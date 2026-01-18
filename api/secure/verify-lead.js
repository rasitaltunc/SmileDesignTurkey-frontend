// api/secure/verify-lead.js
// Secure endpoint to mark lead email as verified
// Requires Supabase Auth session token (from magic link verification)

const { createClient } = require("@supabase/supabase-js");

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const db = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

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

    // Get Supabase Auth session from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ ok: false, error: "Authorization token required" });
    }

    const accessToken = authHeader.replace("Bearer ", "");

    // Verify token and get user email using service role (bypass RLS)
    const { data: { user }, error: authError } = await db.auth.getUser(accessToken);

    if (authError || !user || !user.email) {
      return res.status(401).json({ ok: false, error: "Invalid or expired token" });
    }

    const verifiedEmail = user.email.toLowerCase().trim();

    // Fetch lead and verify email matches
    const { data: lead, error: leadError } = await db
      .from("leads")
      .select("id, email, email_verified_at")
      .eq("case_id", case_id)
      .eq("portal_token", portal_token)
      .single();

    if (leadError || !lead) {
      return res.status(404).json({ ok: false, error: "Case not found or invalid token" });
    }

    const leadEmail = (lead.email || "").toLowerCase().trim();
    if (leadEmail !== verifiedEmail) {
      return res.status(403).json({ ok: false, error: "Email mismatch" });
    }

    // Update email_verified_at and optionally portal_status (idempotent: safe to call multiple times)
    const now = new Date().toISOString();
    const updateData = { email_verified_at: now };
    
    // Optionally update portal_status to 'active' if it's still 'pending_review' or null
    if (!lead.portal_status || lead.portal_status === 'pending_review') {
      updateData.portal_status = 'active';
    }
    
    const { data: updatedLead, error: updateError } = await db
      .from("leads")
      .update(updateData)
      .eq("id", lead.id)
      .select("id, email_verified_at, portal_status")
      .single();

    if (updateError) {
      console.error("[api/secure/verify-lead] Update error:", updateError);
      return res.status(500).json({ ok: false, error: "Failed to update verification status" });
    }

    console.log("[api/secure/verify-lead] Successfully updated lead:", lead.id, "email_verified_at:", now);
    return res.status(200).json({ ok: true, email_verified_at: now, portal_status: updatedLead?.portal_status });
  } catch (e) {
    console.error("[api/secure/verify-lead] Error:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
};

