// api/cal-webhook.js
// Cal.com webhook endpoint for appointment events
//
// Test with curl:
// curl -X POST https://your-domain.vercel.app/api/cal-webhook \
//   -H "Content-Type: application/json" \
//   -H "x-cal-secret: your-secret-here" \
//   -d '{"type":"booking.created","payload":{"id":"123"}}'

const { createClient } = require("@supabase/supabase-js");

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-cal-secret, x-webhook-secret, x-cal-webhook-secret");
}

// Helper: Normalize secret (trim, remove newlines)
function normalizeSecret(s) {
  return String(s ?? "").trim().replace(/\r?\n/g, "");
}

// Helper: Create fingerprint for logging (safe, never full secret)
function fingerprint(s) {
  if (!s || s.length === 0) return "0:empty";
  if (s.length < 4) return `${s.length}:${s}`;
  return `${s.length}:${s.slice(0, 2)}...${s.slice(-2)}`;
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only accept POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  // Debug: Log header presence (before secret check)
  console.log("[cal-webhook] headers keys:", Object.keys(req.headers));
  console.log("[cal-webhook] got x-cal-secret?", !!req.headers["x-cal-secret"]);
  console.log("[cal-webhook] got x-webhook-secret?", !!req.headers["x-webhook-secret"]);
  console.log("[cal-webhook] got x-cal-webhook-secret?", !!req.headers["x-cal-webhook-secret"]);

  // Read query param from URL (Vercel provides req.query, but also check URL directly)
  let querySecret = null;
  if (req.query?.secret) {
    querySecret = req.query.secret;
  } else if (req.url) {
    try {
      const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
      querySecret = url.searchParams.get("secret");
    } catch (e) {
      // Ignore URL parse errors
    }
  }
  console.log("[cal-webhook] got query secret?", !!querySecret);

  // Verify secret from multiple sources (header tolerant)
  // Node.js/Vercel lowercases headers automatically
  const providedSecretRaw =
    req.headers["x-cal-secret"] ||
    req.headers["x-webhook-secret"] ||
    req.headers["x-cal-webhook-secret"] ||
    querySecret;

  // Normalize provided secret
  const providedSecretNormalized = providedSecretRaw ? normalizeSecret(providedSecretRaw) : null;

  // Log which header was used (for debugging, but not the secret value)
  let source = "none";
  if (req.headers["x-cal-secret"]) source = "x-cal-secret";
  else if (req.headers["x-webhook-secret"]) source = "x-webhook-secret";
  else if (req.headers["x-cal-webhook-secret"]) source = "x-cal-webhook-secret";
  else if (querySecret) source = "query param (secret)";

  const expectedSecretRaw = process.env.CAL_WEBHOOK_SECRET;

  if (!expectedSecretRaw) {
    console.error("[cal-webhook] CAL_WEBHOOK_SECRET not configured in environment");
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  // Normalize expected secret
  const expectedSecretNormalized = normalizeSecret(expectedSecretRaw);

  // Debug: Log fingerprints (safe, never full secret)
  const expectedFP = fingerprint(expectedSecretNormalized);
  const providedFP = fingerprint(providedSecretNormalized || "");
  console.log(`[cal-webhook] Secret check: expectedFP=${expectedFP}, providedFP=${providedFP}, source=${source}`);

  // Compare normalized secrets
  if (!providedSecretNormalized || providedSecretNormalized !== expectedSecretNormalized) {
    console.warn(`[cal-webhook] Unauthorized: Secret mismatch (expectedFP=${expectedFP}, providedFP=${providedFP}, source=${source})`);
    return res.status(401).json({ error: "unauthorized" });
  }

  console.log(`[cal-webhook] Secret verified (source: ${source})`);

  // Log incoming body for debugging
  const body = req.body || {};
  console.log("[cal-webhook] Received event:", JSON.stringify(body, null, 2));

  // Extract event type and payload
  const eventType = body.type || body.event || "unknown";
  const payload = body.payload || body.data || body;

  console.log("[cal-webhook] Event type:", eventType);
  console.log("[cal-webhook] Payload keys:", Object.keys(payload));

  // Only handle booking.created and booking.rescheduled
  if (eventType !== "booking.created" && eventType !== "booking.rescheduled") {
    console.log(`[cal-webhook] Ignoring event type: ${eventType}`);
    return res.status(200).json({ ok: true, received: true, eventType, skipped: true });
  }

  // Initialize Supabase client (server-side only, service role)
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("[cal-webhook] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return res.status(500).json({ error: "Database configuration missing" });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Extract booking data from payload
  const calBookingUid = payload.uid || payload.id || null;
  const calBookingId = payload.bookingId || payload.id || null;
  const startTime = payload.startTime || payload.start || null;
  const endTime = payload.endTime || payload.end || null;
  const attendees = payload.attendees || [];
  const patientEmail = attendees[0]?.email || payload.email || null;
  const patientName =
    attendees[0]?.name ||
    payload.name ||
    payload.title ||
    payload.bookerUrl ||
    null;
  const notes = payload.additionalNotes || payload.notes || payload.description || null;
  const calStatus = payload.status || "confirmed";

  console.log(`[cal-webhook] Extracted: uid=${calBookingUid}, email=${patientEmail}, name=${patientName}`);

  // Validate required fields
  if (!calBookingUid) {
    console.warn("[cal-webhook] Missing cal_booking_uid, cannot upsert lead");
    return res.status(200).json({ ok: true, received: true, eventType, warning: "Missing booking UID" });
  }

  // Prepare lead data
  const leadData = {
    cal_booking_uid: calBookingUid,
    cal_booking_id: calBookingId,
    source: "cal.com",
    status: eventType === "booking.rescheduled" ? "booked" : "booked",
    email: patientEmail || null,
    name: patientName || null,
    meeting_start: startTime || null,
    meeting_end: endTime || null,
    notes: notes || null,
    updated_at: new Date().toISOString(),
  };

  // Remove null/undefined fields to avoid overwriting existing data with null
  Object.keys(leadData).forEach((key) => {
    if (leadData[key] === null || leadData[key] === undefined) {
      delete leadData[key];
    }
  });

  console.log(`[cal-webhook] Upserting lead with cal_booking_uid=${calBookingUid}`);

  // First, try to find existing lead by cal_booking_uid
  const { data: existingLead } = await supabase
    .from("leads")
    .select("id")
    .eq("cal_booking_uid", calBookingUid)
    .single();

  let result;
  if (existingLead?.id) {
    // Update existing lead
    console.log(`[cal-webhook] Updating existing lead id=${existingLead.id}`);
    result = await supabase
      .from("leads")
      .update(leadData)
      .eq("id", existingLead.id)
      .select()
      .single();
  } else {
    // Insert new lead (generate ID if not provided)
    if (!leadData.id) {
      leadData.id = `cal_${calBookingUid}_${Date.now()}`;
    }
    console.log(`[cal-webhook] Inserting new lead id=${leadData.id}`);
    result = await supabase.from("leads").insert(leadData).select().single();
  }

  if (error) {
    console.error("[cal-webhook] Upsert lead failed:", error.message);
    return res.status(200).json({
      ok: true,
      received: true,
      eventType,
      error: error.message,
    });
  }

  console.log("[cal-webhook] Upsert lead ok:", data?.id || "created/updated");

  // Return success
  return res.status(200).json({ ok: true, received: true, eventType, leadId: data?.id });
};
