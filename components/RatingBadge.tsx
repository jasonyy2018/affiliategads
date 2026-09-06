import React from 'react';
import { Star, Award, CheckCircle } from 'lucide-react';

interface RatingBadgeProps {
  rating: number;
  ratingCount?: number;
  badgeText?: string;
  showVerified?: boolean;
}

export default function RatingBadge({
  rating,
  ratingCount,
  badgeText,
  showVerified = true,
}: RatingBadgeProps) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {badgeText && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-800 text-xs font-black tracking-wider uppercase rounded-full border border-amber-300">
          <Award className="w-3.5 h-3.5 text-amber-600" />
          {badgeText}
        </span>
      )}

      <div className="flex items-center gap-1.5">
        <div className="flex items-center text-amber-500">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${
                i < fullStars
                  ? 'fill-amber-400 text-amber-400'
                  : i === fullStars && hasHalfStar
                  ? 'fill-amber-400/50 text-amber-400'
                  : 'text-gray-300'
              }`}
            />
          ))}
        </div>
        <span className="text-sm font-bold text-gray-900">{rating.toFixed(1)}</span>
        {ratingCount ? (
          <span className="text-xs text-gray-500 font-medium">
            ({ratingCount.toLocaleString()} ratings)
          </span>
        ) : null}
      </div>

      {showVerified && (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
          <CheckCircle className="w-3 h-3 text-emerald-600" />
          Lab Tested
        </span>
      )}
    </div>
  );
}
