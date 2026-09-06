import React from 'react';
import { Award, Check, Sparkles } from 'lucide-react';

interface ComparisonRow {
  feature: string;
  our_product: string;
  competitor: string;
}

interface ComparisonTableProps {
  productTitle: string;
  competitorName: string;
  rows: ComparisonRow[];
}

export default function ComparisonTable({
  productTitle,
  competitorName,
  rows,
}: ComparisonTableProps) {
  return (
    <div className="my-10">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-amber-500" />
        <h3 className="text-xl font-bold text-gray-900">Head-to-Head Comparison</h3>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm bg-white">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200">
              <th className="py-4 px-5 font-semibold text-gray-600 w-1/3">Key Evaluation Metric</th>
              <th className="py-4 px-5 font-bold text-gray-900 bg-amber-500/10 border-x border-amber-200 w-1/3">
                <div className="flex items-center gap-1.5 text-amber-900">
                  <Award className="w-4 h-4 text-amber-600" />
                  <span className="truncate">{productTitle} (Our Pick)</span>
                </div>
              </th>
              <th className="py-4 px-5 font-semibold text-gray-600 w-1/3 truncate">{competitorName}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50/50 transition">
                <td className="py-3.5 px-5 font-medium text-gray-800">{row.feature}</td>
                <td className="py-3.5 px-5 font-bold text-gray-950 bg-amber-500/5 border-x border-amber-200/60">
                  <div className="flex items-center gap-1.5 text-emerald-800">
                    <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                    <span>{row.our_product}</span>
                  </div>
                </td>
                <td className="py-3.5 px-5 text-gray-600">{row.competitor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
