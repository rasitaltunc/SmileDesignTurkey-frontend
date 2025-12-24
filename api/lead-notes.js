const { createClient } = require('@supabase/supabase-js');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Token');
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 1) Token-first (Supabase'e dokunmadan önce)
    const token = req.headers['x-admin-token'] || '';
    const adminToken = process.env.ADMIN_TOKEN || '';

    if (!adminToken || token !== adminToken) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 2) Env check (token doğruysa)
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({ error: 'Missing SUPABASE env' });
    }

    // 3) Client (service role)
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 4) GET: /api/lead-notes?lead_uuid=...
    if (req.method === 'GET') {
      const lead_uuid = req.query.lead_uuid || '';

      if (!lead_uuid) {
        return res.status(400).json({ error: 'Missing lead_uuid' });
      }

      const { data, error } = await supabase
        .from('lead_notes')
        .select('*')
        .eq('lead_uuid', lead_uuid)
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ data: data || [] });
    }

    // 5) POST: { lead_uuid, note }
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

      const lead_uuid = body.lead_uuid;
      const note = body.note;

      if (!lead_uuid || typeof lead_uuid !== 'string') {
        return res.status(400).json({ error: 'Missing/invalid lead_uuid' });
      }
      if (!note || typeof note !== 'string') {
        return res.status(400).json({ error: 'Missing/invalid note' });
      }

      const { data, error } = await supabase
        .from('lead_notes')
        .insert([{ lead_uuid, note }])
        .select('*')
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ data });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Unknown error' });
  }
};

