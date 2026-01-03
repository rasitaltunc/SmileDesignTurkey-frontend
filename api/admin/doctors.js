// api/admin/doctors.js
// Admin-only endpoint for fetching doctors
// Returns profiles with role='doctor'

const { createClient } = require("@supabase/supabase-js");

function getBearerToken(req) {
  const h = req.headers.authorization; // ✅ Node'da hep lowercase gelir
  if (!h) return null;

  const [type, token] = String(h).split(" ");
  if (!type || type.toLowerCase() !== "bearer") return null;
  return token || null;
}

module.exports = async function handler(req, res) {
  const requestId = `doctors_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("x-sdt-api", "doctors-v1");
  res.setHeader("x-request-id", requestId);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed", requestId });
  }

  // ENV guards
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseServiceKey || !anonKey) {
    return res.status(500).json({
      ok: false,
      error: "Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or SUPABASE_ANON_KEY",
      requestId,
    });
  }

  // Auth guard: Verify JWT
  const jwt = getBearerToken(req);
  if (!jwt) {
    return res.status(401).json({
      ok: false,
      error: "Missing Authorization Bearer token",
      requestId,
    });
  }

  // Verify user via auth client
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await authClient.auth.getUser();
  if (userErr || !userData?.user) {
    return res.status(401).json({
      ok: false,
      error: "Invalid session",
      requestId,
    });
  }

  // Check role via profiles table (service role bypasses RLS)
  const dbClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: prof, error: profErr } = await dbClient
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (profErr) {
    return res.status(500).json({
      ok: false,
      error: "Failed to read profile role",
      requestId,
    });
  }

  // Only admin can access this endpoint
  const role = String(prof?.role || "").trim().toLowerCase();
  if (role !== "admin") {
    return res.status(403).json({
      ok: false,
      error: "Forbidden: admin access required",
      requestId,
    });
  }

  // Fetch doctors
  const { data, error } = await dbClient
    .from("profiles")
    .select("id, full_name, role, created_at")
    .eq("role", "doctor")
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({
      ok: false,
      error: error.message,
      requestId,
    });
  }

  return res.status(200).json({
    ok: true,
    doctors: data || [],
    requestId,
  });
};

