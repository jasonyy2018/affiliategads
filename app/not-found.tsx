import Link from 'next/link';
import { Compass, ArrowLeft, Search } from 'lucide-react';
import DisclaimerFooter from '@/components/DisclaimerFooter';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-white">
      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-lg w-full text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Compass className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="text-xs font-black uppercase tracking-widest text-amber-700">
              404 — Trail Not Found
            </div>
            <h1 className="text-3xl font-black text-gray-950 tracking-tight">
              This page wandered off the map
            </h1>
            <p className="text-sm text-gray-600 leading-relaxed">
              The guide you&apos;re looking for doesn&apos;t exist (or was retired after our
              quarterly content audit). Our live comparison hubs are a good place to rejoin the trail.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/"
              className="px-6 py-3 bg-slate-950 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
            <Link
              href="/hub/hiking-boots"
              className="px-6 py-3 bg-amber-100 text-amber-900 text-sm font-bold rounded-xl hover:bg-amber-200 transition flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Browse Hiking Boots Hub
            </Link>
          </div>
        </div>
      </main>

      <DisclaimerFooter />
    </div>
  );
}
