// api/admin/patient-unified.js
// GET /api/admin/patient/unified?email=X
// Returns unified patient view (all leads merged, canonical resolution)

const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ error: 'Email parameter required' });
    }

    // Verify admin
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Initialize Supabase with service role (admin access)
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: 'Supabase configuration missing' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all leads for this email
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false });

    if (leadsError) {
      console.error('Leads query error:', leadsError);
      return res.status(500).json({ error: 'Failed to fetch leads' });
    }

    if (!leads || leads.length === 0) {
      return res.status(404).json({ error: 'No patient found', email, leads: [] });
    }

    // Determine canonical lead
    const canonicalLead = leads.find(l => l.lead_portal_auth) 
      || leads.find(l => l.status === 'active')
      || leads[0];

    // Get notes and uploads
    const leadIds = leads.map(l => l.id);
    const { data: notes = [] } = await supabase
      .from('lead_notes')
      .select('*')
      .in('lead_id', leadIds)
      .order('created_at', { ascending: false });

    const { data: uploads = [] } = await supabase
      .from('patient_uploads')
      .select('*')
      .in('lead_id', leadIds)
      .order('created_at', { ascending: false });

    // Create unified timeline
    const timelineEvents = [
      ...notes.map(n => ({
        type: 'note',
        lead_id: n.lead_id,
        timestamp: n.created_at,
        data: { note: n.note }
      })),
      ...uploads.map(u => ({
        type: 'upload',
        lead_id: u.lead_id,
        timestamp: u.created_at,
        data: { file_name: u.file_name }
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Aggregate stats
    const stats = {
      total_leads: leads.length,
      total_notes: notes.length,
      total_uploads: uploads.length,
      first_contact: leads[leads.length - 1]?.created_at || new Date().toISOString(),
      last_activity: timelineEvents[0]?.timestamp || new Date().toISOString(),
    };

    return res.status(200).json({
      ok: true,
      canonical_lead: { ...canonicalLead, is_canonical: true },
      historical_leads: leads.filter(l => l.id !== canonicalLead.id),
      unified_timeline: timelineEvents,
      stats,
    });

  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
