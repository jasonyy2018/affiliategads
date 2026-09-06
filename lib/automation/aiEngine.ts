/**
 * 统一 AI 调用层：支持 Anthropic / OpenAI / 自定义兼容端点 (DeepSeek, OpenRouter 等)。
 * 纯 fetch 实现，零 SDK 依赖。
 */

export interface AiConfig {
  anthropicKey?: string;
  openaiKey?: string;
  customBaseUrl?: string;
  customApiKey?: string;
  customModel?: string;
  customProtocol?: string;
  modelChoice?: string;
}

export function loadAiConfig(): AiConfig {
  return {
    anthropicKey: process.env.ANTHROPIC_API_KEY,
    openaiKey: process.env.OPENAI_API_KEY,
    customBaseUrl: process.env.CUSTOM_AI_BASE_URL,
    customApiKey: process.env.CUSTOM_AI_API_KEY,
    customModel: process.env.CUSTOM_AI_MODEL || 'deepseek-chat',
    customProtocol: process.env.CUSTOM_AI_PROTOCOL || 'openai',
    modelChoice: process.env.AI_MODEL_CHOICE || 'auto',
  };
}

/**
 * 决定当前应使用的 provider。
 */
export function resolveProvider(cfg: AiConfig): 'anthropic' | 'openai' | 'custom' | 'mock' {
  const choice = cfg.modelChoice || 'auto';
  if (choice === 'mock') return 'mock';
  if (choice === 'claude') return cfg.anthropicKey ? 'anthropic' : 'mock';
  if (choice === 'openai') return cfg.openaiKey ? 'openai' : 'mock';
  if (choice === 'custom') return cfg.customApiKey ? 'custom' : 'mock';

  // auto
  if (cfg.customApiKey && cfg.customApiKey.length > 5) return 'custom';
  if (cfg.anthropicKey && cfg.anthropicKey.startsWith('sk-ant-') && cfg.anthropicKey.length > 20) return 'anthropic';
  if (cfg.openaiKey && cfg.openaiKey.startsWith('sk-') && cfg.openaiKey.length > 20) return 'openai';
  return 'mock';
}

function stripCodeFence(raw: string): string {
  let s = raw.trim();
  if (s.startsWith('```json')) s = s.slice(7);
  else if (s.startsWith('```')) s = s.slice(3);
  if (s.endsWith('```')) s = s.slice(0, -3);
  return s.trim();
}

async function callAnthropic(cfg: AiConfig, system: string, user: string, maxTokens = 4000): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': cfg.anthropicKey!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Anthropic API HTTP ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text || '';
}

async function callOpenAiCompatible(
  endpoint: string,
  apiKey: string,
  model: string,
  system: string,
  user: string,
  maxTokens = 4000
): Promise<string> {
  const res = await fetch(`${endpoint}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`AI API HTTP ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * 调用当前配置的 AI 生成 JSON 输出；失败时抛异常（由调用方决定兜底策略）。
 */
export async function generateJson(
  system: string,
  user: string,
  cfg: AiConfig = loadAiConfig(),
  maxTokens = 4000
): Promise<any> {
  const provider = resolveProvider(cfg);
  let raw = '';

  if (provider === 'anthropic') {
    raw = await callAnthropic(cfg, system, user, maxTokens);
  } else if (provider === 'openai') {
    raw = await callOpenAiCompatible('https://api.openai.com/v1', cfg.openaiKey!, 'gpt-4o', system, user, maxTokens);
  } else if (provider === 'custom') {
    const base = (cfg.customBaseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
    if ((cfg.customProtocol || 'openai') === 'anthropic') {
      // Anthropic 协议的自定义代理
      const res = await fetch(`${base}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': cfg.customApiKey!,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: cfg.customModel || 'deepseek-chat',
          max_tokens: maxTokens,
          system,
          messages: [{ role: 'user', content: user }],
        }),
      });
      if (!res.ok) throw new Error(`Custom API HTTP ${res.status}`);
      const data = await res.json();
      raw = data.content?.[0]?.text || '';
    } else {
      raw = await callOpenAiCompatible(base, cfg.customApiKey!, cfg.customModel || 'deepseek-chat', system, user, maxTokens);
    }
  } else {
    throw new Error('No AI provider configured.');
  }

  return JSON.parse(stripCodeFence(raw));
}
