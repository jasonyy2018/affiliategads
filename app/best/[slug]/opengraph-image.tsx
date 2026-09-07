import { ImageResponse } from 'next/og';
import fs from 'fs';
import path from 'path';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Buyer comparison matrix open graph image';

export function generateStaticParams() {
  const slugs = new Set<string>();
  const pagesDir = path.join(process.cwd(), 'content', 'pages');
  if (fs.existsSync(pagesDir)) {
    for (const f of fs.readdirSync(pagesDir).filter((f) => f.endsWith('.json'))) {
      slugs.add(f.replace(/\.json$/, ''));
    }
  }
  return [...slugs].map((slug) => ({ slug }));
}

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // 从快照读取品类/场景/商品数
  let category = '';
  let useCase = '';
  let productCount = 0;
  let topPick = '';
  let topPrice = '';
  try {
    const pagePath = path.join(process.cwd(), 'content', 'pages', `${slug}.json`);
    if (fs.existsSync(pagePath)) {
      const data = JSON.parse(fs.readFileSync(pagePath, 'utf-8'));
      category = data.category || '';
      useCase = data.use_case || '';
      productCount = data.product_count || (data.products || []).length || 0;
      const top = (data.products || [])[0];
      topPick = top?.brand || '';
      topPrice = top?.price ? `$${Math.round(top.price)}` : '';
    }
  } catch {}

  const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 76px',
          backgroundColor: '#020617',
          backgroundImage: 'linear-gradient(135deg, #020617 0%, #1e293b 50%, #0f172a 100%)',
        }}
      >
        {/* 顶部品牌行 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '30px',
                fontWeight: 900,
                color: '#0f172a',
              }}
            >
              ⭐
            </div>
            <div style={{ display: 'flex', fontSize: '26px', fontWeight: 800, color: '#f8fafc' }}>
              <span style={{ display: 'flex' }}>Prime</span>
              <span style={{ display: 'flex', color: '#f59e0b' }}>Review</span>
              <span style={{ display: 'flex' }}>Lab</span>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              padding: '10px 24px',
              borderRadius: '999px',
              backgroundColor: '#10b981',
              fontSize: '20px',
              fontWeight: 800,
              color: '#ffffff',
            }}
          >
            2026 BUYER MATRIX
          </div>
        </div>

        {/* 中部标题 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <div style={{ display: 'flex', fontSize: '24px', color: '#f59e0b', fontWeight: 700, letterSpacing: '3px' }}>
            {`TESTED COMPARISON${category ? ` · ${category.toUpperCase()}` : ''}`}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: '58px',
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1.12,
              letterSpacing: '-1.5px',
              maxWidth: '980px',
            }}
          >
            Best {titleCase(category || 'Gear')}
            {useCase ? ` for ${titleCase(useCase)}` : ''}
          </div>
        </div>

        {/* 底部数据行 */}
        <div style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
          {productCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
              <span style={{ display: 'flex', fontSize: '52px', fontWeight: 900, color: '#10b981' }}>{productCount}</span>
              <span style={{ display: 'flex', fontSize: '22px', color: '#94a3b8' }}>models benchmarked</span>
            </div>
          )}
          {topPick && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <span style={{ display: 'flex', fontSize: '22px', color: '#94a3b8' }}>Top pick:</span>
              <span style={{ display: 'flex', fontSize: '28px', fontWeight: 800, color: '#f1f5f9' }}>{topPick}</span>
              {topPrice && (
                <span style={{ display: 'flex', fontSize: '26px', fontWeight: 800, color: '#f59e0b' }}>{topPrice}</span>
              )}
            </div>
          )}
          <div
            style={{
              display: 'flex',
              marginLeft: 'auto',
              padding: '12px 26px',
              borderRadius: '999px',
              border: '2px solid #334155',
              fontSize: '20px',
              color: '#cbd5e1',
              fontWeight: 600,
            }}
          >
            See the full matrix →
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
