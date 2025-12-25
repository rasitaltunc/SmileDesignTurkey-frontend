// api/lead-notes.js
const { createClient } = require("@supabase/supabase-js");

function getBearerToken(req) {
  const h = req.headers["authorization"] || req.headers["Authorization"];
  if (!h) return null;
  const parts = String(h).split(" ");
  if (parts.length === 2 && parts[0].toLowerCase() === "bearer") return parts[1];
  return null;
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

  // GET /api/lead-notes?lead_id=...
  if (req.method === "GET") {
    const lead_id = req.query?.lead_id;
    if (!lead_id) return res.status(400).json({ error: "Missing lead_id" });

    // employee can only access notes for leads assigned to them
    if (isEmployee) {
      const { data: lead } = await supabase
        .from("leads")
        .select("id, assigned_to")
        .eq("id", lead_id)
        .single();

      if (!lead || lead.assigned_to !== user.id) {
        return res.status(403).json({ error: "Forbidden: not assigned" });
      }
    }

    const { data, error } = await supabase
      .from("lead_notes")
      .select("*")
      .eq("lead_id", lead_id)
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ notes: data });
  }

  // POST /api/lead-notes
  if (req.method === "POST") {
    const body = req.body || {};
    const lead_id = body.lead_id || body.leadId;
    const noteText = body.note || body.content || body.text;

    if (!lead_id || !noteText) return res.status(400).json({ error: "Missing lead_id or note" });

    if (isEmployee) {
      const { data: lead } = await supabase
        .from("leads")
        .select("id, assigned_to")
        .eq("id", lead_id)
        .single();

      if (!lead || lead.assigned_to !== user.id) {
        return res.status(403).json({ error: "Forbidden: not assigned" });
      }
    }

    // Insert with both note and content for compatibility
    const { data, error } = await supabase
      .from("lead_notes")
      .insert([{ lead_id, note: noteText, content: noteText }])
      .select("*")
      .limit(1);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ note: data?.[0] || null });
  }

  return res.status(405).json({ error: "Method not allowed" });
};
