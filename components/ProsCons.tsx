import React from 'react';
import { Check, X, ThumbsUp, ThumbsDown } from 'lucide-react';

interface ProsConsProps {
  pros: string[];
  cons: string[];
}

export default function ProsCons({ pros, cons }: ProsConsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
      {/* 优点栏 */}
      <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-emerald-600 text-white rounded-lg">
            <ThumbsUp className="w-4 h-4" />
          </div>
          <h3 className="text-lg font-bold text-emerald-950">What We Loved (Pros)</h3>
        </div>
        <ul className="space-y-3">
          {pros.map((pro, index) => (
            <li key={index} className="flex items-start gap-2.5 text-sm leading-relaxed text-emerald-900">
              <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-emerald-200/80 text-emerald-800 flex items-center justify-center">
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              </span>
              <span>{pro}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 缺点栏 */}
      <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-rose-600 text-white rounded-lg">
            <ThumbsDown className="w-4 h-4" />
          </div>
          <h3 className="text-lg font-bold text-rose-950">Things to Consider (Cons)</h3>
        </div>
        <ul className="space-y-3">
          {cons.map((con, index) => (
            <li key={index} className="flex items-start gap-2.5 text-sm leading-relaxed text-rose-900">
              <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-rose-200/80 text-rose-800 flex items-center justify-center">
                <X className="w-3.5 h-3.5 stroke-[2.5]" />
              </span>
              <span>{con}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
