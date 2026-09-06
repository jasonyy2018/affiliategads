/**
 * 价格快照采集任务：PA-API（若配置）→ 降价检测 → 写入 price_history / price_alerts。
 * 注册为自动化任务 price_tracker，可加入 cron_pipeline。
 */
import { loadProducts } from './dataLayer';
import { isPaApiConfigured, getItemsPrices } from './paApi';
import { recordPriceSnapshots, seedBaselineHistory } from './priceTracker';

export interface PriceTrackerResult {
  mode: 'pa_api' | 'baseline';
  checked: number;
  recorded: number;
  alerts: Array<{ slug: string; title: string; dropPct: number; oldPrice: number; newPrice: number }>;
  summary: string;
}

export async function runPriceTracker(): Promise<PriceTrackerResult> {
  // 1. 首次运行：为全部商品建立基线
  const seeded = await seedBaselineHistory();

  const products = loadProducts();
  const usePaApi = isPaApiConfigured();

  if (!usePaApi) {
    return {
      mode: 'baseline',
      checked: products.length,
      recorded: seeded,
      alerts: [],
      summary:
        seeded > 0
          ? `价格基线初始化: ${seeded} 个商品写入基准价 (配置 PA_ACCESS_KEY/PA_SECRET_KEY 后启用真实价格采集)`
          : `价格追踪: ${products.length} 商品基线已就绪，等待 PA-API 配置`,
    };
  }

  // 2. PA-API 真实价格采集（每批 10 个）
  const byAsin = new Map(products.map((p) => [p.asin, p]));
  const snapshots: Array<{ slug: string; price: number; source: 'pa_api' }> = [];
  let checked = 0;
  const failures: string[] = [];

  for (let i = 0; i < products.length; i += 10) {
    const batch = products.slice(i, i + 10).filter((p) => p.asin);
    try {
      const prices = await getItemsPrices(batch.map((p) => p.asin));
      checked += batch.length;
      for (const price of prices) {
        const product = byAsin.get(price.asin);
        if (product && price.price && price.price > 0) {
          snapshots.push({ slug: product.slug, price: price.price, source: 'pa_api' });
        }
      }
    } catch (e: any) {
      failures.push(e.message);
    }
  }

  // 3. 写入快照 + 降价检测
  const { recorded, alerts } = await recordPriceSnapshots(snapshots);

  const summary =
    `价格采集 (PA-API): 检查 ${checked}/${products.length} 商品, 更新 ${recorded} 个价格点` +
    (alerts.length > 0 ? `, 触发 ${alerts.length} 个降价提醒 (最大降幅 ${Math.min(...alerts.map((a) => a.dropPct))}%)` : ', 无新降价') +
    (failures.length ? `, ${failures.length} 批次失败` : '');

  return {
    mode: 'pa_api',
    checked,
    recorded,
    alerts: alerts.map((a) => ({
      slug: a.slug,
      title: a.title,
      dropPct: a.dropPct,
      oldPrice: a.oldPrice,
      newPrice: a.newPrice,
    })),
    summary,
  };
}
