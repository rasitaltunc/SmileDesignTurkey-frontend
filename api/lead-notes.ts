import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // --- CORS (always) ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Token');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // --- token first ---
    const headerToken = (req.headers['x-admin-token'] as string | undefined) ?? '';
    const expectedToken = process.env.ADMIN_TOKEN ?? '';

    if (!expectedToken || headerToken !== expectedToken) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // --- env checks after token ---
    const supabaseUrl = process.env.SUPABASE_URL ?? '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({ error: 'Missing SUPABASE env' });
    }

    // IMPORTANT: avoid top-level ESM import -> dynamic import inside handler
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    if (req.method === 'GET') {
      const lead_uuid = (req.query.lead_uuid as string | undefined) ?? '';
      if (!lead_uuid) {
        return res.status(400).json({ error: 'Missing lead_uuid' });
      }

      const { data, error } = await supabase
        .from('lead_notes')
        .select('*')
        .eq('lead_uuid', lead_uuid)
        .order('created_at', { ascending: false });

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ data });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const lead_uuid = body?.lead_uuid;
      const note = body?.note;

      if (!lead_uuid || typeof lead_uuid !== 'string') {
        return res.status(400).json({ error: 'Missing/invalid lead_uuid' });
      }
      if (!note || typeof note !== 'string') {
        return res.status(400).json({ error: 'Missing/invalid note' });
      }

      const { data, error } = await supabase
        .from('lead_notes')
        .insert([{ lead_uuid, note }])
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ data });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? 'Unknown error' });
  }
}
