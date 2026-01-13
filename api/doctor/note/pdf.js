// api/doctor/note/pdf.js
// GET /api/doctor/note/pdf?note_id=...
// Returns signed URL for doctor note PDF (doctor/admin/employee role required)
// Auth: Bearer JWT

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
  const requestId = `doctor_note_pdf_${Date.now()}_${Math.random().toString(16).slice(2)}`;

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

    // ✅ Verify role (doctor/admin/employee)
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

      const allowedRoles = ["doctor", "admin", "employee"];
      if (!allowedRoles.includes(profData.role)) {
        return res.status(403).json({
          ok: false,
          error: "Forbidden: doctor, admin, or employee access only",
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

    // ✅ Get note_id from query
    const query = req.query || {};
    const noteId = query.note_id ? String(query.note_id).trim() : null;

    if (!noteId) {
      return res.status(400).json({
        ok: false,
        error: "Missing note_id query parameter",
        step: "param_check",
        requestId,
        buildSha,
      });
    }

    // ✅ Fetch note with lead info
    const { data: note, error: noteErr } = await dbClient
      .from("doctor_notes")
      .select("*, leads(id, assigned_to, doctor_id)")
      .eq("id", noteId)
      .maybeSingle();

    if (noteErr || !note) {
      return res.status(404).json({
        ok: false,
        error: "Doctor note not found",
        step: "fetch_note",
        requestId,
        buildSha,
      });
    }

    // ✅ Authorization checks
    if (profile.role === "doctor" && note.doctor_id !== user.id) {
      return res.status(403).json({
        ok: false,
        error: "Note not owned by you",
        step: "authorization_check",
        requestId,
        buildSha,
      });
    }

    if (profile.role === "employee" && note.leads?.assigned_to !== user.id) {
      return res.status(403).json({
        ok: false,
        error: "Lead not assigned to you",
        step: "authorization_check",
        requestId,
        buildSha,
      });
    }

    // ✅ Get PDF storage path
    const pdfPath = note.pdf_storage_path || `pdf/doctor-notes/${noteId}.pdf`;

    // ✅ Generate signed URL (1 hour expiry)
    const { data: urlData, error: urlErr } = await dbClient.storage
      .from("pdf")
      .createSignedUrl(pdfPath, 3600);

    if (urlErr || !urlData?.signedUrl) {
      console.error("[doctor/note/pdf] Signed URL error:", urlErr, { requestId });
      return res.status(500).json({
        ok: false,
        error: "Failed to generate signed URL",
        step: "generate_url",
        requestId,
        buildSha,
      });
    }

    return res.status(200).json({
      ok: true,
      signedUrl: urlData.signedUrl,
      requestId,
      buildSha,
    });
  } catch (err) {
    console.error("[doctor/note/pdf] Handler crash:", err, { requestId });
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Server error",
      step: "handler",
      requestId,
      buildSha,
    });
  }
};

