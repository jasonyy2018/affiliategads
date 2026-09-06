import { NextResponse } from 'next/server';
import { isAuthorized, unauthorized } from '@/lib/adminAuth';

export async function POST(req: Request) {
  if (!isAuthorized(req)) return unauthorized();

  try {
    const { provider, apiKey, baseUrl, model, protocol = 'openai' } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'API key is required for testing.' }, { status: 400 });
    }

    if (provider === 'custom') {
      const endpoint = baseUrl?.trim() ? baseUrl.trim().replace(/\/+$/, '') : 'https://api.openai.com/v1';
      const targetModel = model?.trim() || 'deepseek-chat';

      if (protocol === 'anthropic') {
        // 自定义 Claude 协议代理测试
        const url = `${endpoint}/messages`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: targetModel,
            max_tokens: 10,
            messages: [{ role: 'user', content: 'hi' }],
          }),
        });
        const data = await res.json();
        if (res.ok) {
          return NextResponse.json({
            success: true,
            message: `Custom Claude Proxy (${targetModel}) connected successfully!`,
          });
        } else {
          return NextResponse.json({
            success: false,
            error: data.error?.message || `HTTP ${res.status}: Failed to authenticate with custom endpoint.`,
          });
        }
      } else {
        // 自定义 OpenAI / DeepSeek / OpenRouter / OneAPI 兼容协议测试
        const url = `${endpoint}/chat/completions`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: targetModel,
            max_tokens: 10,
            messages: [{ role: 'user', content: 'hi' }],
          }),
        });
        const data = await res.json();
        if (res.ok) {
          return NextResponse.json({
            success: true,
            message: `Custom OpenAI-compatible API (${targetModel}) connected successfully!`,
          });
        } else {
          return NextResponse.json({
            success: false,
            error: data.error?.message || `HTTP ${res.status}: API responded with error. Check Base URL and Model Name.`,
          });
        }
      }
    } else if (provider === 'anthropic') {
      // 官方 Anthropic Claude API 测试
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'ping' }],
        }),
      });

      const data = await res.json();
      if (res.ok) {
        return NextResponse.json({ success: true, message: 'Anthropic Claude API connected successfully!' });
      } else {
        return NextResponse.json({
          success: false,
          error: data.error?.message || 'Claude API returned authentication error.',
        });
      }
    } else if (provider === 'openai') {
      // 官方 OpenAI API 测试
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      const data = await res.json();
      if (res.ok) {
        return NextResponse.json({ success: true, message: 'OpenAI API connected successfully!' });
      } else {
        return NextResponse.json({
          success: false,
          error: data.error?.message || 'OpenAI API returned authentication error.',
        });
      }
    } else if (provider === 'bing') {
      // Bing Webmaster Tools API 测试
      const testSiteUrl = baseUrl || 'http://localhost:3000';
      const url = `https://ssl.bing.com/webmaster/api.svc/json/GetUrlSubmissionQuota?siteUrl=${encodeURIComponent(testSiteUrl)}&apikey=${apiKey}`;
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        const quota = data?.d?.DailyQuota ?? 'Valid';
        return NextResponse.json({
          success: true,
          message: `Bing Webmaster API connected successfully! Daily Quota: ${quota}`,
        });
      } else {
        const errText = await res.text();
        return NextResponse.json({
          success: false,
          error: `Bing API responded HTTP ${res.status}: ${errText.slice(0, 150) || 'Authentication failed'}`,
        });
      }
    } else if (provider === 'webhook') {
      // 社媒 Webhook (Make.com / Zapier / Pabbly) 连通性测试
      const targetWebhook = apiKey || baseUrl;
      if (!targetWebhook || !targetWebhook.startsWith('http')) {
        return NextResponse.json({ success: false, error: 'Valid HTTP/HTTPS Webhook URL is required.' }, { status: 400 });
      }

      // SSRF 防护：只允许公网地址，阻止内网探测
      let parsed: URL;
      try {
        parsed = new URL(targetWebhook);
      } catch {
        return NextResponse.json({ success: false, error: 'Malformed webhook URL.' }, { status: 400 });
      }
      const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '169.254.169.254'];
      const hostname = parsed.hostname.toLowerCase();
      if (
        blockedHosts.includes(hostname) ||
        hostname.endsWith('.internal') ||
        hostname.endsWith('.local') ||
        /^10\./.test(hostname) ||
        /^192\.168\./.test(hostname) ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
      ) {
        return NextResponse.json(
          { success: false, error: 'Webhook URL must point to a public host.' },
          { status: 400 }
        );
      }

      const res = await fetch(targetWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'opc_webhook_ping',
          system: 'OPC Arbitrage Command Center',
          message: 'Connection test ping from Admin Console',
          timestamp: new Date().toISOString(),
        }),
      });

      if (res.ok || res.status === 200 || res.status === 201 || res.status === 202) {
        return NextResponse.json({
          success: true,
          message: `Webhook endpoint received test ping successfully! (HTTP ${res.status})`,
        });
      } else {
        return NextResponse.json({
          success: false,
          error: `Webhook returned HTTP ${res.status}: Target server rejected payload.`,
        });
      }
    }

    return NextResponse.json({ success: false, error: 'Unsupported provider' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
