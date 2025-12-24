import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

type CreateNoteBody = {
  lead_uuid?: string;
  note?: string;
};

function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Token');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    // 1) Token-first (Supabase'e dokunmadan önce)
    const token = (req.headers['x-admin-token'] as string | undefined) ?? '';
    const adminToken = process.env.ADMIN_TOKEN ?? '';
    if (!adminToken || token !== adminToken) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 2) Env check (token doğruysa)
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({ error: 'Missing SUPABASE env' });
    }

    // 3) Client (service role)
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 4) GET: /api/lead-notes?lead_uuid=...
    if (req.method === 'GET') {
      const lead_uuid = typeof req.query.lead_uuid === 'string' ? req.query.lead_uuid : undefined;

      let q = supabase
        .from('lead_notes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (lead_uuid) q = q.eq('lead_uuid', lead_uuid);

      const { data, error } = await q;
      if (error) return res.status(500).json({ error: error.message });

      return res.status(200).json({ data });
    }

    // 5) POST: { lead_uuid, note }
    if (req.method === 'POST') {
      const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as CreateNoteBody;

      const lead_uuid = body?.lead_uuid;
      const note = body?.note;

      if (!lead_uuid || typeof lead_uuid !== 'string') {
        return res.status(400).json({ error: 'Missing lead_uuid' });
      }
      if (!note || typeof note !== 'string') {
        return res.status(400).json({ error: 'Missing note' });
      }

      const { data, error } = await supabase
        .from('lead_notes')
        .insert([{ lead_uuid, note }])
        .select('*')
        .single();

      if (error) return res.status(500).json({ error: error.message });

      return res.status(200).json({ data });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Unhandled error', details: err?.message ?? String(err) });
  }
}
