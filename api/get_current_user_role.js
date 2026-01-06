// api/get_current_user_role.js
const { createClient } = require("@supabase/supabase-js");

function getBearerToken(req) {
  const h = req.headers.authorization; // node: lowercase
  if (!h) return null;
  const [type, token] = String(h).split(" ");
  if (!type || type.toLowerCase() !== "bearer") return null;
  return token || null;
}

module.exports = async (req, res) => {
  const requestId = `role_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Version tracking headers
  res.setHeader("x-sdt-api", "role-v1");
  res.setHeader("x-sdt-commit", process.env.VERCEL_GIT_COMMIT_SHA || "unknown");
  res.setHeader("x-request-id", requestId);

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed", requestId });
    }

    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      return res.status(500).json({
        ok: false,
        error: "Server misconfigured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
        requestId,
      });
    }

    const jwt = getBearerToken(req);
    if (!jwt) {
      return res.status(401).json({ ok: false, error: "Missing Authorization Bearer token", requestId });
    }

    const db = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userErr } = await db.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return res.status(401).json({
        ok: false,
        error: "Invalid session",
        details: userErr?.message || null,
        requestId,
      });
    }

    const user = userData.user;

    const { data: prof, error: profErr } = await db
      .from("profiles")
      .select("id, role, full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (profErr) {
      return res.status(500).json({
        ok: false,
        error: "Failed to load profile",
        details: profErr.message,
        requestId,
      });
    }

    return res.status(200).json({
      ok: true,
      role: prof?.role || null,
      user: { id: user.id, email: user.email },
      profile: prof || null,
      requestId,
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err?.message || "Unknown error",
      code: err?.code || null,
      details: err?.details || null,
      hint: err?.hint || null,
      requestId,
    });
  }
};

