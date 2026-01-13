// api/doctor/signature/index.js
// GET /api/doctor/signature
// Get doctor signature metadata (own or by doctor_id for admin)
// Query: ?doctor_id=... (admin only)
// Auth: Bearer JWT (doctor/admin role required)

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
  const requestId = `doctor_signature_get_${Date.now()}_${Math.random().toString(16).slice(2)}`;

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

    // ✅ Auth
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

    const authClient = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY || SERVICE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

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

    // ✅ Verify role (doctor or admin)
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

      if (profErr || !profData || (profData.role !== "doctor" && profData.role !== "admin")) {
        return res.status(403).json({
          ok: false,
          error: "Forbidden: doctor or admin access only",
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

    // ✅ Get target doctor_id (own or from query for admin)
    const query = req.query || {};
    let targetDoctorId = user.id; // Default: own signature

    if (profile.role === "admin" && query.doctor_id) {
      targetDoctorId = String(query.doctor_id).trim();
    }

    // ✅ Fetch signature
    const { data: signature, error: sigErr } = await dbClient
      .from("doctor_signatures")
      .select("*")
      .eq("doctor_id", targetDoctorId)
      .maybeSingle();

    if (sigErr) {
      console.error("[doctor/signature] Query error:", sigErr, { requestId });
      return res.status(500).json({
        ok: false,
        error: sigErr.message || "Failed to fetch signature",
        step: "fetch_signature",
        requestId,
        buildSha,
      });
    }

    if (!signature) {
      return res.status(200).json({
        ok: true,
        signature: null,
        requestId,
        buildSha,
      });
    }

    return res.status(200).json({
      ok: true,
      signature: {
        doctor_id: signature.doctor_id,
        signature_storage_path: signature.signature_storage_path,
        display_name: signature.display_name,
        title: signature.title,
      },
      requestId,
      buildSha,
    });
  } catch (err) {
    console.error("[doctor/signature] Handler crash:", err, { requestId });
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Server error",
      step: "handler",
      requestId,
      buildSha,
    });
  }
};

