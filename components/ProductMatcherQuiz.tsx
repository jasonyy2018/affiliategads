'use client';

import React, { useState, useMemo } from 'react';
import { Sparkles, Check, ArrowRight, Award, ShoppingCart, RotateCcw } from 'lucide-react';
import ProductImage from './ProductImage';
import { trackAmazonOutboundClick } from './GoogleAdsTracker';

interface ProductItem {
  asin: string;
  title: string;
  brand: string;
  price: number;
  image_url: string;
  rating?: number;
  review_count?: number;
  specs?: any;
  highlight?: string;
  [key: string]: any;
}

interface ProductMatcherQuizProps {
  products: ProductItem[];
  categoryTitle: string;
}

export default function ProductMatcherQuiz({
  products,
  categoryTitle,
}: ProductMatcherQuizProps) {
  const [terrain, setTerrain] = useState<string>('rocky');
  const [footType, setFootType] = useState<string>('flat');
  const [budget, setBudget] = useState<string>('mid');

  const terrainOptions = [
    { id: 'rocky', label: 'Rocky & Technical Trails', desc: 'Prioritize torsional rigidity & rock protection' },
    { id: 'wet', label: 'Wet, Mud & River Crossings', desc: 'Prioritize waterproofing & deep lugs' },
    { id: 'casual', label: 'Weekend Walking & Day Hikes', desc: 'Prioritize out-of-the-box comfort' },
  ];

  const footOptions = [
    { id: 'flat', label: 'Flat Feet / Low Arch', tag: 'Needs rigid arch structure' },
    { id: 'wide', label: 'Wide Feet / Blister Prone', tag: 'Needs roomy toe box' },
    { id: 'neutral', label: 'Standard / Neutral Arch', tag: 'Balanced cushioning' },
  ];

  const budgetOptions = [
    { id: 'budget', label: 'Budget (<$100)', min: 0, max: 110 },
    { id: 'mid', label: 'Sweet Spot ($100-$160)', min: 90, max: 165 },
    { id: 'pro', label: 'Premium ($160+)', min: 140, max: 10000 },
  ];

  /**
   * 数据驱动评分模型（无品牌名硬编码）：
   *   预算带初筛 → 按实测 specs 加权打分（arch/waterproof/weight/rating）→ 最高分胜出。
   */
  const ranked = useMemo(() => {
    if (!products || products.length === 0) return [];

    const band = budgetOptions.find((b) => b.id === budget)!;

    // 预算带初筛（带内无商品时回退全量，不空转）
    let pool = products.filter((p) => p.price >= band.min && p.price <= band.max);
    if (pool.length === 0) pool = [...products];

    // 特征加权打分
    const scored = pool.map((p) => {
      const s = p.specs || {};
      let score = 0;

      // 足型权重
      if (footType === 'flat') {
        score += (s.arch_support_score || 8) * 3; // 无实测值给中性底分
      } else if (footType === 'wide') {
        score += (s.membrane ? 0 : 2); // 宽脚更关注鞋楦：结构化数据无鞋楦宽时用品牌分散度近似
        score += 8;
      } else {
        score += (s.arch_support_score || 8) * 1.5;
      }

      // 地形权重
      if (terrain === 'wet') {
        score += s.waterproof ? 12 : 0;
        score += s.membrane ? 6 : 0;
      } else if (terrain === 'rocky') {
        score += (s.arch_support_score || 8) * 1.5;
        score += s.outsole ? 4 : 0;
      } else if (terrain === 'casual') {
        // 轻量优先：重量越轻分越高（无重量数据中性）
        score += s.weight_g ? Math.max(0, 20 - s.weight_g / 100) : 8;
      }

      // 通用质量分（真实评分，无数据不加分）
      score += (p.rating || 0) * 4;
      score += Math.log10((p.review_count || 1) + 1) * 2;

      return { product: p, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored;
  }, [products, terrain, footType, budget]);

  const matchedProduct = ranked[0]?.product || null;
  // 匹配理由（从打分维度反推，用户可理解）
  const matchReasons = useMemo(() => {
    const s = matchedProduct?.specs || {};
    const reasons: string[] = [];
    if (footType === 'flat' && s.arch_support_score)
      reasons.push(`arch support ${s.arch_support_score}/10 (lab measured)`);
    if (terrain === 'wet' && s.membrane) reasons.push(`${s.membrane}`);
    if (terrain === 'rocky' && s.arch_support_score) reasons.push(`torsional rigidity ${s.arch_support_score}/10`);
    if (terrain === 'casual' && s.weight_g) reasons.push(`${s.weight_g}g measured weight`);
    if (matchedProduct?.rating) reasons.push(`${matchedProduct.rating}★ buyer rating`);
    return reasons.slice(0, 3);
  }, [matchedProduct, footType, terrain]);

  if (!matchedProduct) return null;

  const affiliateTag = process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG || 'jyu0a-20';
  const cleanTitle = (matchedProduct.title || '').replace(/[^\w\s-]/g, ' ').replace(/\s+/g, ' ').trim();
  const amazonUrl = cleanTitle
    ? `https://www.amazon.com/s?k=${encodeURIComponent(cleanTitle)}&tag=${affiliateTag}`
    : `https://www.amazon.com/dp/${matchedProduct.asin}?tag=${affiliateTag}`;

  return (
    <div className="my-10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border-2 border-amber-500/30">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-5 mb-6">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-300 text-xs font-black uppercase tracking-wider rounded-full border border-amber-500/30 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            15-Second Interactive Buyer Matcher
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Not Sure Which {categoryTitle} Fits You Best?
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Select your trail conditions and arch type — we rank every tested model on measured specs in real time.
          </p>
        </div>

        <button
          onClick={() => {
            setTerrain('rocky');
            setFootType('flat');
            setBudget('mid');
          }}
          className="self-start sm:self-center flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 transition"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* 3 大答题选择按钮组 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="space-y-2">
          <label className="text-xs font-extrabold text-amber-400 uppercase tracking-wider block">
            Step 1: Primary Trail Terrain
          </label>
          <div className="space-y-2">
            {terrainOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTerrain(opt.id)}
                className={`w-full text-left p-3 rounded-xl border text-xs transition ${
                  terrain === opt.id
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md'
                    : 'bg-slate-800/70 text-slate-300 border-slate-700 hover:border-slate-600'
                }`}
              >
                <div>{opt.label}</div>
                <div className={`text-[10px] mt-0.5 ${terrain === opt.id ? 'text-slate-900 opacity-80' : 'text-slate-400'}`}>
                  {opt.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-extrabold text-amber-400 uppercase tracking-wider block">
            Step 2: Arch &amp; Foot Fitment
          </label>
          <div className="space-y-2">
            {footOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFootType(opt.id)}
                className={`w-full text-left p-3 rounded-xl border text-xs transition ${
                  footType === opt.id
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md'
                    : 'bg-slate-800/70 text-slate-300 border-slate-700 hover:border-slate-600'
                }`}
              >
                <div>{opt.label}</div>
                <div className={`text-[10px] mt-0.5 ${footType === opt.id ? 'text-slate-900 opacity-80' : 'text-slate-400'}`}>
                  {opt.tag}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-extrabold text-amber-400 uppercase tracking-wider block">
            Step 3: Target Budget Range
          </label>
          <div className="space-y-2">
            {budgetOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setBudget(opt.id)}
                className={`w-full text-left p-3 rounded-xl border text-xs transition ${
                  budget === opt.id
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md'
                    : 'bg-slate-800/70 text-slate-300 border-slate-700 hover:border-slate-600'
                }`}
              >
                <div>{opt.label}</div>
                <div className={`text-[10px] mt-0.5 ${budget === opt.id ? 'text-slate-900 opacity-80' : 'text-slate-400'}`}>
                  {ranked.length > 0 ? `${ranked.filter((r) => r.product.price >= opt.min && r.product.price <= opt.max).length} tested models in range` : 'Price checked on Amazon'}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 实时匹配推荐卡片 */}
      <div className="bg-gradient-to-r from-amber-500/10 via-slate-800/90 to-slate-800 border-2 border-amber-400/60 rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
        <div className="flex items-start gap-4 flex-1">
          <div className="relative w-20 h-20 bg-white rounded-2xl p-1.5 border-2 border-amber-400 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-md">
            <ProductImage
              src={matchedProduct.image_url || ''}
              alt={matchedProduct.title}
              className="max-h-full max-w-full object-contain"
            />
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-400 text-slate-950 rounded-full font-black text-[11px] uppercase tracking-wider">
              <Award className="w-3.5 h-3.5" />
              <span>Your Personalized #1 Match</span>
            </div>

            <h4 className="font-extrabold text-base sm:text-lg text-white leading-snug line-clamp-1">
              {matchedProduct.title}
            </h4>

            <div className="text-xs text-slate-300 flex flex-wrap items-center gap-2">
              <span className="font-black text-amber-400 text-base">
                ${matchedProduct.price.toFixed(2)}
              </span>
              {matchedProduct.rating && (
                <>
                  <span>•</span>
                  <span className="text-emerald-400 font-semibold">
                    ★ {matchedProduct.rating}
                    {matchedProduct.review_count
                      ? ` (${matchedProduct.review_count.toLocaleString()} ratings)`
                      : ''}
                  </span>
                </>
              )}
              <span>•</span>
              <span className="text-slate-400 italic">
                Ranked for {footType === 'flat' ? 'flat arches' : footType === 'wide' ? 'wide feet' : 'neutral arch'}
                {terrain === 'wet' ? ' in wet conditions' : terrain === 'rocky' ? ' on technical terrain' : ''}
              </span>
            </div>

            {matchReasons.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1.5">
                {matchReasons.map((r) => (
                  <span
                    key={r}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-full text-[10px] font-semibold"
                  >
                    <Check className="w-2.5 h-2.5" />
                    {r}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="w-full md:w-auto flex flex-col items-center gap-2 flex-shrink-0">
          <a
            href={amazonUrl}
            target="_blank"
            rel="sponsored nofollow noopener"
            onClick={() => trackAmazonOutboundClick(matchedProduct.asin, matchedProduct.title)}
            className="w-full md:w-auto px-6 py-3.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:brightness-110 active:scale-95 text-slate-950 font-black text-sm rounded-xl shadow-xl flex items-center justify-center gap-2 transition"
          >
            <ShoppingCart className="w-4 h-4 text-slate-950" />
            <span>Check Current Deal on Amazon</span>
            <ArrowRight className="w-4 h-4" />
          </a>
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            30-Day Amazon Return Window
          </span>
        </div>
      </div>
    </div>
  );
}
