// api/doctor/signature/upload.js
// POST /api/doctor/signature/upload
// Upload doctor signature (base64 PNG/JPG)
// Body: { signature_data (base64), display_name?, title? }
// Auth: Bearer JWT (doctor role required)

const { createClient } = require("@supabase/supabase-js");
const { requireDoctor } = require("../../_lib/requireDoctor");

const buildSha =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.VERCEL_GIT_COMMIT_REF ||
  process.env.GITHUB_SHA ||
  null;

module.exports = async function handler(req, res) {
  const requestId = `doctor_signature_upload_${Date.now()}_${Math.random().toString(16).slice(2)}`;

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
    const signatureData = body.signature_data || body.signatureData || body.base64Image || body.base64;
    const displayName = body.display_name || body.displayName || profile.full_name || null;
    const title = body.title || profile.title || null;

    if (!signatureData) {
      return res.status(400).json({
        ok: false,
        error: "Missing signature_data parameter (base64 PNG/JPG)",
        step: "param_check",
        requestId,
        buildSha,
      });
    }

    // ✅ Parse base64 data URL or raw base64
    let imageBuffer;
    let contentType = "image/png";
    try {
      if (signatureData.startsWith("data:image")) {
        // Data URL format: data:image/png;base64,...
        const matches = signatureData.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches) {
          throw new Error("Invalid data URL format");
        }
        contentType = `image/${matches[1]}`;
        imageBuffer = Buffer.from(matches[2], "base64");
      } else {
        // Raw base64
        imageBuffer = Buffer.from(signatureData, "base64");
      }
    } catch (parseErr) {
      return res.status(400).json({
        ok: false,
        error: "Invalid signature_data format. Expected base64 PNG/JPG.",
        step: "parse_signature",
        requestId,
        buildSha,
      });
    }

    // ✅ Determine file extension from content type
    const ext = contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" : "png";
    const storagePath = `signatures/${user.id}.${ext}`;

    // ✅ Upload to Supabase Storage
    const { error: uploadErr } = await dbClient.storage
      .from("signatures")
      .upload(storagePath, imageBuffer, {
        contentType: contentType,
        upsert: true,
      });

    if (uploadErr) {
      console.error("[doctor/signature/upload] Upload error:", uploadErr, { requestId });
      return res.status(500).json({
        ok: false,
        error: uploadErr.message || "Failed to upload signature",
        step: "upload_signature",
        requestId,
        buildSha,
      });
    }

    // ✅ Upsert doctor_signatures row
    const { data: signature, error: upsertErr } = await dbClient
      .from("doctor_signatures")
      .upsert(
        {
          doctor_id: user.id,
          signature_storage_path: storagePath,
          display_name: displayName,
          title: title,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "doctor_id" }
      )
      .select()
      .single();

    if (upsertErr) {
      console.error("[doctor/signature/upload] Upsert error:", upsertErr, { requestId });
      return res.status(500).json({
        ok: false,
        error: upsertErr.message || "Failed to save signature metadata",
        step: "upsert_signature",
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
    console.error("[doctor/signature/upload] Handler crash:", err, { requestId });
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Server error",
      step: "handler",
      requestId,
      buildSha,
    });
  }
};

