// api/secure/send-verification.js
// Send custom email verification link for lead email verification
// Uses custom token system (alternative to Supabase Auth OTP)
// Session-independent: works even when employee is logged in

const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");
const { Resend } = require("resend");

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
    let leadData = null;

    // If lead_id not provided, find lead by case_id
    if (!lead_id) {
      if (!case_id) {
        return res.status(400).json({ ok: false, error: "case_id or lead_id required" });
      }

      // Find lead by case_id to get lead_id (id column)
      // Also get email_verified_at and portal_status for validation
      const { data: lead, error: leadError } = await db
        .from("leads")
        .select("id, email, email_verified_at, portal_status")
        .eq("case_id", case_id)
        .single();

      if (leadError || !lead) {
        console.error("[api/secure/send-verification] Lead not found:", { case_id, error: leadError });
        return res.status(404).json({ ok: false, error: "Case not found" });
      }

      lead_id = lead.id;
      leadData = lead;
    } else {
      // If lead_id provided, fetch lead data including email_verified_at
      const { data: lead } = await db
        .from("leads")
        .select("id, email, email_verified_at, portal_status")
        .eq("id", lead_id)
        .single();
      
      if (!lead) {
        return res.status(404).json({ ok: false, error: "Lead not found" });
      }
      
      leadData = lead;
    }

    const requestEmail = String(email || "").toLowerCase().trim();
    const leadEmail = String(leadData.email || "").toLowerCase().trim();

    // ✅ NEW RULE:
    // - If lead is NOT verified yet, allow changing the email to whatever user typed
    // - If lead IS already verified, block email changes (security)
    if (leadData.email_verified_at) {
      // Lead already verified - don't allow email changes
      if (leadEmail && leadEmail !== requestEmail) {
        return res.status(403).json({ ok: false, error: "Email already verified; cannot change email" });
      }
    } else {
      // Lead not verified yet: update email to user's input
      if (!leadEmail || leadEmail !== requestEmail) {
        await db.from("leads").update({ email: requestEmail }).eq("id", lead_id);
      }

      // Clear old pending tokens for this lead (only one active token per lead)
      await db
        .from("lead_email_verifications")
        .delete()
        .eq("lead_id", lead_id)
        .is("verified_at", null);
    }

    // 2) Generate secure token
    const token = crypto.randomBytes(32).toString("hex");
    const token_hash = sha256(token);
    const expires_at = new Date(Date.now() + 1000 * 60 * 30).toISOString(); // 30 minutes

    // 3) Insert into database
    // Note: Old pending tokens are already deleted above if lead is not verified
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
    const verifyUrl = `${origin}/verify-email?token=${token}&case_id=${encodeURIComponent(case_id || '')}`;

    // 5) Send email via Resend
    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
      await resend.emails.send({
        from: process.env.MAIL_FROM,
        to: requestEmail,
        subject: "Verify your email for your treatment plan",
        html: `
          <p>Click the button below to verify your email:</p>
          <p><a href="${verifyUrl}" target="_blank">Verify Email</a></p>
          <p>If you didn't request this, ignore this email.</p>
        `,
      });

      console.log("[api/secure/send-verification] Verification email sent:", {
        lead_id,
        case_id,
        email: requestEmail,
        expires_at,
      });
    } catch (emailError) {
      // Log email error but don't fail the request (token is already saved)
      console.error("[api/secure/send-verification] Email send error:", emailError);
      // In development, still return verifyUrl for manual testing
      if (process.env.NODE_ENV !== 'production' && process.env.VERCEL_ENV !== 'production') {
        console.warn("[api/secure/send-verification] Email failed, returning verifyUrl for testing:", verifyUrl);
      }
    }

    return res.status(200).json({ ok: true });

  } catch (e) {
    console.error("[api/secure/send-verification] Error:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
};
