// api/doctor/lead/review.js
// POST /api/doctor/lead/review
// Submit doctor review (notes) and mark as reviewed
// Auth: Bearer JWT (doctor role required)

const { createClient } = require("@supabase/supabase-js");

function getBearerToken(req) {
  const h = req.headers.authorization;
  if (!h) return null;
  const [type, token] = String(h).split(" ");
  if (!type || type.toLowerCase() !== "bearer") return null;
  return token || null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(v) {
  return typeof v === "string" && UUID_RE.test(v.trim());
}

module.exports = async function handler(req, res) {
  const requestId = `doctor_review_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  try {
    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") return res.status(200).end();

    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed", requestId });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({
        ok: false,
        error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
        requestId,
      });
    }

    const jwt = getBearerToken(req);
    if (!jwt) {
      return res.status(401).json({ ok: false, error: "Missing Authorization Bearer token", requestId });
    }

    const dbClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Verify JWT and get user
    const { data: userData, error: userErr } = await dbClient.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return res.status(401).json({ ok: false, error: "Invalid session", requestId });
    }

    const user = userData.user;

    // Verify doctor role
    const { data: profile, error: profErr } = await dbClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profErr || profile?.role !== "doctor") {
      return res.status(403).json({ ok: false, error: "Forbidden: doctor access only", requestId });
    }

    // Parse request body
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const ref = body.ref ? String(body.ref).trim() : null;
    const doctor_review_notes = body.doctor_review_notes ? String(body.doctor_review_notes).trim() : null;

    if (!ref) {
      return res.status(400).json({ ok: false, error: "Missing ref parameter", requestId });
    }

    // Verify lead exists and is assigned to this doctor
    let q = dbClient
      .from("leads")
      .select("id, doctor_id")
      .eq("doctor_id", user.id);

    if (isUuid(ref)) {
      q = q.eq("lead_uuid", ref);
    } else {
      q = q.eq("id", ref);
    }

    const { data: lead, error: leadErr } = await q.maybeSingle();

    if (leadErr) {
      console.error("[doctor/lead/review] Lead query error:", leadErr, { requestId });
      return res.status(500).json({ ok: false, error: leadErr.message, requestId });
    }

    if (!lead) {
      return res.status(404).json({ ok: false, error: "Lead not found or not assigned to you", requestId });
    }

    // Update lead: mark as reviewed and save notes
    const updateData = {
      doctor_review_status: "reviewed",
      doctor_reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (doctor_review_notes !== null) {
      updateData.doctor_review_notes = doctor_review_notes;
    }

    const { data: updatedLead, error: updateErr } = await dbClient
      .from("leads")
      .update(updateData)
      .eq("id", lead.id)
      .select("id, doctor_review_status, doctor_review_notes, doctor_reviewed_at")
      .single();

    if (updateErr) {
      console.error("[doctor/lead/review] Update error:", updateErr, { requestId });
      return res.status(500).json({ ok: false, error: updateErr.message, requestId });
    }

    // Create timeline event (if table exists)
    try {
      await dbClient.from("lead_timeline_events").insert({
        lead_id: lead.id,
        stage: "doctor_reviewed",
        actor_role: "doctor",
        note: "Doctor review submitted",
        payload: {
          doctor_review_notes: doctor_review_notes || null,
        },
        created_at: new Date().toISOString(),
      });
    } catch (timelineErr) {
      // Table might not exist, continue
      console.debug("[doctor/lead/review] Timeline event skipped:", timelineErr?.message);
    }

    return res.status(200).json({
      ok: true,
      lead: {
        id: updatedLead.id,
        doctor_review_status: updatedLead.doctor_review_status,
        doctor_review_notes: updatedLead.doctor_review_notes,
        doctor_reviewed_at: updatedLead.doctor_reviewed_at,
      },
      requestId,
    });
  } catch (err) {
    console.error("[doctor/lead/review] Handler crash:", err, { requestId });
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Internal server error",
      requestId,
    });
  }
};

