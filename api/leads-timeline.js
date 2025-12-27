// api/leads-timeline.js
// GET /api/leads-timeline?lead_id=xxx
// Returns timeline events for a lead based on cal_booking_uid

const { createClient } = require("@supabase/supabase-js");

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-token");
}

function getAdminToken(req) {
  // Node header keys are lowercased
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

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed. Use GET." });
  }

  // Verify admin token
  const adminToken = getAdminToken(req);
  const expectedToken = process.env.ADMIN_TOKEN || "";

  if (!expectedToken || adminToken !== expectedToken) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // Get lead ID from query
  const leadId = pickString(req.query?.lead_id) || pickString(req.query?.id);

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
    // Get lead by ID
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, cal_booking_uid")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    // If no cal_booking_uid, return empty timeline
    if (!lead.cal_booking_uid) {
      return res.status(200).json({ ok: true, timeline: [] });
    }

    // Get timeline events by cal_booking_uid
    const { data: events, error: eventsError } = await supabase
      .from("cal_webhook_events")
      .select("*")
      .eq("cal_booking_uid", lead.cal_booking_uid)
      .order("received_at", { ascending: true });

    if (eventsError) {
      console.error("[leads-timeline] Error fetching events:", eventsError);
      return res.status(500).json({ error: "Failed to fetch timeline events" });
    }

    // Map to DTO
    const timeline = (events || []).map((event) => {
      const payload = event.payload || {};
      return {
        eventId: event.id,
        receivedAt: event.received_at || event.created_at,
        eventType: event.event_type,
        triggerEvent: event.trigger_event,
        calBookingUid: event.cal_booking_uid,
        calBookingId: event.cal_booking_id,
        startTime: payload.startTime || payload.start || null,
        endTime: payload.endTime || payload.end || null,
        title: payload.title || payload.name || null,
        additionalNotes: payload.additionalNotes || payload.notes || payload.description || null,
      };
    });

    return res.status(200).json({ ok: true, timeline });
  } catch (error) {
    console.error("[leads-timeline] Unhandled error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

