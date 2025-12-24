import { createClient } from '@supabase/supabase-js';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Token');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PATCH,POST,OPTIONS');
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    // token-first
    const token = req.headers['x-admin-token'] ?? '';
    const adminToken = process.env.ADMIN_TOKEN ?? '';
    if (!adminToken || token !== adminToken) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // env after token
    const supabaseUrl = process.env.SUPABASE_URL ?? '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({ error: 'Missing SUPABASE env' });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    if (req.method === 'GET') {
      const lead_id = typeof req.query?.lead_id === 'string' ? req.query.lead_id : 
                      typeof req.query?.lead_uuid === 'string' ? req.query.lead_uuid : '';
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

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const lead_id = body?.lead_id || body?.lead_uuid;
      const content = body?.content || body?.note;

      if (!lead_id || typeof lead_id !== 'string') {
        return res.status(400).json({ error: 'Missing/invalid lead_id' });
      }
      if (!content || typeof content !== 'string') {
        return res.status(400).json({ error: 'Missing/invalid content' });
      }

      // Service role key kullanırken author_id için system UUID kullanıyoruz
      // (auth.uid() null döner, bu yüzden placeholder kullanıyoruz)
      const systemAuthorId = '00000000-0000-0000-0000-000000000000';

      const { data, error } = await supabase
        .from('lead_notes')
        .insert([{ lead_id, content, author_id: systemAuthorId }])
        .select('*')
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ data });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: 'Unhandled error', details: e?.message ?? String(e) });
  }
}
