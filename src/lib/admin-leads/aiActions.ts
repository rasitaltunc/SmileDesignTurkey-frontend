import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeLeadNote, type CanonicalNote, transformV10ToV11 } from '@/lib/ai/normalizeLeadNote';
import type { CanonicalAny, CanonicalV11 } from '@/lib/ai/canonicalTypes';
import { diffCanonical, safeMergeCanonical } from '@/lib/ai/canonicalDiff';
import { emitAIAudit } from '@/lib/ai/aiAudit';

export interface Lead {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  source: string;
  created_at: string;
  treatment?: string;
  status?: string;
}

export interface LeadNote {
  id: string;
  lead_id: string;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface TimelineEvent {
  receivedAt: string;
  eventType: string;
  [key: string]: any;
}

export interface ContactEvent {
  id: number;
  lead_id: string;
  channel: string;
  note: string | null;
  created_at: string;
}

export interface RunLeadAIAnalysisParams {
  supabase: SupabaseClient;
  apiUrl: string;
  leadId: string;
  onSuccess?: (data: { ai_risk_score: number | null; ai_summary: string | null }) => void;
  onError?: (err: unknown) => void;
}

/**
 * Run AI analysis for a lead.
 * Calls /api/leads-ai-analyze endpoint.
 */
export async function runLeadAIAnalysis(params: RunLeadAIAnalysisParams): Promise<void> {
  const { supabase, apiUrl, leadId, onSuccess, onError } = params;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) {
      throw new Error('No session token available');
    }

    const response = await fetch(`${apiUrl}/api/leads-ai-analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ lead_id: leadId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to analyze lead' }));
      throw new Error(errorData.error || 'Failed to analyze lead');
    }

    const result = await response.json();
    onSuccess?.(result);
  } catch (err) {
    onError?.(err);
    throw err;
  }
}

export interface NormalizeLeadIfNeededParams {
  supabase: SupabaseClient;
  apiUrl: string;
  leadId: string;
  lead: Lead;
  notes: LeadNote[];
  timeline: TimelineEvent[];
  contactEvents: ContactEvent[];
  lastContactedAt: string | null;
  prevCanonical: CanonicalAny | null;
  createNote: (leadId: string, content: string) => Promise<void>;
  onSuccess?: (canonical: CanonicalV11) => void;
  onError?: (err: unknown) => void;
}

/**
 * Normalize lead notes via AI.
 * Calls normalizeLeadNote, transforms to v1.1, applies safe merge, and saves as canonical note.
 */
export async function normalizeLeadIfNeeded(params: NormalizeLeadIfNeededParams): Promise<void> {
  const {
    supabase,
    apiUrl,
    leadId,
    lead,
    notes,
    timeline,
    contactEvents,
    lastContactedAt,
    prevCanonical,
    createNote,
    onSuccess,
    onError,
  } = params;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) {
      throw new Error('No session token available');
    }

    // Filter out existing canonical notes
    const humanNotes = notes.filter((n) => {
      const content = n.note || '';
      return !content.startsWith('[AI_CANONICAL_NOTE');
    });

    // Calculate incremental notes/events since last canonical
    const lastNoteAt = prevCanonical?.sources?.last_note_at;
    const newNotesSincePrev = lastNoteAt
      ? humanNotes.filter((n) => new Date(n.created_at) > new Date(lastNoteAt))
      : humanNotes;

    const newTimelineSincePrev = lastNoteAt
      ? timeline.filter((t) => new Date(t.receivedAt) > new Date(lastNoteAt))
      : timeline;

    // Call normalize function with memory prompting
    const normalizeResult = await normalizeLeadNote(
      {
        lead: {
          id: lead.id,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          source: lead.source,
          created_at: lead.created_at,
          treatment: lead.treatment,
          status: lead.status,
        },
        lastContactedAt,
        contactEvents,
        timeline,
        notes: humanNotes.slice(0, 10), // Last 10, excluding canonical
        prevCanonical: prevCanonical as CanonicalV11 | null,
        newNotesSincePrev: newNotesSincePrev.slice(0, 10),
        newTimelineSincePrev,
      },
      apiUrl,
      token
    );

    const firewallReport = normalizeResult.firewallReport;
    const runHash = normalizeResult.runHash;

    // Transform to v1.1 if needed
    let canonicalV11: CanonicalV11;
    if (normalizeResult.version === '1.1') {
      canonicalV11 = normalizeResult as CanonicalV11;
    } else {
      // Transform v1.0 to v1.1
      canonicalV11 = transformV10ToV11(normalizeResult as CanonicalNote, lead.id);
    }

    // Apply safe merge (lead ground truth > AI)
    canonicalV11 = safeMergeCanonical(canonicalV11, {
      phone: lead.phone,
      email: lead.email,
      source: lead.source,
      status: lead.status,
    });

    // Compute changelog via diff
    const changelog = diffCanonical(prevCanonical, canonicalV11, {
      phone: lead.phone,
      email: lead.email,
      source: lead.source,
      status: lead.status,
    });

    // Add changelog and sources to canonical
    canonicalV11.changelog = changelog;
    canonicalV11.updated_at = new Date().toISOString();
    canonicalV11.sources = {
      notes_used_count: humanNotes.length,
      timeline_used_count: timeline.length,
      last_note_at: humanNotes.length > 0 ? humanNotes[0].created_at : undefined,
    };

    // Inject firewall security meta into canonical
    if (firewallReport && runHash) {
      canonicalV11.security = canonicalV11.security || {};
      canonicalV11.security.firewall = {
        redaction_counts: firewallReport.redaction.counts,
        redaction_samples_masked: firewallReport.redaction.samples_masked,
        injection_detected: firewallReport.injection.detected,
        injection_signals: firewallReport.injection.signals.map((s) => ({ pattern: s.pattern, match: s.match })),
        detected_contacts_masked: {
          emails: firewallReport.detected_contacts.emails_masked,
          phones: firewallReport.detected_contacts.phones_masked,
        },
        applied_at: new Date().toISOString(),
        run_hash: runHash,
      };
    }

    // Review gating logic (strengthened with firewall)
    const reviewReasons: string[] = [];
    if (canonicalV11.confidence !== null && canonicalV11.confidence < 55) {
      reviewReasons.push('Low confidence');
    }
    if (changelog.conflicts.length > 0) {
      reviewReasons.push('Conflicts detected');
    }
    if (
      canonicalV11.missing_fields.length >= 3 &&
      (!canonicalV11.next_best_action.script || canonicalV11.next_best_action.script.length === 0)
    ) {
      reviewReasons.push('Insufficient info for script');
    }

    // Firewall-based review gating
    if (firewallReport) {
      if (firewallReport.injection.detected) {
        reviewReasons.push('Prompt-injection signals detected');
      }
      if (firewallReport.detected_contacts.emails_masked.length > 0 && !lead.email) {
        reviewReasons.push('Potential contact data detected in notes');
      }
      if (firewallReport.detected_contacts.phones_masked.length > 0 && !lead.phone) {
        reviewReasons.push('Potential contact data detected in notes');
      }
    }

    canonicalV11.review_required = reviewReasons.length > 0;
    // De-dupe review reasons
    canonicalV11.review_reasons = [...new Set(reviewReasons)];

    // Emit audit event (privacy-safe, no raw content)
    if (firewallReport && runHash) {
      emitAIAudit({
        type: 'normalize_run',
        leadId: lead.id,
        runHashShort: runHash,
        firewall: {
          injectionDetected: firewallReport.injection.detected,
          redactionCounts: firewallReport.redaction.counts,
        },
        gating: {
          reviewRequired: canonicalV11.review_required,
          reasons: canonicalV11.review_reasons,
        },
        scores: {
          risk: canonicalV11.risk_score ?? undefined,
          confidence: canonicalV11.confidence ?? undefined,
          priorityLabel: (canonicalV11 as any).priority || undefined,
        },
        sourceMeta: {
          notesUsed: canonicalV11.sources.notes_used_count,
          timelineUsed: canonicalV11.sources.timeline_used_count,
        },
        at: canonicalV11.updated_at,
      });
    }

    // Save as system note (v1.1)
    const canonicalNoteContent = `[AI_CANONICAL_NOTE v1.1]\n${JSON.stringify(canonicalV11, null, 2)}`;
    await createNote(leadId, canonicalNoteContent);

    onSuccess?.(canonicalV11);
  } catch (err) {
    onError?.(err);
    throw err;
  }
}


