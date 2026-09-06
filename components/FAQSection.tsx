'use client';

import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FAQ {
  question: string;
  answer: string;
}

interface FAQSectionProps {
  faqs: FAQ[];
}

export default function FAQSection({ faqs }: FAQSectionProps) {
  const [openIndices, setOpenIndices] = useState<number[]>([0]);

  const toggle = (idx: number) => {
    setOpenIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  return (
    <div className="my-10">
      <div className="flex items-center gap-2 mb-6">
        <HelpCircle className="w-5 h-5 text-blue-600" />
        <h3 className="text-xl font-bold text-gray-900">Frequently Asked Questions</h3>
      </div>
      <div className="space-y-3">
        {faqs.map((faq, idx) => {
          const isOpen = openIndices.includes(idx);
          return (
            <div
              key={idx}
              className="border border-gray-200 rounded-xl overflow-hidden bg-white transition-all shadow-sm"
            >
              <button
                type="button"
                onClick={() => toggle(idx)}
                className="w-full py-4 px-5 text-left font-semibold text-gray-900 flex items-center justify-between gap-4 hover:bg-gray-50/80 transition"
              >
                <span className="text-base">{faq.question}</span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 transform transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-blue-600' : ''
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-5 pb-4 pt-1 text-sm text-gray-600 leading-relaxed border-t border-gray-100 bg-gray-50/30">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
