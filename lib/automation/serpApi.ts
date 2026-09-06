/**
 * SERP 真实数据源：SerpApi（https://serpapi.com，免费 100 次/月）。
 * 需要 SERPAPI_KEY；未配置时调用方回退到启发式基准模型。
 */
const SERPAPI_ENDPOINT = 'https://serpapi.com/search.json';

export interface LiveSerpResult {
  keyword: string;
  engine: 'google' | 'bing';
  position: number | null; // 我们站点在第几条自然结果
  url: string | null;
  hasAiOverview: boolean;
}

export function isSerpApiConfigured(): boolean {
  return Boolean(process.env.SERPAPI_KEY && process.env.SERPAPI_KEY.length > 10);
}

/**
 * 查询单个关键词的真实 SERP 排名。
 * SerpApi google engine 参数 num=20, bing 用 engine=bing。
 */
export async function queryLiveSerp(keyword: string, engine: 'google' | 'bing', siteUrl: string): Promise<LiveSerpResult> {
  const key = process.env.SERPAPI_KEY!;
  const cleanSite = siteUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');

  const params = new URLSearchParams({
    q: keyword,
    num: '20',
    api_key: key,
  });
  if (engine === 'bing') {
    params.set('engine', 'bing');
  } else {
    params.set('engine', 'google');
  }

  const res = await fetch(`${SERPAPI_ENDPOINT}?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`SerpApi HTTP ${res.status}`);
  }

  const data = await res.json();

  // 定位我们自己域名的自然结果
  const organic: Array<{ position: number; link: string }> = data.organic_results || [];
  const hit = organic.find((r) => {
    try {
      const host = new URL(r.link).hostname.replace(/^www\./, '');
      return host === cleanSite.replace(/^www\./, '');
    } catch {
      return false;
    }
  });

  return {
    keyword,
    engine,
    position: hit ? hit.position : null,
    url: hit?.link || null,
    hasAiOverview: Boolean(data.ai_overview),
  };
}
