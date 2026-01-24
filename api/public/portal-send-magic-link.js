// api/public/portal-send-magic-link.js
// Send magic link for portal access recovery (forgot password flow)

const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");
const { Resend } = require("resend");

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;
const resendFrom = process.env.RESEND_FROM || "Smile Design TR <onboarding@resend.dev>";

const db = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const resend = resendApiKey ? new Resend(resendApiKey) : null;

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
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const email = String(body.email || "").toLowerCase().trim();

    if (!email) {
      return res.status(400).json({ ok: false, error: "Email required" });
    }

    // Find canonical lead (oldest active lead for this email)
    const { data: leads, error: leadErr } = await db
      .from("leads")
      .select("id, case_id, email, status")
      .eq("email", email)
      .neq("status", "closed")
      .order("created_at", { ascending: true })
      .limit(1);

    if (leadErr || !leads?.length) {
      // Don't reveal if email exists (security)
      return res.status(200).json({ ok: true, message: "If an account exists, a verification link has been sent." });
    }

    const lead = leads[0];
    const lead_id = lead.id;
    const case_id = lead.case_id;

    // Generate verification token (reuse existing system)
    const token = crypto.randomBytes(32).toString("hex");
    const token_hash = sha256(token);
    const expires_at = new Date(Date.now() + 1000 * 60 * 30).toISOString(); // 30 minutes

    // Delete old pending tokens for this lead
    await db
      .from("lead_email_verifications")
      .delete()
      .eq("lead_id", lead_id)
      .is("verified_at", null);

    // Insert new token
    const { error: insErr } = await db
      .from("lead_email_verifications")
      .insert({
        lead_id,
        email,
        token_hash,
        expires_at,
      });

    if (insErr) {
      console.error("[portal-send-magic-link] Insert error:", insErr);
      return res.status(500).json({ ok: false, error: "Failed to generate link" });
    }

    // Build verification URL
    const origin = process.env.PUBLIC_SITE_URL || process.env.VITE_PUBLIC_SITE_URL || "http://localhost:5173";
    const verifyUrl = `${origin}/verify-email?token=${token}&case_id=${encodeURIComponent(case_id)}`;

    // Send email via Resend (if configured)
    if (resend) {
      try {
        await resend.emails.send({
          from: resendFrom,
          to: email,
          subject: "Access your portal",
          html: `
            <p>Click the button below to access your portal:</p>
            <p><a href="${verifyUrl}" target="_blank">Access Portal</a></p>
            <p>This link expires in 30 minutes.</p>
            <p>If you didn't request this, ignore this email.</p>
          `,
        });
        console.log("[portal-send-magic-link] Magic link sent:", { email, case_id });
      } catch (emailError) {
        console.error("[portal-send-magic-link] Email send error:", emailError);
        // Continue - token is saved, user can manually use link in dev
      }
    }

    // Always return success (don't reveal if email exists)
    return res.status(200).json({ ok: true, message: "If an account exists, a verification link has been sent." });
  } catch (e) {
    console.error("[portal-send-magic-link] Error:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
};

