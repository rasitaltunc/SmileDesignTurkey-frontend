// src/hooks/useRoleBasedPrefetch.ts
// Hook for role-based route prefetching during idle time

import { useEffect } from 'react';
import { prefetchMany, type RouteKey } from '@/lib/prefetch';
import { useAuthStore } from '@/store/authStore';

/**
 * Automatically prefetch routes based on user role during idle time
 * This ensures that users get instant navigation when they click on role-specific routes
 */
export function useRoleBasedPrefetch(): void {
  const role = useAuthStore((s) => s.role);

  useEffect(() => {
    if (!role) return;

    const normalizedRole = (role || '').toLowerCase().trim();
    const routesToPrefetch: RouteKey[] = [];

    switch (normalizedRole) {
      case 'admin':
      case 'employee':
        routesToPrefetch.push('admin');
        break;
      case 'doctor':
        routesToPrefetch.push('doctor');
        break;
      case 'patient':
        routesToPrefetch.push('patient');
        break;
      default:
        // Unknown role: no prefetch
        return;
    }

    // Prefetch during idle time (not blocking)
    if (routesToPrefetch.length > 0) {
      prefetchMany(routesToPrefetch, 'idle');
    }
  }, [role]);
}

