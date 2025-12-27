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

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only accept POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  // Verify secret from multiple sources (header tolerant)
  // Try multiple header names and query param
  // Vercel/Node.js lowercases headers, so check both
  const providedSecretRaw =
    req.headers["x-cal-secret"] ||
    req.headers["x-webhook-secret"] ||
    req.headers["x-cal-webhook-secret"] ||
    req.query?.secret;

  // Convert to string and trim (handle arrays, whitespace, etc.)
  const providedSecret = providedSecretRaw
    ? String(providedSecretRaw).trim()
    : null;

  // Log which header was used (for debugging, but not the secret value)
  let usedHeader = "none";
  if (req.headers["x-cal-secret"]) usedHeader = "x-cal-secret";
  else if (req.headers["x-webhook-secret"]) usedHeader = "x-webhook-secret";
  else if (req.headers["x-cal-webhook-secret"]) usedHeader = "x-cal-webhook-secret";
  else if (req.query?.secret) usedHeader = "query param (secret)";

  const expectedSecret = process.env.CAL_WEBHOOK_SECRET;

  if (!expectedSecret) {
    console.error("[cal-webhook] CAL_WEBHOOK_SECRET not configured in environment");
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  // Debug: Log lengths and first/last chars (never full secret)
  console.log(`[cal-webhook] Secret check: providedLength=${providedSecret?.length || 0}, expectedLength=${expectedSecret.length}, header=${usedHeader}`);

  if (!providedSecret || providedSecret !== expectedSecret) {
    console.warn(`[cal-webhook] Unauthorized: Invalid or missing secret (checked header: ${usedHeader}, providedLength=${providedSecret?.length || 0}, expectedLength=${expectedSecret.length})`);
    return res.status(401).json({ error: "unauthorized" });
  }

  console.log(`[cal-webhook] Secret verified (source: ${usedHeader})`);

  // Log incoming body for debugging
  const body = req.body || {};
  console.log("[cal-webhook] Received event:", JSON.stringify(body, null, 2));

  // Extract event type and payload
  const eventType = body.type || body.event || "unknown";
  const payload = body.payload || body.data || body;

  console.log("[cal-webhook] Event type:", eventType);
  console.log("[cal-webhook] Payload keys:", Object.keys(payload));

  // TODO: Process the event
  // Examples:
  // - booking.created: Create/update lead with appointment info
  // - booking.cancelled: Update lead status
  // - booking.rescheduled: Update appointment time

  // For now, just acknowledge receipt
  return res.status(200).json({ ok: true, received: true, eventType });
};
