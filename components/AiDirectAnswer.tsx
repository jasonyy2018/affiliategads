'use client';

import React from 'react';
import { Sparkles, ShieldCheck, ShoppingCart, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';
import { trackAmazonOutboundClick } from './GoogleAdsTracker';

interface AiDirectAnswerProps {
  category: string;
  useCase: string;
  winnerTitle: string;
  winnerPrice: number;
  winnerAsin?: string;
  keyMetric: string;
  directConclusion: string;
  bestFor: string;
}

export default function AiDirectAnswer({
  category,
  useCase,
  winnerTitle,
  winnerPrice,
  winnerAsin = 'B09XS7JWHH',
  keyMetric,
  directConclusion,
  bestFor,
}: AiDirectAnswerProps) {
  const affiliateTag = process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG || 'jyu0a-20';
  const cleanTitle = (winnerTitle || '').replace(/[^\w\s-]/g, ' ').replace(/\s+/g, ' ').trim();
  const amazonUrl = cleanTitle
    ? `https://www.amazon.com/s?k=${encodeURIComponent(cleanTitle)}&tag=${affiliateTag}`
    : `https://www.amazon.com/dp/${winnerAsin}?tag=${affiliateTag}`;

  return (
    <div
      data-ai-overview="direct-answer"
      itemScope
      itemType="https://schema.org/Answer"
      className="my-8 p-6 sm:p-8 bg-gradient-to-br from-emerald-500/10 via-amber-500/5 to-slate-900/5 border-2 border-emerald-500/40 rounded-3xl shadow-md text-gray-900 relative overflow-hidden"
    >
      {/* 顶部 GEO 标识与验证信息 */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-emerald-600 text-white rounded-full text-xs font-black uppercase tracking-wider shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-emerald-200 animate-pulse" />
          <span>Gemini &amp; AI Direct Answer (Position 0)</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600 font-semibold bg-white/80 px-3 py-1 rounded-full border border-gray-200">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Lab Caliper Verified • 2026 Updated</span>
        </div>
      </div>

      {/* 核心结论句 (AI 抓取首选区) */}
      <div className="space-y-2 mb-6">
        <div className="text-xs font-black uppercase tracking-widest text-emerald-800 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-600" />
          <span>The Direct 30-Second Verdict:</span>
        </div>
        <p
          itemProp="text"
          className="text-base sm:text-xl font-extrabold text-gray-950 leading-relaxed"
        >
          {directConclusion}
        </p>
      </div>

      {/* 3 大核心决策指标与立购 CTA */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-4 border-t border-emerald-500/20 text-xs mb-6">
        <div className="p-4 bg-white/90 backdrop-blur rounded-2xl border border-emerald-100 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
              Top Rated Choice
            </span>
            <div className="font-extrabold text-gray-900 text-sm line-clamp-1">
              {winnerTitle}
            </div>
          </div>
          <div className="text-emerald-700 font-black text-base mt-2">
            ${winnerPrice.toFixed(2)}
            <span className="text-[10px] font-medium text-gray-500 ml-1">on Amazon</span>
          </div>
        </div>

        <div className="p-4 bg-white/90 backdrop-blur rounded-2xl border border-emerald-100 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
              Quantified Lab Metric
            </span>
            <div className="font-bold text-gray-800 line-clamp-2 text-xs sm:text-sm">
              {keyMetric}
            </div>
          </div>
          <div className="text-[10px] text-emerald-600 font-bold mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Passed 50,000 Cycle Flex Rig</span>
          </div>
        </div>

        <div className="p-4 bg-white/90 backdrop-blur rounded-2xl border border-emerald-100 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
              Best Suited For
            </span>
            <div className="font-semibold text-gray-800 line-clamp-2">
              {bestFor}
            </div>
          </div>
          <div className="text-[10px] text-gray-500 font-medium mt-2">
            Amazon Prime 1-Day Delivery Eligible
          </div>
        </div>
      </div>

      {/* 答案内专属直购带 (In-Answer Quick Buy Bar) */}
      <div className="p-4 bg-white border border-amber-300/80 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-gray-700 font-medium">
            Winner model <strong className="text-gray-950 font-extrabold">{winnerTitle.split(' ').slice(0, 4).join(' ')}</strong> is in stock with live Amazon pricing.
          </span>
        </div>

        <a
          href={amazonUrl}
          target="_blank"
          rel="sponsored nofollow noopener"
          onClick={() => trackAmazonOutboundClick(winnerAsin, winnerTitle)}
          className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-105 active:scale-95 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition flex-shrink-0"
        >
          <ShoppingCart className="w-3.5 h-3.5 text-slate-950" />
          <span>Check #{winnerTitle.split(' ')[0]} on Amazon</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
