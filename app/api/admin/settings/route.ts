import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { isAuthorized, unauthorized } from '@/lib/adminAuth';

const ENV_LOCAL_PATH = path.join(process.cwd(), '.env.local');

function parseEnvFile(filePath: string): Record<string, string> {
  const result: Record<string, string> = {};
  try {
    if (!fs.existsSync(filePath)) return result;
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const [key, ...rest] = trimmed.split('=');
      result[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '');
    }
  } catch (err: any) {
    console.warn(`[Settings] Notice: could not read ${filePath} (${err.message}). Falling back to process.env.`);
  }
  return result;
}

/**
 * 原地更新 .env.local：逐行替换已存在的 key，新 key 追加到末尾。
 * 保留原有注释与行序，捕获只读容器或权限不足 (EACCES)，避免直接崩溃。
 */
function updateEnvFile(filePath: string, updates: Record<string, string>): { written: boolean; error?: string } {
  try {
    let content = '';
    if (fs.existsSync(filePath)) {
      content = fs.readFileSync(filePath, 'utf-8');
    } else {
      content = '# ==========================================\n# Affiliate Site Configurations\n# ==========================================\n';
    }

    const pending = { ...updates };
    const lines = content.split('\n').map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) return line;
      const key = trimmed.split('=')[0].trim();
      if (key in pending) {
        const value = pending[key];
        delete pending[key];
        return `${key}=${value}`;
      }
      return line;
    });

    // 追加新 key
    for (const [k, v] of Object.entries(pending)) {
      lines.push(`${k}=${v}`);
    }

    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
    return { written: true };
  } catch (err: any) {
    console.warn(`[Settings] Notice: could not write to ${filePath} (${err.code || err.message}). Runtime memory has been updated.`);
    return { written: false, error: err.message };
  }
}

function maskKey(key: string | undefined): string {
  if (!key) return '';
  if (key.length <= 8) return '********';
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) return unauthorized();

  const fileEnvs = parseEnvFile(ENV_LOCAL_PATH);

  const anthropicKey = fileEnvs['ANTHROPIC_API_KEY'] || process.env.ANTHROPIC_API_KEY || '';
  const openaiKey = fileEnvs['OPENAI_API_KEY'] || process.env.OPENAI_API_KEY || '';
  const amazonTag = fileEnvs['NEXT_PUBLIC_AMAZON_AFFILIATE_TAG'] || process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG || 'yourtag-20';
  const gaId = fileEnvs['NEXT_PUBLIC_GA_CONVERSION_ID'] || process.env.NEXT_PUBLIC_GA_CONVERSION_ID || 'AW-123456789';
  const gaLabel = fileEnvs['NEXT_PUBLIC_GA_CONVERSION_LABEL'] || process.env.NEXT_PUBLIC_GA_CONVERSION_LABEL || '';
  const defaultModel = fileEnvs['AI_MODEL_CHOICE'] || process.env.AI_MODEL_CHOICE || 'auto';

  // 第三方自定义 API 配置
  const customBaseUrl = fileEnvs['CUSTOM_AI_BASE_URL'] || process.env.CUSTOM_AI_BASE_URL || '';
  const customApiKey = fileEnvs['CUSTOM_AI_API_KEY'] || process.env.CUSTOM_AI_API_KEY || '';
  const customModel = fileEnvs['CUSTOM_AI_MODEL'] || process.env.CUSTOM_AI_MODEL || 'deepseek-chat';
  const customProtocol = fileEnvs['CUSTOM_AI_PROTOCOL'] || process.env.CUSTOM_AI_PROTOCOL || 'openai';

  // 搜索引擎与收录
  const bingApiKey = fileEnvs['BING_API_KEY'] || process.env.BING_API_KEY || '';
  const siteUrl = fileEnvs['NEXT_PUBLIC_SITE_URL'] || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  // 社媒广播与 Webhook 中继
  const socialWebhookUrl = fileEnvs['SOCIAL_WEBHOOK_URL'] || process.env.SOCIAL_WEBHOOK_URL || '';
  const ayrshareApiKey = fileEnvs['AYRSHARE_API_KEY'] || process.env.AYRSHARE_API_KEY || '';

  // 安全门禁密码
  const adminSecretKey = fileEnvs['ADMIN_SECRET_KEY'] || process.env.ADMIN_SECRET_KEY || 'opc2026';

  return NextResponse.json({
    success: true,
    settings: {
      siteUrl,
      bingApiKeyMasked: maskKey(bingApiKey),
      hasBingApiKey: Boolean(bingApiKey && bingApiKey.length > 5),
      adminSecretKeyMasked: maskKey(adminSecretKey),
      hasAdminSecretKey: Boolean(adminSecretKey && adminSecretKey.length > 0),
      anthropicKeyMasked: maskKey(anthropicKey),
      hasAnthropicKey: Boolean(anthropicKey && anthropicKey.startsWith('sk-ant-') && anthropicKey.length > 20),
      openaiKeyMasked: maskKey(openaiKey),
      hasOpenaiKey: Boolean(openaiKey && openaiKey.startsWith('sk-') && openaiKey.length > 20),
      customBaseUrl,
      customApiKeyMasked: maskKey(customApiKey),
      hasCustomApiKey: Boolean(customApiKey && customApiKey.length > 5),
      customModel,
      customProtocol,
      amazonTag,
      gaId,
      gaLabel,
      defaultModel,
      socialWebhookUrl,
      hasSocialWebhook: Boolean(socialWebhookUrl && socialWebhookUrl.startsWith('http')),
      ayrshareApiKeyMasked: maskKey(ayrshareApiKey),
      hasAyrshareApiKey: Boolean(ayrshareApiKey && ayrshareApiKey.length > 5),
    },
  });
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) return unauthorized();

  try {
    const body = await req.json();
    const {
      anthropicKey,
      openaiKey,
      customBaseUrl,
      customApiKey,
      customModel,
      customProtocol,
      amazonTag,
      gaId,
      gaLabel,
      defaultModel,
      socialWebhookUrl,
      ayrshareApiKey,
      siteUrl,
      bingApiKey,
      adminSecretKey,
    } = body;

    const currentEnvs = parseEnvFile(ENV_LOCAL_PATH);
    const updates: Record<string, string> = {};

    if (siteUrl !== undefined && siteUrl.trim() !== '') {
      updates['NEXT_PUBLIC_SITE_URL'] = siteUrl.trim();
      process.env.NEXT_PUBLIC_SITE_URL = siteUrl.trim();
    }

    if (bingApiKey !== undefined && bingApiKey.trim() !== '') {
      updates['BING_API_KEY'] = bingApiKey.trim();
      process.env.BING_API_KEY = bingApiKey.trim();
    }

    if (adminSecretKey !== undefined && adminSecretKey.trim() !== '') {
      updates['ADMIN_SECRET_KEY'] = adminSecretKey.trim();
      process.env.ADMIN_SECRET_KEY = adminSecretKey.trim();
    }

    if (anthropicKey !== undefined && anthropicKey.trim() !== '') {
      updates['ANTHROPIC_API_KEY'] = anthropicKey.trim();
      process.env.ANTHROPIC_API_KEY = anthropicKey.trim();
    }

    if (openaiKey !== undefined && openaiKey.trim() !== '') {
      updates['OPENAI_API_KEY'] = openaiKey.trim();
      process.env.OPENAI_API_KEY = openaiKey.trim();
    }

    if (customBaseUrl !== undefined) {
      updates['CUSTOM_AI_BASE_URL'] = customBaseUrl.trim();
      process.env.CUSTOM_AI_BASE_URL = customBaseUrl.trim();
    }

    if (customApiKey !== undefined && customApiKey.trim() !== '') {
      updates['CUSTOM_AI_API_KEY'] = customApiKey.trim();
      process.env.CUSTOM_AI_API_KEY = customApiKey.trim();
    }

    if (customModel !== undefined) {
      updates['CUSTOM_AI_MODEL'] = customModel.trim();
      process.env.CUSTOM_AI_MODEL = customModel.trim();
    }

    if (customProtocol !== undefined) {
      updates['CUSTOM_AI_PROTOCOL'] = customProtocol.trim();
      process.env.CUSTOM_AI_PROTOCOL = customProtocol.trim();
    }

    if (amazonTag !== undefined) {
      updates['NEXT_PUBLIC_AMAZON_AFFILIATE_TAG'] = amazonTag.trim();
      process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG = amazonTag.trim();
    }

    if (gaId !== undefined) {
      updates['NEXT_PUBLIC_GA_CONVERSION_ID'] = gaId.trim();
      process.env.NEXT_PUBLIC_GA_CONVERSION_ID = gaId.trim();
    }

    if (gaLabel !== undefined) {
      updates['NEXT_PUBLIC_GA_CONVERSION_LABEL'] = gaLabel.trim();
      process.env.NEXT_PUBLIC_GA_CONVERSION_LABEL = gaLabel.trim();
    }

    if (socialWebhookUrl !== undefined) {
      updates['SOCIAL_WEBHOOK_URL'] = socialWebhookUrl.trim();
      process.env.SOCIAL_WEBHOOK_URL = socialWebhookUrl.trim();
    }

    if (ayrshareApiKey !== undefined && ayrshareApiKey.trim() !== '') {
      updates['AYRSHARE_API_KEY'] = ayrshareApiKey.trim();
      process.env.AYRSHARE_API_KEY = ayrshareApiKey.trim();
    }

    if (defaultModel !== undefined) {
      updates['AI_MODEL_CHOICE'] = defaultModel;
      process.env.AI_MODEL_CHOICE = defaultModel;
    }

    const writeResult = updateEnvFile(ENV_LOCAL_PATH, updates);

    return NextResponse.json({
      success: true,
      persisted: writeResult.written,
      message: writeResult.written
        ? 'Settings and API keys updated successfully in .env.local.'
        : 'Settings updated in runtime memory! Notice: could not persist to /app/.env.local due to server file permissions (EACCES). Run "chmod 666 /app/.env.local" on server to persist permanently across restarts.',
      warning: writeResult.written ? undefined : writeResult.error,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
