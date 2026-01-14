// api/doctor/signature/upload.js
// POST /api/doctor/signature/upload
// Upload doctor signature (base64 PNG/JPG)
// Body: { signature_data (base64), display_name?, title? }
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

      if (profErr) {
        console.error("[doctor/signature/upload] Profile query error:", profErr, { requestId, userId: user.id });
        return res.status(500).json({
          ok: false,
          error: "Profile query failed",
          step: "role_check",
          requestId,
          buildSha,
        });
      }

      if (!profData) {
        console.error("[doctor/signature/upload] Profile not found:", { requestId, userId: user.id });
        return res.status(403).json({
          ok: false,
          error: "Profile not found",
          step: "role_check",
          requestId,
          buildSha,
        });
      }

      const role = String(profData.role || "").trim().toLowerCase();
      if (role !== "doctor") {
        console.warn("[doctor/signature/upload] Invalid role:", { requestId, userId: user.id, role: profData.role, normalizedRole: role });
        return res.status(403).json({
          ok: false,
          error: "Forbidden: doctor access only",
          step: "role_check",
          requestId,
          buildSha,
        });
      }

      // ✅ Fetch full_name and title separately (optional fields)
      let profileWithDetails = { ...profData, full_name: null, title: null };
      try {
        const { data: profDetails } = await dbClient
          .from("profiles")
          .select("full_name, title")
          .eq("id", user.id)
          .maybeSingle();
        if (profDetails) {
          profileWithDetails.full_name = profDetails.full_name || null;
          profileWithDetails.title = profDetails.title || null;
        }
      } catch (detailErr) {
        // Non-fatal: use defaults
        console.debug("[doctor/signature/upload] Profile details fetch skipped:", detailErr?.message);
      }
      profile = profileWithDetails;
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

