// api/employees.js
const { createClient } = require("@supabase/supabase-js");

function getBearerToken(req) {
  const h = req.headers.authorization; // ✅ Node'da hep lowercase gelir
  if (!h) return null;

  const [type, token] = String(h).split(" ");
  if (!type || type.toLowerCase() !== "bearer") return null;
  return token || null;
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return res.status(500).json({ error: "Missing server env vars" });
  }

  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: "Missing bearer token" });

  // ✅ Verify JWT using service role client (supabase-js handles API key automatically)
  const dbClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Verify JWT token
  const { data: userData, error: userErr } = await dbClient.auth.getUser(token);
  if (userErr || !userData?.user) {
    return res.status(401).json({ error: "Invalid token" });
  }

  // Check role via profiles table (service role bypasses RLS)
  const { data: prof, error: profErr } = await dbClient
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (profErr || !prof) {
    return res.status(401).json({ error: "Failed to read profile role" });
  }

  const role = String(prof?.role || "").trim().toLowerCase();
  if (role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  // Admin-only: fetch employees using service role (reuse dbClient)
  const { data, error } = await dbClient
    .from("profiles")
    .select("id, full_name, role")
    .eq("role", "employee")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ employees: data || [] });
};

