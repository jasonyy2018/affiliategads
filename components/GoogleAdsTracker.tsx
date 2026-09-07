'use client';

/**
 * Google Ads 全局代码已直接原生注入 app/layout.tsx 的 <head> 首行，
 * 本组件保留作为客户端微转化事件调度中心。
 */
export function GoogleAdsTracker() {
  return null;
}

/**
 * 触发 Google Ads 按钮点击微转化
 */
export function trackAmazonOutboundClick(asin: string, title: string) {
  const conversionId = process.env.NEXT_PUBLIC_GA_CONVERSION_ID;
  const conversionLabel = process.env.NEXT_PUBLIC_GA_CONVERSION_LABEL;

  if (typeof window !== 'undefined' && (window as any).gtag && conversionId) {
    const eventParams: Record<string, any> = {
      event_category: 'outbound_affiliate_click',
      event_label: asin,
      item_name: title,
      value: 1.0,
      currency: 'USD',
    };

    if (conversionLabel && conversionLabel.trim().length > 0 && conversionLabel !== 'AbCdEfGhIjKlMnOpQrS') {
      eventParams.send_to = `${conversionId}/${conversionLabel.trim()}`;
      (window as any).gtag('event', 'conversion', eventParams);
    } else {
      (window as any).gtag('event', 'conversion', { ...eventParams, send_to: conversionId });
      (window as any).gtag('event', 'outbound_click', eventParams);
    }
  }

  // 本地开发调试日志
  console.log(`[Google Ads Micro-Conversion] Tracked affiliate click for ASIN: ${asin} (${title})`);
}
