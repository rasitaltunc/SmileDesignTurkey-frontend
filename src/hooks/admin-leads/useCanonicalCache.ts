import { useRef, useCallback } from 'react';

/**
 * Hook to manage canonical note cache.
 * Provides stable ref and helper functions for get/set/clear operations.
 */
export function useCanonicalCache<TCanonical = any>(): {
  canonicalCacheRef: React.MutableRefObject<Map<string, TCanonical>>;
  getCanonical: (leadId: string) => TCanonical | null;
  setCanonical: (leadId: string, canonical: TCanonical | null) => void;
  clearCanonical: (leadId: string) => void;
} {
  const canonicalCacheRef = useRef<Map<string, TCanonical>>(new Map());

  const getCanonical = useCallback((leadId: string): TCanonical | null => {
    return canonicalCacheRef.current.get(leadId) ?? null;
  }, []);

  const setCanonical = useCallback((leadId: string, canonical: TCanonical | null): void => {
    if (canonical === null) {
      canonicalCacheRef.current.delete(leadId);
    } else {
      canonicalCacheRef.current.set(leadId, canonical);
    }
  }, []);

  const clearCanonical = useCallback((leadId: string): void => {
    canonicalCacheRef.current.delete(leadId);
  }, []);

  return {
    canonicalCacheRef,
    getCanonical,
    setCanonical,
    clearCanonical,
  };
}


