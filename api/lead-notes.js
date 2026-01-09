// api/lead-notes.js
const { createClient } = require("@supabase/supabase-js");

function getBearerToken(req) {
  const h = req.headers.authorization; // ✅ Node'da hep lowercase gelir
  if (!h) return null;

  const [type, token] = String(h).split(" ");
  if (!type || type.toLowerCase() !== "bearer") return null;
  return token || null;
}

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return res.status(500).json({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const jwt = getBearerToken(req);
  if (!jwt) return res.status(401).json({ error: "Missing Authorization Bearer token" });

  const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
  const user = userData?.user;
  if (userErr || !user) return res.status(401).json({ error: "Invalid session" });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = profile?.role || "unknown";
  const isAdmin = role === "admin";
  const isEmployee = role === "employee";

  if (!isAdmin && !isEmployee) {
    return res.status(403).json({ error: "Forbidden: notes are admin/employee only" });
  }

  // GET /api/lead-notes?lead_uuid=... OR ?lead_id=... (backward compatibility)
  if (req.method === "GET") {
    // ✅ Accept both lead_uuid (UUID) and lead_id (for backward compatibility)
    const lead_uuid = req.query?.lead_uuid ? String(req.query.lead_uuid).trim() : null;
    const lead_id = req.query?.lead_id ? String(req.query.lead_id).trim() : null;
    
    if (!lead_uuid && !lead_id) {
      return res.status(400).json({ ok: false, error: "Missing lead_uuid or lead_id" });
    }

    // ✅ Resolve to UUID: if lead_uuid provided, use it; else query leads table
    let resolvedUuid = lead_uuid;
    if (!resolvedUuid && lead_id) {
      const { data: leadData } = await supabase
        .from("leads")
        .select("id, lead_uuid, assigned_to")
        .or(`id.eq.${lead_id},lead_uuid.eq.${lead_id}`)
        .maybeSingle();
      
      if (!leadData) {
        return res.status(404).json({ ok: false, error: "Lead not found" });
      }
      resolvedUuid = leadData.id; // Use UUID (id column) for lead_notes table
      
      // employee can only access notes for leads assigned to them
      if (isEmployee && leadData.assigned_to !== user.id) {
        return res.status(403).json({ ok: false, error: "Forbidden: not assigned" });
      }
    } else if (resolvedUuid) {
      // If lead_uuid provided, verify employee access
      if (isEmployee) {
        const { data: leadData } = await supabase
          .from("leads")
          .select("id, assigned_to")
          .eq("lead_uuid", resolvedUuid)
          .maybeSingle();
        
        if (!leadData || leadData.assigned_to !== user.id) {
          return res.status(403).json({ ok: false, error: "Forbidden: not assigned" });
        }
        resolvedUuid = leadData.id; // Use UUID (id column) for lead_notes table
      } else {
        // For admin, resolve lead_uuid to UUID (id column)
        const { data: leadData } = await supabase
          .from("leads")
          .select("id")
          .eq("lead_uuid", resolvedUuid)
          .maybeSingle();
        
        if (!leadData) {
          return res.status(404).json({ ok: false, error: "Lead not found" });
        }
        resolvedUuid = leadData.id;
      }
    }

    const { data, error } = await supabase
      .from("lead_notes")
      .select("*")
      .eq("lead_id", resolvedUuid)
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.status(200).json({ ok: true, notes: data || [] });
  }

  // POST /api/lead-notes
  if (req.method === "POST") {
    const body = req.body || {};
    // ✅ Accept both lead_uuid (UUID) and lead_id (for backward compatibility)
    const lead_uuid = body.lead_uuid ? String(body.lead_uuid).trim() : null;
    const lead_id = body.lead_id || body.leadId ? String(body.lead_id || body.leadId).trim() : null;
    const noteText = body.note || body.content || body.text;

    if ((!lead_uuid && !lead_id) || !noteText) {
      return res.status(400).json({ ok: false, error: "Missing lead_uuid/lead_id or note" });
    }

    // ✅ Resolve to UUID: if lead_uuid provided, use it; else query leads table
    let resolvedUuid = lead_uuid;
    if (!resolvedUuid && lead_id) {
      const { data: leadData } = await supabase
        .from("leads")
        .select("id, assigned_to")
        .or(`id.eq.${lead_id},lead_uuid.eq.${lead_id}`)
        .maybeSingle();
      
      if (!leadData) {
        return res.status(404).json({ ok: false, error: "Lead not found" });
      }
      resolvedUuid = leadData.id; // Use UUID (id column) for lead_notes table
      
      // employee can only access notes for leads assigned to them
      if (isEmployee && leadData.assigned_to !== user.id) {
        return res.status(403).json({ ok: false, error: "Forbidden: not assigned" });
      }
    } else if (resolvedUuid) {
      // If lead_uuid provided, verify employee access and resolve to UUID
      const { data: leadData } = await supabase
        .from("leads")
        .select("id, assigned_to")
        .eq("lead_uuid", resolvedUuid)
        .maybeSingle();
      
      if (!leadData) {
        return res.status(404).json({ ok: false, error: "Lead not found" });
      }
      
      if (isEmployee && leadData.assigned_to !== user.id) {
        return res.status(403).json({ ok: false, error: "Forbidden: not assigned" });
      }
      resolvedUuid = leadData.id; // Use UUID (id column) for lead_notes table
    }

    // Insert with both note and content for compatibility
    const { data, error } = await supabase
      .from("lead_notes")
      .insert([{ lead_id: resolvedUuid, note: noteText, content: noteText }])
      .select("*")
      .limit(1);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ note: data?.[0] || null });
  }

  return res.status(405).json({ error: "Method not allowed" });
};
