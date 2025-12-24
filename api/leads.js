// api/leads.js
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
  res.setHeader("Access-Control-Allow-Methods", "GET, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return res.status(500).json({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
  }

  // Admin client (service role) - used ONLY on server
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ✅ JWT-based auth (replaces x-admin-token)
  const jwt = getBearerToken(req);
  if (!jwt) return res.status(401).json({ error: "Missing Authorization Bearer token" });

  const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
  const user = userData?.user;
  if (userErr || !user) return res.status(401).json({ error: "Invalid session" });

  // ✅ role from profiles
  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profErr) return res.status(500).json({ error: "Failed to read profile role" });

  const role = profile?.role || "unknown";
  const isAdmin = role === "admin";
  const isEmployee = role === "employee";

  // 🔒 Leads are ONLY for admin/employee
  if (!isAdmin && !isEmployee) {
    return res.status(403).json({ error: "Forbidden: leads access is admin/employee only" });
  }

  // GET /api/leads
  if (req.method === "GET") {
    const { status } = req.query || {};
    const limit = Math.min(parseInt(req.query?.limit || "200", 10) || 200, 500);

    let q = supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(limit);

    if (status && status !== "all") q = q.eq("status", status);

    // employee sees only assigned leads
    if (isEmployee) q = q.eq("assigned_to", user.id);

    const { data, error } = await q;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ leads: data });
  }

  // PATCH /api/leads  (update status/notes/assigned_to etc.)
  if (req.method === "PATCH") {
    const body = req.body || {};
    const id = body.id || body.lead_id;
    const lead_uuid = body.lead_uuid;

    // accept either {updates:{...}} or direct fields
    const updates = body.updates ? { ...body.updates } : { ...body };
    delete updates.id;
    delete updates.lead_id;
    delete updates.lead_uuid;

    if (!id && !lead_uuid) return res.status(400).json({ error: "Missing id or lead_uuid" });
    if (!Object.keys(updates).length) return res.status(400).json({ error: "No updates provided" });

    let q = supabase.from("leads").update(updates).select("*").limit(1);

    // employee can only update assigned leads
    if (isEmployee) q = q.eq("assigned_to", user.id);

    q = id ? q.eq("id", id) : q.eq("lead_uuid", lead_uuid);

    const { data, error } = await q;
    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ lead: data?.[0] || null });
  }

  return res.status(405).json({ error: "Method not allowed" });
};
