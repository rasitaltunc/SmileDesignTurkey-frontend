// api/doctor/note/approve.js
// POST /api/doctor/note/approve
// Approves doctor note, generates PDF with signature, uploads to storage, creates notification
// Body: { note_id }
// Auth: Bearer JWT (doctor role required)

const { generateDoctorNotePDF } = require("../../_pdfUtils");
const { requireDoctor } = require("../../_lib/requireDoctor");
const { validateServerEnv } = require("../../_lib/validateEnv");

const buildSha =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.VERCEL_GIT_COMMIT_REF ||
  process.env.GITHUB_SHA ||
  null;

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

    // ✅ CRITICAL: Validate environment before proceeding
    try {
      validateServerEnv();
    } catch (envErr) {
      console.error('[doctor/note/approve] Environment validation failed:', envErr.message);
      return res.status(500).json({
        ok: false,
        error: 'Server configuration error - missing required environment variables',
        step: 'env_validation',
        requestId,
        buildSha,
        details: envErr.message
      });
    }

    // ✅ Require doctor role (common helper)
    const gate = await requireDoctor(req);
    if (!gate.ok) {
      return res.status(gate.status).json({
        ...gate.body,
        requestId,
        buildSha,
      });
    }

    const { user, profile, supa: dbClient } = gate;

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

    // ✅ Fetch signature (get signed URL from storage)
    let signatureImageUrl = null;
    try {
    const { data: signature } = await dbClient
      .from("doctor_signatures")
        .select("signature_storage_path")
      .eq("doctor_id", user.id)
      .maybeSingle();

      if (signature?.signature_storage_path) {
        // Generate signed URL for signature image
        const { data: urlData } = await dbClient.storage
          .from("signatures")
          .createSignedUrl(signature.signature_storage_path, 3600); // 1 hour expiry

        signatureImageUrl = urlData?.signedUrl || null;
      }
    } catch (sigErr) {
      console.debug("[doctor/note/approve] Signature fetch skipped:", sigErr?.message);
    }

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
        detail: pdfErr instanceof Error ? pdfErr.message : String(pdfErr),
        stack: process.env.NODE_ENV === 'development' ? (pdfErr instanceof Error ? pdfErr.stack : undefined) : undefined,
        requestId,
        buildSha,
      });
    }

    // ✅ Upload PDF to Supabase Storage (path: pdf/doctor-notes/{note_id}.pdf)
    const storagePath = `pdf/doctor-notes/${noteId}.pdf`;

    const { error: uploadErr } = await dbClient.storage
      .from("pdf")
      .upload(storagePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true, // Allow overwrite if regenerated
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

    // ✅ Fetch lead for notification and stage update
    const { data: lead, error: leadFetchErr } = await dbClient
      .from("leads")
      .select("assigned_to, stage, status")
      .eq("id", note.lead_id)
      .maybeSingle();

    if (leadFetchErr) {
      console.error("[doctor/note/approve] Lead fetch error:", leadFetchErr, { requestId });
    }

    // ✅ Update lead stage to 'doctor_approved' (pipeline automation)
    if (lead) {
      try {
        await dbClient
          .from("leads")
          .update({
            stage: "doctor_approved",
            updated_at: approvedAt,
          })
          .eq("id", note.lead_id);
      } catch (stageErr) {
        // If stage column doesn't exist, log but don't fail
        console.warn("[doctor/note/approve] Stage update skipped (column may not exist):", stageErr.message);
      }

      // ✅ Create notification for assigned employee
      if (lead.assigned_to) {
        await dbClient.from("notifications").insert({
          user_id: lead.assigned_to,
          type: "doctor_note_approved",
          title: "Doctor Note Approved",
          message: `Doctor ${profile.full_name || "Unknown"} has approved and signed a note for case ${caseCode}`,
          link: `/employee/leads/${note.lead_id}`, // Link to employee lead view
          metadata: {
            doctor_note_id: noteId,
            lead_id: note.lead_id,
            case_code: caseCode,
          },
          created_at: approvedAt,
        });
      }
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

