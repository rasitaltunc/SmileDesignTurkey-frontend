// AI Gateway v1 - Server-side normalize endpoint
// POST /api/ai/normalize
// Authorization: Bearer <supabase_access_token>
// Role: admin | employee only

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Rate-limit: in-memory map (best-effort, resets on serverless cold start)
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_COOLDOWN_MS = 15000; // 15 seconds

interface NormalizeRequest {
  leadId: string;
  prevCanonical?: any;
  newNotesSincePrev?: Array<{ note: string; created_at: string }>;
  newTimelineSincePrev?: Array<{ eventType: string; receivedAt: string; title?: string; additionalNotes?: string }>;
}

// Verify Supabase access token and extract user + role
async function verifyAuth(authHeader: string | undefined): Promise<{ userId: string; role: string | null } | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return null;
    }

    // Get role from app_metadata or RPC
    let role: string | null = null;
    try {
      const { data: roleData, error: roleError } = await supabase.rpc('get_current_user_role');
      if (!roleError && roleData) {
        role = String(roleData).trim().toLowerCase() || null;
      }
    } catch (err) {
      // Fallback: try app_metadata
      role = (user.app_metadata?.role as string)?.toLowerCase() || null;
    }

    return { userId: user.id, role };
  } catch (err) {
    console.error('[ai/normalize] Auth verification error:', err);
    return null;
  }
}

// Check rate limit
function checkRateLimit(userId: string, leadId: string): boolean {
  const key = `${userId}:${leadId}`;
  const lastRequest = rateLimitMap.get(key);
  const now = Date.now();

  if (lastRequest && (now - lastRequest) < RATE_LIMIT_COOLDOWN_MS) {
    return false; // Rate limited
  }

  rateLimitMap.set(key, now);
  return true;
}

// Fetch lead data (server-side)
async function fetchLeadData(leadId: string) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || supabaseUrl.trim().length === 0) {
    throw new Error('SUPABASE_URL not configured. Please set SUPABASE_URL in Vercel environment variables.');
  }
  if (!supabaseServiceKey || supabaseServiceKey.trim().length === 0) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured. Please set SUPABASE_SERVICE_ROLE_KEY in Vercel environment variables.');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Fetch lead
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single();

  if (leadError || !lead) {
    throw new Error('Lead not found');
  }

  // Fetch notes
  let notes: any[] = [];
  try {
    const { data: notesData, error: notesError } = await supabase
      .from('lead_notes')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (!notesError && notesData) {
      notes = notesData;
    }
  } catch (err) {
    console.warn('[ai/normalize] Notes fetch error (non-fatal):', err);
  }

  // Fetch timeline events
  let timeline: any[] = [];
  if (lead.cal_booking_uid) {
    try {
      const { data: timelineData, error: timelineError } = await supabase
        .from('cal_webhook_events')
        .select('*')
        .eq('cal_booking_uid', lead.cal_booking_uid)
        .order('received_at', { ascending: true });

      if (!timelineError && timelineData) {
        timeline = timelineData;
      }
    } catch (err) {
      console.warn('[ai/normalize] Timeline fetch error (non-fatal):', err);
    }
  }

  // Fetch contact events
  let contactEvents: any[] = [];
  try {
    const { data: contactData, error: contactError } = await supabase
      .from('lead_contact_events')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (!contactError && contactData) {
      contactEvents = contactData;
    }
  } catch (err) {
    console.warn('[ai/normalize] Contact events fetch error (non-fatal):', err);
  }

  return {
    lead,
    notes,
    timeline,
    contactEvents,
    lastContactedAt: lead.last_contacted_at || null,
  };
}

// Call OpenAI API (server-side)
async function callOpenAI(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('OPENAI_API_KEY not configured. Please set OPENAI_API_KEY in Vercel environment variables.');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an AI assistant that analyzes lead data and returns ONLY valid JSON matching the Canonical v1.1 schema. Never include markdown, explanations, or any text outside the JSON object.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'OpenAI API error' }));
    throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

// Extract JSON from response
function extractJSON(text: string): any {
  // Remove markdown code blocks
  let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  
  // Find first { and last }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('No valid JSON found in response');
  }
  
  const jsonText = cleaned.substring(firstBrace, lastBrace + 1);
  return JSON.parse(jsonText);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    // 1) Verify auth
    const auth = await verifyAuth(req.headers.authorization);
    if (!auth) {
      return res.status(401).json({ error: 'Invalid or missing authorization token' });
    }

    const { userId, role } = auth;

    // 2) Role check: only admin | employee
    if (role !== 'admin' && role !== 'employee') {
      return res.status(403).json({ error: 'Access denied. Only admin and employee roles can normalize leads.' });
    }

    // 3) Parse request
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { leadId, prevCanonical, newNotesSincePrev, newTimelineSincePrev }: NormalizeRequest = body;

    if (!leadId) {
      return res.status(400).json({ error: 'Missing leadId' });
    }

    // 4) Rate limit check
    if (!checkRateLimit(userId, leadId)) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded. Please wait 15 seconds before trying again.',
        retryAfter: 15,
      });
    }

    // 5) Fetch lead data
    const { lead, notes, timeline, contactEvents, lastContactedAt } = await fetchLeadData(leadId);

    // 6) Build normalize input (reuse client-side logic structure)
    // Note: We'll need to port firewall logic to server or call it here
    // For now, we'll build a simplified prompt that includes sanitization hints

    const leadTruth = {
      id: lead.id,
      name: lead.name || undefined,
      email: lead.email || undefined,
      phone: lead.phone || undefined,
      source: lead.source || 'unknown',
      created_at: lead.created_at,
      treatment: lead.treatment || undefined,
      status: lead.status || 'new',
    };

    // Format notes (exclude AI canonical notes)
    const humanNotes = notes
      .filter(n => !n.note?.includes('[AI_CANONICAL_NOTE') && !n.note?.includes('[AI_MEMORY_V1'))
      .map(n => ({
        note: n.note || n.content || '',
        created_at: n.created_at,
      }));

    // Format timeline
    const formattedTimeline = timeline.map(e => ({
      eventType: e.event_type || e.eventType || 'unknown',
      receivedAt: e.received_at || e.receivedAt || e.created_at,
      title: e.title || undefined,
      additionalNotes: e.additional_notes || e.additionalNotes || undefined,
    }));

    // Format contact events
    const formattedContactEvents = contactEvents.map(e => ({
      channel: e.channel || 'unknown',
      note: e.note || undefined,
      created_at: e.created_at,
    }));

    // Build prompt (simplified - in production, port full firewall logic)
    const prompt = `
Lead Ground Truth (ALWAYS USE THESE VALUES - DO NOT INVENT):
- ID: ${leadTruth.id}
- Name: ${leadTruth.name || 'unknown'}
- Email: ${leadTruth.email || 'unknown'}
- Phone: ${leadTruth.phone || 'unknown'}
- Source: ${leadTruth.source}
- Created: ${leadTruth.created_at}
- Treatment: ${leadTruth.treatment || 'unknown'}
- Status: ${leadTruth.status || 'new'}

Last Contacted: ${lastContactedAt || 'never'}

Contact Attempts:
${formattedContactEvents.length === 0 ? 'None' : formattedContactEvents.map(e => `- ${e.channel} on ${e.created_at}: ${e.note || 'no note'}`).join('\n')}

Timeline Events:
${formattedTimeline.length > 0 ? formattedTimeline.map(e => `- ${e.eventType} on ${e.receivedAt}${e.title ? `: ${e.title}` : ''}${e.additionalNotes ? ` (${e.additionalNotes})` : ''}`).join('\n') : 'None'}

Notes:
${humanNotes.length > 0 ? humanNotes.map(n => `- ${n.note} (${n.created_at})`).join('\n') : 'None'}

${prevCanonical ? `\nPrevious Canonical Snapshot (v${prevCanonical.version}):\n${JSON.stringify(prevCanonical, null, 2)}\n\nIMPORTANT: Use the previous canonical as context. Only update fields that have actually changed based on new information.` : ''}

Analyze this lead and return ONLY valid JSON matching Canonical v1.1 schema:
{
  "version": "1.1",
  "lead_id": "<string>",
  "updated_at": "<ISO string>",
  "facts": {
    "name": "<string optional>",
    "phone": "<string optional>",
    "email": "<string optional>",
    "source": "<string optional>",
    "treatment_interest": ["<string>"],
    "budget": <number optional>,
    "time_window": "<string optional>",
    "objections": ["<string>"],
    "preferences": ["<string>"]
  },
  "events_summary": {
    "last_activity_at": "<ISO string optional>",
    "last_contact_at": "<ISO string optional>",
    "booking_status": "<string optional>",
    "booking_time": "<ISO string optional>"
  },
  "next_best_action": {
    "label": "<string>",
    "due_hours": <number>,
    "script": ["<string>", "..."],
    "channel": "phone|whatsapp|email|note|unknown"
  },
  "missing_fields": ["phone|email|photos|xray|passport|preferred_dates"],
  "open_questions": ["<string>", "..."],
  "risk_score": <number 0-100 or null>,
  "confidence": <number 0-100 or null>,
  "changelog": {
    "added": [],
    "updated": [],
    "removed": [],
    "conflicts": []
  },
  "sources": {
    "notes_used_count": <number>,
    "timeline_used_count": <number>,
    "last_note_at": "<ISO string optional>"
  },
  "review_required": <boolean>,
  "review_reasons": ["<string>", "..."]
}

IMPORTANT: 
- Return ONLY valid JSON matching Canonical v1.1 schema. No markdown, no explanations.
- Use lead ground truth values (phone/email/source) exactly as provided above. Do not invent or change them.
- If information is missing, use "unknown" or omit optional fields. Never invent data.
- Compare with previous canonical (if provided) and only update fields that have actually changed.
- Set review_required: true if confidence < 0.55 or if you detect conflicts with lead ground truth.
`;

    // 7) Call OpenAI
    const aiResponse = await callOpenAI(prompt);
    
    // 8) Parse and validate response
    const canonical = extractJSON(aiResponse);
    
    // Ensure v1.1 structure
    if (!canonical.version || canonical.version !== '1.1') {
      canonical.version = '1.1';
    }
    if (!canonical.lead_id) {
      canonical.lead_id = leadId;
    }
    if (!canonical.updated_at) {
      canonical.updated_at = new Date().toISOString();
    }

    // 9) Emit audit event (privacy-safe)
    try {
      const posthog = (global as any).posthog;
      if (posthog && typeof posthog.capture === 'function') {
        posthog.capture('ai_gateway_request', {
          user_id: userId,
          role,
          lead_id: leadId,
          at: new Date().toISOString(),
        });
      }
    } catch (auditErr) {
      // Silent fail
      console.debug('[ai/normalize] Audit event failed:', auditErr);
    }

    // 10) Return canonical
    return res.status(200).json({
      ok: true,
      canonical,
    });

  } catch (error: any) {
    console.error('[ai/normalize] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message || 'Unknown error',
    });
  }
}

