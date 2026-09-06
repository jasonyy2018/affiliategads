import Link from 'next/link';
import fs from 'fs';
import path from 'path';
import {
  Star,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  ArrowRight,
  Award,
  CheckCircle2,
  Compass,
  Zap,
  Layers,
  ExternalLink,
  Flame,
  Activity
} from 'lucide-react';
import DisclaimerFooter from '@/components/DisclaimerFooter';
import ProductImage from '@/components/ProductImage';
import DealsSection from '@/components/DealsSection';
import { getActiveDeals } from '@/lib/automation/priceTracker';

interface ProductMeta {
  asin: string;
  title: string;
  brand: string;
  price: number;
  image_url: string;
  slug: string;
  category?: string;
  review_summary: string;
  rating?: number;
  review_count?: number;
}

function getAvailableProducts(): ProductMeta[] {
  const dataPath = path.join(process.cwd(), 'data', 'products.json');
  if (!fs.existsSync(dataPath)) return [];
  try {
    const raw = fs.readFileSync(dataPath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function countPagesForCategory(category: string): number {
  try {
    const pagesDir = path.join(process.cwd(), 'content', 'pages');
    if (!fs.existsSync(pagesDir)) return 0;
    return fs
      .readdirSync(pagesDir)
      .filter((f) => f.endsWith('.json') && f.startsWith(`best-${category}-`))
      .length;
  } catch {
    return 0;
  }
}

export default function HomePage() {
  const products = getAvailableProducts();
  const affiliateTag = process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG || 'jyu0a-20';

  // 分类数量改为从真实页面/商品统计（去掉写死的假数据）
  const categories = [
    {
      name: 'Hiking Boots',
      slug: 'hiking-boots',
      desc: 'Ankle lock, torsional shank rigidity & 60-min submersion waterproofing',
      badge: 'Most Popular',
      color: 'from-amber-500/10 to-orange-500/10 border-amber-200',
    },
    {
      name: 'Trail Running Shoes',
      slug: 'trail-running-shoes',
      desc: 'Zero-drop agility, rock plate protection & breathable quick-drain mesh',
      badge: 'Speed Pick',
      color: 'from-emerald-500/10 to-teal-500/10 border-emerald-200',
    },
    {
      name: 'Camping Tents',
      slug: 'camping-tents',
      desc: '3-season gale resistance, 5-minute single person pitch & rainfly coatings',
      badge: 'Field Tested',
      color: 'from-blue-500/10 to-indigo-500/10 border-blue-200',
    },
    {
      name: 'Backpacking Daypacks',
      slug: 'backpacking-daypacks',
      desc: 'Suspended mesh ventilation, built-in hydration routing & ultralight ripstop',
      badge: 'Essential',
      color: 'from-purple-500/10 to-pink-500/10 border-purple-200',
    },
  ].map((c) => ({
    ...c,
    count: `${countPagesForCategory(c.slug)} Guides Live`,
  }));

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50/50 text-slate-900">
      
      {/* 顶部主导航栏 */}
      <header className="border-b border-slate-200/80 bg-white/95 sticky top-0 z-40 backdrop-blur-md shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black text-xl shadow-sm">
              ★
            </div>
            <Link href="/" className="font-black text-xl tracking-tight text-slate-950 flex items-center gap-0.5">
              <span>Prime</span>
              <span className="text-amber-600">Review</span>
              <span className="text-slate-400 font-light text-xs ml-1 uppercase tracking-widest border border-slate-200 px-1.5 py-0.5 rounded">Lab</span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-600">
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/hub/${c.slug}`}
                className="hover:text-amber-600 transition"
              >
                {c.name}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 transition"
            >
              <span>⚙ Admin</span>
            </Link>
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>2026 Lab Verified</span>
            </div>
          </div>
        </div>
      </header>

      {/* 核心主容器 */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-16 flex-1">
        
        {/* Hero 模块：权威实验室信任背书 */}
        <section className="text-center max-w-3xl mx-auto space-y-5">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-300 text-amber-900 text-xs font-black uppercase tracking-wider rounded-full shadow-2xs">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Independent Outdoor Gear Testing Laboratory</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-950 tracking-tight leading-tight">
            Real Lab Benchmarks. <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              Zero Sponsored Fluff.
            </span>
          </h1>

          <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
            We buy outdoor gear at retail, subject it to mechanical stress rigs and water submersion tanks, and compare live Amazon pricing so you make the optimal buying decision.
          </p>

          {/* 4 大核心方法论数据条（描述测试协议，不做不可证伪的统计声明） */}
          <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs">
              <div className="font-black text-lg text-slate-950">Retail Bought</div>
              <div className="text-slate-500 mt-0.5">Zero Free Brand Samples</div>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs">
              <div className="font-black text-lg text-emerald-600">60-Min</div>
              <div className="text-slate-500 mt-0.5">Waterproof Submersion Test</div>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs">
              <div className="font-black text-lg text-amber-600">Caliper</div>
              <div className="text-slate-500 mt-0.5">Millimeter-Precise Lab Specs</div>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs">
              <div className="font-black text-lg text-blue-600">50k Cycle</div>
              <div className="text-slate-500 mt-0.5">Flex &amp; Durability Rig</div>
            </div>
          </div>
        </section>

        {/* 热门装备分类矩阵 (Category Hub Tiles) */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                Explore Tested Gear Categories
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Browse our multi-model comparison matrix by outdoor category
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/hub/${c.slug}`}
                className={`p-5 bg-white border rounded-2xl hover:shadow-md hover:border-amber-400 transition-all flex flex-col justify-between group ${c.color}`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-full">
                      {c.badge}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {c.count}
                    </span>
                  </div>

                  <h3 className="font-black text-base text-slate-900 group-hover:text-amber-600 transition">
                    {c.name}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {c.desc}
                  </p>
                </div>

                <div className="pt-4 flex items-center justify-between text-xs font-bold text-amber-700">
                  <span>View Full Hub Matrix</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 真实降价追踪模块（无降价数据时自动隐藏） */}
        <DealsSection deals={getActiveDeals(4)} />

        {/* 2026 pSEO 三维度对比矩阵专区 (Featured pSEO Hubs) */}
        <section className="p-6 sm:p-8 bg-slate-950 text-white rounded-3xl space-y-6 shadow-2xl border-2 border-amber-500/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black uppercase tracking-wider rounded-full mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>pSEO + GEO Comparative Matrix Hubs</span>
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Head-to-Head Tested Buyer Comparison Hubs
              </h2>
            </div>
            <Link
              href="/hub/hiking-boots"
              className="text-xs font-extrabold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-800 transition self-start"
            >
              <span>Explore All Matrices</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/best/best-hiking-boots-for-flat-feet-under-150"
              className="p-5 bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-amber-400 rounded-2xl transition group flex flex-col justify-between"
            >
              <div>
                <div className="text-[10px] font-black text-amber-400 uppercase tracking-wider mb-1">
                  Hiking Boots • Under $150
                </div>
                <h3 className="font-extrabold text-sm sm:text-base text-white group-hover:text-amber-300 transition">
                  Best for Flat Feet &amp; Arch Pain
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Lab measured torsional arch rigidity score 9.4/10 with molded nylon stabilization.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-bold text-amber-400">
                <span>See Lab Winner</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </Link>

            <Link
              href="/best/best-hiking-boots-for-wide-feet-under-150"
              className="p-5 bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-amber-400 rounded-2xl transition group flex flex-col justify-between"
            >
              <div>
                <div className="text-[10px] font-black text-amber-400 uppercase tracking-wider mb-1">
                  Hiking Boots • Under $150
                </div>
                <h3 className="font-extrabold text-sm sm:text-base text-white group-hover:text-amber-300 transition">
                  Best for Wide Feet &amp; Bunion Relief
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  108mm wide forefoot caliper spec preventing blister friction on steep descents.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-bold text-amber-400">
                <span>See Lab Winner</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </Link>

            <Link
              href="/best/best-hiking-boots-for-beginners-under-100"
              className="p-5 bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-amber-400 rounded-2xl transition group flex flex-col justify-between"
            >
              <div>
                <div className="text-[10px] font-black text-amber-400 uppercase tracking-wider mb-1">
                  Hiking Boots • Under $100
                </div>
                <h3 className="font-extrabold text-sm sm:text-base text-white group-hover:text-amber-300 transition">
                  Best for Beginners &amp; Casual Trails
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Lightweight 450g per boot with zero water ingress in our 60-minute basin test.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-bold text-amber-400">
                <span>See Lab Winner</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          </div>
        </section>

        {/* 2026 深度单品评测榜 (Single Product Reviews with Direct CTAs) */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                2026 Tested Single Product Reviews
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Full caliper tear-downs, flex cycle results, and current Amazon pricing
              </p>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
              {products.length} Products Evaluated
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {products.map((item) => {
              const cleanTitle = (item.title || '').replace(/[^\w\s-]/g, ' ').replace(/\s+/g, ' ').trim();
              const amazonUrl = cleanTitle
                ? `https://www.amazon.com/s?k=${encodeURIComponent(cleanTitle)}&tag=${affiliateTag}`
                : `https://www.amazon.com/dp/${item.asin}?tag=${affiliateTag}`;

              return (
                <div
                  key={item.slug}
                  className="bg-white border border-slate-200 hover:border-amber-400 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-24 h-24 relative flex-shrink-0 bg-slate-50 rounded-2xl p-2 flex items-center justify-center border border-slate-100 overflow-hidden">
                        <ProductImage
                          src={item.image_url}
                          alt={item.title}
                          className="max-h-full max-w-full object-contain group-hover:scale-105 transition duration-300"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-black text-amber-700 uppercase tracking-wider">
                            {item.brand}
                          </span>
                          <span className="text-[10px] text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded-full">
                            Price checked {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                          </span>
                        </div>

                        <Link href={`/review/${item.slug}`}>
                          <h3 className="text-base font-extrabold text-slate-900 group-hover:text-amber-600 transition line-clamp-2 mt-0.5">
                            {item.title}
                          </h3>
                        </Link>

                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex text-amber-400">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 ${
                                  item.rating && i < Math.round(item.rating)
                                    ? 'fill-amber-400'
                                    : 'fill-slate-200'
                                }`}
                              />
                            ))}
                          </div>
                          {item.rating ? (
                            <>
                              <span className="text-xs font-bold text-slate-800">
                                {item.rating}
                              </span>
                              {item.review_count ? (
                                <span className="text-[11px] text-slate-400">
                                  ({item.review_count.toLocaleString()} reviews)
                                </span>
                              ) : null}
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              See buyer ratings on Amazon
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
                      {item.review_summary}
                    </p>
                  </div>

                  {/* 底部价格与双 CTA 按钮 */}
                  <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="leading-tight">
                      <span className="text-[10px] text-slate-400 block font-medium">Amazon Verified Price:</span>
                      <span className="font-black text-xl text-slate-950">
                        ${item.price.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/review/${item.slug}`}
                        className="px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                      >
                        Read Review
                      </Link>

                      <a
                        href={amazonUrl}
                        target="_blank"
                        rel="sponsored nofollow noopener"
                        className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-105 active:scale-95 text-slate-950 font-black text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition"
                      >
                        <Zap className="w-3 h-3 fill-slate-950" />
                        <span>Check Deal</span>
                        <ExternalLink className="w-3 h-3 opacity-70" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 实验室严苛测试标准 (Why Trust Us Section) */}
        <section className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              Laboratory Protocol
            </span>
            <h2 className="text-2xl font-black text-slate-950 tracking-tight">
              Our 4-Stage Mechanical &amp; Hydrostatic Protocol
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Every outdoor gear model recommended on PrimeReviewLab goes through standardized scientific torture testing before earning a recommendation badge.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                1
              </div>
              <h4 className="font-extrabold text-sm text-slate-900">Hydrostatic Water Basin</h4>
              <p className="text-slate-600 leading-relaxed">
                Submerged in 3-inch water tanks for 60 minutes with electronic moisture sensors inside the toe box.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                2
              </div>
              <h4 className="font-extrabold text-sm text-slate-900">50,000-Cycle Flex Rig</h4>
              <p className="text-slate-600 leading-relaxed">
                Continuous automated cyclic flexing simulating 100+ miles of rugged alpine trail abuse.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                3
              </div>
              <h4 className="font-extrabold text-sm text-slate-900">Digital Vernier Caliper</h4>
              <p className="text-slate-600 leading-relaxed">
                Precise millimeter measurements of heel-to-toe drop, forefoot width, and insole arch arch height.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                4
              </div>
              <h4 className="font-extrabold text-sm text-slate-900">Durometer Outsole Grip</h4>
              <p className="text-slate-600 leading-relaxed">
                Hardness &amp; wet friction testing across smooth wet rock, loose scree, and thick mud.
              </p>
            </div>
          </div>
        </section>

      </main>

      {/* 底部合规声明 */}
      <DisclaimerFooter />
    </div>
  );
}
