const { createClient } = require('@supabase/supabase-js');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, x-admin-token',
};

function createSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase configuration');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

function authenticateRequest(token) {
  if (!token) return { isAdmin: false, error: 'Invalid credentials' };

  const adminToken = process.env.ADMIN_TOKEN;
  const employeeSecret = process.env.EMPLOYEE_SECRET;

  if (adminToken && token === adminToken) return { isAdmin: true };

  if (employeeSecret && token.startsWith('EMPLOYEE:')) {
    const parts = token.split(':');
    if (parts.length === 3 && parts[0] === 'EMPLOYEE' && parts[2] === employeeSecret) {
      return { isAdmin: false, employeeId: parts[1] };
    }
  }

  return { isAdmin: false, error: 'Invalid credentials' };
}

async function handleGet(req, res, auth) {
  let supabase;
  try {
    supabase = createSupabaseClient();
  } catch (e) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    let query = supabase.from('leads').select('*');

    if (!auth.isAdmin && auth.employeeId) {
      query = query.eq('assigned_to', auth.employeeId);
    } else {
      const assignedTo = req.query?.assigned_to;
      if (assignedTo) query = query.eq('assigned_to', assignedTo);
    }

    const status = req.query?.status;
    if (status) query = query.eq('status', status);

    const limit = parseInt(req.query?.limit, 10) || 100;
    query = query.limit(limit).order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: 'Failed to fetch leads' });

    return res.status(200).json({ data: data || [] });
  } catch (e) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handlePatch(req, res, auth) {
  let supabase;
  try {
    supabase = createSupabaseClient();
  } catch (e) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const { id, status, notes, assigned_to } = req.body || {};
    if (!id) return res.status(400).json({ error: 'Missing lead id' });

    if (!auth.isAdmin && auth.employeeId) {
      const { data: lead } = await supabase.from('leads').select('assigned_to').eq('id', id).single();
      if (!lead || lead.assigned_to !== auth.employeeId) {
        return res.status(403).json({ error: 'Not authorized to update this lead' });
      }

      const updateData = {};
      if (status !== undefined) updateData.status = status;
      if (notes !== undefined) updateData.notes = notes;

      const { error } = await supabase.from('leads').update(updateData).eq('id', id);
      if (error) return res.status(500).json({ error: 'Failed to update lead' });

      return res.status(200).json({ data: { id, ...updateData } });
    }

    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to;

    const { error } = await supabase.from('leads').update(updateData).eq('id', id);
    if (error) return res.status(500).json({ error: 'Failed to update lead' });

    return res.status(200).json({ data: { id, ...updateData } });
  } catch (e) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(200).json({});
  }

  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

  const tokenRaw = req.headers['x-admin-token'];
  const token = (Array.isArray(tokenRaw) ? tokenRaw[0] : tokenRaw)?.trim();

  const auth = authenticateRequest(token);
  if (auth.error) return res.status(401).json({ error: auth.error });

  if (req.method === 'GET') return handleGet(req, res, auth);
  if (req.method === 'PATCH') return handlePatch(req, res, auth);

  return res.status(405).json({ error: 'Method not allowed' });
};

