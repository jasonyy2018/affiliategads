/**
 * 自动化任务调度中心：统一注册表 + 执行入口。
 * 全部为 TypeScript 原生实现（原 13 个 Python 脚本的等价移植），
 * 无外部进程、无 Python 依赖，可在任何 Next.js 运行环境执行。
 */
import { runEpcTracker } from './epcTracker';
import { runGeoOptimizer } from './geoOptimizer';
import { runSerpTracker } from './serpTracker';
import { runGeminiAudit } from './geminiAudit';
import { runTrustSyndicate } from './trustSyndicate';
import { runBingSubmit } from './bingSubmit';
import { runPseoGenerator } from './pseoGenerator';
import { runContentGenerator } from './contentGenerator';
import { runDailyReport } from './dailyReport';
import { runGscMonitor } from './gscMonitor';
import { runGscSync } from './gscApi';
import { runSocialDispatch } from './socialDispatch';
import { runPriceTracker } from './priceTrackerTask';
import { runImageSync } from './imageSync';
import { runPreLaunchAudit } from './preLaunchAudit';
import { runMatrixOpportunities } from './matrixOpportunities';
import { runProductImport, runMarketRebalance } from './productImport';

export interface TaskResult {
  success: boolean;
  task: string;
  label: string;
  durationMs: number;
  summary: string;
  details?: any;
  error?: string;
}

export interface TaskDefinition {
  label: string;
  description: string;
  run: (opts: any) => Promise<any>;
}

export const TASK_REGISTRY: Record<string, TaskDefinition> = {
  cron_pipeline: {
    label: '每日全自动综合流水线',
    description: 'GSC 拉真数据 → GSC 剪枝 → EPC 归因 → GEO 扫描 → SERP 快照 → 证据链派生 → 日报汇总',
    run: async () => {
      const steps: Array<{ name: string; result: any }> = [];

      // 先拉真实 GSC 数据（未配置服务账号则静默跳过），再让剪枝引擎吃真数据
      const gscSync = await runGscSync({ days: 90 });
      steps.push({ name: 'GSC 数据同步', result: gscSync });

      const gsc = await runGscMonitor(false);
      steps.push({ name: 'GSC 生命周期审计 (dry-run)', result: gsc });

      const epc = await runEpcTracker();
      steps.push({ name: 'EPC 商业归因', result: epc });

      const geo = await runGeoOptimizer();
      steps.push({ name: 'GEO 合规扫描', result: geo });

      const serp = await runSerpTracker();
      steps.push({ name: 'SERP 双引擎快照', result: serp });

      const prices = await runPriceTracker();
      steps.push({ name: '价格快照与降价检测', result: prices });

      const synd = await runTrustSyndicate();
      steps.push({ name: '第三方信任证据链派生', result: synd });

      const report = await runDailyReport();
      steps.push({ name: '每日经营看板', result: report });

      const rebalance = await runMarketRebalance();
      steps.push({ name: '市场需求重排', result: rebalance });

      return { steps, summary: steps.map((s) => `${s.name}: ${s.result.summary || 'OK'}`).join(' | ') };
    },
  },
  epc_tracker: {
    label: '亚马逊联盟订单对账与 EPC 商业归因',
    description: '按 Tracking ID 反推每品类真实 EPC，输出 EXPAND/OPTIMIZE 决策',
    run: () => runEpcTracker(),
  },
  geo_optimizer: {
    label: 'GEO 全站合规扫描 (Princeton KDD 模型)',
    description: '逐页评估 AI 引用就绪度：结论前置/数据点/来源/引述',
    run: () => runGeoOptimizer(),
  },
  serp_tracker: {
    label: 'Google + Bing 双引擎排名快照',
    description: '核心词双引擎排位与 ChatGPT 引用就绪度',
    run: () => runSerpTracker(),
  },
  gemini_audit: {
    label: 'Gemini / AI Overview 引用可见度审计',
    description: '20 大买家疑问 × 证据链匹配度全栈审计',
    run: () => runGeminiAudit(),
  },
  trust_syndicate: {
    label: '跨平台第三方信任证据链派生',
    description: '按疑问库生成 Reddit / Medium / Quora 分发内容',
    run: () => runTrustSyndicate(),
  },
  bing_submit: {
    label: 'Bing Webmaster URL 批量推送',
    description: '全站 URL 一键提交 Bing 收录（需 BING_API_KEY）',
    run: () => runBingSubmit(true),
  },
  gsc_monitor: {
    label: 'Search Console 展现监控与零展现剪枝',
    description: '90 天零展现剪枝 / 180 天低展现合并审计（数据源 data/gsc_performance.csv，可由 gsc_sync 拉取）',
    run: () => runGscMonitor(false),
  },
  gsc_sync: {
    label: 'Google Search Console 数据同步 + sitemap 提交',
    description: '服务账号拉取近 90 天真实点击/展现/排名写回 gsc_performance.csv，并 best-effort 提交 sitemap（需 GSC_SERVICE_ACCOUNT_JSON/_PATH）',
    run: () => runGscSync({ days: 90 }),
  },
  pseo_generate: {
    label: 'pSEO 矩阵对比页批量构建',
    description: '品类×场景×价格带矩阵生成，每页≥3 商品硬约束',
    run: (opts) => runPseoGenerator({ limit: opts?.limit ?? 50, apply: opts?.apply ?? false, useAi: opts?.useAi ?? false }),
  },
  content_generate: {
    label: '单品 AI 评测内容生成',
    description: '为 products.json 生成结构化评测 (AI 或数据驱动模板)',
    run: (opts) => runContentGenerator({ slug: opts?.slug, all: opts?.all ?? false, useAi: opts?.useAi ?? false }),
  },
  daily_report: {
    label: '每日经营看板生成',
    description: '汇总全部模块报告为一张决策日报',
    run: () => runDailyReport(),
  },
  social_dispatch: {
    label: '全网社媒一键广播与中继分发',
    description: 'syndicate 内容卡片批量推送 Webhook (Make.com/Zapier)',
    run: () => runSocialDispatch(true),
  },
  price_tracker: {
    label: '价格快照采集与降价检测',
    description: 'PA-API 实时价采集 → 历史曲线 → 降价提醒（未配置 PA-API 时建立基线）',
    run: () => runPriceTracker(),
  },
  image_sync: {
    label: '商品官方图同步',
    description: 'PA-API 拉取 Amazon 官方商品图，替换 Unsplash 占位图',
    run: () => runImageSync(),
  },
  prelaunch_audit: {
    label: '上线预检',
    description: '10 项部署前检查：域名/密钥/内容/收录/合规/邮件',
    run: () => runPreLaunchAudit(),
  },
  matrix_opportunities: {
    label: 'pSEO 矩阵扩产机会分析',
    description: '扫描 READY/GAP 组合，数据驱动扩产决策（输出 reports/matrix_opportunities.md）',
    run: () => runMatrixOpportunities(),
  },
  product_import: {
    label: '批量导入商品 (CSV)',
    description: '粘贴 asin/价格/佣金率/品类 CSV → 去重入库 + 自动补内容 + 市场重排（无需 API）',
    run: (opts) => runProductImport(typeof opts?.csv === 'string' ? opts.csv : ''),
  },
  market_rebalance: {
    label: '市场需求重排 (无 API)',
    description: '按 利润×需求×季节 给全库商品重新打分，输出主推/补缺/剪枝行动清单（reports/market_rebalance.md）',
    run: () => runMarketRebalance(),
  },
};

export async function executeTask(taskKey: string, opts?: any): Promise<TaskResult> {
  const startTime = Date.now();
  const def = TASK_REGISTRY[taskKey];

  if (!def) {
    return {
      success: false,
      task: taskKey,
      label: 'Unknown',
      durationMs: 0,
      summary: '',
      error: `Unknown task "${taskKey}". Available: ${Object.keys(TASK_REGISTRY).join(', ')}`,
    };
  }

  try {
    const result = await def.run(opts || {});
    return {
      success: true,
      task: taskKey,
      label: def.label,
      durationMs: Date.now() - startTime,
      summary: result.summary || `${def.label} 完成`,
      details: result,
    };
  } catch (e: any) {
    return {
      success: false,
      task: taskKey,
      label: def.label,
      durationMs: Date.now() - startTime,
      summary: '',
      error: e?.message || String(e),
    };
  }
}
