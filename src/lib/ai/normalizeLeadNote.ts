// AI Note Normalizer - Canonical JSON Schema (v1.0 and v1.1)

import type { CanonicalV11 } from './canonicalTypes';
import type { FirewallReport } from './dataFirewall';

export interface CanonicalNote {
  version: string;
  leadId: string;
  summary_1line: string;
  summary_bullets: string[];
  status: "new" | "contacted" | "booking_pending" | "booked" | "cold" | "lost";
  priority: "hot" | "warm" | "cool";
  risk_score: number;
  confidence: number;
  intent: "pricing" | "consultation" | "booking" | "info" | "complaint" | "unknown";
  treatment_interest: string[];
  objections: string[];
  constraints: {
    budget_eur?: number;
    timeline: "asap" | "1-2w" | "1m+" | "unknown";
    travel_date?: string;
  };
  next_best_action: {
    label: string;
    due_hours: number;
    script: string[];
  };
  missing_fields: Array<"phone" | "email" | "photos" | "xray" | "passport" | "preferred_dates">;
  what_changed?: string[];
  evidence: {
    last_contact: "never" | "phone" | "whatsapp" | "email";
    last_activity_at?: string;
    notes_used_count: number;
  };
}

export interface NormalizeInput {
  lead: {
    id: string;
    name?: string;
    email?: string;
    phone?: string;
    source: string;
    created_at: string;
    treatment?: string;
    status?: string;
  };
  lastContactedAt: string | null;
  contactEvents: Array<{
    channel: string;
    note?: string;
    created_at: string;
  }>;
  timeline: Array<{
    eventType: string;
    receivedAt: string;
    title?: string;
    additionalNotes?: string;
  }>;
  notes: Array<{
    note: string;
    created_at: string;
  }>;
  prevCanonical?: CanonicalV11 | null;
  newNotesSincePrev?: Array<{
    note: string;
    created_at: string;
  }>;
  newTimelineSincePrev?: Array<{
    eventType: string;
    receivedAt: string;
    title?: string;
    additionalNotes?: string;
  }>;
}

// Extract JSON from response (handle markdown code blocks or extra text)
export function extractJSONFromResponse(text: string): string {
  // Remove markdown code blocks if present
  let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  
  // Find first { and last }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('No valid JSON found in response');
  }
  
  return cleaned.substring(firstBrace, lastBrace + 1);
}

// Normalize lead notes via AI Gateway (server-side)
export async function normalizeLeadNote(
  input: NormalizeInput,
  apiUrl: string,
  adminToken: string
): Promise<CanonicalV11 & { firewallReport?: FirewallReport; runHash?: string }> {
  // Get Supabase access token for auth
  const { getSupabaseClient } = await import('../supabaseClient');
  const supabase = getSupabaseClient();
  
  if (!supabase) {
    throw new Error('Supabase client not configured');
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated. Please sign in again.');
  }

  // Call AI Gateway endpoint
  const gatewayUrl = `${apiUrl}/api/ai/normalize`;
  
  const response = await fetch(gatewayUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      leadId: input.lead.id,
      prevCanonical: input.prevCanonical || null,
      newNotesSincePrev: input.newNotesSincePrev || [],
      newTimelineSincePrev: input.newTimelineSincePrev || [],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to normalize notes' }));
    
    if (response.status === 401) {
      throw new Error('Authentication failed. Please sign in again.');
    }
    if (response.status === 403) {
      throw new Error('Access denied. Only admin and employee roles can normalize leads.');
    }
    if (response.status === 429) {
      throw new Error(errorData.error || 'Rate limit exceeded. Please wait 15 seconds.');
    }
    
    throw new Error(errorData.error || errorData.message || 'Failed to normalize notes');
  }

  const result = await response.json();
  
  if (!result.ok || !result.canonical) {
    throw new Error('Invalid response from AI gateway');
  }

  // Return canonical v1.1 (firewall report and runHash will be in security.firewall if present)
  const canonical = result.canonical as CanonicalV11;
  
  // Extract firewall report from security.firewall if present
  let firewallReport: FirewallReport | undefined;
  let runHash: string | undefined;
  
  if (canonical.security?.firewall) {
    const fw = canonical.security.firewall;
    firewallReport = {
      redaction: {
        applied: Object.values(fw.redaction_counts || {}).some(count => count > 0),
        counts: {
          email: fw.redaction_counts?.email || 0,
          phone: fw.redaction_counts?.phone || 0,
          iban: fw.redaction_counts?.iban || 0,
          trid: fw.redaction_counts?.trid || 0,
          credit_card: fw.redaction_counts?.credit_card || 0,
          passport_like: fw.redaction_counts?.passport_like || 0,
        },
        samples_masked: fw.redaction_samples_masked || {},
      },
      injection: {
        detected: fw.injection_detected || false,
        signals: (fw.injection_signals || []).map(s => ({
          pattern: s.pattern,
          match: s.match,
        })),
      },
      detected_contacts: {
        emails_masked: fw.detected_contacts_masked?.emails || [],
        phones_masked: fw.detected_contacts_masked?.phones || [],
      },
    };
    runHash = fw.run_hash;
  }

  return {
    ...canonical,
    firewallReport,
    runHash,
  };
}

// Transform v1.0 to v1.1 format (for backward compatibility)
export function transformV10ToV11(v10: CanonicalNote, leadId: string): CanonicalV11 {
  return {
    version: '1.1',
    lead_id: leadId,
    updated_at: new Date().toISOString(),
    facts: {
      name: undefined,
      phone: undefined,
      email: undefined,
      source: undefined,
      treatment_interest: v10.treatment_interest || [],
      budget: v10.constraints?.budget_eur,
      time_window: v10.constraints?.timeline,
      objections: v10.objections || [],
      preferences: [],
    },
    events_summary: {
      last_activity_at: v10.evidence?.last_activity_at,
      last_contact_at: undefined,
      booking_status: v10.status === 'booked' ? 'booked' : undefined,
    },
    next_best_action: {
      label: v10.next_best_action.label,
      due_hours: v10.next_best_action.due_hours,
      script: v10.next_best_action.script,
      channel: 'unknown',
    },
    missing_fields: v10.missing_fields || [],
    open_questions: [],
    risk_score: v10.risk_score,
    confidence: v10.confidence,
    changelog: {
      added: [],
      updated: [],
      removed: [],
      conflicts: [],
    },
    sources: {
      notes_used_count: v10.evidence?.notes_used_count || 0,
      timeline_used_count: 0,
    },
    review_required: false,
    review_reasons: [],
  };
}

