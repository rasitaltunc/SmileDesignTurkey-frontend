// AI Memory Audit - Privacy-safe memory sync observability
import { capture } from '../posthog';

export interface MemorySyncEvent {
  leadId: string;
  runHashShort?: string;
  scopes: Array<{
    scope: "patient" | "doctor" | "internal";
    facts_count: number;
    open_questions_count: number;
    missing_fields_count: number;
  }>;
  at: string; // ISO timestamp
}

/**
 * Emit memory sync audit event to PostHog (privacy-safe, no raw content)
 */
export function emitAIMemorySync(event: MemorySyncEvent): void {
  try {
    // Use posthog-js capture wrapper (safe no-op if not initialized)

    // Build safe properties (NO raw content, only counts)
    const safeProps: Record<string, any> = {
      lead_id: event.leadId,
      run_hash_short: event.runHashShort || undefined,
      scopes_count: event.scopes.length,
      at: event.at,
    };

    // Add scope-specific counts
    event.scopes.forEach((scopeData, idx) => {
      safeProps[`scope_${scopeData.scope}_facts`] = scopeData.facts_count;
      safeProps[`scope_${scopeData.scope}_open_q`] = scopeData.open_questions_count;
      safeProps[`scope_${scopeData.scope}_missing`] = scopeData.missing_fields_count;
    });

    // Emit memory sync event
    capture('ai_memory_sync', safeProps);
  } catch (err) {
    // Fail-safe: silently no-op on errors
    console.debug('[aiMemoryAudit] Failed to emit memory sync event:', err);
  }
}

