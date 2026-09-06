'use client';

import React, { useState, useEffect } from 'react';
import { ShoppingCart, ExternalLink, Award, X, Zap } from 'lucide-react';
import { trackAmazonOutboundClick } from './GoogleAdsTracker';
import ProductImage from './ProductImage';

interface StickyFloatingBuyBarProps {
  product: {
    asin: string;
    title: string;
    price: number;
    rating?: number;
    review_count?: number;
    image_url?: string;
    brand?: string;
  };
  customText?: string;
}

export default function StickyFloatingBuyBar({
  product,
  customText = 'Check Live Deal on Amazon',
}: StickyFloatingBuyBarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400 && !isDismissed) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isDismissed]);

  if (!product || isDismissed) return null;

  const affiliateTag = process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG || 'jyu0a-20';
  const cleanTitle = (product.title || '').replace(/[^\w\s-]/g, ' ').replace(/\s+/g, ' ').trim();
  const amazonUrl = cleanTitle
    ? `https://www.amazon.com/s?k=${encodeURIComponent(cleanTitle)}&tag=${affiliateTag}`
    : `https://www.amazon.com/dp/${product.asin}?tag=${affiliateTag}`;

  const handleClick = () => {
    trackAmazonOutboundClick(product.asin, product.title);
  };

  return (
    <aside
      aria-label="Current Product Deal"
      className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 transform ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
      }`}
    >
      <div className="bg-slate-950/95 backdrop-blur-md border-t-2 border-amber-500/40 shadow-2xl px-4 py-3 sm:py-3.5 text-white">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 sm:gap-6">
          
          {/* 左侧商品信息预览 */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="relative w-11 h-11 sm:w-13 sm:h-13 bg-white rounded-xl p-1 border border-slate-700 flex-shrink-0 flex items-center justify-center overflow-hidden">
              <ProductImage
                src={product.image_url || ''}
                alt={product.title}
                className="max-h-full max-w-full object-contain"
              />
              <span className="absolute top-0 left-0 bg-amber-500 text-slate-950 p-0.5 rounded-br font-black text-[8px] leading-none">
                #1
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
                  <Award className="w-3 h-3 text-amber-400" />
                  <span>Top Pick</span>
                </span>
                <span className="text-[11px] text-emerald-400 font-bold hidden sm:inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Check Stock on Amazon
                </span>
              </div>

              <h4 className="font-bold text-xs sm:text-sm text-white truncate mt-0.5">
                {product.title}
              </h4>

              <div className="flex items-center gap-2 text-[11px] text-slate-300">
                <span className="font-black text-amber-400 text-sm">
                  ${product.price ? product.price.toFixed(2) : '99.99'}
                </span>
                <span className="hidden sm:inline text-slate-500">•</span>
                <span className="hidden sm:inline text-slate-400">
                  ★ {product.rating || 4.8} ({product.review_count ? product.review_count.toLocaleString() : '5,000'}+ reviews)
                </span>
              </div>
            </div>
          </div>

          {/* 右侧高转化 CTA 按钮组 */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={amazonUrl}
              target="_blank"
              rel="sponsored nofollow noopener"
              onClick={handleClick}
              className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:brightness-110 active:scale-95 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg border border-amber-300 transition group"
            >
              <ShoppingCart className="w-4 h-4 text-slate-950" />
              <div className="flex flex-col text-left leading-none">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-0.5">
                  <Zap className="w-2.5 h-2.5 fill-slate-950" />
                  Prime Delivery
                </span>
                <span>{customText}</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 opacity-75 group-hover:translate-x-0.5 transition" />
            </a>

            <button
              onClick={() => setIsDismissed(true)}
              title="Dismiss floating deal bar"
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </aside>
  );
}
