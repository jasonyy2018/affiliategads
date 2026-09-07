import React from 'react';
import Link from 'next/link';
import fs from 'fs';
import path from 'path';
import { ChevronRight, Layers } from 'lucide-react';

interface RelatedGuidesProps {
  /** 当前品类（小写原文，如 "hiking boots"） */
  category: string;
  /** 当前页面 slug（从结果中排除） */
  currentSlug: string;
  /** 最多展示几个链接 */
  limit?: number;
}

/**
 * 品类互链网络：读取 content/pages/ 快照，展示同品类下的其他对比页。
 * 服务端组件 — 构建期解析，静态输出，助 crawl 权重传递与用户深度浏览。
 */
export default function RelatedGuides({ category, currentSlug, limit = 6 }: RelatedGuidesProps) {
  const pagesDir = path.join(process.cwd(), 'content', 'pages');
  const catSlug = category.toLowerCase().replace(/\s+/g, '-');
  const prefix = `best-${catSlug}-`;

  const siblings: Array<{ slug: string; label: string; productCount: number }> = [];
  try {
    if (fs.existsSync(pagesDir)) {
      for (const file of fs.readdirSync(pagesDir).filter((f) => f.endsWith('.json'))) {
        const slug = file.replace(/\.json$/, '');
        if (slug === currentSlug || !slug.startsWith(prefix)) continue;
        try {
          const data = JSON.parse(fs.readFileSync(path.join(pagesDir, file), 'utf-8'));
          // 标签 = "场景 (价格带)"
          const useCase = data.use_case
            ? String(data.use_case).replace(/\b\w/g, (c) => c.toUpperCase())
            : '';
          const band = data.price_band?.label
            ? String(data.price_band.label).replace(/\b\w/g, (c) => c.toUpperCase())
            : '';
          siblings.push({
            slug,
            label: [useCase, band ? `(${band})` : ''].filter(Boolean).join(' '),
            productCount: data.product_count || (data.products || []).length || 0,
          });
        } catch {}
      }
    }
  } catch {}

  if (siblings.length === 0) return null;

  // 稳定排序（slug 字母序）避免每次构建顺序漂移
  siblings.sort((a, b) => a.slug.localeCompare(b.slug));
  const shown = siblings.slice(0, limit);
  const hubUrl = `/hub/${catSlug}`;

  return (
    <div className="my-12 p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" />
          <span>More Tested Comparisons in {category.replace(/\b\w/g, (c) => c.toUpperCase())}</span>
        </h3>
        <Link href={hubUrl} className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
          <span>View Full Hub</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
        {shown.map((s) => (
          <Link
            key={s.slug}
            href={`/best/${s.slug}`}
            className="p-3.5 bg-white border border-slate-200 rounded-xl hover:border-amber-400 hover:shadow-sm transition group"
          >
            <div className="font-bold text-slate-800 group-hover:text-amber-600 transition leading-snug">
              Best for {s.label}
            </div>
            {s.productCount > 0 && (
              <div className="text-slate-400 mt-1 font-medium">{s.productCount} models benchmarked</div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
