'use client';

import React from 'react';
import { ShoppingCart, ExternalLink, ShieldCheck, Zap, Check } from 'lucide-react';
import { trackAmazonOutboundClick } from './GoogleAdsTracker';

interface AmazonCTAButtonProps {
  asin: string;
  title: string;
  customText?: string;
  size?: 'normal' | 'large' | 'floating';
  className?: string;
}

export default function AmazonCTAButton({
  asin,
  title,
  customText = 'Check Live Price on Amazon',
  size = 'large',
  className = '',
}: AmazonCTAButtonProps) {
  const affiliateTag = process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG || 'jyu0a-20';
  
  // 清理商品标题中的特殊符号，构建高可用 Amazon 精准匹配搜索链接
  const cleanTitle = (title || '')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  const amazonUrl = cleanTitle
    ? `https://www.amazon.com/s?k=${encodeURIComponent(cleanTitle)}&tag=${affiliateTag}`
    : `https://www.amazon.com/dp/${asin}?tag=${affiliateTag}`;

  const handleClick = () => {
    trackAmazonOutboundClick(asin, title);
  };

  if (size === 'floating') {
    return (
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-slate-950/90 backdrop-blur-md border-t border-slate-800 z-50 md:hidden shadow-2xl">
        <a
          href={amazonUrl}
          target="_blank"
          rel="sponsored nofollow noopener"
          onClick={handleClick}
          className="flex items-center justify-between w-full py-3 px-4 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black rounded-xl shadow-lg active:scale-[0.98] transition duration-150"
        >
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-slate-950" />
            <div className="flex flex-col text-left leading-none">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-900">
                Prime Delivery Available
              </span>
              <span className="text-sm">Check Live Price &amp; Stock</span>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 opacity-80" />
        </a>
      </div>
    );
  }

  const sizeClasses =
    size === 'large'
      ? 'py-4 px-8 text-base sm:text-lg font-black shadow-lg hover:shadow-xl'
      : 'py-3 px-6 text-sm sm:text-base font-bold shadow-md hover:shadow-lg';

  return (
    <div className={`inline-flex flex-col items-center gap-2 w-full sm:w-auto ${className}`}>
      <a
        href={amazonUrl}
        target="_blank"
        rel="sponsored nofollow noopener"
        onClick={handleClick}
        className={`group relative overflow-hidden flex items-center justify-center gap-3 w-full sm:w-auto text-slate-950 bg-gradient-to-r from-[#F7DF94] via-[#F3A847] to-[#EE9B32] hover:brightness-105 border-2 border-[#A88734]/80 rounded-2xl transition-all transform active:scale-95 duration-150 shadow-md hover:shadow-amber-500/20 ${sizeClasses}`}
      >
        <span className="absolute inset-0 w-1/2 h-full bg-white/20 skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-700 ease-out pointer-events-none" />
        
        <ShoppingCart className="w-5 h-5 text-slate-950 flex-shrink-0" />
        
        <div className="flex flex-col items-start text-left leading-tight">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-900">
            <span className="px-1.5 py-0.2 bg-slate-950 text-amber-300 rounded font-black text-[9px] flex items-center gap-0.5">
              <Zap className="w-2.5 h-2.5 fill-amber-300" />
              prime
            </span>
            <span>Free Delivery &amp; Returns</span>
          </div>
          <span className="font-extrabold text-slate-950">{customText}</span>
        </div>

        <ExternalLink className="w-4 h-4 text-slate-900 opacity-75 group-hover:translate-x-0.5 transition flex-shrink-0 ml-1" />
      </a>

      {/* 官方信任与背书微标 */}
      <div className="flex items-center gap-3 text-[11px] text-gray-500 font-medium">
        <div className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Official Amazon Store</span>
        </div>
        <span>•</span>
        <div className="flex items-center gap-1 text-emerald-700 font-semibold">
          <Check className="w-3.5 h-3.5" />
          <span>Live Price on Amazon</span>
        </div>
      </div>
    </div>
  );
}
