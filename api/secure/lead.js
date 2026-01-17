// api/secure/lead.js
// Public endpoint for lead submission (no auth required)
// Uses service role to bypass RLS

const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

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

    // Honeypot (botlar genelde doldurur)
    if (body.companyWebsite && String(body.companyWebsite).trim()) {
      return res.status(200).json({ ok: true }); // sessiz geç
    }

    const email = (body.email || "").trim();
    const phone = (body.phone || "").trim();
    if (!email && !phone) return res.status(400).json({ ok: false, error: "email or phone is required" });

    const id = `lead_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    
    // Generate case_id: GH-YYYY-XXXX (e.g., GH-2024-1234)
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const case_id = `GH-${year}-${randomSuffix}`;

    const row = {
      id,
      case_id,
      status: "new", // ✅ Canonical value (never use "new_lead")
      // sende zaten kolonlar var: name/email/phone/utm/message/meta vs.
      name: (body.name || "").trim() || null,
      email: email || null,
      phone: phone || null,
      treatment: body.treatment || null,
      timeline: body.timeline || null,
      message: body.message || null,
      page_url: body.page_url || body.pageUrl || null,
      referrer: body.referrer || null,
      utm_source: body.utm_source || null,
      utm_medium: body.utm_medium || null,
      utm_campaign: body.utm_campaign || null,
      utm_term: body.utm_term || null,
      utm_content: body.utm_content || null,
      source: body.source || "onboarding", // Default to onboarding if not specified
      lang: body.lang || null,
      meta: {
        ...body,
        created_via: "api/secure/lead",
        ip: req.headers["x-forwarded-for"] || null,
        ua: req.headers["user-agent"] || null,
      },
    };

    const { error } = await db.from("leads").insert([row]);
    if (error) return res.status(400).json({ ok: false, error: error.message });

    // ✅ Save original message as a note (future-proof: never lose first contact)
    if (row.message && String(row.message).trim()) {
      try {
        await db.from("lead_notes").insert({
          lead_id: id,
          note: String(row.message).trim(),
          actor_role: "patient",
          created_by: null,
        });
      } catch (noteErr) {
        // Don't fail the lead insert if note insert fails (graceful degradation)
        console.warn("[api/secure/lead] Failed to save message as note:", noteErr.message);
      }
    }

    return res.status(200).json({ ok: true, id, case_id });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "Server error" });
  }
};

