'use client';

import React, { useState } from 'react';
import Image, { ImageProps } from 'next/image';
import { Package, ShieldCheck } from 'lucide-react';

interface ProductImageProps {
  src?: string;
  alt: string;
  className?: string;
  category?: string;
  /** 首屏 LCP 商品图传 'high'（fetchpriority），列表图默认 lazy */
  priority?: boolean;
}

const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  'hiking boots': 'https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?auto=format&fit=crop&w=600&q=80',
  'trail running shoes': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80',
  'camping tents': 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=600&q=80',
  'backpacking daypacks': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80',
};

// next/image 需要尺寸：容器均为固定方块（w-N h-N），给一个合理的内在尺寸让优化器工作
const FALLBACK_DIMS = { width: 600, height: 600 };

export default function ProductImage({
  src,
  alt,
  className = 'max-h-full max-w-full object-contain',
  category,
  priority = false,
}: ProductImageProps) {
  const defaultFallback =
    (category && CATEGORY_FALLBACK_IMAGES[category.toLowerCase()]) ||
    'https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?auto=format&fit=crop&w=600&q=80';

  const [imgSrc, setImgSrc] = useState(src || defaultFallback);
  const [stage, setStage] = useState<'primary' | 'fallback' | 'svg'>(
    src ? 'primary' : 'fallback'
  );

  const handleError = () => {
    if (stage === 'primary' && defaultFallback && defaultFallback !== imgSrc) {
      setStage('fallback');
      setImgSrc(defaultFallback);
    } else {
      // Both primary and fallback failed or CDN blocked - render clean SVG placeholder
      setStage('svg');
    }
  };

  if (stage === 'svg' || !imgSrc) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`w-full h-full flex flex-col items-center justify-center p-2 bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 select-none rounded-xl text-center ${className}`}
      >
        <Package className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400 stroke-1 mb-1" />
        <span className="text-[10px] font-medium text-slate-500 line-clamp-1 max-w-[90%]">
          {alt || 'Outdoor Gear'}
        </span>
      </div>
    );
  }

  return (
    <Image
      src={imgSrc}
      alt={alt}
      width={FALLBACK_DIMS.width}
      height={FALLBACK_DIMS.height}
      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      priority={priority}
      unoptimized={true}
      sizes="(max-width: 640px) 96px, (max-width: 1024px) 160px, 200px"
      referrerPolicy="no-referrer"
      onError={handleError}
    />
  );
}
