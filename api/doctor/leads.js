// api/doctor/leads.js
// GET /api/doctor/leads?bucket=unread|reviewed
// Returns privacy-filtered lead data (no email/phone/utm/internal meta)
// Auth: Bearer JWT (doctor role required)

const { createClient } = require("@supabase/supabase-js");

function getBearerToken(req) {
  const h = req.headers.authorization;
  if (!h) return null;
  const [type, token] = String(h).split(" ");
  if (!type || type.toLowerCase() !== "bearer") return null;
  return token || null;
}

module.exports = async function handler(req, res) {
  const requestId = `doctor_leads_${Date.now()}_${Math.random().toString(16).slice(2)}`;

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

    // Parse bucket filter (unread = pending, reviewed = reviewed)
    const bucket = req.query?.bucket ? String(req.query.bucket).trim().toLowerCase() : "unread";
    const validBuckets = ["unread", "pending", "reviewed"];
    const bucketFilter = validBuckets.includes(bucket) ? bucket : "unread";

    // Build query with privacy filter - only allowed columns
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
        status
      `)
      .eq("doctor_id", user.id)
      .order("doctor_assigned_at", { ascending: false });

    // Apply bucket filter
    if (bucketFilter === "unread" || bucketFilter === "pending") {
      q = q.in("doctor_review_status", ["pending", "needs_info", null]).limit(100);
    } else if (bucketFilter === "reviewed") {
      q = q.eq("doctor_review_status", "reviewed").limit(100);
    }

    const { data: leads, error } = await q;

    if (error) {
      console.error("[doctor/leads] Query error:", error, { requestId });
      return res.status(500).json({ ok: false, error: error.message, requestId });
    }

    // ✅ Privacy filter: remove any sensitive fields that might leak through
    const safeLeads = (leads || []).map((lead) => {
      const safe = {
        id: lead.id,
        lead_uuid: lead.lead_uuid,
        name: lead.name || "Unknown",
        age: lead.age || null,
        gender: lead.gender || null,
        treatment: lead.treatment || null,
        timeline: lead.timeline || null,
        message: lead.message || null, // ✅ Patient message only (pre-filtered)
        doctor_review_status: lead.doctor_review_status || "pending",
        doctor_review_notes: lead.doctor_review_notes || null,
        doctor_assigned_at: lead.doctor_assigned_at || null,
        doctor_reviewed_at: lead.doctor_reviewed_at || null,
        created_at: lead.created_at || null,
        status: lead.status || "new",
      };
      // Explicitly exclude sensitive fields (double-check)
      delete safe.email;
      delete safe.phone;
      delete safe.referrer;
      delete safe.utm_source;
      delete safe.utm_medium;
      delete safe.utm_campaign;
      delete safe.utm_term;
      delete safe.utm_content;
      delete safe.page_url;
      delete safe.meta;
      return safe;
    });

    return res.status(200).json({
      ok: true,
      leads: safeLeads,
      bucket: bucketFilter,
      requestId,
    });
  } catch (err) {
    console.error("[doctor/leads] Handler crash:", err, { requestId });
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Internal server error",
      requestId,
    });
  }
};

