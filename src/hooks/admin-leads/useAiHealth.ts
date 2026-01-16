import { useState, useEffect, useCallback, useMemo } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface AiHealthData {
  needs_normalize?: boolean;
  last_normalized_at?: string | null;
  review_required?: boolean;
  updated_at?: string | null;
}

export interface UseAiHealthParams {
  supabase: SupabaseClient | null;
  apiUrl: string;
  leadIds: string[];
  enabled: boolean;
}

export interface UseAiHealthReturn {
  aiHealthMap: Record<string, AiHealthData>;
  refreshAiHealth: (leadId?: string) => Promise<void>;
}

/**
 * Hook to manage AI health data for leads.
 * Fetches from /api/admin/ai-health endpoint and caches results.
 */
export function useAiHealth(params: UseAiHealthParams): UseAiHealthReturn {
  const { supabase, apiUrl, leadIds, enabled } = params;
  const [aiHealthMap, setAiHealthMap] = useState<Record<string, AiHealthData>>({});

  // Create stable key from leadIds (sorted, deterministic)
  const leadIdsKey = useMemo(() => {
    if (!leadIds?.length) return '';
    const sorted = [...leadIds].sort();
    return sorted.join(',');
  }, [leadIds]);

  // Helper: chunk array into smaller pieces
  const chunkArray = <T,>(array: T[], chunkSize: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  };

  const fetchAiHealth = useCallback(
    async (idsToFetch: string[]) => {
      if (!enabled || !supabase || !idsToFetch.length) return;

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) {
          // Silent fail - no token means not authenticated
          return;
        }

        // Guard: ensure we have at least one ID
        if (idsToFetch.length === 0) return;

        // Use POST method (avoids URL length limits)
        // Chunking kept as fallback for very large batches (1000+ leads)
        const CHUNK_SIZE = 100; // Increased since POST handles body well
        const chunks = chunkArray(idsToFetch, CHUNK_SIZE);

        // Fetch each chunk and merge results
        const allResults: Record<string, AiHealthData> = {};

        for (const chunk of chunks) {
          if (chunk.length === 0) continue;

          // Use POST for bulk fetch (body instead of query param)
          // POST to the same endpoint (Vercel dynamic route handles both GET and POST)
          const response = await fetch(
            `${apiUrl}/api/admin/ai-health/bulk`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({ leadIds: chunk }),
            }
          );

          if (!response.ok) {
            // Fallback to GET if POST not supported (backward compatibility)
            if (response.status === 405 && chunk.length <= 50) {
              const firstId = chunk[0];
              const getResponse = await fetch(
                `${apiUrl}/api/admin/ai-health/${encodeURIComponent(firstId)}?leadIds=${chunk.join(',')}`,
                {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                  },
                }
              );
              if (getResponse.ok) {
                const getResult = await getResponse.json();
                if (getResult.ok && getResult.data) {
                  Object.assign(allResults, getResult.data);
                }
                continue;
              }
            }
            console.warn(`[useAiHealth] Failed to load AI health for chunk:`, response.status);
            continue; // Continue with other chunks even if one fails
          }

          const result = await response.json();
          if (result.ok && result.data) {
            Object.assign(allResults, result.data);
          }
        }

        // Merge all chunk results into state
        if (Object.keys(allResults).length > 0) {
          setAiHealthMap((prev) => ({ ...prev, ...allResults }));
        }
      } catch (err) {
        console.warn('[useAiHealth] Error loading AI health:', err);
        // Silent fail - don't break the UI
      }
    },
    [enabled, supabase, apiUrl]
  );

  const refreshAiHealth = useCallback(
    async (leadId?: string) => {
      if (leadId) {
        // Refresh single lead
        await fetchAiHealth([leadId]);
      } else {
        // Refresh all leads
        if (leadIds.length > 0) {
          await fetchAiHealth(leadIds);
        }
      }
    },
    [fetchAiHealth, leadIds]
  );

  // Auto-fetch on mount and when leadIds change (if enabled)
  useEffect(() => {
    if (!enabled || !leadIds.length) return;
    fetchAiHealth(leadIds);
  }, [enabled, fetchAiHealth, leadIdsKey]); // Use stable key + fetchAiHealth in deps

  return {
    aiHealthMap,
    refreshAiHealth,
  };
}

