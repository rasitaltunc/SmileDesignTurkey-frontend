import type { VercelRequest, VercelResponse } from '@vercel/node';

// ✅ CJS require: runtime'da "import" kalmasın
const { createClient } = require('@supabase/supabase-js') as typeof import('@supabase/supabase-js');

function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Token');
}

// ✅ CJS export: runtime'da "export" kalmasın
module.exports = async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    // 1) token first
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

    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // ========= GET =========
    if (req.method === 'GET') {
      const leadId = (req.query.leadId as string) || '';
      if (!leadId) {
        return res.status(400).json({ error: 'Missing leadId query parameter' });
      }

      const { data, error } = await supabase
        .from('lead_notes')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(500).json({ error: error.message, details: error });
      }
      return res.status(200).json({ data: data || [] });
    }

    // ========= POST =========
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const lead_id = body.lead_id || body.leadId || body.lead_uuid;
      const content = body.content || body.note || body.text;

      if (!lead_id || typeof lead_id !== 'string') {
        return res.status(400).json({ error: 'Missing/invalid lead_id' });
      }
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({ error: 'Missing/invalid note content' });
      }

      // Insert note (author_id is optional, can be null for admin token usage)
      const { data, error } = await supabase
        .from('lead_notes')
        .insert([{ 
          lead_id, 
          content: content.trim(),
          // author_id can be null or omitted if using admin token
        }])
        .select('*')
        .single();

      if (error) {
        return res.status(500).json({ error: error.message, details: error });
      }
      return res.status(201).json({ data });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    return res.status(500).json({ error: 'Server error', message: e?.message ?? String(e) });
  }
};
