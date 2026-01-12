// api/doctor/leads.js
// GET /api/doctor/leads?bucket=unread|reviewed
// Returns privacy-filtered lead data (no email/phone/utm/internal meta)
// Auth: Bearer JWT (doctor role required) - AGE-PROOF (explicit column allowlist)

const { createClient } = require("@supabase/supabase-js");
const { toDoctorLeadDTO, filterLeadsByBucket } = require("../_doctorPrivacy");

module.exports = async function handler(req, res) {
  const requestId = `doctor_leads_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const buildSha =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.VERCEL_GIT_COMMIT_REF ||
    process.env.GITHUB_SHA ||
    null;

  try {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Cache-Control", "no-store");

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    // ✅ Ping mode (DB'ye hiç girmez) — deploy doğru mu test
    if (req.query?.ping === "1") {
      return res.status(200).json({ ok: true, ping: "doctor/leads", requestId, buildSha });
    }

    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed", requestId, buildSha });
    }

    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) {
      return res.status(401).json({ ok: false, error: "Missing Authorization Bearer token", requestId, buildSha });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    const user = userData?.user;
    if (userErr || !user) {
      return res.status(401).json({ ok: false, error: "Invalid session", requestId, buildSha });
    }

    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (profErr || !profile || profile.role !== "doctor") {
      return res.status(403).json({ ok: false, error: "Forbidden", requestId, buildSha });
    }

    const bucket = String(req.query?.bucket || "unread");
    const limit = Math.min(parseInt(String(req.query?.limit || "100"), 10) || 100, 200);

    // ✅ AGE-PROOF: Explicit column allowlist (age/gender ASLA yok)
    const { data: rows, error: rowsErr } = await supabase
      .from("leads")
      .select([
        "id",
        "lead_uuid",
        "name",
        "treatment",
        "timeline",
        "message",
        "status",
        "doctor_id",
        "doctor_review_status",
        "doctor_assigned_at",
        "updated_at",
        "created_at",
        "ai_summary",
        "snapshot",
      ].join(","))
      .eq("doctor_id", user.id)
      .order("doctor_assigned_at", { ascending: false })
      .limit(limit);

    if (rowsErr) {
      return res.status(500).json({ ok: false, error: rowsErr.message, requestId, buildSha });
    }

    const dto = (rows || []).map(toDoctorLeadDTO);
    const filtered = filterLeadsByBucket(dto, bucket);

    return res.status(200).json({ ok: true, leads: filtered, requestId, buildSha });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: e?.message || "Server error",
      requestId,
      buildSha,
    });
  }
};
