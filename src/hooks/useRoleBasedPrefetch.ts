// src/hooks/useRoleBasedPrefetch.ts
// Hook for role-based route prefetching during idle time

import { useEffect } from 'react';
import { prefetchMany, type RouteKey } from '@/lib/prefetch';
import { useAuthStore } from '@/store/authStore';

/**
 * Automatically prefetch routes based on user role during idle time
 * This ensures that users get instant navigation when they click on role-specific routes
 * 
 * Features:
 * - Respects document visibility (no prefetch when tab is hidden)
 * - Quota-limited: max 2 routes per idle cycle
 * - Remaining routes automatically scheduled for next idle callback
 */
export function useRoleBasedPrefetch(): void {
  const role = useAuthStore((s) => s.role);

  useEffect(() => {
    if (!role) return;

    // Skip if document is hidden
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      return;
    }

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

    // Prefetch during idle time with quota (max 2 routes per cycle)
    // Remaining routes automatically scheduled for next idle callback
    if (routesToPrefetch.length > 0) {
      prefetchMany(routesToPrefetch, 'idle', 2);
    }
  }, [role]);
}


