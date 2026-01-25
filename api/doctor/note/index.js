// api/doctor/note/index.js
// GET /api/doctor/note?lead_id=...
// Returns latest doctor_note + items + signature info + pdf link if exists
// Auth: Bearer JWT (doctor role required)

const { createClient } = require("@supabase/supabase-js");
const { normalizeRef, fetchLeadByRef } = require("../../_doctorLeadResolve");

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
  const requestId = `doctor_note_get_${Date.now()}_${Math.random().toString(16).slice(2)}`;

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

    // ✅ Parse URL
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

    // ✅ Support multiple param names: leadRef, lead_id, ref, id, leadId
    const leadRef =
      url.searchParams.get("leadRef") ||
      url.searchParams.get("lead_id") ||
      url.searchParams.get("ref") ||
      url.searchParams.get("id") ||
      url.searchParams.get("leadId") ||
      null;

    if (!leadRef) {
      return res.status(400).json({
        ok: false,
        error: "Missing leadRef parameter",
        step: "param_check",
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
        .select("id, role")
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

    // ✅ Fetch lead using robust resolve helper
    let lead;
    try {
      const result = await fetchLeadByRef(dbClient, leadRef, user.id);

      if (result.error) {
        console.error("[doctor/note] Lead fetch error:", result.error, { requestId, leadRef });
        // If assignment error, return 403; otherwise 404
        if (result.error.includes("not assigned")) {
          return res.status(403).json({
            ok: false,
            error: result.error,
            step: "fetch_lead",
            requestId,
            buildSha,
          });
        }
        return res.status(404).json({
          ok: false,
          error: result.error || "Lead not found",
          step: "fetch_lead",
          requestId,
          buildSha,
          leadRef: String(leadRef || ""),
        });
      }

      if (!result.lead) {
        return res.status(404).json({
          ok: false,
          error: "Lead not found",
          step: "fetch_lead",
          requestId,
          buildSha,
          leadRef: String(leadRef || ""),
        });
      }

      lead = result.lead;
    } catch (leadErr) {
      console.error("[doctor/note] Lead fetch exception:", leadErr, { requestId, leadRef });
      return res.status(500).json({
        ok: false,
        error: leadErr instanceof Error ? leadErr.message : "Lead query failed",
        step: "fetch_lead",
        requestId,
        buildSha,
      });
    }

    // ✅ Verify assignment (only if doctor_id is set)
    // If doctor_id is null, allow access (lead not yet assigned)
    if (lead.doctor_id && lead.doctor_id !== user.id) {
      console.warn("[doctor/note] Assignment mismatch:", { leadDoctorId: lead.doctor_id, userId: user.id, requestId });
      return res.status(403).json({
        ok: false,
        error: "Lead not assigned to you",
        step: "lead_assignment_check",
        requestId,
        buildSha,
      });
    }

    const leadId = lead.id; // Use resolved lead.id for note queries

    // ✅ Fetch latest doctor_note
    let note;
    let noteErr;
    try {
      const result = await dbClient
        .from("doctor_notes")
        .select("*")
        .eq("lead_id", leadId)
        .eq("doctor_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      note = result.data;
      noteErr = result.error;
    } catch (queryErr) {
      console.error("[doctor/note] Note query exception:", queryErr, { requestId, leadId, doctorId: user.id });
      return res.status(500).json({
        ok: false,
        error: queryErr instanceof Error ? queryErr.message : "Note query failed",
        step: "fetch_note",
        requestId,
        buildSha,
      });
    }

    if (noteErr) {
      console.error("[doctor/note] Note query error:", noteErr, { requestId, leadId, doctorId: user.id });
      return res.status(500).json({
        ok: false,
        error: noteErr.message || "Note query failed",
        step: "fetch_note",
        requestId,
        buildSha,
      });
    }

    if (!note) {
      return res.status(200).json({
        ok: true,
        note: null,
        items: [],
        signature: null,
        pdfUrl: null,
        requestId,
        buildSha,
      });
    }

    // ✅ Fetch note items (only if note exists)
    let items = [];
    if (note) {
      try {
        const itemsResult = await dbClient
          .from("doctor_note_items")
          .select("*")
          .eq("doctor_note_id", note.id)
          .order("created_at", { ascending: true });
        items = itemsResult.data || [];
        if (itemsResult.error) {
          console.error("[doctor/note] Items query error (non-fatal):", itemsResult.error, { requestId, noteId: note.id });
        }
      } catch (itemsErr) {
        console.error("[doctor/note] Items query exception (non-fatal):", itemsErr, { requestId, noteId: note.id });
        items = [];
      }
    }

    // ✅ Fetch signature info (only if note is approved)
    let signature = null;
    if (note && note.approved_at) {
      try {
        const sigResult = await dbClient
          .from("doctor_signatures")
          .select("signature_image_url, signed_at")
          .eq("doctor_id", user.id)
          .maybeSingle();
        signature = sigResult.data || null;
        if (sigResult.error) {
          console.debug("[doctor/note] Signature fetch error (non-fatal):", sigResult.error, { requestId });
        }
      } catch (sigErr) {
        console.debug("[doctor/note] Signature fetch exception (non-fatal):", sigErr, { requestId });
        signature = null;
      }
    }

    // ✅ Build PDF URL if exists (only if note has pdf_storage_path)
    let pdfUrl = null;
    if (note && note.pdf_storage_path) {
      try {
        const urlResult = await dbClient.storage
          .from("pdf") // ✅ Correct bucket name (matches approve endpoint)
          .createSignedUrl(note.pdf_storage_path, 3600); // 1 hour expiry
        pdfUrl = urlResult.data?.signedUrl || null;
        if (urlResult.error) {
          console.debug("[doctor/note] PDF URL generation error (non-fatal):", urlResult.error, { requestId });
        }
      } catch (pdfErr) {
        console.debug("[doctor/note] PDF URL generation exception (non-fatal):", pdfErr, { requestId });
        pdfUrl = null;
      }
    }

    return res.status(200).json({
      ok: true,
      note: note,
      items: items || [],
      signature: signature,
      pdfUrl: pdfUrl,
      requestId,
      buildSha,
    });
  } catch (err) {
    console.error("[doctor/note] Handler crash:", err, { requestId });
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Server error",
      step: "handler",
      requestId,
      buildSha,
    });
  }
};

