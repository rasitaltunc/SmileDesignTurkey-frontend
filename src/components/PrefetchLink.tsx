// src/components/PrefetchLink.tsx
// Link component with automatic route prefetch on hover/focus

import React, { useRef } from 'react';
import { Link, LinkProps } from 'react-router-dom';
import { prefetchRoute, type RouteKey } from '@/lib/prefetch';

type Props = LinkProps & {
  prefetch?: RouteKey;
};

/**
 * PrefetchLink - Enhanced Link component that prefetches route chunks on hover/focus
 * 
 * - Hover: Debounced 180ms delay (prevents accidental hovers)
 * - Focus: Immediate (accessibility-friendly)
 * 
 * Usage:
 *   <PrefetchLink to="/admin/leads" prefetch="admin">Admin</PrefetchLink>
 *   <PrefetchLink to="/doctor" prefetch="doctor">Doctor Portal</PrefetchLink>
 */
export function PrefetchLink({ prefetch, onMouseEnter, onFocus, onMouseLeave, ...rest }: Props) {
  const hoverTimerRef = useRef<number | null>(null);

  const handleMouseEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Clear any existing timer
    if (hoverTimerRef.current !== null) {
      clearTimeout(hoverTimerRef.current);
    }

    // Start debounced prefetch (180ms delay)
    if (prefetch) {
      hoverTimerRef.current = window.setTimeout(() => {
        prefetchRoute(prefetch, 'hover');
        hoverTimerRef.current = null;
      }, 180);
    }

    onMouseEnter?.(e);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Cancel pending prefetch if user leaves before delay
    if (hoverTimerRef.current !== null) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }

    onMouseLeave?.(e);
  };

  const handleFocus = (e: React.FocusEvent<HTMLAnchorElement>) => {
    // Focus prefetch is immediate (accessibility)
    if (prefetch) {
      prefetchRoute(prefetch, 'hover');
    }
    onFocus?.(e);
  };

  return (
    <Link
      {...rest}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
    />
  );
}


