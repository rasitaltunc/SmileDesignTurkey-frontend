// AI Audit Logging - Privacy-safe observability
import { capture } from '../posthog';

export type AIAuditEvent = {
  type: "normalize_run";
  leadId: string;
  runHashShort: string;
  firewall: {
    injectionDetected: boolean;
    redactionCounts: Record<string, number>;
  };
  gating: {
    reviewRequired: boolean;
    reasons: string[];
  };
  scores?: {
    risk?: number;
    confidence?: number;
    priorityLabel?: string;
  };
  sourceMeta?: {
    notesUsed?: number;
    timelineUsed?: number;
  };
  at: string; // ISO timestamp
};

/**
 * Emit AI audit event to PostHog (privacy-safe, no raw content)
 */
export function emitAIAudit(event: AIAuditEvent): void {
  try {
    // Use posthog-js capture wrapper (safe no-op if not initialized)

    // Build safe properties (NO raw content, NO PII, only counts/flags/hashes)
    const safeProps: Record<string, any> = {
      lead_id: event.leadId,
      run_hash_short: event.runHashShort,
      firewall_injection_detected: event.firewall.injectionDetected,
      firewall_redaction_counts: event.firewall.redactionCounts,
      gating_review_required: event.gating.reviewRequired,
      gating_reasons_count: event.gating.reasons.length,
      gating_reasons: event.gating.reasons, // Safe: only reason labels, no content
      at: event.at,
    };

    // Add scores if present
    if (event.scores) {
      if (event.scores.risk !== null && event.scores.risk !== undefined) {
        safeProps.score_risk = event.scores.risk;
      }
      if (event.scores.confidence !== null && event.scores.confidence !== undefined) {
        safeProps.score_confidence = event.scores.confidence;
      }
      if (event.scores.priorityLabel) {
        safeProps.score_priority_label = event.scores.priorityLabel;
      }
    }

    // Add source meta if present
    if (event.sourceMeta) {
      if (event.sourceMeta.notesUsed !== undefined) {
        safeProps.source_notes_used = event.sourceMeta.notesUsed;
      }
      if (event.sourceMeta.timelineUsed !== undefined) {
        safeProps.source_timeline_used = event.sourceMeta.timelineUsed;
      }
    }

    // Emit main audit event
    capture('ai_audit', safeProps);

    // Emit firewall-specific event if firewall was active
    if (event.firewall.injectionDetected || Object.values(event.firewall.redactionCounts).some(count => count > 0)) {
      capture('ai_firewall', {
        lead_id: event.leadId,
        run_hash_short: event.runHashShort,
        injection_detected: event.firewall.injectionDetected,
        redaction_counts: event.firewall.redactionCounts,
        at: event.at,
      });
    }
  } catch (err) {
    // Fail-safe: silently no-op on errors (don't break normalize flow)
    console.debug('[aiAudit] Failed to emit audit event:', err);
  }
}

