// api/secure/send-verification.js
// Send custom email verification link for lead email verification
// Uses custom token system (alternative to Supabase Auth OTP)
// Session-independent: works even when employee is logged in

const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const db = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function sha256(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

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
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { case_id, email, lead_id: providedLeadId } = body || {};
    
    if (!email) {
      return res.status(400).json({ ok: false, error: "email required" });
    }

    let lead_id = providedLeadId;
    let leadEmail = null;

    // If lead_id not provided, find lead by case_id
    if (!lead_id) {
      if (!case_id) {
        return res.status(400).json({ ok: false, error: "case_id or lead_id required" });
      }

      // Find lead by case_id to get lead_id (id column)
      const { data: lead, error: leadError } = await db
        .from("leads")
        .select("id, email")
        .eq("case_id", case_id)
        .single();

      if (leadError || !lead) {
        console.error("[api/secure/send-verification] Lead not found:", { case_id, error: leadError });
        return res.status(404).json({ ok: false, error: "Case not found" });
      }

      lead_id = lead.id;
      leadEmail = lead.email;
    } else {
      // If lead_id provided, fetch lead email for validation (optional security check)
      const { data: lead } = await db
        .from("leads")
        .select("email")
        .eq("id", lead_id)
        .single();
      
      if (lead) {
        leadEmail = lead.email;
      }
    }

    const requestEmail = email.toLowerCase().trim();

    // Verify email matches lead email (optional security check)
    if (normalizedLeadEmail && normalizedLeadEmail !== requestEmail) {
      console.warn("[api/secure/send-verification] Email mismatch:", { leadEmail: normalizedLeadEmail, requestEmail });
      // Still allow verification if lead email is null/empty (new lead)
      return res.status(403).json({ ok: false, error: "Email does not match case" });
    }

    // 2) Generate secure token
    const token = crypto.randomBytes(32).toString("hex");
    const token_hash = sha256(token);
    const expires_at = new Date(Date.now() + 1000 * 60 * 30).toISOString(); // 30 minutes

    // 3) Insert into database (delete old unverified tokens for this lead/email)
    // This ensures only one active verification token per lead
    await db
      .from("lead_email_verifications")
      .delete()
      .eq("lead_id", lead_id)
      .eq("email", requestEmail)
      .is("verified_at", null);

    const { error: insErr } = await db
      .from("lead_email_verifications")
      .insert({
        lead_id,
        email: requestEmail,
        token_hash,
        expires_at,
      });

    if (insErr) {
      console.error("[api/secure/send-verification] Insert error:", insErr);
      return res.status(500).json({ ok: false, error: insErr.message });
    }

    // 4) Build verification URL (use PUBLIC_SITE_URL or VITE_PUBLIC_SITE_URL from env)
    const origin = process.env.PUBLIC_SITE_URL || process.env.VITE_PUBLIC_SITE_URL || "http://localhost:5173";
    const verifyUrl = `${origin}/verify-email?token=${token}&case_id=${encodeURIComponent(case_id)}`;

    // 5) TODO: Send email via your email provider (Resend, Postmark, SMTP, etc.)
    // For now, return the verifyUrl for testing
    // In production, you'll send the email and return { ok: true }
    // Example:
    // await sendEmail({
    //   to: requestEmail,
    //   subject: "Verify your email",
    //   html: `<a href="${verifyUrl}">Click here to verify</a>`
    // });

    console.log("[api/secure/send-verification] Verification link generated:", {
      lead_id,
      case_id,
      email: requestEmail,
      expires_at,
    });

    // In production, don't return verifyUrl (email is sent by backend)
    // In dev/test, return verifyUrl for manual testing
    const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
    
    return res.status(200).json({ 
      ok: true, 
      verifyUrl: isProd ? undefined : verifyUrl, // Only return in dev/test
      expiresAt: expires_at,
    });

  } catch (e) {
    console.error("[api/secure/send-verification] Error:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
};
