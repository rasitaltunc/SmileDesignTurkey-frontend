// api/doctor/note/create.js
// POST /api/doctor/note/create
// Creates a draft doctor_note assigned to current doctor
// Body: { lead_id }
// Auth: Bearer JWT (doctor role required)

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
  const requestId = `doctor_note_create_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  try {
    if (req.method === "OPTIONS") {
      return res.status(200).json({ ok: true });
    }

    if (req.method !== "POST") {
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

    // ✅ Verify doctor role
    const dbClient = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let profile;
    try {
      const { data: profData, error: profErr } = await dbClient
        .from("profiles")
        .select("id, role, full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (profErr || !profData || profData.role !== "doctor") {
        return res.status(403).json({
          ok: false,
          error: "Forbidden: doctor access only",
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

    // ✅ Parse body
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const leadId = body.lead_id ? String(body.lead_id).trim() : null;

    if (!leadId) {
      return res.status(400).json({
        ok: false,
        error: "Missing lead_id parameter",
        step: "param_check",
        requestId,
        buildSha,
      });
    }

    // ✅ Verify lead exists and is assigned to this doctor
    const { data: lead, error: leadErr } = await dbClient
      .from("leads")
      .select("id, doctor_id")
      .eq("id", leadId)
      .maybeSingle();

    if (leadErr) {
      console.error("[doctor/note/create] Lead query error:", leadErr, { requestId });
      return res.status(500).json({
        ok: false,
        error: leadErr.message || "Lead query failed",
        step: "fetch_lead",
        requestId,
        buildSha,
      });
    }

    if (!lead) {
      return res.status(404).json({
        ok: false,
        error: "Lead not found",
        step: "fetch_lead",
        requestId,
        buildSha,
      });
    }

    if (lead.doctor_id !== user.id) {
      return res.status(403).json({
        ok: false,
        error: "Lead not assigned to you",
        step: "lead_assignment_check",
        requestId,
        buildSha,
      });
    }

    // ✅ Create draft doctor_note
    const { data: note, error: noteErr } = await dbClient
      .from("doctor_notes")
      .insert({
        lead_id: leadId,
        doctor_id: user.id,
        status: "draft",
        note_markdown: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (noteErr) {
      console.error("[doctor/note/create] Note creation error:", noteErr, { requestId });
      return res.status(500).json({
        ok: false,
        error: noteErr.message || "Failed to create doctor note",
        step: "create_note",
        requestId,
        buildSha,
      });
    }

    return res.status(200).json({
      ok: true,
      note: note,
      requestId,
      buildSha,
    });
  } catch (err) {
    console.error("[doctor/note/create] Handler crash:", err, { requestId });
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Server error",
      step: "handler",
      requestId,
      buildSha,
    });
  }
};

