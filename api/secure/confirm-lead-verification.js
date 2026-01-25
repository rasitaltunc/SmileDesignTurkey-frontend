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
    const verifiedEmail = String(row.email || "").toLowerCase().trim();

    // Update verification record
    await db.from("lead_email_verifications").update({ verified_at: now }).eq("id", row.id);
    
    // ✅ B) Resolve Canonical Lead: "1 Email = 1 Canonical Lead"
    // Find the canonical (oldest active) lead for this email
    const { data: allLeads } = await db
      .from("leads")
      .select("id, case_id, portal_token, portal_status, status, created_at")
      .eq("email", verifiedEmail)
      .neq("status", "closed")
      .order("created_at", { ascending: true }) // Oldest first = canonical
      .limit(10);

    if (!allLeads || allLeads.length === 0) {
      console.error("[api/secure/confirm-lead-verification] No lead found for verified email:", verifiedEmail);
      return res.status(400).json({ ok: false, error: "Lead not found" });
    }

    const canonicalLead = allLeads[0]; // Oldest = canonical
    const verifiedLeadId = row.lead_id;

    // Update verified lead: email = token's email (final truth) + email_verified_at + portal_status
    const { data: verifiedLead } = await db
      .from("leads")
      .select("portal_status, case_id, portal_token")
      .eq("id", verifiedLeadId)
      .single();

    const updateData = {
      email: verifiedEmail, // Normalized email
      email_verified_at: now,
      portal_state: 'verified', // ✅ NEW: Set portal_state for UI single source of truth
    };
    
    // Optionally update portal_status to 'active' if it's still 'pending_review' or null
    if (!verifiedLead?.portal_status || verifiedLead.portal_status === 'pending_review') {
      updateData.portal_status = 'active';
    }

    await db.from("leads").update(updateData).eq("id", verifiedLeadId);

    // If verified lead is NOT the canonical lead, merge it
    let shouldRedirect = false;
    if (verifiedLeadId !== canonicalLead.id) {
      console.log("[api/secure/confirm-lead-verification] Merging duplicate lead:", {
        verified_lead_id: verifiedLeadId,
        verified_case_id: verifiedLead?.case_id,
        canonical_lead_id: canonicalLead.id,
        canonical_case_id: canonicalLead.case_id,
        email: verifiedEmail,
      });

      // Soft delete: mark verified lead as merged (status = 'merged')
      await db
        .from("leads")
        .update({
          status: "merged",
          meta: {
            merged_into: canonicalLead.id,
            merged_at: now,
            merged_reason: "email_verification_duplicate",
          },
        })
        .eq("id", verifiedLeadId);

      // Ensure canonical lead has verified email set
      await db
        .from("leads")
        .update({
          email: verifiedEmail,
          email_verified_at: now,
          portal_state: 'verified', // ✅ Set portal_state for canonical lead too
          portal_status: "active",
          portal_state: "verified", // ✅ NEW: Set portal_state
        })
        .eq("id", canonicalLead.id);

      shouldRedirect = true;
    }

    console.log("[api/secure/confirm-lead-verification] Email verified successfully:", {
      lead_id: canonicalLead.id,
      case_id: canonicalLead.case_id,
      email: verifiedEmail,
      was_merged: shouldRedirect,
    });

    // Return canonical lead info if merge happened (frontend will redirect)
    return res.status(200).json({
      ok: true,
      lead_id: canonicalLead.id,
      case_id: canonicalLead.case_id,
      portal_token: canonicalLead.portal_token,
      redirect_to_canonical: shouldRedirect,
    });
  } catch (e) {
    console.error("[api/secure/confirm-lead-verification] Error:", e);
    return res.status(500).json({ ok: false, error: "server error" });
  }
};

