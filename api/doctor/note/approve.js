// api/doctor/note/approve.js
// POST /api/doctor/note/approve
// Approves doctor note, generates PDF with signature, uploads to storage, creates notification
// Body: { note_id }
// Auth: Bearer JWT (doctor role required)

const { createClient } = require("@supabase/supabase-js");
const { generateDoctorNotePDF } = require("../../_pdfUtils");

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
  const requestId = `doctor_note_approve_${Date.now()}_${Math.random().toString(16).slice(2)}`;

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
        .select("id, role, full_name, title")
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
    const noteId = body.note_id ? String(body.note_id).trim() : null;

    if (!noteId) {
      return res.status(400).json({
        ok: false,
        error: "Missing note_id parameter",
        step: "param_check",
        requestId,
        buildSha,
      });
    }

    // ✅ Fetch note with lead info
    const { data: note, error: noteErr } = await dbClient
      .from("doctor_notes")
      .select("*, leads(id, name)")
      .eq("id", noteId)
      .eq("doctor_id", user.id)
      .maybeSingle();

    if (noteErr || !note) {
      return res.status(404).json({
        ok: false,
        error: "Note not found or not owned by you",
        step: "fetch_note",
        requestId,
        buildSha,
      });
    }

    // ✅ Fetch note items
    const { data: items, error: itemsErr } = await dbClient
      .from("doctor_note_items")
      .select("*")
      .eq("doctor_note_id", noteId)
      .order("created_at", { ascending: true });

    if (itemsErr) {
      console.error("[doctor/note/approve] Items query error:", itemsErr, { requestId });
    }

    // ✅ Fetch signature
    let signatureImageUrl = null;
    const { data: signature } = await dbClient
      .from("doctor_signatures")
      .select("signature_image_url")
      .eq("doctor_id", user.id)
      .maybeSingle();

    signatureImageUrl = signature?.signature_image_url || null;

    // ✅ Generate case code
    const caseCode = note.lead_id ? `CASE-${note.lead_id.substring(0, 8).toUpperCase()}` : "CASE-UNKNOWN";

    // ✅ Generate PDF
    let pdfBytes;
    try {
      pdfBytes = await generateDoctorNotePDF({
        clinicName: "Smile Design Turkey",
        caseCode: caseCode,
        leadId: note.lead_id,
        doctorName: profile.full_name || "Dr. Unknown",
        doctorTitle: profile.title || "Doctor",
        noteMarkdown: note.note_markdown || "",
        items: (items || []).map((item) => ({
          catalog_item_name: item.catalog_item_name,
          qty: item.qty,
          unit_price: item.unit_price,
          notes: item.notes,
          total: item.qty * item.unit_price,
        })),
        approvedAt: new Date().toISOString(),
        signatureImageUrl: signatureImageUrl,
      });
    } catch (pdfErr) {
      console.error("[doctor/note/approve] PDF generation error:", pdfErr, { requestId });
      return res.status(500).json({
        ok: false,
        error: "Failed to generate PDF",
        step: "generate_pdf",
        requestId,
        buildSha,
      });
    }

    // ✅ Upload PDF to Supabase Storage
    const fileName = `doctor-note-${noteId}-${Date.now()}.pdf`;
    const storagePath = `${user.id}/${fileName}`;

    const { error: uploadErr } = await dbClient.storage
      .from("doctor-notes")
      .upload(storagePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadErr) {
      console.error("[doctor/note/approve] PDF upload error:", uploadErr, { requestId });
      return res.status(500).json({
        ok: false,
        error: "Failed to upload PDF",
        step: "upload_pdf",
        requestId,
        buildSha,
      });
    }

    // ✅ Update note: set status approved, store PDF path
    const approvedAt = new Date().toISOString();
    const { error: updateErr } = await dbClient
      .from("doctor_notes")
      .update({
        status: "approved",
        approved_at: approvedAt,
        approved_by: user.id,
        pdf_storage_path: storagePath,
        updated_at: approvedAt,
      })
      .eq("id", noteId);

    if (updateErr) {
      console.error("[doctor/note/approve] Note update error:", updateErr, { requestId });
      return res.status(500).json({
        ok: false,
        error: "Failed to update note",
        step: "update_note",
        requestId,
        buildSha,
      });
    }

    // ✅ Create notification for assigned employee
    const { data: lead } = await dbClient
      .from("leads")
      .select("assigned_to")
      .eq("id", note.lead_id)
      .maybeSingle();

    if (lead?.assigned_to) {
      await dbClient.from("notifications").insert({
        user_id: lead.assigned_to,
        type: "doctor_note_approved",
        title: "Doctor Note Approved",
        message: `Doctor ${profile.full_name || "Unknown"} has approved and signed a note for case ${caseCode}`,
        metadata: {
          doctor_note_id: noteId,
          lead_id: note.lead_id,
          case_code: caseCode,
        },
        created_at: approvedAt,
      });
    }

    return res.status(200).json({
      ok: true,
      pdfPath: storagePath,
      approvedAt: approvedAt,
      requestId,
      buildSha,
    });
  } catch (err) {
    console.error("[doctor/note/approve] Handler crash:", err, { requestId });
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Server error",
      step: "handler",
      requestId,
      buildSha,
    });
  }
};

