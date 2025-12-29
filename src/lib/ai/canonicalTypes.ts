// Canonical Note Schema v1.1 Types

export interface CanonicalV11 {
  version: "1.1";
  lead_id: string;
  updated_at: string;
  facts: {
    name?: string;
    phone?: string;
    email?: string;
    source?: string;
    language?: string;
    country?: string;
    city?: string;
    treatment_interest?: string[];
    budget?: number;
    time_window?: string;
    objections?: string[];
    preferences?: string[];
  };
  events_summary: {
    last_activity_at?: string;
    last_contact_at?: string;
    booking_status?: string;
    booking_time?: string;
  };
  next_best_action: {
    label: string;
    due_hours: number;
    script: string[];
    channel: "phone" | "whatsapp" | "email" | "note" | "unknown";
  };
  missing_fields: string[];
  open_questions: string[];
  risk_score: number | null;
  confidence: number | null;
  changelog: {
    added: string[];
    updated: string[];
    removed: string[];
    conflicts: string[];
  };
  sources: {
    notes_used_count: number;
    timeline_used_count: number;
    last_note_at?: string;
  };
  review_required: boolean;
  review_reasons: string[];
  last_run_hash?: string;
  security?: {
    firewall?: {
      redaction_counts?: Partial<Record<string, number>>;
      redaction_samples_masked?: Partial<Record<string, string[]>>;
      injection_detected?: boolean;
      injection_signals?: Array<{ pattern: string; match: string }>;
      detected_contacts_masked?: { emails: string[]; phones: string[] };
      applied_at?: string;
      run_hash?: string;
    };
  };
}

