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
            // ✅ Schema-safe defaults: use `language` (NOT `locale`)
            language: "en",
            brief_style: "bullets",
            tone: "warm_expert",
            risk_tolerance: "balanced",
            // ✅ Schema-safe JSON: `material_preferences` (NOT `preferred_materials`)
            material_preferences: {},
            implant_preferences: {},
            exclusions: {},
            patient_message_templates: {},
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
      const normalized = body || {};

      // ✅ Back-compat mapping:
      // - frontend may send `locale` but DB column is `language`
      // - old code may send `preferred_materials` but DB column is `material_preferences`
      const language = normalized.language || normalized.locale || "en";
      const materialPrefs =
        normalized.material_preferences ||
        normalized.preferred_materials ||
        {};

      const implantPrefs = normalized.implant_preferences || {};
      const exclusions = normalized.exclusions || {};
      const patientMessageTemplates = normalized.patient_message_templates || {};

      // Validate enum values
      const briefStyle = normalized.brief_style || "bullets";
      const tone = normalized.tone || "warm_expert";
      const riskToleranceRaw = normalized.risk_tolerance ?? "balanced";

      const validLanguages = ["en", "tr"];
      const validBriefStyles = ["bullets", "detailed"];
      const validTones = ["warm_expert", "formal_clinical"];
      const validRiskTolerances = ["conservative", "balanced", "aggressive"];

      if (!validLanguages.includes(language)) {
        return res.status(400).json({
          ok: false,
          error: `Invalid language. Must be one of: ${validLanguages.join(", ")}`,
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

      // ✅ risk_tolerance column is INTEGER in this project (per prod error),
      // but UI sends strings ("balanced"). We accept both and store integer.
      // Mapping: conservative=0, balanced=1, aggressive=2
      let riskToleranceInt = 1;
      if (typeof riskToleranceRaw === "number" && Number.isFinite(riskToleranceRaw)) {
        riskToleranceInt = Math.max(0, Math.min(2, Math.trunc(riskToleranceRaw)));
      } else {
        const rt = String(riskToleranceRaw || "").toLowerCase().trim();
        if (!validRiskTolerances.includes(rt)) {
          return res.status(400).json({
            ok: false,
            error: `Invalid risk_tolerance. Must be one of: ${validRiskTolerances.join(", ")}`,
            step: "validation",
            requestId,
            buildSha,
          });
        }
        riskToleranceInt = rt === "conservative" ? 0 : rt === "aggressive" ? 2 : 1;
      }

      // Doctors can only update their own preferences
      if (profile.role !== "admin" && normalized.doctor_id && normalized.doctor_id !== user.id) {
        return res.status(403).json({
          ok: false,
          error: "Cannot update other doctor's preferences",
          step: "authorization",
          requestId,
          buildSha,
        });
      }

      const targetDoctorId = normalized.doctor_id || user.id;

      // ✅ Candidate payload (we will retry-remove unknown columns if schema cache differs)
      let preferencesData = {
        doctor_id: targetDoctorId,
        language,
        brief_style: briefStyle,
        tone,
        risk_tolerance: riskToleranceInt,
        material_preferences: materialPrefs,
        implant_preferences: implantPrefs,
        exclusions,
        patient_message_templates: patientMessageTemplates,
        updated_at: new Date().toISOString(),
      };

      // ✅ Allowlist (real schema candidates)
      const ALLOWED_CANDIDATES = new Set([
        "doctor_id",
        "language",
        "brief_style",
        "tone",
        "risk_tolerance",
        "material_preferences",
        "implant_preferences",
        "exclusions",
        "patient_message_templates",
        "updated_at",
      ]);
      preferencesData = Object.fromEntries(
        Object.entries(preferencesData).filter(([k, v]) => ALLOWED_CANDIDATES.has(k) && v !== undefined)
      );

      // ✅ Upsert with schema-mismatch retry (removes unknown column names based on error message)
      let prefs = null;
      let upsertErr = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        // eslint-disable-next-line no-await-in-loop
        const r = await dbClient
          .from("doctor_preferences")
          .upsert(preferencesData, { onConflict: "doctor_id" })
          .select()
          .single();
        prefs = r.data || null;
        upsertErr = r.error || null;

        if (!upsertErr) break;

        const msg = String(upsertErr.message || "");
        const m = msg.match(/Could not find the '([^']+)' column/i);
        const missingCol = m?.[1];
        if (missingCol && Object.prototype.hasOwnProperty.call(preferencesData, missingCol)) {
          console.warn("[doctor/preferences] Schema mismatch, dropping column and retrying:", {
            missingCol,
            attempt,
            requestId,
          });
          delete preferencesData[missingCol];
          continue;
        }
        break;
      }

      if (upsertErr) {
        console.error("[doctor/preferences] Upsert error:", upsertErr, { requestId });
        return res.status(400).json({
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

