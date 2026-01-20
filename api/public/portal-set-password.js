// api/public/portal-set-password.js
// Set password for portal access (requires active portal session)

const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const db = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

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
    const { case_id, portal_token, password } = body;

    if (!case_id || !portal_token) {
      return res.status(401).json({ ok: false, error: "Unauthorized - session required" });
    }

    const pwd = String(password || "");
    if (pwd.length < 8) {
      return res.status(400).json({ ok: false, error: "Password must be at least 8 characters." });
    }

    // Lead'i resolve et
    const { data: lead, error: leadErr } = await db
      .from("leads")
      .select("id, email, case_id, portal_token, status")
      .eq("case_id", case_id)
      .eq("portal_token", portal_token)
      .maybeSingle();

    if (leadErr || !lead) {
      return res.status(404).json({ ok: false, error: "Lead not found" });
    }

    if (!lead.email) {
      return res.status(400).json({ ok: false, error: "Missing email" });
    }

    const email = String(lead.email).toLowerCase().trim();
    const hash = await bcrypt.hash(pwd, 10);

    // Upsert auth
    const { error: upErr } = await db
      .from("lead_portal_auth")
      .upsert(
        {
          lead_id: lead.id,
          email,
          password_hash: hash,
        },
        { onConflict: "lead_id" }
      );

    if (upErr) {
      console.error("[portal-set-password] Upsert error:", upErr);
      return res.status(500).json({ ok: false, error: "Failed to save password" });
    }

    console.log("[portal-set-password] Password set for lead:", { lead_id: lead.id, email });

    return res.status(200).json({ ok: true, has_password: true });
  } catch (e) {
    console.error("[portal-set-password] Error:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
};

