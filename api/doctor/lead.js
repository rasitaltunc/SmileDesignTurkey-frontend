// api/doctor/lead.js
// GET /api/doctor/lead?ref=... (ref = lead_uuid or lead.id)
// Returns privacy-filtered single lead with snapshot and documents
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
  const requestId = `doctor_lead_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  try {
    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Cache-Control", "no-store");

    if (req.method === "OPTIONS") return res.status(200).end();

    if (req.method !== "GET") {
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

    // Get ref parameter (UUID or TEXT id)
    const ref = req.query?.ref ? String(req.query.ref).trim() : null;
    if (!ref) {
      return res.status(400).json({ ok: false, error: "Missing ref parameter", requestId });
    }

    // Build query based on ref type
    let q = dbClient
      .from("leads")
      .select(`
        id,
        lead_uuid,
        name,
        age,
        gender,
        treatment,
        timeline,
        message,
        doctor_review_status,
        doctor_review_notes,
        doctor_assigned_at,
        doctor_reviewed_at,
        created_at,
        status,
        ai_summary
      `)
      .eq("doctor_id", user.id); // ✅ Doctor can only see their assigned leads

    if (isUuid(ref)) {
      q = q.eq("lead_uuid", ref);
    } else {
      q = q.eq("id", ref);
    }

    const { data: lead, error } = await q.maybeSingle();

    if (error) {
      console.error("[doctor/lead] Query error:", error, { requestId });
      return res.status(500).json({ ok: false, error: error.message, requestId });
    }

    if (!lead) {
      return res.status(404).json({ ok: false, error: "Lead not found or not assigned to you", requestId });
    }

    // ✅ Privacy filter: remove sensitive fields
    const safeLead = {
      id: lead.id,
      lead_uuid: lead.lead_uuid,
      name: lead.name || "Unknown",
      age: lead.age || null,
      gender: lead.gender || null,
      treatment: lead.treatment || null,
      timeline: lead.timeline || null,
      message: lead.message || null,
      doctor_review_status: lead.doctor_review_status || "pending",
      doctor_review_notes: lead.doctor_review_notes || null,
      doctor_assigned_at: lead.doctor_assigned_at || null,
      doctor_reviewed_at: lead.doctor_reviewed_at || null,
      created_at: lead.created_at || null,
      status: lead.status || "new",
      snapshot: lead.ai_summary || null, // ✅ Employee/admin snapshot (read-only for doctor)
    };

    // Fetch documents (if table exists)
    let documents = [];
    try {
      const { data: docsData } = await dbClient
        .from("lead_documents")
        .select("*")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false });

      if (docsData) {
        documents = docsData.map((doc) => ({
          id: doc.id,
          type: doc.type || "other",
          url: doc.url || null,
          filename: doc.filename || null,
          created_at: doc.created_at || null,
        }));
      }
    } catch (docsErr) {
      // Table might not exist, continue
      console.debug("[doctor/lead] Documents fetch skipped:", docsErr?.message);
    }

    return res.status(200).json({
      ok: true,
      lead: safeLead,
      documents: documents,
      requestId,
    });
  } catch (err) {
    console.error("[doctor/lead] Handler crash:", err, { requestId });
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Internal server error",
      requestId,
    });
  }
};

