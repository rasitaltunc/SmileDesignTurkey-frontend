const { createClient } = require('@supabase/supabase-js');

function getToken(req) {
  const headerToken = req.headers['x-admin-token'];
  if (typeof headerToken === 'string' && headerToken.trim()) return headerToken.trim();

  const auth = req.headers.authorization || '';
  if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  return '';
}

function requireAdmin(req, res) {
  const token = getToken(req);
  const adminToken = process.env.ADMIN_TOKEN || '';

  if (!adminToken) {
    res.status(500).json({ error: 'Server misconfigured: missing ADMIN_TOKEN' });
    return null;
  }
  if (!token || token !== adminToken) {
    res.status(401).json({ error: 'Invalid credentials' });
    return null;
  }
  return true;
}

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

module.exports = async function handler(req, res) {
  // CORS (opsiyonel ama sorunsuz)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // ✅ SADECE ADMIN
  const ok = requireAdmin(req, res);
  if (!ok) return;

  let supabase;
  try {
    supabase = supabaseAdmin();
  } catch (e) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // ======================
    // GET: lead listesi
    // ======================
    if (req.method === 'GET') {
      const limit = Math.min(parseInt(req.query.limit || '100', 10) || 100, 500);
      const status = req.query.status;

      let q = supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status) q = q.eq('status', status);

      const { data, error } = await q;
      if (error) return res.status(500).json({ error: error.message });

      return res.status(200).json({ data });
    }

    // ======================
    // PATCH: sadece status + notes
    // ======================
    if (req.method === 'PATCH') {
      const { id, status, notes } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Missing id' });

      const update = {};
      if (typeof status === 'string') update.status = status;
      if (typeof notes === 'string') update.notes = notes;

      if (Object.keys(update).length === 0) {
        return res.status(400).json({ error: 'Nothing to update' });
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
  } catch (err) {
    console.error('[api/leads] crash:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
