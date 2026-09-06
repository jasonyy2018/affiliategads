'use client';

import React, { useEffect } from 'react';

interface PostHogProviderProps {
  children: React.ReactNode;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

  useEffect(() => {
    if (typeof window !== 'undefined' && posthogKey) {
      // 动态注入轻量 PostHog SDK
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://us-assets.i.posthog.com/static/array.js';
      script.onload = () => {
        (window as any).posthog?.init(posthogKey, {
          api_host: posthogHost,
          person_profiles: 'identified_only',
          capture_pageview: true,
        });
      };
      document.head.appendChild(script);
    }
  }, [posthogKey, posthogHost]);

  return <>{children}</>;
}

/**
 * 触发自定义用户行为事件
 */
export function trackPostHogEvent(eventName: string, properties: Record<string, any> = {}) {
  if (typeof window !== 'undefined' && (window as any).posthog) {
    (window as any).posthog.capture(eventName, properties);
  }
  // 本地调试日志
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[PostHog Analytics] ${eventName}:`, properties);
  }
}
