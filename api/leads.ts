import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * CRM MVP - Leads API Endpoint
 * 
 * Handles GET (list leads) and PATCH (update lead status/notes)
 * Uses Supabase Auth JWT for authentication
 * Uses Service Role key for database operations (server-side only)
 */

interface LeadUpdate {
  id: string; // TEXT type in database
  status?: string;
  notes?: string;
  assigned_to?: string;
  follow_up_at?: string | null; // ISO string timestamp or null to clear
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

function verifyAdminToken(req: VercelRequest): boolean {
  const adminToken = req.headers['x-admin-token'] as string | undefined;
  const expectedToken = process.env.ADMIN_TOKEN;

  if (!expectedToken || !adminToken) {
    return false;
  }

  return adminToken === expectedToken;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verify admin token - only admin token is allowed
  const isAdminToken = verifyAdminToken(req);
  if (!isAdminToken) {
    return res.status(401).json({ error: 'Unauthorized. Admin token required.' });
  }

  // Admin token verified - use service role key (RLS bypass)
  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (e: any) {
    return res.status(500).json({ error: 'Server configuration error: ' + e.message });
  }

  try {
    // ======================
    // GET: List leads
    // ======================
    if (req.method === 'GET') {
      const limit = Math.min(parseInt((req.query.limit as string) || '100', 10) || 100, 500);
      
      // Normalize and validate status filter
      const statusParam = (req.query.status ?? '').toString().trim().toLowerCase();
      const valid = ['new', 'contacted', 'booked', 'paid', 'completed'];
      const status = valid.includes(statusParam) ? statusParam : undefined;
      
      const assignedTo = req.query.assigned_to as string | undefined;

      let query = supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status) {
        query = query.eq('status', status);
      }

      // Admin token - can filter by assigned_to if provided
      if (assignedTo) {
        query = query.eq('assigned_to', assignedTo);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[API] GET leads error:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ data: data || [] });
    }

    // ======================
    // PATCH: Update lead
    // ======================
    if (req.method === 'PATCH') {
      const body = req.body as LeadUpdate;
      const { id, status, notes, assigned_to, follow_up_at } = body;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid id (must be TEXT)' });
      }

      // Build update object
      const update: {
        status?: string;
        notes?: string;
        assigned_to?: string;
        follow_up_at?: string | null;
      } = {};
      
      // Handle status update with strict normalization
      if (status !== undefined) {
        // Normalize: convert to string, trim, lowercase
        const normalized = String(status).trim().toLowerCase();
        
        // If empty after normalization, default to 'new'
        const finalStatus = normalized || 'new';
        
        // Validate against allowed list (DB constraint: leads_status_check)
        const validStatuses = ['new', 'contacted', 'booked', 'paid', 'completed'];
        if (!validStatuses.includes(finalStatus)) {
          return res.status(400).json({ 
            error: `Invalid status "${status}". Must be one of: ${validStatuses.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')}` 
          });
        }
        
        // Write ONLY normalized lowercase value to DB
        update.status = finalStatus;
      }
      if (typeof notes === 'string') {
        update.notes = notes;
      }
      if (follow_up_at !== undefined) {
        // Handle follow_up_at: accept ISO string or null to clear
        if (follow_up_at === null || follow_up_at === '') {
          update.follow_up_at = null;
        } else if (typeof follow_up_at === 'string') {
          // Validate ISO string format
          const date = new Date(follow_up_at);
          if (isNaN(date.getTime())) {
            return res.status(400).json({ error: 'Invalid follow_up_at format. Must be ISO 8601 string.' });
          }
          update.follow_up_at = date.toISOString();
        }
      }
      if (typeof assigned_to === 'string') {
        update.assigned_to = assigned_to;
      }

      if (Object.keys(update).length === 0) {
        return res.status(400).json({ error: 'Nothing to update' });
      }

      // Perform update (id is TEXT, so we use .eq() directly)
      // Using service role key (RLS bypass)
      const { data, error } = await supabase
        .from('leads')
        .update(update)
        .eq('id', id) // id is TEXT, this works correctly
        .select('*')
        .single();

      if (error) {
        console.error('[API] PATCH leads error:', error);
        return res.status(500).json({ error: error.message });
      }

      if (!data) {
        return res.status(404).json({ error: 'Lead not found' });
      }

      return res.status(200).json({ data });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('[API] leads handler crash:', err);
    return res.status(500).json({ error: 'Server error: ' + (err.message || 'Unknown error') });
  }
}

