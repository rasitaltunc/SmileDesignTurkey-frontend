// api/leads-contact-events.js
// GET /api/leads-contact-events?lead_id=xxx (list events)
// POST /api/leads-contact-events (add event)
// Admin-only: requires x-admin-token

const { createClient } = require("@supabase/supabase-js");

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
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

  // Verify admin token
  const adminToken = getAdminToken(req);
  const expectedToken = process.env.ADMIN_TOKEN || "";

  if (!expectedToken || adminToken !== expectedToken) {
    return res.status(401).json({ error: "Invalid credentials" });
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
    // GET: List contact events for a lead
    if (req.method === "GET") {
      const leadId = pickString(req.query?.lead_id || req.query?.leadId);
      const limit = parseInt(req.query?.limit || "5", 10);

      if (!leadId) {
        return res.status(400).json({ error: "Missing lead_id" });
      }

      const { data: events, error: eventsError } = await supabase
        .from("lead_contact_events")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false })
        .limit(Math.min(limit, 50)); // Cap at 50

      if (eventsError) {
        console.error("[leads-contact-events] Error fetching events:", eventsError);
        return res.status(500).json({ 
          error: "Failed to fetch contact events",
          details: eventsError.message,
          hint: eventsError.message.includes("relation") ? "Table 'lead_contact_events' may not exist. Run migration: supabase/migration_lead_contact_events.sql" : eventsError.message
        });
      }

      return res.status(200).json({ ok: true, events: events || [] });
    }

    // POST: Add new contact event
    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      const leadId = pickString(body.lead_id || body.leadId);
      const channel = pickString(body.channel || "phone");
      const note = pickString(body.note || "");

      if (!leadId) {
        return res.status(400).json({ error: "Missing lead_id" });
      }

      // Validate channel
      const validChannels = ["phone", "whatsapp", "email", "sms", "other"];
      if (!validChannels.includes(channel)) {
        return res.status(400).json({ error: `Invalid channel. Must be one of: ${validChannels.join(", ")}` });
      }

      // Insert contact event
      // Note: created_by is optional (can be null for service role inserts)
      const { data: event, error: insertError } = await supabase
        .from("lead_contact_events")
        .insert([
          {
            lead_id: leadId,
            channel: channel,
            note: note || null,
            created_by: null, // Service role insert, no user context
          },
        ])
        .select("*")
        .single();

      if (insertError) {
        console.error("[leads-contact-events] Error inserting event:", insertError);
        return res.status(500).json({ error: "Failed to create contact event", details: insertError.message });
      }

      // Also update last_contacted_at on the lead
      await supabase
        .from("leads")
        .update({ last_contacted_at: new Date().toISOString() })
        .eq("id", leadId);

      return res.status(200).json({ ok: true, event });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("[leads-contact-events] Unhandled error:", error);
    return res.status(500).json({ error: "Internal server error", details: error.message });
  }
};

