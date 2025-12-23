import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * CRM MVP Part 2 - Lead Notes API
 * 
 * Handles GET (list notes for a lead) and POST (create new note)
 * Uses Supabase Auth JWT for authentication
 * Uses Service Role key for database operations (server-side only)
 */

interface CreateNoteRequest {
  lead_id: string;
  content: string;
}

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function verifyAuth(req: VercelRequest): Promise<{ userId: string; isAdmin: boolean } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);
  if (!token) {
    return null;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    const isAdmin = user.user_metadata?.role === 'admin';

    return {
      userId: user.id,
      isAdmin,
    };
  } catch (err) {
    console.error('[API] Auth verification error:', err);
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verify authentication
  const auth = await verifyAuth(req);
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized. Valid Supabase JWT token required.' });
  }

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (e: any) {
    return res.status(500).json({ error: 'Server configuration error: ' + e.message });
  }

  try {
    // ======================
    // GET: List notes for a lead
    // ======================
    if (req.method === 'GET') {
      const leadId = req.query.leadId as string;

      if (!leadId || typeof leadId !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid leadId query parameter' });
      }

      // First, verify user has access to this lead (via RLS)
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('id, assigned_to')
        .eq('id', leadId)
        .single();

      if (leadError || !lead) {
        return res.status(404).json({ error: 'Lead not found or access denied' });
      }

      // Check if employee can access this lead
      if (!auth.isAdmin && lead.assigned_to !== auth.userId) {
        return res.status(403).json({ error: 'You can only view notes for leads assigned to you' });
      }

      // Fetch notes (newest first)
      const { data: notes, error: notesError } = await supabase
        .from('lead_notes')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (notesError) {
        console.error('[API] GET lead-notes error:', notesError);
        return res.status(500).json({ error: notesError.message });
      }

      return res.status(200).json({ data: notes || [] });
    }

    // ======================
    // POST: Create new note
    // ======================
    if (req.method === 'POST') {
      const body = req.body as CreateNoteRequest;
      const { lead_id, content } = body;

      if (!lead_id || typeof lead_id !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid lead_id' });
      }

      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({ error: 'Note content is required' });
      }

      // Verify user has access to this lead
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('id, assigned_to')
        .eq('id', lead_id)
        .single();

      if (leadError || !lead) {
        return res.status(404).json({ error: 'Lead not found or access denied' });
      }

      // Check if employee can access this lead
      if (!auth.isAdmin && lead.assigned_to !== auth.userId) {
        return res.status(403).json({ error: 'You can only add notes to leads assigned to you' });
      }

      // Create note
      const { data: note, error: insertError } = await supabase
        .from('lead_notes')
        .insert({
          lead_id,
          author_id: auth.userId,
          content: content.trim(),
        })
        .select('*')
        .single();

      if (insertError) {
        console.error('[API] POST lead-notes error:', insertError);
        return res.status(500).json({ error: insertError.message });
      }

      return res.status(201).json({ data: note });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('[API] lead-notes handler crash:', err);
    return res.status(500).json({ error: 'Server error: ' + (err.message || 'Unknown error') });
  }
}

