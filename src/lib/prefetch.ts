// src/lib/prefetch.ts
// Route prefetch system with network awareness and save-data respect

export type RouteKey =
  | 'admin'
  | 'doctor'
  | 'patient'
  | 'pricing'
  | 'process'
  | 'treatments'
  | 'reviews'
  | 'faq'
  | 'contact'
  | 'onboarding';

/**
 * Checks if prefetch should be allowed based on network conditions
 */
const canPrefetch = (): boolean => {
  if (typeof navigator === 'undefined') return false;

  // Save-Data / low network saygısı
  const navAny = navigator as any;
  const conn = navAny.connection || navAny.mozConnection || navAny.webkitConnection;
  
  // Save-Data mode: prefetch disabled
  if (conn?.saveData) return false;
  
  // Slow network: prefetch disabled
  const et = String(conn?.effectiveType || '');
  if (et.includes('2g') || et.includes('slow-2g')) return false;

  return true;
};

/**
 * Runs a function during idle time (requestIdleCallback with fallback)
 */
const runIdle = (fn: () => void): number => {
  const w = window as any;
  if (typeof w.requestIdleCallback === 'function') {
    return w.requestIdleCallback(fn, { timeout: 1500 });
  }
  return window.setTimeout(fn, 400);
};

/**
 * Route importers map
 * IMPORTANT: These paths must match your actual route component imports
 */
const importers: Record<RouteKey, () => Promise<any>> = {
  // Lazy-loaded routes (critical for prefetch)
  admin: () => import('@/pages/AdminLeads'),
  doctor: () => import('@/pages/DoctorPortal'),
  patient: () => import('@/pages/PatientPortal'),
  
  // Marketing routes (lazy-loaded, enables real prefetch)
  pricing: () => import('@/pages/Pricing'),
  process: () => import('@/pages/Process'),
  treatments: () => import('@/pages/Treatments'),
  reviews: () => import('@/pages/Reviews'),
  faq: () => import('@/pages/FAQ'),
  contact: () => import('@/pages/Contact'),
  onboarding: () => import('@/pages/Onboarding'),
};

const prefetched = new Set<RouteKey>();

/**
 * Prefetch a route chunk
 * @param key - Route key to prefetch
 * @param mode - 'hover' = immediate, 'idle' = wait for idle time
 */
export function prefetchRoute(key: RouteKey, mode: 'hover' | 'idle' = 'hover'): void {
  if (!canPrefetch()) return;
  if (prefetched.has(key)) return;

  const run = (): void => {
    // Double-check (race condition guard)
    if (prefetched.has(key)) return;
    prefetched.add(key);
    
    importers[key]?.().catch(() => {
      // Fail silently; don't retry
      prefetched.delete(key); // Allow retry on next attempt
    });
  };

  if (mode === 'idle') {
    runIdle(run);
  } else {
    run();
  }
}

/**
 * Prefetch multiple routes
 * @param keys - Array of route keys
 * @param mode - 'hover' = immediate, 'idle' = wait for idle time
 */
export function prefetchMany(keys: RouteKey[], mode: 'hover' | 'idle' = 'idle'): void {
  keys.forEach((k) => prefetchRoute(k, mode));
}


