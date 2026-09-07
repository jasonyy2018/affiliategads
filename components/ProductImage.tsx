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
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(defaultFallback);
    }
  };

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
      sizes="(max-width: 640px) 96px, (max-width: 1024px) 160px, 200px"
      referrerPolicy="no-referrer"
      onError={handleError}
    />
  );
}
