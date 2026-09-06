import React from 'react';
import { TrendingDown, TrendingUp, Minus, History } from 'lucide-react';

export interface PriceInsight {
  slug: string;
  currentPrice: number;
  lowestPrice: number;
  avgPrice: number;
  isAtLowest: boolean;
  dropPctFromAvg: number;
  lastUpdated: string;
  trend: Array<{ date: string; price: number }>;
}

/**
 * 迷你价格趋势 Sparkline（纯 SVG，30 天窗口）。
 */
export function TrendMiniChart({ trend }: { trend: Array<{ date: string; price: number }> }) {
  if (!trend || trend.length < 2) return null;

  const width = 120;
  const height = 32;
  const prices = trend.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const points = trend
    .map((p, i) => {
      const x = (i / (trend.length - 1)) * width;
      const y = height - ((p.price - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const isDown = prices[prices.length - 1] <= prices[0];
  const stroke = isDown ? '#059669' : '#d97706';

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-[120px] h-8"
      role="img"
      aria-label={`Price trend: ${isDown ? 'declining' : 'rising'} over last ${trend.length} snapshots`}
    >
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * 价格态势徽标：当前价 vs 历史最低/均价。
 * 服务端传入 PriceInsight（由 lib/automation/priceTracker.getPriceInsight 计算）。
 */
export default function PriceHistoryBadge({ insight }: { insight: PriceInsight | null }) {
  if (!insight) return null;

  const { currentPrice, lowestPrice, avgPrice, isAtLowest, dropPctFromAvg, lastUpdated, trend } = insight;

  const isBelowAvg = dropPctFromAvg <= -3;

  return (
    <div
      className={`flex flex-wrap items-center gap-3 px-4 py-3 rounded-2xl border text-xs ${
        isAtLowest
          ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
          : isBelowAvg
            ? 'bg-amber-50/60 border-amber-200 text-amber-900'
            : 'bg-slate-50 border-slate-200 text-slate-700'
      }`}
      itemScope
      itemType="https://schema.org/PriceSpecification"
    >
      <div className="flex items-center gap-2 font-bold">
        {isAtLowest ? (
          <>
            <TrendingDown className="w-4 h-4 text-emerald-600" />
            <span>At tracked low — ${currentPrice.toFixed(2)}</span>
          </>
        ) : isBelowAvg ? (
          <>
            <TrendingDown className="w-4 h-4 text-amber-600" />
            <span>{Math.abs(dropPctFromAvg).toFixed(0)}% below average</span>
          </>
        ) : (
          <>
            <Minus className="w-4 h-4 text-slate-400" />
            <span>${currentPrice.toFixed(2)} — in normal range</span>
          </>
        )}
      </div>

      <TrendMiniChart trend={trend} />

      <div className="flex items-center gap-2 text-[11px] text-slate-500 ml-auto">
        <History className="w-3.5 h-3.5" />
        <span>
          Low ${lowestPrice.toFixed(2)} · Avg ${avgPrice.toFixed(2)} · as of {lastUpdated}
        </span>
      </div>
    </div>
  );
}
