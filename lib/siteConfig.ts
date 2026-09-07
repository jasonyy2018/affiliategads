import fs from 'fs';
import path from 'path';

export const SETTINGS_JSON_PATH = path.join(process.cwd(), 'data', 'settings.json');
export const ENV_LOCAL_PATH = path.join(process.cwd(), '.env.local');

// 生产环境默认官方绑定域名 (永不使用 localhost 作为生产兜底)
export const DEFAULT_PRODUCTION_DOMAIN = 'https://aads.togomol.com';

export function parseEnvFile(filePath: string): Record<string, string> {
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
    console.warn(`[SiteConfig] Notice: could not read ${filePath} (${err.message}).`);
  }
  return result;
}

/**
 * 统一加载系统设置：
 * 1. .env.local
 * 2. data/settings.json (持久化文件数据库，最高权威)
 * 3. process.env
 * 并自动同步回写到当前进程的 process.env 中，确保全局各模块一致。
 */
export function loadMergedSettings(): Record<string, string> {
  const result: Record<string, string> = {};

  // 1. 读取 .env.local
  const fileEnvs = parseEnvFile(ENV_LOCAL_PATH);
  Object.assign(result, fileEnvs);

  // 2. 读取持久化文件数据库 data/settings.json (宿主机 ./data 映射，重启永不丢失)
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
    console.warn(`[SiteConfig DB] Notice: could not read ${SETTINGS_JSON_PATH}:`, err.message);
  }

  // 3. 补充 process.env
  for (const [k, v] of Object.entries(process.env)) {
    if (v && !result[k]) {
      result[k] = v;
    }
  }

  // 自动将配置同步回 process.env
  for (const [k, v] of Object.entries(result)) {
    if (v && !process.env[k]) {
      process.env[k] = v;
    }
  }

  return result;
}

/**
 * 智能获取网站当前生效的基准 URL (Site URL)：
 * 支持多层智能识别与绑定域名自动解析：
 *
 * 优先级：
 * 1. 显式传入的 requestHost (从 HTTP 请求标头 Host / X-Forwarded-Host 中自动识别提取)
 * 2. data/settings.json 中已配置的 NEXT_PUBLIC_SITE_URL
 * 3. 环境变量 process.env.NEXT_PUBLIC_SITE_URL
 * 4. 若为生产环境 (NODE_ENV === 'production' 或 Docker 容器环境)，默认直接返回 DEFAULT_PRODUCTION_DOMAIN (https://aads.togomol.com)
 * 5. 仅在本地开发环境且无任何配置时，才回退到 http://localhost:3000
 */
export function getSiteUrl(requestHost?: string | null, requestProto?: string | null): string {
  // 1. 若传入了 HTTP 请求的 Host 标头且非本地回环地址，自动识别为绑定域名
  if (requestHost) {
    const cleanHost = requestHost.trim().split(':')[0]; // 去掉端口
    if (
      cleanHost &&
      cleanHost !== 'localhost' &&
      cleanHost !== '127.0.0.1' &&
      cleanHost !== '0.0.0.0'
    ) {
      const proto = requestProto === 'http' ? 'http' : 'https';
      return `${proto}://${cleanHost}`;
    }
  }

  // 2. 读取已保存设置
  const settings = loadMergedSettings();
  const configuredUrl = (settings['NEXT_PUBLIC_SITE_URL'] || process.env.NEXT_PUBLIC_SITE_URL || '').trim();

  // 若配置的 URL 有效且非 localhost，直接采用
  if (configuredUrl && !configuredUrl.includes('localhost') && !configuredUrl.includes('127.0.0.1')) {
    return configuredUrl.replace(/\/+$/, '');
  }

  // 3. 生产环境严格禁用 localhost 兜底
  const isProduction = process.env.NODE_ENV === 'production' || process.env.PORT === '3000';
  if (isProduction) {
    return DEFAULT_PRODUCTION_DOMAIN;
  }

  // 4. 本地开发环境回退
  return configuredUrl || 'http://localhost:3000';
}

/**
 * 自动感知并持久化识别到的用户绑定域名：
 * 当用户通过自定义域名 (如 aads.togomol.com) 访问后台或触发接口时，
 * 自动检测当前域名，若尚未配置或当前仍为 localhost，则自动将其保存为系统正式域名。
 */
export function autoDetectAndSaveSiteUrl(hostHeader?: string | null, protoHeader?: string | null): string {
  if (!hostHeader) return getSiteUrl();

  const cleanHost = hostHeader.trim().split(':')[0];
  if (
    !cleanHost ||
    cleanHost === 'localhost' ||
    cleanHost === '127.0.0.1' ||
    cleanHost === '0.0.0.0'
  ) {
    return getSiteUrl();
  }

  const proto = protoHeader === 'http' ? 'http' : 'https';
  const detectedUrl = `${proto}://${cleanHost}`;

  const current = (process.env.NEXT_PUBLIC_SITE_URL || '').trim();
  const needsUpdate = !current || current.includes('localhost') || current.includes('127.0.0.1');

  if (needsUpdate) {
    try {
      let dbSettings: Record<string, string> = {};
      if (fs.existsSync(SETTINGS_JSON_PATH)) {
        dbSettings = JSON.parse(fs.readFileSync(SETTINGS_JSON_PATH, 'utf-8'));
      }
      dbSettings['NEXT_PUBLIC_SITE_URL'] = detectedUrl;
      fs.writeFileSync(SETTINGS_JSON_PATH, JSON.stringify(dbSettings, null, 2), 'utf-8');
      process.env.NEXT_PUBLIC_SITE_URL = detectedUrl;
      console.log(`[SiteConfig] Auto-detected and bound site domain: ${detectedUrl}`);
    } catch (err: any) {
      console.warn(`[SiteConfig] Could not auto-save detected site URL:`, err.message);
    }
  }

  return detectedUrl;
}
