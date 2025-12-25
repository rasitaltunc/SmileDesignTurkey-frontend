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

  // ✅ DEBUG: "Ben hangi code'u çalıştırıyorum?" kanıt endpoint'i
  return res.status(418).json({
    who: "api/leads.js",
    commit: "DEBUG-ROLE-1",
    time: new Date().toISOString()
  });

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return res.status(500).json({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
  }

  // ✅ Anon key with fallback
  const anonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    "";

  if (!anonKey) {
    return res.status(500).json({ error: "Missing SUPABASE_ANON_KEY (or VITE_SUPABASE_ANON_KEY)" });
  }

  // ✅ JWT-based auth
  const jwt = getBearerToken(req);
  if (!jwt) return res.status(401).json({ error: "Missing Authorization Bearer token" });

  // auth-bound client (uses caller JWT for auth checks)
  const authClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Verify user via authClient
  const { data: userData, error: userErr } = await authClient.auth.getUser();
  if (userErr || !userData?.user) return res.status(401).json({ error: "Invalid session" });

  const user = userData.user;

  // ✅ Role from RPC (same as frontend + RLS functions)
  const { data: roleData, error: roleErr } = await authClient.rpc("get_current_user_role");
  if (roleErr) {
    return res.status(500).json({ error: "Role RPC failed", details: roleErr.message });
  }

  // ✅ Normalize role (RPC might return "Admin", "ADMIN", with spaces, etc.)
  const roleRaw = roleData;
  const role = String(roleData || "").trim().toLowerCase();
  const isAdmin = role === "admin";
  const isEmployee = role === "employee";

  // DB client (service role) - used for DB operations (RLS bypass)
  const dbClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 🔒 Leads are ONLY for admin/employee
  if (!isAdmin && !isEmployee) {
    return res.status(403).json({ error: "Forbidden: leads access is admin/employee only" });
  }

  // GET /api/leads
  if (req.method === "GET") {
    const { status } = req.query || {};
    const limit = Math.min(parseInt(req.query?.limit || "200", 10) || 200, 500);

    let q = dbClient.from("leads").select("*").order("created_at", { ascending: false }).limit(limit);

    if (status && status !== "all") q = q.eq("status", status);

    // employee sees only assigned leads
    if (isEmployee) q = q.eq("assigned_to", user.id);

    const { data, error } = await q;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ leads: data });
  }

  // PATCH /api/leads
  if (req.method === "PATCH") {
    try {
      const body = req.body || {};
      const id = body.id || body.lead_id;
      const lead_uuid = body.lead_uuid;

      const updates = body.updates ? { ...body.updates } : { ...body };
      delete updates.id;
      delete updates.lead_id;
      delete updates.lead_uuid;

      if (!id && !lead_uuid) return res.status(400).json({ error: "Missing id or lead_uuid" });
      if (!Object.keys(updates).length) return res.status(400).json({ error: "No updates provided" });

      // ✅ Admin: her şeyi yapabilir; Employee: assignment alanlarını değiştiremez
      const allowedForAll = [
        "status",
        "notes",
        "follow_up_at",
        "next_action",
        "contacted_at",
        "patient_id",
      ];

      const allowedForAdminExtra = [
        "assigned_to",
        "assigned_at",
        "assigned_by",
      ];

      const allowed = isAdmin ? [...allowedForAll, ...allowedForAdminExtra] : allowedForAll;

      const filtered = Object.fromEntries(
        Object.entries(updates).filter(([k]) => allowed.includes(k))
      );

      if (Object.keys(filtered).length === 0) {
        return res.status(400).json({ error: "No allowed fields to update" });
      }

      // 🔒 Only admin can change assignment
      if (Object.prototype.hasOwnProperty.call(filtered, "assigned_to")) {
        if (!isAdmin) {
          return res.status(403).json({
            error: "Only admins can change assigned_to",
            debug: { roleRaw, role, uid: user.id, email: user.email }
          });
        }

        // prevent spoofing
        filtered.assigned_by = user.id;
        filtered.assigned_at = new Date().toISOString();
      }

      // ✅ UPDATE query: limit yok, single ile net
      let q = dbClient
        .from("leads")
        .update(filtered)
        .select("*");

      if (isEmployee) q = q.eq("assigned_to", user.id);

      q = id ? q.eq("id", id) : q.eq("lead_uuid", lead_uuid);

      const { data, error } = await q.single();

      if (error) {
        return res.status(500).json({ error: error.message, hint: error.hint || null });
      }

      return res.status(200).json({ lead: data });
    } catch (e) {
      return res.status(500).json({ error: e?.message || "Server error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
};
