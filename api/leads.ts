import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
};

interface AuthResult {
  isAdmin: boolean;
  employeeId?: string;
  error?: string;
}

/**
 * Authenticate request based on X-Admin-Token header
 */
function authenticateRequest(token: string | undefined): AuthResult {
  if (!token) {
    return { isAdmin: false, error: 'Missing X-Admin-Token header' };
  }

  const adminToken = process.env.ADMIN_TOKEN;
  const employeeSecret = process.env.EMPLOYEE_SECRET;

  // Check if admin token
  if (adminToken && token === adminToken) {
    return { isAdmin: true };
  }

  // Check if employee token (format: EMPLOYEE:<employee_id>:<employee_secret>)
  if (employeeSecret && token.startsWith('EMPLOYEE:')) {
    const parts = token.split(':');
    if (parts.length === 3 && parts[0] === 'EMPLOYEE' && parts[2] === employeeSecret) {
      return { isAdmin: false, employeeId: parts[1] };
    }
  }

  return { isAdmin: false, error: 'Invalid token' };
}

/**
 * GET /api/leads - Fetch leads with filters
 */
async function handleGet(req: VercelRequest, res: VercelResponse, auth: AuthResult) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    let query = supabase.from('leads').select('*');

    // Employee mode: always filter by assigned_to
    if (!auth.isAdmin && auth.employeeId) {
      query = query.eq('assigned_to', auth.employeeId);
    } else {
      // Admin mode: apply filters from query params
      const assignedTo = req.query.assigned_to as string | undefined;
      if (assignedTo) {
        query = query.eq('assigned_to', assignedTo);
      }
    }

    // Status filter (both admin and employee)
    const status = req.query.status as string | undefined;
    if (status) {
      query = query.eq('status', status);
    }

    // Limit
    const limit = parseInt(req.query.limit as string) || 100;
    query = query.limit(limit);

    // Order by created_at desc
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('[API] Supabase error:', error);
      return res.status(500).json({ error: 'Failed to fetch leads' });
    }

    return res.status(200).json({ data: data || [] });
  } catch (error) {
    console.error('[API] Unhandled error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PATCH /api/leads - Update lead (status, notes, assigned_to)
 */
async function handlePatch(req: VercelRequest, res: VercelResponse, auth: AuthResult) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    const { id, status, notes, assigned_to } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Missing lead id' });
    }

    // Employee mode: verify lead is assigned to them
    if (!auth.isAdmin && auth.employeeId) {
      const { data: lead } = await supabase
        .from('leads')
        .select('assigned_to')
        .eq('id', id)
        .single();

      if (!lead || lead.assigned_to !== auth.employeeId) {
        return res.status(403).json({ error: 'Not authorized to update this lead' });
      }

      // Employee can only update status and notes (not assigned_to)
      const updateData: any = {};
      if (status !== undefined) updateData.status = status;
      if (notes !== undefined) updateData.notes = notes;

      const { error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('[API] Supabase update error:', error);
        return res.status(500).json({ error: 'Failed to update lead' });
      }

      return res.status(200).json({ data: { id, ...updateData } });
    }

    // Admin mode: can update all fields
    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to;

    const { error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('[API] Supabase update error:', error);
      return res.status(500).json({ error: 'Failed to update lead' });
    }

    return res.status(200).json({ data: { id, ...updateData } });
  } catch (error) {
    console.error('[API] Unhandled error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    return res.status(200).json({});
  }

  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Authenticate
  const token = req.headers['x-admin-token'] as string | undefined;
  const auth = authenticateRequest(token);

  if (auth.error) {
    return res.status(401).json({ error: auth.error });
  }

  // Route to handler
  if (req.method === 'GET') {
    return handleGet(req, res, auth);
  } else if (req.method === 'PATCH') {
    return handlePatch(req, res, auth);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

