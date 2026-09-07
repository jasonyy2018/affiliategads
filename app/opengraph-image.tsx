import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'PrimeReviewLab — Lab-benchmarked outdoor gear comparison guides';

export default async function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '72px 84px',
          backgroundColor: '#020617',
          backgroundImage: 'linear-gradient(135deg, #020617 0%, #1e293b 60%, #0f172a 100%)',
        }}
      >
        {/* 品牌徽标行 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '44px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              backgroundColor: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
              color: '#0f172a',
              fontWeight: 900,
            }}
          >
            ⭐
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: '34px',
              fontWeight: 800,
              color: '#f8fafc',
              letterSpacing: '-1px',
            }}
          >
            <span style={{ display: 'flex' }}>Prime</span>
            <span style={{ display: 'flex', color: '#f59e0b' }}>Review</span>
            <span style={{ display: 'flex' }}>Lab</span>
          </div>
        </div>

        {/* 主标题 */}
        <div
          style={{
            display: 'flex',
            fontSize: '64px',
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.15,
            letterSpacing: '-2px',
            maxWidth: '980px',
          }}
        >
          Real Lab Benchmarks.
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: '64px',
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: '-2px',
            color: '#f59e0b',
            marginBottom: '40px',
          }}
        >
          Zero Sponsored Fluff.
        </div>

        {/* 副标 */}
        <div
          style={{
            display: 'flex',
            fontSize: '28px',
            color: '#94a3b8',
            lineHeight: 1.4,
            maxWidth: '900px',
          }}
        >
          Independent outdoor gear testing — caliper measurements, submersion
          tanks, and 50,000-cycle flex rigs.
        </div>

        {/* 底部信任条 */}
        <div style={{ display: 'flex', gap: '36px', marginTop: '52px' }}>
          {['Retail-Bought', 'No Free Samples', 'Lab Measured'].map((t) => (
            <div
              key={t}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 22px',
                borderRadius: '999px',
                border: '2px solid #334155',
                backgroundColor: '#0f172a',
              }}
            >
              <div
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '999px',
                  backgroundColor: '#10b981',
                }}
              />
              <span style={{ fontSize: '22px', color: '#e2e8f0', fontWeight: 600 }}>{t}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
