import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * CRM MVP - Leads API Endpoint
 * 
 * Handles GET (list leads) and PATCH (update lead status/notes)
 * Uses admin token authentication
 * Uses Service Role key for database operations (server-side only)
 */

interface LeadUpdate {
  id: string; // TEXT type in database
  status?: string;
  notes?: string;
  assigned_to?: string;
  follow_up_at?: string | null; // ISO string timestamp or null to clear
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers - set early
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token');

  // Handle OPTIONS request early
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Wrap entire handler in try/catch to prevent unhandled errors
  try {
    // Step 1: Verify admin token FIRST (before touching Supabase)
    const adminToken = req.headers['x-admin-token'] as string | undefined;
    const expectedToken = process.env.ADMIN_TOKEN;

    if (!expectedToken || !adminToken || adminToken !== expectedToken) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Step 2: Validate Supabase environment variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({ error: 'Missing SUPABASE env' });
    }

    // Step 3: Create Supabase client (only after validation)
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Step 4: Handle GET request (list leads)
    if (req.method === 'GET') {
      try {
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
          return res.status(500).json({ error: error.message || 'Database query failed' });
        }

        return res.status(200).json({ data: data || [] });
      } catch (err: any) {
        console.error('[API] GET leads exception:', err);
        return res.status(500).json({ error: err.message || 'Failed to fetch leads' });
      }
    }

    // Step 5: Handle PATCH request (update lead)
    if (req.method === 'PATCH') {
      try {
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
          return res.status(500).json({ error: error.message || 'Database update failed' });
        }

        if (!data) {
          return res.status(404).json({ error: 'Lead not found' });
        }

        return res.status(200).json({ data });
      } catch (err: any) {
        console.error('[API] PATCH leads exception:', err);
        return res.status(500).json({ error: err.message || 'Failed to update lead' });
      }
    }

    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    // Top-level catch for any unhandled errors
    console.error('[API] leads handler crash:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
