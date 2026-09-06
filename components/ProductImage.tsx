'use client';

import React, { useState } from 'react';
import { Package, ShieldCheck } from 'lucide-react';

interface ProductImageProps {
  src?: string;
  alt: string;
  className?: string;
  category?: string;
}

const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  'hiking boots': 'https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?auto=format&fit=crop&w=600&q=80',
  'trail running shoes': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80',
  'camping tents': 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=600&q=80',
  'backpacking daypacks': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80',
};

export default function ProductImage({
  src,
  alt,
  className = 'max-h-full max-w-full object-contain',
  category,
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
    <img
      src={imgSrc}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={handleError}
      className={className}
    />
  );
}
