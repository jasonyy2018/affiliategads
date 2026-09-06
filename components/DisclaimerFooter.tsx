import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';

export default function DisclaimerFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-16 pt-10 pb-16 border-t border-gray-200 bg-gray-50 text-gray-500 text-xs leading-relaxed">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* 亚马逊官方合规声明（强制要求） */}
        <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-2 shadow-xs">
          <div className="flex items-center gap-2 font-semibold text-gray-700">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span>Affiliate Disclosure & Transparency Notice</span>
          </div>
          <p className="text-gray-600">
            <strong>As an Amazon Associate I earn from qualifying purchases.</strong> When you click on links to various merchants on this site and make a purchase, this can result in this site earning a commission. Affiliate programs and affiliations include, but are not limited to, the eBay Partner Network and the Amazon Associates Program.
          </p>
          <p className="text-gray-500">
            Amazon and the Amazon logo are trademarks of Amazon.com, Inc. or its affiliates. Product prices and availability are accurate as of the date/time indicated and are subject to change. Any price and availability information displayed on Amazon.com at the time of purchase will apply to the purchase of this product.
          </p>
        </div>

        {/* 底部版权与导航 */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-200/60 text-gray-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Independent Editorial Reviews © {currentYear}. All Rights Reserved.</span>
          </div>
          <div className="flex items-center gap-4 text-gray-500">
            <a href="#privacy" className="hover:underline">Privacy Policy</a>
            <span>•</span>
            <a href="#terms" className="hover:underline">Terms of Service</a>
            <span>•</span>
            <a href="/admin" className="hover:underline text-amber-700 font-semibold">⚙ OPC Admin Hub</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
