/**
 * 商品图片同步任务：PA-API 拉取官方商品图 → 替换 products.json 里的 Unsplash 占位图。
 * 联盟协议允许使用 Amazon 官方商品图（必须通过 PA-API 获取，不允许直接热链）。
 */
import { loadProducts, saveProducts, withLock, writeJson, CONTENT_DIR } from './dataLayer';
import { isPaApiConfigured, getItemsPrices } from './paApi';
import fs from 'fs';
import path from 'path';

export interface ImageSyncResult {
  mode: 'pa_api' | 'unavailable';
  checked: number;
  updated: number;
  remainingStockPhotos: number;
  summary: string;
}

export async function runImageSync(): Promise<ImageSyncResult> {
  return withLock('image_sync', async () => {
    const products = loadProducts();

    if (!isPaApiConfigured()) {
      const stock = products.filter((p) => p.image_url?.includes('unsplash')).length;
      return {
        mode: 'unavailable',
        checked: 0,
        updated: 0,
        remainingStockPhotos: stock,
        summary: `图片同步跳过: 未配置 PA-API (当前 ${stock} 个商品仍使用 Unsplash 占位图)。配置 PA_ACCESS_KEY/PA_SECRET_KEY 后重试。`,
      };
    }

    let checked = 0;
    let updated = 0;

    // 每批 10 个
    for (let i = 0; i < products.length; i += 10) {
      const batch = products.slice(i, i + 10).filter((p) => p.asin);
      try {
        const results = await getItemsPrices(batch.map((p) => p.asin));
        checked += batch.length;

        const byAsin = new Map(results.map((r) => [r.asin, r]));

        for (const p of batch) {
          const live = byAsin.get(p.asin);
          if (live?.imageUrl) {
            // 替换非 Amazon 官方源（unsplash 等占位图）
            if (!p.image_url?.includes('media-amazon.com') && !p.image_url?.includes('ssl-images-amazon')) {
              p.image_url = live.imageUrl;
              updated++;
            }
          }
        }
      } catch {
        // 批次失败继续
      }
    }

    // 写回 products.json
    saveProducts(products);

    // 同步刷新 content/pages 快照中的图片（保持对比页一致）
    const pagesDir = path.join(process.cwd(), 'content', 'pages');
    let pagesUpdated = 0;
    if (fs.existsSync(pagesDir)) {
      const imageBySlug = new Map(products.map((p) => [p.slug, p.image_url]));
      for (const file of fs.readdirSync(pagesDir).filter((f) => f.endsWith('.json'))) {
        const filePath = path.join(pagesDir, file);
        try {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          let dirty = false;
          for (const prod of data.products || []) {
            const slug = products.find((p) => p.asin === prod.asin)?.slug;
            const newImg = slug ? imageBySlug.get(slug) : undefined;
            if (newImg && prod.image_url !== newImg && !prod.image_url?.includes('media-amazon.com')) {
              prod.image_url = newImg;
              dirty = true;
            }
          }
          if (dirty) {
            writeJson(filePath, data);
            pagesUpdated++;
          }
        } catch {}
      }
    }

    const remaining = products.filter((p) => p.image_url?.includes('unsplash')).length;

    return {
      mode: 'pa_api',
      checked,
      updated,
      remainingStockPhotos: remaining,
      summary: `图片同步完成: ${checked} 商品查询, ${updated} 个换为 Amazon 官方图, ${pagesUpdated} 个对比页快照同步更新 (剩余占位图 ${remaining})`,
    };
  });
}
