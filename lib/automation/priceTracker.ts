/**
 * 价格追踪引擎：记录商品价格快照 → 检测降价 → 生成"今日最佳降价"数据。
 *
 * 数据流：
 *   data/price_history.json  — { [slug]: [{ date, price, source }] }
 *   data/price_alerts.json   — 检测到的降价事件（供首页/对比页渲染 Deal Badge）
 *
 * 价格来源（按优先级）：
 *   1. Amazon Product Advertising API（配置 PA_API_KEY 后自动启用，真实零售价）
 *   2. 后台手动快照（admin UI 触发）
 *   3. products.json 中的静态价（基线）
 */
import fs from 'fs';
import path from 'path';
import { DATA_DIR, loadProducts, withLock, readJson, writeJson, type Product } from './dataLayer';

const HISTORY_FILE = path.join(DATA_DIR, 'price_history.json');
const ALERTS_FILE = path.join(DATA_DIR, 'price_alerts.json');

export interface PricePoint {
  date: string; // ISO date (YYYY-MM-DD)
  price: number;
  source: 'pa_api' | 'manual' | 'baseline';
}

export interface PriceAlert {
  slug: string;
  asin: string;
  title: string;
  brand: string;
  oldPrice: number;
  newPrice: number;
  dropPct: number; // 负数 = 降价
  detectedAt: string;
  active: boolean;
}

export function loadPriceHistory(): Record<string, PricePoint[]> {
  return readJson<Record<string, PricePoint[]>>(HISTORY_FILE, {});
}

export function loadPriceAlerts(): PriceAlert[] {
  return readJson<PriceAlert[]>(ALERTS_FILE, []);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * 记录一次价格快照。若与最近快照相同则跳过（不产生重复点）。
 * 检测到降幅 >= minDropPct% 时生成/激活降价提醒。
 */
export async function recordPriceSnapshots(
  snapshots: Array<{ slug: string; price: number; source?: PricePoint['source'] }>,
  minDropPct = 3
): Promise<{ recorded: number; alerts: PriceAlert[] }> {
  return withLock('price_tracker', async () => {
    const history = loadPriceHistory();
    const alerts = loadPriceAlerts();
    const products = loadProducts();
    const bySlug = new Map(products.map((p) => [p.slug, p]));
    const today = todayIso();
    const newAlerts: PriceAlert[] = [];
    let recorded = 0;

    for (const snap of snapshots) {
      const product = bySlug.get(snap.slug);
      if (!product || typeof snap.price !== 'number' || snap.price <= 0) continue;

      const points = history[snap.slug] || [];
      const last = points[points.length - 1];

      // 当天已有同源快照则覆盖
      if (last && last.date === today) {
        last.price = snap.price;
        last.source = snap.source || 'manual';
      } else {
        points.push({ date: today, price: snap.price, source: snap.source || 'manual' });
        recorded++;
      }

      // 只保留最近 180 天
      const cutoff = new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10);
      history[snap.slug] = points.filter((p) => p.date >= cutoff).slice(-180);

      // 降价检测：与此前最低价比较（排除今天的点）
      const priorPoints = points.filter((p) => p.date < today);
      if (priorPoints.length > 0) {
        const priorMin = Math.min(...priorPoints.map((p) => p.price));
        const dropPct = ((snap.price - priorMin) / priorMin) * 100;

        if (dropPct <= -minDropPct) {
          const existing = alerts.find((a) => a.slug === snap.slug && a.active);
          if (!existing || existing.newPrice > snap.price) {
            if (existing) existing.active = false;
            const alert: PriceAlert = {
              slug: snap.slug,
              asin: product.asin,
              title: product.title,
              brand: product.brand,
              oldPrice: priorMin,
              newPrice: snap.price,
              dropPct: Math.round(dropPct * 10) / 10,
              detectedAt: new Date().toISOString(),
              active: true,
            };
            alerts.push(alert);
            newAlerts.push(alert);
          }
        }
      }
    }

    // 清理 30 天前的非活动提醒
    const cutoff = Date.now() - 30 * 86400000;
    const cleaned = alerts.filter(
      (a) => a.active || new Date(a.detectedAt).getTime() > cutoff
    );
    writeJson(HISTORY_FILE, history);
    writeJson(ALERTS_FILE, cleaned);

    return { recorded, alerts: newAlerts };
  });
}

/**
 * 从基线（products.json）初始化历史 — 首次运行时建立基线。
 */
export async function seedBaselineHistory(): Promise<number> {
  return withLock('price_tracker', async () => {
    const history = loadPriceHistory();
    const products = loadProducts();
    const today = todayIso();
    let seeded = 0;

    for (const p of products) {
      if (!history[p.slug]?.length) {
        history[p.slug] = [{ date: today, price: p.price, source: 'baseline' }];
        seeded++;
      }
    }

    writeJson(HISTORY_FILE, history);
    return seeded;
  });
}

export interface DealCard {
  slug: string;
  asin: string;
  title: string;
  brand: string;
  image_url?: string;
  currentPrice: number;
  lowestPrice: number;
  avgPrice: number;
  isAtLowest: boolean;
  dropPctFromAvg: number;
  lastUpdated: string;
  trend: Array<{ date: string; price: number }>;
}

/**
 * 读取商品的价格态势（供前端 PriceHistoryBadge / DealCard 渲染）。
 */
export function getPriceInsight(slug: string): DealCard | null {
  const history = loadPriceHistory();
  const points = history[slug];
  if (!points || points.length === 0) return null;

  const products = loadProducts();
  const product = products.find((p) => p.slug === slug);
  const current = points[points.length - 1];
  const prices = points.map((p) => p.price);
  const lowest = Math.min(...prices);
  const avg = prices.reduce((s, p) => s + p, 0) / prices.length;

  return {
    slug,
    asin: product?.asin || '',
    title: product?.title || slug,
    brand: product?.brand || '',
    image_url: product?.image_url,
    currentPrice: current.price,
    lowestPrice: lowest,
    avgPrice: Math.round(avg * 100) / 100,
    isAtLowest: current.price <= lowest,
    dropPctFromAvg: Math.round(((current.price - avg) / avg) * 1000) / 10,
    lastUpdated: current.date,
    trend: points.slice(-30),
  };
}

/**
 * 全站当前处于历史低价的商品（首页 "Today's Best Deals" 模块数据源）。
 */
export function getActiveDeals(limit = 4): DealCard[] {
  const products = loadProducts();
  const deals: DealCard[] = [];

  for (const p of products) {
    const insight = getPriceInsight(p.slug);
    if (insight && insight.dropPctFromAvg <= -3) {
      deals.push(insight);
    }
  }

  // 降幅最大的排前
  return deals.sort((a, b) => a.dropPctFromAvg - b.dropPctFromAvg).slice(0, limit);
}
