'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Page error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-20">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-black text-gray-950 tracking-tight">
          Something went wrong
        </h1>
        <p className="text-sm text-gray-600">
          We hit an unexpected snag loading this page. Retrying usually fixes it.
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-slate-950 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition inline-flex items-center gap-2"
        >
          <RotateCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    </div>
  );
}
