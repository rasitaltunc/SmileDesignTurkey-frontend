// api/leads.js
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 1) Token check FIRST (before supabase)
    const token =
      req.headers['x-admin-token'] ||
      req.headers['X-Admin-Token'] ||
      req.headers['x-admin-token'.toLowerCase()];

    const expected = process.env.ADMIN_TOKEN;

    if (!expected || !token || token !== expected) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 2) Env check
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return res.status(500).json({ error: 'Missing SUPABASE env' });
    }

    // 3) Create admin client (service role)
    const supabase = createClient(url, key, {
      auth: { persistSession: false },
    });

    // ========= GET =========
    if (req.method === 'GET') {
      const allowedStatuses = new Set(['new', 'contacted', 'booked', 'paid', 'completed']);

      const limitRaw = req.query?.limit;
      const limit = Math.min(parseInt(limitRaw, 10) || 50, 200);

      const statusRaw = (req.query?.status || '').toString().trim().toLowerCase();
      const assignedToRaw = (req.query?.assigned_to || '').toString().trim();

      let q = supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(limit);

      if (statusRaw && allowedStatuses.has(statusRaw)) {
        q = q.eq('status', statusRaw);
      }

      if (assignedToRaw) {
        q = q.eq('assigned_to', assignedToRaw);
      }

      const { data, error } = await q;
      if (error) return res.status(500).json({ error: error.message });

      return res.status(200).json({ data });
    }

    // ========= PATCH =========
    if (req.method === 'PATCH') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const { id, status, notes, assigned_to, follow_up_at } = body;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid id' });
      }

      const update = {};

      if (status !== undefined) {
        const s = String(status).trim().toLowerCase();
        const allowed = new Set(['new', 'contacted', 'booked', 'paid', 'completed']);
        if (!allowed.has(s)) {
          return res.status(400).json({ error: 'Invalid status value' });
        }
        update.status = s;
      }

      if (notes !== undefined) {
        update.notes = notes === null ? null : String(notes);
      }

      if (assigned_to !== undefined) {
        update.assigned_to = assigned_to === null ? null : String(assigned_to);
      }

      // follow_up_at: string (ISO) or null to clear, undefined => ignore
      if (follow_up_at !== undefined) {
        if (follow_up_at === null || follow_up_at === '') {
          update.follow_up_at = null;
        } else {
          const d = new Date(String(follow_up_at));
          if (isNaN(d.getTime())) {
            return res.status(400).json({ error: 'Invalid follow_up_at format' });
          }
          update.follow_up_at = d.toISOString();
        }
      }

      const { data, error } = await supabase
        .from('leads')
        .update(update)
        .eq('id', id)
        .select('*')
        .single();

      if (error) return res.status(500).json({ error: error.message });

      return res.status(200).json({ data });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Server error' });
  }
};
