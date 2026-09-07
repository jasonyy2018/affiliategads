import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/siteConfig';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/'],
      },
      {
        // 显式允许主流 AI 搜索与 GEO 引用引擎抓取公开内容
        userAgent: [
          'Googlebot',
          'Bingbot',
          'GPTBot',
          'PerplexityBot',
          'ClaudeBot',
          'Google-Extended',
          'Applebot',
        ],
        allow: '/',
        disallow: ['/admin', '/api/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
