import React from 'react';
import { Award, ShoppingCart, ExternalLink, ShieldCheck, CheckCircle2 } from 'lucide-react';
import ProductImage from './ProductImage';
import AmazonCTAButton from './AmazonCTAButton';

export interface ComparisonProduct {
  asin: string;
  title: string;
  brand: string;
  price: number;
  image_url: string;
  rating: number;
  review_count: number;
  specs: {
    weight_g?: number;
    waterproof?: boolean;
    membrane?: string;
    drop_mm?: number;
    arch_support_score?: number;
    outsole?: string;
    cushioning?: string;
    [key: string]: any;
  };
  highlight: string;
  affiliate_tag?: string;
}

interface StructuredComparisonProps {
  products: ComparisonProduct[];
  categoryTitle: string;
}

export default function StructuredComparison({
  products,
  categoryTitle,
}: StructuredComparisonProps) {
  return (
    <div className="my-10 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h2 className="text-xl sm:text-2xl font-extrabold text-gray-950 flex items-center gap-2">
          <span>📊 Benchmarked Comparison Matrix</span>
        </h2>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full w-fit">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Data Source: Lab Measurements &amp; Manufacturer Specs</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm bg-white">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="py-4 px-4 font-bold min-w-[200px]">Product / Model</th>
              <th className="py-4 px-4 font-bold text-center">Price <span className="text-[10px] text-slate-400 font-normal block">[At Publishing]</span></th>
              <th className="py-4 px-4 font-bold">Weight (g) <span className="text-[10px] text-slate-400 font-normal block">[Lab Measured]</span></th>
              <th className="py-4 px-4 font-bold">Arch Support <span className="text-[10px] text-slate-400 font-normal block">[Torsional / 10]</span></th>
              <th className="py-4 px-4 font-bold">Heel Drop <span className="text-[10px] text-slate-400 font-normal block">[Caliper mm]</span></th>
              <th className="py-4 px-4 font-bold">Waterproofing <span className="text-[10px] text-slate-400 font-normal block">[Tank Tested]</span></th>
              <th className="py-4 px-4 text-center">Amazon Direct</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map((p, idx) => {
              return (
                <tr
                  key={p.asin}
                  className={`hover:bg-amber-50/40 transition duration-150 ${
                    idx === 0 ? 'bg-amber-500/5 font-medium' : ''
                  }`}
                >
                  {/* 商品信息列 */}
                  <td className="py-4 px-4">
                    <div className="flex items-start gap-3">
                      <div className="w-14 h-14 bg-white rounded-lg p-1 border border-gray-200 flex-shrink-0 flex items-center justify-center overflow-hidden">
                        <ProductImage
                          src={p.image_url}
                          alt={p.title}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div>
                        {idx === 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-200 px-2 py-0.5 rounded-full mb-1">
                            <Award className="w-3 h-3 text-amber-700" />
                            #1 Top Ranked
                          </span>
                        )}
                        <div className="font-bold text-gray-900 line-clamp-2 text-xs sm:text-sm">
                          {p.title}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          {p.brand} • ★ {p.rating} ({p.review_count.toLocaleString()} reviews)
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* 价格 */}
                  <td className="py-4 px-4 text-center">
                    <div className="font-black text-gray-950 text-base">${p.price.toFixed(2)}</div>
                    <span className="text-[9px] text-gray-400 block font-normal leading-tight mt-0.5">
                      on Amazon
                    </span>
                  </td>

                  {/* 重量 */}
                  <td className="py-4 px-4 font-mono text-gray-800">
                    <span className="font-bold">{p.specs.weight_g ? `${p.specs.weight_g}g` : 'N/A'}</span>
                    <span className="text-[10px] text-gray-400 block font-sans">per pair</span>
                  </td>

                  {/* 足弓支撑 */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                      {p.specs.arch_support_score ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <span>{p.specs.arch_support_score}/10</span>
                        </>
                      ) : (
                        <span className="text-gray-400 font-medium">Not measured</span>
                      )}
                    </div>
                  </td>

                  {/* 坡差 Drop */}
                  <td className="py-4 px-4 font-mono text-gray-700">
                    {p.specs.drop_mm ? `${p.specs.drop_mm}mm` : <span className="text-gray-400">—</span>}
                  </td>

                  {/* 防水 */}
                  <td className="py-4 px-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-semibold text-xs border border-blue-200">
                      {p.specs.membrane || (p.specs.waterproof ? 'Waterproof' : 'Breathable')}
                    </span>
                  </td>

                  {/* 跳转按钮（客户端叶子组件，紧凑模式） */}
                  <td className="py-4 px-4 text-center">
                    <AmazonCTAButton
                      asin={p.asin}
                      title={p.title}
                      customText="Check Price"
                      size="compact"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
