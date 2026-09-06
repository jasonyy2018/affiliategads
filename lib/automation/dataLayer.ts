/**
 * 数据访问层：统一读写 data/ 与 content/ 下的 JSON 资产。
 * 带进程内写锁，防止并发读-改-写互相覆盖。
 */
import fs from 'fs';
import path from 'path';

export const DATA_DIR = path.join(process.cwd(), 'data');
export const CONTENT_DIR = path.join(process.cwd(), 'content');
export const PAGES_DIR = path.join(CONTENT_DIR, 'pages');
export const REPORTS_DIR = path.join(process.cwd(), 'reports');
export const SYNDICATE_DIR = path.join(CONTENT_DIR, 'syndicate');

export function readJson<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  // 原子写：先写临时文件再 rename，避免半写状态
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, filePath);
}

// ---------- 进程内互斥锁 ----------
const locks = new Map<string, Promise<unknown>>();

/**
 * 串行化执行：同一 key 的操作排队执行，避免并发读-改-写。
 */
export async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(key) || Promise.resolve();
  const next = prev.then(fn, fn);
  locks.set(key, next);
  try {
    return await next;
  } finally {
    if (locks.get(key) === next) locks.delete(key);
  }
}

// ---------- 领域数据 ----------

export interface Product {
  asin: string;
  title: string;
  brand: string;
  price: number;
  commission_rate: number;
  category: string;
  use_cases: string[];
  specs: Record<string, any>;
  rating: number;
  review_count: number;
  image_url: string;
  affiliate_tag?: string;
  highlight?: string;
  lab_test_quote?: string;
  user_quote?: string;
  slug: string;
}

export function loadProducts(): Product[] {
  return readJson<Product[]>(path.join(DATA_DIR, 'products.json'), []);
}

export function saveProducts(products: Product[]): void {
  writeJson(path.join(DATA_DIR, 'products.json'), products);
}

export interface MatrixData {
  categories: string[];
  use_cases: string[];
  price_bands: Array<{ label: string; min: number; max: number }>;
  excluded_combinations: Array<{ category: string; use_case: string }>;
}

export function loadMatrix(): MatrixData {
  return readJson<MatrixData>(path.join(DATA_DIR, 'matrix.json'), {
    categories: [],
    use_cases: [],
    price_bands: [],
    excluded_combinations: [],
  });
}

export function loadTrackingIds(): Record<string, string> {
  const data = readJson<{ categories?: Record<string, string>; default?: string }>(
    path.join(DATA_DIR, 'tracking_ids.json'),
    {}
  );
  return data.categories || { default: data.default || 'jyu0a-20' };
}

export interface GeoQuestion {
  id: string;
  category: string;
  question: string;
  target_slug: string;
  winning_product: string;
  direct_verdict: string;
  key_metric: string;
  best_for: string;
}

export function loadGeoQuestions(): GeoQuestion[] {
  return readJson<GeoQuestion[]>(path.join(DATA_DIR, 'geo_questions.json'), []);
}

export function loadTargetKeywords(): string[] {
  try {
    const p = path.join(DATA_DIR, 'target_keywords.txt');
    if (!fs.existsSync(p)) return [];
    return fs
      .readFileSync(p, 'utf-8')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

// ---------- 报告 ----------

export function writeReport(filename: string, content: string): string {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const filePath = path.join(REPORTS_DIR, filename);
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

export function readReport(filename: string): string {
  try {
    const p = path.join(REPORTS_DIR, filename);
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : '';
  } catch {
    return '';
  }
}

export function countFiles(dir: string, ext: string): number {
  try {
    if (!fs.existsSync(dir)) return 0;
    return fs.readdirSync(dir).filter((f) => f.endsWith(ext)).length;
  } catch {
    return 0;
  }
}
