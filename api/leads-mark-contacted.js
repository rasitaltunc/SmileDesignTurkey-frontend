// api/leads-mark-contacted.js
// POST /api/leads-mark-contacted
// Mark a lead as contacted (sets last_contacted_at = now())
// Admin-only: requires x-admin-token

const { createClient } = require("@supabase/supabase-js");

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-token");
}

function getAdminToken(req) {
  return (req.headers["x-admin-token"] || "").toString();
}

function pickString(v) {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return "";
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  // Verify admin token
  const adminToken = getAdminToken(req);
  const expectedToken = process.env.ADMIN_TOKEN || "";

  if (!expectedToken || adminToken !== expectedToken) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // Parse request body
  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  const leadId = pickString(body.lead_id || body.leadId);

  if (!leadId) {
    return res.status(400).json({ error: "Missing lead_id" });
  }

  // Initialize Supabase client (service role)
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: "Missing SUPABASE env" });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // Parse optional channel from body (default: phone)
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const channel = (body.channel || "phone").toString().toLowerCase();
    const note = (body.note || "").toString().trim() || null;

    // Validate channel
    const validChannels = ["phone", "whatsapp", "email", "sms", "other"];
    if (!validChannels.includes(channel)) {
      return res.status(400).json({ error: `Invalid channel. Must be one of: ${validChannels.join(", ")}` });
    }

    // Insert contact event first (audit trail)
    const { data: contactEvent, error: eventError } = await supabase
      .from("lead_contact_events")
      .insert([
        {
          lead_id: leadId,
          channel: channel,
          note: note,
          created_by: null, // Service role insert, no user context
        },
      ])
      .select("*")
      .single();

    if (eventError) {
      console.error("[leads-mark-contacted] Error creating contact event:", eventError);
      // Continue anyway - update lead even if event insert fails
    }

    // Update last_contacted_at to now()
    const { data: updatedLead, error: updateError } = await supabase
      .from("leads")
      .update({
        last_contacted_at: new Date().toISOString(),
      })
      .eq("id", leadId)
      .select("id, last_contacted_at")
      .single();

    if (updateError) {
      console.error("[leads-mark-contacted] Error updating lead:", updateError);
      return res.status(500).json({ error: "Failed to update lead", details: updateError.message });
    }

    if (!updatedLead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    return res.status(200).json({
      ok: true,
      leadId: updatedLead.id,
      last_contacted_at: updatedLead.last_contacted_at,
      contact_event: contactEvent || null,
    });
  } catch (error) {
    console.error("[leads-mark-contacted] Unhandled error:", error);
    return res.status(500).json({ error: "Internal server error", details: error.message });
  }
};

