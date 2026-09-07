/**
 * 页面生命周期监控与剪枝引擎（原 scripts/gsc_monitor.py）
 * 规则：
 *   1. 上线 > 90 天且展现 = 0 → PRUNE（下线，避免拖累全站权重）
 *   2. 上线 > 180 天且展现 < 10 → MERGE（合并到 Hub）
 *   3. 默认 dry-run，--apply 才真正移动文件
 *
 * 数据源：接入 GSC API 前使用页面 generated_at 字段做生命周期基准，
 * 展现数据由 data/gsc_performance.csv 导入（若有）。
 */
import fs from 'fs';
import path from 'path';
import { PAGES_DIR, withLock, readJson, tryWriteReport } from './dataLayer';

const PRUNE_AFTER_DAYS = 90;
const MERGE_AFTER_DAYS = 180;
const LOW_IMPRESSION_THRESHOLD = 10;

interface PageVerdict {
  slug: string;
  ageDays: number;
  impressions90d: number;
  verdict: 'PRUNE' | 'MERGE' | 'KEEP';
}

function loadGscImpressions(): Map<string, number> {
  const map = new Map<string, number>();
  const csvPath = path.join(process.cwd(), 'data', 'gsc_performance.csv');
  if (!fs.existsSync(csvPath)) return map;

  try {
    const lines = fs.readFileSync(csvPath, 'utf-8').split('\n').map((l) => l.trim()).filter(Boolean);
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const urlIdx = headers.findIndex((h) => h.includes('url') || h.includes('page'));
    const impIdx = headers.findIndex((h) => h.includes('impression'));
    if (urlIdx < 0 || impIdx < 0) return map;

    for (const line of lines.slice(1)) {
      const cells = line.split(',');
      const url = cells[urlIdx]?.trim();
      const impressions = parseInt(cells[impIdx]?.trim() || '0', 10) || 0;
      if (url) {
        const slug = url.replace(/\/$/, '').split('/').pop() || '';
        map.set(slug, (map.get(slug) || 0) + impressions);
      }
    }
  } catch {
    // 解析失败按无数据处理
  }
  return map;
}

export interface PruneResult {
  scanned: number;
  pruneCandidates: PageVerdict[];
  mergeCandidates: PageVerdict[];
  applied: number;
}

export async function runGscMonitor(apply = false): Promise<PruneResult> {
  return withLock('gsc_monitor', async () => {
    const impressions = loadGscImpressions();
    const verdicts: PageVerdict[] = [];

    if (fs.existsSync(PAGES_DIR)) {
      for (const file of fs.readdirSync(PAGES_DIR).filter((f) => f.endsWith('.json'))) {
        const slug = file.replace(/\.json$/, '');
        const data = readJson<any>(path.join(PAGES_DIR, file), {});
        const generatedAt = data.generated_at ? new Date(data.generated_at) : null;
        const ageDays = generatedAt && !isNaN(generatedAt.getTime())
          ? Math.max(0, Math.floor((Date.now() - generatedAt.getTime()) / 86400000))
          : 0;

        const impressions90d = impressions.get(slug) ?? 0;

        let verdict: PageVerdict['verdict'] = 'KEEP';
        if (ageDays >= PRUNE_AFTER_DAYS && impressions90d === 0) verdict = 'PRUNE';
        else if (ageDays >= MERGE_AFTER_DAYS && impressions90d < LOW_IMPRESSION_THRESHOLD) verdict = 'MERGE';

        verdicts.push({ slug, ageDays, impressions90d, verdict });
      }
    }

    const pruneCandidates = verdicts.filter((v) => v.verdict === 'PRUNE');
    const mergeCandidates = verdicts.filter((v) => v.verdict === 'MERGE');

    let applied = 0;
    if (apply) {
      const prunedDir = path.join(process.cwd(), 'content', 'pruned_pages');
      for (const v of pruneCandidates) {
        const src = path.join(PAGES_DIR, `${v.slug}.json`);
        if (fs.existsSync(src)) {
          fs.mkdirSync(prunedDir, { recursive: true });
          fs.renameSync(src, path.join(prunedDir, `${v.slug}.json`));
          applied++;
        }
      }
    }

    // 写剪枝日志
    const logLines = [
      '# ✂️ 页面生命周期剪枝日志',
      '',
      `> 生成时间: ${new Date().toISOString()} | 模式: ${apply ? '✅ 已执行剪枝' : '👁 Dry-run 预览'}`,
      '',
      `| 指标 | 数值 |`,
      `|---|---|`,
      `| 扫描页面 | ${verdicts.length} |`,
      `| PRUNE 候选 (90天+零展现) | ${pruneCandidates.length} |`,
      `| MERGE 候选 (180天+低展现) | ${mergeCandidates.length} |`,
      `| 已剪枝 | ${applied} |`,
      '',
      '## 候选清单',
      '',
      ...(pruneCandidates.length
        ? pruneCandidates.map((v) => `- **PRUNE** ${v.slug} (age: ${v.ageDays}d, impressions: ${v.impressions90d})`)
        : ['- 无剪枝候选 — 全站页面健康']),
    ];

    const writeResult = tryWriteReport(
      path.join(process.cwd(), 'reports', 'prune_log.md'),
      logLines.join('\n')
    );

    const summary =
      `GSC 审计完成: 扫描 ${verdicts.length} 页, PRUNE 候选 ${pruneCandidates.length}, MERGE 候选 ${mergeCandidates.length}` +
      (apply ? `, 已剪枝 ${applied}` : ' (dry-run)') +
      (writeResult.ok ? '' : ` [报告写入失败: ${writeResult.error}]`);

    return { scanned: verdicts.length, pruneCandidates, mergeCandidates, applied, summary };
  });
}
