// src/components/PrefetchLink.tsx
// Link component with automatic route prefetch on hover/focus

import React from 'react';
import { Link, LinkProps } from 'react-router-dom';
import { prefetchRoute, type RouteKey } from '@/lib/prefetch';

type Props = LinkProps & {
  prefetch?: RouteKey;
};

/**
 * PrefetchLink - Enhanced Link component that prefetches route chunks on hover/focus
 * 
 * Usage:
 *   <PrefetchLink to="/admin/leads" prefetch="admin">Admin</PrefetchLink>
 *   <PrefetchLink to="/doctor" prefetch="doctor">Doctor Portal</PrefetchLink>
 */
export function PrefetchLink({ prefetch, onMouseEnter, onFocus, ...rest }: Props) {
  const handleMouseEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (prefetch) {
      prefetchRoute(prefetch, 'hover');
    }
    onMouseEnter?.(e);
  };

  const handleFocus = (e: React.FocusEvent<HTMLAnchorElement>) => {
    if (prefetch) {
      prefetchRoute(prefetch, 'hover');
    }
    onFocus?.(e);
  };

  return (
    <Link
      {...rest}
      onMouseEnter={handleMouseEnter}
      onFocus={handleFocus}
    />
  );
}

