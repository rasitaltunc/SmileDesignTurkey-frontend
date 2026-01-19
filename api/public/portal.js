// api/public/portal.js
// Public endpoint to fetch portal data by case_id + portal_token
// No auth required, but validates portal_token for security

const { createClient } = require("@supabase/supabase-js");

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const db = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  if (!url || !serviceKey) {
    return res.status(500).json({ ok: false, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const { case_id, portal_token } = body;

    if (!case_id || !portal_token) {
      return res.status(400).json({ ok: false, error: "case_id and portal_token are required" });
    }

    // Fetch lead by case_id + portal_token (secure validation)
    const { data: lead, error } = await db
      .from("leads")
      .select("id, case_id, created_at, name, email, phone, treatment, message, timeline, portal_status, email_verified_at, coordinator_email")
      .eq("case_id", case_id)
      .eq("portal_token", portal_token)
      .single();

    if (error || !lead) {
      return res.status(404).json({ ok: false, error: "Case not found or invalid token" });
    }

    // Return safe payload (no internal notes, scoring, admin fields)
    const safePayload = {
      id: lead.id, // lead_id for send-verification endpoint
      case_id: lead.case_id,
      created_at: lead.created_at,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      treatment: lead.treatment || lead.treatment,
      message: lead.message,
      timeline: lead.timeline,
      portal_status: lead.portal_status || "pending_review",
      email_verified_at: lead.email_verified_at,
      coordinator_email: lead.coordinator_email,
      // Computed next_step suggestion
      next_step: lead.email_verified_at ? "upload" : "verify",
    };

    return res.status(200).json({ ok: true, data: safePayload });
  } catch (e) {
    console.error("[api/public/portal] Error:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
};

