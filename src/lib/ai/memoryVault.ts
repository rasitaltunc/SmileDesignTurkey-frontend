// Memory Vault v1 - Scoped memory notes + role-filtered context

import type { CanonicalV11 } from './canonicalTypes';
import { getRoleScope, type AIRole } from './aiRoles';

export type MemoryScope = "patient" | "doctor" | "internal";

export interface MemoryV1 {
  version: "1.0";
  scope: MemoryScope;
  lead_id: string;
  updated_at: string;
  run_hash_short?: string;
  facts: Array<{ key: string; value: string; confidence?: number }>;
  events_summary: string[];
  preferences: string[];
  constraints: string[];
  next_best_action?: {
    label: string;
    channel?: string;
    due_hours?: number;
    script?: string;
  };
  open_questions: string[];
  missing_fields: string[];
  safety: {
    pii_redacted: boolean;
    injection_detected?: boolean;
  };
  sources?: {
    canonical_version?: string;
    notes_used_count?: number;
    timeline_used_count?: number;
  };
}

/**
 * Build memory from canonical (scope-aware PII handling)
 */
export function buildMemoryFromCanonical(
  canonical: CanonicalV11,
  leadTruth: {
    phone?: string;
    email?: string;
    name?: string;
  },
  scope: MemoryScope
): MemoryV1 {
  const facts: Array<{ key: string; value: string; confidence?: number }> = [];
  const preferences: string[] = [];
  const constraints: string[] = [];
  const events_summary: string[] = [];
  const open_questions: string[] = [];
  const missing_fields: string[] = [];

  // Build facts (scope-aware)
  if (scope === "patient") {
    // Patient scope: NO PII, only treatment-related facts
    if (canonical.facts.treatment_interest && canonical.facts.treatment_interest.length > 0) {
      facts.push({
        key: "treatment_interest",
        value: canonical.facts.treatment_interest.join(", "),
      });
    }
    if (canonical.facts.budget) {
      facts.push({
        key: "budget_hint",
        value: `Budget range: ${canonical.facts.budget} EUR`,
      });
    }
    if (canonical.facts.time_window) {
      facts.push({
        key: "timeline",
        value: `Preferred timeline: ${canonical.facts.time_window}`,
      });
    }
    if (canonical.facts.objections && canonical.facts.objections.length > 0) {
      facts.push({
        key: "objections",
        value: canonical.facts.objections.join(", "),
      });
    }
  } else if (scope === "doctor") {
    // Doctor scope: can include PII if role allows (but minimal)
    if (leadTruth.name) {
      facts.push({ key: "name", value: leadTruth.name });
    }
    if (leadTruth.email) {
      facts.push({ key: "email", value: leadTruth.email });
    }
    if (leadTruth.phone) {
      facts.push({ key: "phone", value: leadTruth.phone });
    }
    if (canonical.facts.treatment_interest && canonical.facts.treatment_interest.length > 0) {
      facts.push({
        key: "treatment_interest",
        value: canonical.facts.treatment_interest.join(", "),
      });
    }
    if (canonical.facts.budget) {
      facts.push({
        key: "budget",
        value: `${canonical.facts.budget} EUR`,
      });
    }
  } else {
    // Internal scope: more operational details (but still no raw notes)
    if (leadTruth.name) {
      facts.push({ key: "name", value: leadTruth.name });
    }
    if (leadTruth.email) {
      facts.push({ key: "email", value: leadTruth.email });
    }
    if (leadTruth.phone) {
      facts.push({ key: "phone", value: leadTruth.phone });
    }
    if (canonical.facts.source) {
      facts.push({ key: "source", value: canonical.facts.source });
    }
    if (canonical.facts.treatment_interest && canonical.facts.treatment_interest.length > 0) {
      facts.push({
        key: "treatment_interest",
        value: canonical.facts.treatment_interest.join(", "),
      });
    }
    if (canonical.facts.budget) {
      facts.push({
        key: "budget",
        value: `${canonical.facts.budget} EUR`,
      });
    }
  }

  // Events summary (no PII, only structured summaries)
  if (canonical.events_summary.last_activity_at) {
    events_summary.push(`Last activity: ${new Date(canonical.events_summary.last_activity_at).toLocaleDateString()}`);
  }
  if (canonical.events_summary.booking_status) {
    events_summary.push(`Booking status: ${canonical.events_summary.booking_status}`);
  }

  // Preferences (scope-aware)
  if (canonical.facts.preferences && canonical.facts.preferences.length > 0) {
    preferences.push(...canonical.facts.preferences);
  }
  if (canonical.next_best_action.channel && canonical.next_best_action.channel !== 'unknown') {
    preferences.push(`Preferred contact: ${canonical.next_best_action.channel}`);
  }

  // Constraints
  if (canonical.missing_fields.includes('phone')) {
    constraints.push('No phone number available');
  }
  if (canonical.missing_fields.includes('email')) {
    constraints.push('No email available');
  }
  if (canonical.facts.objections && canonical.facts.objections.length > 0) {
    constraints.push(`Objections: ${canonical.facts.objections.join(', ')}`);
  }

  // Open questions
  if (canonical.open_questions && canonical.open_questions.length > 0) {
    open_questions.push(...canonical.open_questions);
  }

  // Missing fields
  missing_fields.push(...canonical.missing_fields);

  // Next best action (scope-aware script)
  let next_best_action: MemoryV1['next_best_action'] | undefined;
  if (canonical.next_best_action) {
    let script = canonical.next_best_action.script.join('\n');
    
    // Patient scope: remove any contact info from script
    if (scope === "patient") {
      // Remove phone/email patterns
      script = script.replace(/\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{2,4}[-.\s]?\d{2,4}/g, '[contact removed]');
      script = script.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[contact removed]');
    }
    
    next_best_action = {
      label: canonical.next_best_action.label,
      channel: canonical.next_best_action.channel,
      due_hours: canonical.next_best_action.due_hours,
      script: script || undefined,
    };
  }

  return {
    version: "1.0",
    scope,
    lead_id: canonical.lead_id,
    updated_at: canonical.updated_at,
    run_hash_short: canonical.security?.firewall?.run_hash,
    facts,
    events_summary,
    preferences,
    constraints,
    next_best_action,
    open_questions,
    missing_fields,
    safety: {
      pii_redacted: scope === "patient", // Patient scope always redacted
      injection_detected: canonical.security?.firewall?.injection_detected,
    },
    sources: {
      canonical_version: canonical.version,
      notes_used_count: canonical.sources.notes_used_count,
      timeline_used_count: canonical.sources.timeline_used_count,
    },
  };
}

/**
 * Convert memory to system note format
 */
export function toMemorySystemNote(memory: MemoryV1): string {
  return `[AI_MEMORY_V1 scope=${memory.scope}]\n${JSON.stringify(memory, null, 2)}`;
}

/**
 * Check if note is a memory note
 */
export function isMemoryNote(noteText: string): boolean {
  return noteText.trim().startsWith('[AI_MEMORY_V1');
}

/**
 * Extract memory JSON from note text
 */
export function extractMemoryJson(noteText: string): MemoryV1 | null {
  if (!isMemoryNote(noteText)) return null;

  try {
    const lines = noteText.split('\n');
    const jsonStart = lines.findIndex(l => l.trim().startsWith('{'));
    if (jsonStart === -1) return null;

    const jsonText = lines.slice(jsonStart).join('\n');
    const parsed = JSON.parse(jsonText);
    
    if (parsed.version === '1.0' && parsed.scope && parsed.lead_id) {
      return parsed as MemoryV1;
    }
    
    return null;
  } catch (err) {
    console.error('[memoryVault] Failed to parse memory:', err);
    return null;
  }
}

/**
 * Find latest memory note for a scope
 */
export function findLatestMemory(
  notes: Array<{ note: string; created_at: string }>,
  scope: MemoryScope
): MemoryV1 | null {
  const memoryNotes = notes
    .filter(n => {
      const content = n.note || '';
      return isMemoryNote(content) && content.includes(`scope=${scope}`);
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (memoryNotes.length === 0) return null;

  return extractMemoryJson(memoryNotes[0].note);
}

/**
 * Build role-filtered context pack for chat
 */
export function buildContextPack(
  role: AIRole,
  canonical: CanonicalV11 | null,
  memoryPatient: MemoryV1 | null,
  memoryDoctor: MemoryV1 | null,
  memoryInternal: MemoryV1 | null
): string {
  const scope = getRoleScope(role);
  
  // Select memory based on role
  let memory: MemoryV1 | null = null;
  if (scope.canSeePII && memoryInternal) {
    memory = memoryInternal;
  } else if (scope.canSeePII && memoryDoctor) {
    memory = memoryDoctor;
  } else if (memoryPatient) {
    memory = memoryPatient;
  }

  if (!memory) {
    return "No memory available for this lead.";
  }

  const parts: string[] = [];

  // Known facts
  if (memory.facts.length > 0) {
    parts.push("Known facts:");
    memory.facts.forEach(fact => {
      parts.push(`- ${fact.key}: ${fact.value}`);
    });
  }

  // What happened
  if (memory.events_summary.length > 0) {
    parts.push("\nWhat happened:");
    memory.events_summary.forEach(event => {
      parts.push(`- ${event}`);
    });
  }

  // Next best action
  if (memory.next_best_action) {
    parts.push(`\nNext best action: ${memory.next_best_action.label}`);
    if (memory.next_best_action.due_hours) {
      parts.push(`Due in ${memory.next_best_action.due_hours} hours`);
    }
    if (memory.next_best_action.channel) {
      parts.push(`Channel: ${memory.next_best_action.channel}`);
    }
  }

  // Open questions
  if (memory.open_questions.length > 0) {
    parts.push("\nOpen questions:");
    memory.open_questions.forEach(q => {
      parts.push(`- ${q}`);
    });
  }

  // Missing fields
  if (memory.missing_fields.length > 0) {
    parts.push("\nMissing information:");
    parts.push(`- ${memory.missing_fields.join(', ')}`);
  }

  return parts.join('\n');
}

