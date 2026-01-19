// api/secure/confirm-lead-verification.js
// Verify email using custom token system
// Token is passed from /verify-email frontend page

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
  if (req.method !== "POST") return res.status(405).json({ ok: false });

  if (!url || !serviceKey) {
    return res.status(500).json({ ok: false, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { token } = body || {};
    if (!token) return res.status(400).json({ ok: false, error: "token required" });

    const token_hash = sha256(token);

    const { data: row, error } = await db
      .from("lead_email_verifications")
      .select("id, lead_id, email, expires_at, verified_at")
      .eq("token_hash", token_hash)
      .single();

    if (error || !row) {
      console.error("[api/secure/confirm-lead-verification] Verification not found:", { error });
      return res.status(400).json({ ok: false, error: "invalid token" });
    }

    if (row.verified_at) {
      // Already verified - return success but indicate it was already done
      return res.status(200).json({ ok: true, already: true });
    }

    if (new Date(row.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ ok: false, error: "expired" });
    }

    const now = new Date().toISOString();

    // Update verification record
    await db.from("lead_email_verifications").update({ verified_at: now }).eq("id", row.id);
    
    // ✅ Update lead: email = token's email (final truth) + email_verified_at + portal_status
    const { data: lead } = await db
      .from("leads")
      .select("portal_status")
      .eq("id", row.lead_id)
      .single();

    const updateData = {
      email: row.email, // Token's email is the final verified email
      email_verified_at: now,
    };
    
    // Optionally update portal_status to 'active' if it's still 'pending_review' or null
    if (!lead?.portal_status || lead.portal_status === 'pending_review') {
      updateData.portal_status = 'active';
    }

    await db.from("leads").update(updateData).eq("id", row.lead_id);

    console.log("[api/secure/confirm-lead-verification] Email verified successfully:", {
      lead_id: row.lead_id,
      email: row.email,
    });

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("[api/secure/confirm-lead-verification] Error:", e);
    return res.status(500).json({ ok: false, error: "server error" });
  }
};

