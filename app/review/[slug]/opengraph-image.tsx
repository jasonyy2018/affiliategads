import { ImageResponse } from 'next/og';
import fs from 'fs';
import path from 'path';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Product review open graph image';

export function generateStaticParams() {
  const productsPath = path.join(process.cwd(), 'data', 'products.json');
  if (!fs.existsSync(productsPath)) return [];
  try {
    const products = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
    return products.map((p: any) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const productsPath = path.join(process.cwd(), 'data', 'products.json');
  let product: any = null;
  try {
    const products = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
    product = products.find((p: any) => p.slug === slug);
  } catch {}

  const title = product?.title || 'Product Review';
  const brand = product?.brand || '';
  const price = product?.price ? `$${product.price.toFixed(2)}` : '';
  const rating = product?.rating ? `${product.rating}/5` : '';

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
          backgroundImage: 'linear-gradient(160deg, #020617 0%, #1e293b 55%, #111827 100%)',
        }}
      >
        {/* 顶部品牌行 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                display: 'flex',
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: '#f59e0b',
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
            LAB TESTED 2026
          </div>
        </div>

        {/* 中部标题 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', fontSize: '24px', color: '#f59e0b', fontWeight: 700, letterSpacing: '3px' }}>
            {(brand || 'GEAR').toUpperCase()} · HANDS-ON REVIEW
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: '54px',
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1.15,
              letterSpacing: '-1.5px',
            }}
          >
            {title}
          </div>
        </div>

        {/* 底部数据条 */}
        <div style={{ display: 'flex', gap: '28px', alignItems: 'center' }}>
          {price && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
              <span style={{ fontSize: '52px', fontWeight: 900, color: '#f59e0b' }}>{price}</span>
              <span style={{ fontSize: '20px', color: '#64748b' }}>at publishing</span>
            </div>
          )}
          {rating && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ display: 'flex', fontSize: '30px' }}>⭐</span>
              <span style={{ display: 'flex', fontSize: '30px', fontWeight: 700, color: '#f1f5f9' }}>{rating}</span>
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
            Full caliper teardown inside →
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
