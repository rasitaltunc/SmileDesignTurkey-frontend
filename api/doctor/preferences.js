// api/doctor/preferences.js
// GET /api/doctor/preferences - Get doctor preferences (own or by doctor_id for admin)
// POST /api/doctor/preferences - Upsert doctor preferences
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
  const requestId = `doctor_preferences_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  try {
    if (req.method === "OPTIONS") {
      return res.status(200).json({ ok: true });
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

    // ============================================================================
    // GET: Retrieve preferences
    // ============================================================================
    if (req.method === "GET") {
      const query = req.query || {};
      let targetDoctorId = user.id; // Default: own preferences

      // Admin can query by doctor_id
      if (profile.role === "admin" && query.doctor_id) {
        targetDoctorId = String(query.doctor_id).trim();
      }

      const { data: prefs, error: prefsErr } = await dbClient
        .from("doctor_preferences")
        .select("*")
        .eq("doctor_id", targetDoctorId)
        .maybeSingle();

      if (prefsErr) {
        console.error("[doctor/preferences] Query error:", prefsErr, { requestId });
        return res.status(500).json({
          ok: false,
          error: prefsErr.message || "Failed to fetch preferences",
          step: "fetch_preferences",
          requestId,
          buildSha,
        });
      }

      // Return defaults if no preferences exist
      if (!prefs) {
        return res.status(200).json({
          ok: true,
          preferences: {
            doctor_id: targetDoctorId,
            locale: "en",
            brief_style: "bullets",
            tone: "warm_expert",
            risk_tolerance: "balanced",
            specialties: [],
            preferred_materials: {},
            clinic_protocol_notes: null,
          },
          requestId,
          buildSha,
        });
      }

      return res.status(200).json({
        ok: true,
        preferences: prefs,
        requestId,
        buildSha,
      });
    }

    // ============================================================================
    // POST: Upsert preferences
    // ============================================================================
    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};

      // Validate enum values
      const locale = body.locale || "en";
      const briefStyle = body.brief_style || "bullets";
      const tone = body.tone || "warm_expert";
      const riskTolerance = body.risk_tolerance || "balanced";

      const validLocales = ["en", "tr"];
      const validBriefStyles = ["bullets", "detailed"];
      const validTones = ["warm_expert", "formal_clinical"];
      const validRiskTolerances = ["conservative", "balanced", "aggressive"];

      if (!validLocales.includes(locale)) {
        return res.status(400).json({
          ok: false,
          error: `Invalid locale. Must be one of: ${validLocales.join(", ")}`,
          step: "validation",
          requestId,
          buildSha,
        });
      }

      if (!validBriefStyles.includes(briefStyle)) {
        return res.status(400).json({
          ok: false,
          error: `Invalid brief_style. Must be one of: ${validBriefStyles.join(", ")}`,
          step: "validation",
          requestId,
          buildSha,
        });
      }

      if (!validTones.includes(tone)) {
        return res.status(400).json({
          ok: false,
          error: `Invalid tone. Must be one of: ${validTones.join(", ")}`,
          step: "validation",
          requestId,
          buildSha,
        });
      }

      if (!validRiskTolerances.includes(riskTolerance)) {
        return res.status(400).json({
          ok: false,
          error: `Invalid risk_tolerance. Must be one of: ${validRiskTolerances.join(", ")}`,
          step: "validation",
          requestId,
          buildSha,
        });
      }

      // Doctors can only update their own preferences
      if (profile.role !== "admin" && body.doctor_id && body.doctor_id !== user.id) {
        return res.status(403).json({
          ok: false,
          error: "Cannot update other doctor's preferences",
          step: "authorization",
          requestId,
          buildSha,
        });
      }

      const targetDoctorId = body.doctor_id || user.id;

      const preferencesData = {
        doctor_id: targetDoctorId,
        locale,
        brief_style: briefStyle,
        tone,
        risk_tolerance: riskTolerance,
        specialties: Array.isArray(body.specialties) ? body.specialties : [],
        preferred_materials: body.preferred_materials || {},
        clinic_protocol_notes: body.clinic_protocol_notes || null,
        updated_at: new Date().toISOString(),
      };

      // Upsert (insert or update)
      const { data: prefs, error: upsertErr } = await dbClient
        .from("doctor_preferences")
        .upsert(preferencesData, { onConflict: "doctor_id" })
        .select()
        .single();

      if (upsertErr) {
        console.error("[doctor/preferences] Upsert error:", upsertErr, { requestId });
        return res.status(500).json({
          ok: false,
          error: upsertErr.message || "Failed to save preferences",
          step: "upsert_preferences",
          requestId,
          buildSha,
        });
      }

      return res.status(200).json({
        ok: true,
        preferences: prefs,
        requestId,
        buildSha,
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
      step: "method_check",
      requestId,
      buildSha,
    });
  } catch (err) {
    console.error("[doctor/preferences] Handler crash:", err, { requestId });
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Server error",
      step: "handler",
      requestId,
      buildSha,
    });
  }
};

