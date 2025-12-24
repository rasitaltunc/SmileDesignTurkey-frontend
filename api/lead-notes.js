const { createClient } = require('@supabase/supabase-js');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Token');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
}

function getHeaderToken(req) {
  // Node header keys are lowercased
  return (req.headers['x-admin-token'] || req.headers['x-admin-token'.toLowerCase()] || '').toString();
}

function pickString(v) {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
  return '';
}

module.exports = async (req, res) => {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    // 1) Token-first
    const token = getHeaderToken(req);
    const adminToken = process.env.ADMIN_TOKEN || '';
    if (!adminToken || token !== adminToken) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 2) Env check after token
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({ error: 'Missing SUPABASE env' });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // GET /api/lead-notes?lead_id=...  (lead_uuid de kabul)
    if (req.method === 'GET') {
      const lead_id =
        pickString(req.query?.lead_id) ||
        pickString(req.query?.lead_uuid);

      if (!lead_id) return res.status(400).json({ error: 'Missing lead_id' });

      const { data, error } = await supabase
        .from('lead_notes')
        .select('*')
        .eq('lead_id', lead_id)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ data });
    }

    // POST body: { lead_id|lead_uuid, note|content }
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

      const lead_id = (body.lead_id || body.lead_uuid || '').toString();
      const note = (body.note || body.content || '').toString();

      if (!lead_id) return res.status(400).json({ error: 'Missing lead_id' });
      if (!note) return res.status(400).json({ error: 'Missing note' });

      // author_id konusu: şemanda var ama nullable mı bilmiyoruz.
      // Önce author_id göndermeden deneriz. Eğer "null value in column author_id" hatası gelirse,
      // o zaman DB'de default/system author tanımlarız (aşağıda veriyorum).
      const row = { lead_id, note };

      const { data, error } = await supabase
        .from('lead_notes')
        .insert([row])
        .select('*')
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ data });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: 'Unhandled error', details: String(e?.message || e) });
  }
};

