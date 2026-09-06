'use client';

import Script from 'next/script';

export function GoogleAdsTracker() {
  const conversionId = process.env.NEXT_PUBLIC_GA_CONVERSION_ID;

  if (!conversionId) return null;

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${conversionId}`}
      />
      <Script
        id="google-ads-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${conversionId}');
          `,
        }}
      />
    </>
  );
}

/**
 * 触发 Google Ads 按钮点击微转化
 */
export function trackAmazonOutboundClick(asin: string, title: string) {
  const conversionId = process.env.NEXT_PUBLIC_GA_CONVERSION_ID;
  const conversionLabel = process.env.NEXT_PUBLIC_GA_CONVERSION_LABEL;

  if (typeof window !== 'undefined' && (window as any).gtag && conversionId && conversionLabel) {
    (window as any).gtag('event', 'conversion', {
      send_to: `${conversionId}/${conversionLabel}`,
      event_category: 'outbound_affiliate_click',
      event_label: asin,
      value: 1.0,
      currency: 'USD',
    });
  }

  // 本地开发调试日志
  console.log(`[Google Ads Micro-Conversion] Tracked affiliate click for ASIN: ${asin} (${title})`);
}
