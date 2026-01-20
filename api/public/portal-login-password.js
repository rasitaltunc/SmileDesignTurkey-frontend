// api/public/portal-login-password.js
// Login with email + password (returns portal session credentials)

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
    const email = String(body.email || "").toLowerCase().trim();
    const password = String(body.password || "");

    if (!email || !password) {
      return res.status(400).json({ ok: false, error: "Missing email or password" });
    }

    // Canonical lead bul: en eski active lead (merge mantığına uyum)
    const { data: leads, error: leadErr } = await db
      .from("leads")
      .select("id, case_id, portal_token, status, email")
      .eq("email", email)
      .neq("status", "closed")
      .order("created_at", { ascending: true })
      .limit(1);

    if (leadErr || !leads?.length) {
      return res.status(404).json({ ok: false, error: "No lead found" });
    }

    const lead = leads[0];

    const { data: authRow } = await db
      .from("lead_portal_auth")
      .select("password_hash")
      .eq("lead_id", lead.id)
      .maybeSingle();

    if (!authRow?.password_hash) {
      return res.status(400).json({ ok: false, error: "No password set. Use email login link." });
    }

    const ok = await bcrypt.compare(password, authRow.password_hash);
    if (!ok) {
      return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }

    // Return session credentials (frontend will create portal session)
    return res.status(200).json({
      ok: true,
      case_id: lead.case_id,
      portal_token: lead.portal_token,
    });
  } catch (e) {
    console.error("[portal-login-password] Error:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
};

