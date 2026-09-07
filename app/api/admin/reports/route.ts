import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { isAuthorized, unauthorized } from '@/lib/adminAuth';

function readSafe(filePath: string): string {
  if (fs.existsSync(filePath)) {
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch {
      return '';
    }
  }
  return '';
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) return unauthorized();

  const reportsDir = path.join(process.cwd(), 'reports');
  const contentDir = path.join(process.cwd(), 'content');
  const dataDir = path.join(process.cwd(), 'data');

  // 读取各类经营报告
  const dailyReport = readSafe(path.join(reportsDir, 'daily_report.md'));
  const geminiAudit = readSafe(path.join(reportsDir, 'gemini_citation_audit.md'));
  const epcReport = readSafe(path.join(reportsDir, 'epc_ranking.md'));
  const geoAudit = readSafe(path.join(reportsDir, 'geo_audit.md'));
  const rankReport = readSafe(path.join(reportsDir, 'rank_history.md'));
  const pruneReport = readSafe(path.join(reportsDir, 'prune_log.md'));
  const socialReport = readSafe(path.join(reportsDir, 'social_dispatch_report.md'));
  const bingReport = readSafe(path.join(reportsDir, 'bing_submission_report.md'));
  const matrixReport = readSafe(path.join(reportsDir, 'matrix_opportunities.md'));

  // 统计已生成 pSEO 页面数
  const pagesDir = path.join(contentDir, 'pages');
  const pageCount = fs.existsSync(pagesDir)
    ? fs.readdirSync(pagesDir).filter((f) => f.endsWith('.json')).length
    : 0;

  // 统计第三方证据链资产数
  const syndicateDir = path.join(contentDir, 'syndicate');
  let redditCount = 0;
  let mediumCount = 0;
  let quoraCount = 0;

  if (fs.existsSync(syndicateDir)) {
    const redditDir = path.join(syndicateDir, 'reddit');
    const mediumDir = path.join(syndicateDir, 'medium');
    const quoraDir = path.join(syndicateDir, 'quora');

    if (fs.existsSync(redditDir)) redditCount = fs.readdirSync(redditDir).filter((f) => f.endsWith('.md')).length;
    if (fs.existsSync(mediumDir)) mediumCount = fs.readdirSync(mediumDir).filter((f) => f.endsWith('.md')).length;
    if (fs.existsSync(quoraDir)) quoraCount = fs.readdirSync(quoraDir).filter((f) => f.endsWith('.md')).length;
  }

  // 读取买家留资数据
  const leadsFile = path.join(dataDir, 'leads.json');
  let leads: any[] = [];
  if (fs.existsSync(leadsFile)) {
    try {
      leads = JSON.parse(fs.readFileSync(leadsFile, 'utf-8'));
    } catch {
      leads = [];
    }
  }

  return NextResponse.json({
    success: true,
    pageCount,
    reports: {
      dailyReport,
      geminiAudit,
      epcReport,
      geoAudit,
      rankReport,
      pruneReport,
      socialReport,
      bingReport,
      matrixReport,
    },
    syndicateStats: {
      reddit: redditCount,
      medium: mediumCount,
      quora: quoraCount,
      total: redditCount + mediumCount + quoraCount,
    },
    leads: {
      total: leads.length,
      list: leads,
    },
  });
}
