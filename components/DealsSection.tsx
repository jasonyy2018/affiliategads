import React from 'react';
import Link from 'next/link';
import { Flame, TrendingDown, ArrowRight } from 'lucide-react';
import ProductImage from '@/components/ProductImage';
import AmazonCTAButton from '@/components/AmazonCTAButton';

export interface DealItem {
  slug: string;
  asin: string;
  title: string;
  brand: string;
  image_url?: string;
  currentPrice: number;
  avgPrice: number;
  dropPctFromAvg: number;
  lastUpdated: string;
}

/**
 * 首页 "Tracked Price Drops" 模块：只渲染真实降价数据（无降价时整个模块隐藏）。
 */
export default function DealsSection({ deals }: { deals: DealItem[] }) {
  if (!deals || deals.length === 0) return null;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight flex items-center gap-2">
            <Flame className="w-6 h-6 text-rose-500" />
            Tracked Price Drops
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Models currently below their tracked average price — updated by our price snapshot engine
          </p>
        </div>
        <span className="text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200">
          {deals.length} Active Drops
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {deals.map((deal) => (
          <div
            key={deal.slug}
            className="bg-white border-2 border-rose-200 rounded-3xl p-5 shadow-sm hover:shadow-md hover:border-rose-400 transition-all flex flex-col sm:flex-row gap-4"
          >
            <div className="w-full sm:w-28 h-28 bg-slate-50 rounded-2xl p-2 flex items-center justify-center border border-slate-100 overflow-hidden flex-shrink-0">
              <ProductImage
                src={deal.image_url}
                alt={deal.title}
                className="max-h-full max-w-full object-contain"
              />
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" />
                  {Math.abs(deal.dropPctFromAvg).toFixed(0)}% below avg
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  as of {deal.lastUpdated}
                </span>
              </div>

              <Link href={`/review/${deal.slug}`} className="block">
                <h3 className="text-sm font-extrabold text-slate-900 hover:text-rose-600 transition line-clamp-2">
                  {deal.title}
                </h3>
              </Link>

              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-slate-950">
                  ${deal.currentPrice.toFixed(2)}
                </span>
                <span className="text-xs text-slate-400 line-through">
                  ${deal.avgPrice.toFixed(2)}
                </span>
                <span className="text-xs font-bold text-emerald-700">save ${(deal.avgPrice - deal.currentPrice).toFixed(2)}</span>
              </div>

              <div className="pt-1">
                <AmazonCTAButton
                  asin={deal.asin}
                  title={deal.title}
                  customText="Check Current Price"
                  size="normal"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
