import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { isAuthorized, unauthorized } from '@/lib/adminAuth';

const SETTINGS_JSON_PATH = path.join(process.cwd(), 'data', 'settings.json');
const ENV_LOCAL_PATH = path.join(process.cwd(), '.env.local');

function parseEnvFile(filePath: string): Record<string, string> {
  const result: Record<string, string> = {};
  try {
    if (!fs.existsSync(/*turbopackIgnore: true*/ filePath)) return result;
    const content = fs.readFileSync(/*turbopackIgnore: true*/ filePath, 'utf-8');
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const [key, ...rest] = trimmed.split('=');
      result[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '');
    }
  } catch (err: any) {
    console.warn(`[Settings] Notice: could not read ${filePath} (${err.message}).`);
  }
  return result;
}

/**
 * 统一合并系统设置：优先读取持久化数据库 data/settings.json（宿主机 ./data 映射，永不丢失），
 * 次之读取 .env.local 与 process.env 作为底座。
 */
function loadMergedSettings(): Record<string, string> {
  const result: Record<string, string> = {};

  // 1. 读取 .env.local
  const fileEnvs = parseEnvFile(ENV_LOCAL_PATH);
  Object.assign(result, fileEnvs);

  // 2. 读取持久化文件数据库 data/settings.json (宿主已做 ./data 映射，最高权威，重启永不丢失)
  try {
    if (fs.existsSync(/*turbopackIgnore: true*/ SETTINGS_JSON_PATH)) {
      const content = fs.readFileSync(/*turbopackIgnore: true*/ SETTINGS_JSON_PATH, 'utf-8');
      const dbSettings = JSON.parse(content);
      for (const [k, v] of Object.entries(dbSettings)) {
        if (typeof v === 'string' && v.trim()) {
          result[k] = v.trim();
        }
      }
    }
  } catch (err: any) {
    console.warn(`[Settings DB] Notice: could not read ${SETTINGS_JSON_PATH}:`, err.message);
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
    if (fs.existsSync(/*turbopackIgnore: true*/ filePath)) {
      content = fs.readFileSync(/*turbopackIgnore: true*/ filePath, 'utf-8');
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

    fs.writeFileSync(/*turbopackIgnore: true*/ filePath, lines.join('\n'), 'utf-8');
    return { written: true };
  } catch (err: any) {
    console.warn(`[Settings] Notice: could not write to ${filePath} (${err.code || err.message}).`);
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

  const merged = loadMergedSettings();

  const anthropicKey = merged['ANTHROPIC_API_KEY'] || process.env.ANTHROPIC_API_KEY || '';
  const openaiKey = merged['OPENAI_API_KEY'] || process.env.OPENAI_API_KEY || '';
  const amazonTag = merged['NEXT_PUBLIC_AMAZON_AFFILIATE_TAG'] || process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG || 'yourtag-20';
  const gaId = merged['NEXT_PUBLIC_GA_CONVERSION_ID'] || process.env.NEXT_PUBLIC_GA_CONVERSION_ID || 'AW-17885747857';
  const gaLabel = merged['NEXT_PUBLIC_GA_CONVERSION_LABEL'] || process.env.NEXT_PUBLIC_GA_CONVERSION_LABEL || '';
  const defaultModel = merged['AI_MODEL_CHOICE'] || process.env.AI_MODEL_CHOICE || 'auto';

  // 第三方自定义 API 配置
  const customBaseUrl = merged['CUSTOM_AI_BASE_URL'] || process.env.CUSTOM_AI_BASE_URL || '';
  const customApiKey = merged['CUSTOM_AI_API_KEY'] || process.env.CUSTOM_AI_API_KEY || '';
  const customModel = merged['CUSTOM_AI_MODEL'] || process.env.CUSTOM_AI_MODEL || 'deepseek-chat';
  const customProtocol = merged['CUSTOM_AI_PROTOCOL'] || process.env.CUSTOM_AI_PROTOCOL || 'openai';

  // 搜索引擎与收录
  const bingApiKey = merged['BING_API_KEY'] || process.env.BING_API_KEY || '';
  const siteUrl = merged['NEXT_PUBLIC_SITE_URL'] || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  // 社媒广播与 Webhook 中继
  const socialWebhookUrl = merged['SOCIAL_WEBHOOK_URL'] || process.env.SOCIAL_WEBHOOK_URL || '';
  const ayrshareApiKey = merged['AYRSHARE_API_KEY'] || process.env.AYRSHARE_API_KEY || '';

  // 安全门禁密码
  const adminSecretKey = merged['ADMIN_SECRET_KEY'] || process.env.ADMIN_SECRET_KEY || 'opc2026';

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

    // 1. 持久化存储到系统数据库 data/settings.json（宿主机 ./data 已挂载映射，永不丢失）
    let dbSaved = false;
    try {
      let existingDb: Record<string, any> = {};
      if (fs.existsSync(/*turbopackIgnore: true*/ SETTINGS_JSON_PATH)) {
        try {
          existingDb = JSON.parse(fs.readFileSync(/*turbopackIgnore: true*/ SETTINGS_JSON_PATH, 'utf-8'));
        } catch {
          existingDb = {};
        }
      }
      const newDb = { ...existingDb, ...updates };
      fs.mkdirSync(path.dirname(SETTINGS_JSON_PATH), { recursive: true });
      fs.writeFileSync(/*turbopackIgnore: true*/ SETTINGS_JSON_PATH, JSON.stringify(newDb, null, 2), 'utf-8');
      dbSaved = true;
    } catch (dbErr: any) {
      console.error('[Settings DB] Error saving to data/settings.json:', dbErr.message);
    }

    // 2. 双写同步到本地 .env.local 文件
    const writeResult = updateEnvFile(ENV_LOCAL_PATH, updates);

    return NextResponse.json({
      success: true,
      persisted: dbSaved || writeResult.written,
      message: dbSaved
        ? '配置已成功持久化保存至系统数据库 (data/settings.json) 并同步更新环境，容器重启永不丢失。'
        : '配置已更新至运行内存。',
      warning: dbSaved ? undefined : writeResult.error,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
