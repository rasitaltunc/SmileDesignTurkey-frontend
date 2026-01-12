// api/catalog/items.js
// GET /api/catalog/items?kind=procedure|material|service
// Returns catalog items filtered by kind
// Auth: Bearer JWT (doctor or employee role required)

const { createClient } = require("@supabase/supabase-js");

const buildSha =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.VERCEL_GIT_COMMIT_REF ||
  process.env.GITHUB_SHA ||
  null;

function getBearerToken(req) {
  const h = req.headers.authorization || req.headers.Authorization || "";
  if (!h) return null;
  const [type, token] = String(h).split(" ");
  if (!type || type.toLowerCase() !== "bearer") return null;
  return token || null;
}

module.exports = async function handler(req, res) {
  const requestId = `catalog_items_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  // ✅ CRASH-PROOF: Set JSON headers FIRST
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  try {
    if (req.method === "OPTIONS") {
      return res.status(200).json({ ok: true });
    }

    if (req.method !== "GET") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed",
        step: "method_check",
        requestId,
        buildSha,
      });
    }

    // ✅ Parse URL safely
    let url;
    try {
      url = new URL(req.url, "http://localhost");
    } catch (urlErr) {
      return res.status(400).json({
        ok: false,
        error: "Invalid URL",
        step: "url_parse",
        requestId,
        buildSha,
      });
    }

    const kind = url.searchParams.get("kind") || null; // procedure|material|service

    // ✅ Env check
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return res.status(500).json({
        ok: false,
        error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
        step: "env_check",
        requestId,
        buildSha,
      });
    }

    // ✅ Auth: Extract Bearer token
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({
        ok: false,
        error: "Missing Authorization Bearer token",
        step: "auth_check",
        requestId,
        buildSha,
      });
    }

    // ✅ Use anon key for JWT verification
    const authClient = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY || SERVICE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // ✅ Verify user
    let user;
    try {
      const { data: userData, error: userErr } = await authClient.auth.getUser(token);
      if (userErr || !userData?.user) {
        return res.status(401).json({
          ok: false,
          error: "Invalid session",
          step: "jwt_verify",
          requestId,
          buildSha,
        });
      }
      user = userData.user;
    } catch (authErr) {
      return res.status(401).json({
        ok: false,
        error: "Auth verification failed",
        step: "jwt_verify",
        requestId,
        buildSha,
      });
    }

    // ✅ Verify role (doctor or employee/admin)
    const dbClient = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let profile;
    try {
      const { data: profData, error: profErr } = await dbClient
        .from("profiles")
        .select("id, role")
        .eq("id", user.id)
        .maybeSingle();

      if (profErr || !profData) {
        return res.status(403).json({
          ok: false,
          error: "Forbidden: profile not found",
          step: "role_check",
          requestId,
          buildSha,
        });
      }

      const allowedRoles = ["doctor", "employee", "admin"];
      if (!allowedRoles.includes(profData.role)) {
        return res.status(403).json({
          ok: false,
          error: "Forbidden: doctor or employee access only",
          step: "role_check",
          requestId,
          buildSha,
        });
      }
      profile = profData;
    } catch (roleErr) {
      return res.status(500).json({
        ok: false,
        error: "Role check failed",
        step: "role_check",
        requestId,
        buildSha,
      });
    }

    // ✅ Fetch catalog items
    try {
      let q = dbClient.from("catalog_items").select("*").order("name", { ascending: true });

      // Filter by kind if provided
      if (kind && ["procedure", "material", "service"].includes(kind.toLowerCase())) {
        q = q.eq("kind", kind.toLowerCase());
      }

      const { data: items, error: itemsErr } = await q;

      if (itemsErr) {
        console.error("[catalog/items] Query error:", itemsErr, { requestId });
        return res.status(500).json({
          ok: false,
          error: itemsErr.message || "Catalog query failed",
          step: "fetch_items",
          requestId,
          buildSha,
        });
      }

      return res.status(200).json({
        ok: true,
        items: items || [],
        requestId,
        buildSha,
      });
    } catch (fetchErr) {
      console.error("[catalog/items] Fetch crash:", fetchErr, { requestId });
      return res.status(500).json({
        ok: false,
        error: fetchErr instanceof Error ? fetchErr.message : "Internal server error",
        step: "fetch_items",
        requestId,
        buildSha,
      });
    }
  } catch (err) {
    console.error("[catalog/items] Handler crash:", err, { requestId });
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Server error",
      step: "handler",
      requestId,
      buildSha,
    });
  }
};

