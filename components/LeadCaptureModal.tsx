'use client';

import React, { useState } from 'react';
import { Mail, Download, CheckCircle, ShieldCheck, Sparkles } from 'lucide-react';

interface LeadCaptureProps {
  category: string;
  useCase?: string;
}

export default function LeadCaptureModal({
  category,
  useCase,
}: LeadCaptureProps) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    setLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, category, useCase }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        setErrorMessage(data.error || 'Failed to submit. Please try again.');
      }
    } catch {
      setErrorMessage('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="my-12 p-6 sm:p-8 bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-slate-700/80 rounded-3xl text-white shadow-xl">
      <div className="max-w-2xl mx-auto text-center space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-bold rounded-full">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Free 2026 Buyer Lead Magnet</span>
        </div>

        <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight">
          Get the Free {category.charAt(0).toUpperCase() + category.slice(1)} Sizing &amp; Buying Checklist
        </h3>
        
        <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-lg mx-auto">
          Avoid foot blister pain and returns. Get our lab-tested sizing chart, insole match matrix, and price drop tracker sent directly to your inbox.
        </p>

        {submitted ? (
          <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span>You&apos;re on the list! We&apos;ll email the {category} checklist to {email} within 24 hours.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto pt-2">
            <div className="relative flex-1">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm text-white placeholder-slate-400 focus:border-amber-400 focus:outline-none transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition"
            >
              <Download className="w-4 h-4" />
              <span>{loading ? 'Sending...' : 'Get Free PDF'}</span>
            </button>
          </form>
        )}

        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Zero spam guarantee. Unsubscribe anytime in 1-click.</span>
        </div>
      </div>
    </div>
  );
}
