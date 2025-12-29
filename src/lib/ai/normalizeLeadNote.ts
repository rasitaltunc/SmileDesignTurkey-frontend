// AI Note Normalizer - Canonical JSON Schema v1.0

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

// Normalize lead notes via AI API
export async function normalizeLeadNote(
  input: NormalizeInput,
  apiUrl: string,
  adminToken: string
): Promise<CanonicalNote> {
  // Prepare input text for AI
  const inputText = `
Lead Information:
- ID: ${input.lead.id}
- Name: ${input.lead.name || 'unknown'}
- Email: ${input.lead.email || 'unknown'}
- Phone: ${input.lead.phone || 'unknown'}
- Source: ${input.lead.source}
- Created: ${input.lead.created_at}
- Treatment: ${input.lead.treatment || 'unknown'}
- Status: ${input.lead.status || 'new'}

Last Contacted: ${input.lastContactedAt || 'never'}

Contact Attempts:
${input.contactEvents.length === 0 ? 'None' : input.contactEvents.map(e => `- ${e.channel} on ${e.created_at}: ${e.note || 'no note'}`).join('\n')}

Timeline Events:
${input.timeline.length === 0 ? 'None' : input.timeline.map(e => `- ${e.eventType} on ${e.receivedAt}${e.title ? `: ${e.title}` : ''}${e.additionalNotes ? ` (${e.additionalNotes})` : ''}`).join('\n')}

Recent Notes (last 10, excluding AI canonical notes):
${input.notes.slice(0, 10).map(n => `- ${n.note || ''} (${n.created_at})`).join('\n')}

Analyze this lead and return ONLY valid JSON matching this exact schema:
{
  "version": "1.0",
  "leadId": "<string>",
  "summary_1line": "<string>",
  "summary_bullets": ["<string>", "..."],
  "status": "new|contacted|booking_pending|booked|cold|lost",
  "priority": "hot|warm|cool",
  "risk_score": <number 0-100>,
  "confidence": <number 0-100>,
  "intent": "pricing|consultation|booking|info|complaint|unknown",
  "treatment_interest": ["<string>"],
  "objections": ["<string>"],
  "constraints": {
    "budget_eur": <number optional>,
    "timeline": "asap|1-2w|1m+|unknown",
    "travel_date": "<ISO string optional>"
  },
  "next_best_action": {
    "label": "<string>",
    "due_hours": <number>,
    "script": ["<string>", "..."]
  },
  "missing_fields": ["phone|email|photos|xray|passport|preferred_dates"],
  "what_changed": ["<string>", "..."],
  "evidence": {
    "last_contact": "never|phone|whatsapp|email",
    "last_activity_at": "<ISO optional>",
    "notes_used_count": <number>
  }
}

IMPORTANT: Return ONLY valid JSON. Do not include markdown, explanations, or any text outside the JSON object. If information is missing, use "unknown" or omit optional fields. Never invent data.
`;

  // Use the same AI analyze endpoint but with a special prompt for normalization
  const response = await fetch(`${apiUrl}/api/leads-ai-analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': adminToken,
    },
    body: JSON.stringify({
      lead_id: input.lead.id,
      normalize_mode: true,
      custom_prompt: inputText,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to normalize notes' }));
    throw new Error(errorData.error || 'Failed to normalize notes');
  }

  const result = await response.json();
  
  // Extract JSON from response (handle if wrapped in markdown or has extra text)
  // Try multiple possible response fields
  let jsonText = result.normalized_json || result.canonical_json || result.ai_summary || result.response || '';
  
  if (typeof jsonText !== 'string') {
    jsonText = JSON.stringify(jsonText);
  }
  
  try {
    // Try direct parse first
    const parsed = JSON.parse(jsonText);
    // Validate it has required fields
    if (parsed.version && parsed.leadId) {
      return parsed as CanonicalNote;
    }
    throw new Error('Invalid canonical note structure');
  } catch (parseErr) {
    // If that fails, try extracting JSON from text
    try {
      const extracted = extractJSONFromResponse(jsonText);
      const parsed = JSON.parse(extracted);
      if (parsed.version && parsed.leadId) {
        return parsed as CanonicalNote;
      }
      throw new Error('Invalid canonical note structure');
    } catch (extractErr) {
      throw new Error('Failed to parse canonical JSON from AI response');
    }
  }
}

