const { createClient } = require('@supabase/supabase-js');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Token');
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    // 1) admin token first
    const token = req.headers['x-admin-token'];
    const adminToken = process.env.ADMIN_TOKEN;

    if (!adminToken || token !== adminToken) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 2) env check
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return res.status(500).json({ error: 'Missing SUPABASE env' });
    }

    const supabase = createClient(url, key);

    if (req.method === 'POST') {
      const body = req.body || {};

      const lead_uuid = body.lead_uuid;
      const note = body.note;

      if (!lead_uuid || typeof lead_uuid !== 'string') {
        return res.status(400).json({ error: 'Missing/invalid lead_uuid' });
      }
      if (!note || typeof note !== 'string') {
        return res.status(400).json({ error: 'Missing/invalid note' });
      }

      // TABLE NAME: lead_notes
      // COLUMNS: lead_uuid, note
      const { data, error } = await supabase
        .from('lead_notes')
        .insert([{ lead_uuid, note }])
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message, details: error });
      return res.status(200).json({ data });
    }

    if (req.method === 'GET') {
      const lead_uuid = req.query.lead_uuid;
      if (!lead_uuid) return res.status(400).json({ error: 'Missing lead_uuid' });

      const { data, error } = await supabase
        .from('lead_notes')
        .select('*')
        .eq('lead_uuid', lead_uuid)
        .order('created_at', { ascending: false });

      if (error) return res.status(500).json({ error: error.message, details: error });
      return res.status(200).json({ data });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: 'Server error', message: e?.message || String(e) });
  }
};

