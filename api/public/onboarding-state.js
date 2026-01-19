// api/public/onboarding-state.js
// Public endpoint to fetch onboarding state and answers
// Validates portal access via case_id + portal_token

const { createClient } = require("@supabase/supabase-js");

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
    const { case_id, portal_token } = body;

    if (!case_id || !portal_token) {
      return res.status(400).json({ ok: false, error: "case_id + portal_token required" });
    }

    // 1) Lead doğrula
    const { data: lead, error: leadErr } = await db
      .from("leads")
      .select("id, case_id, portal_token, email_verified_at, portal_status")
      .eq("case_id", case_id)
      .eq("portal_token", portal_token)
      .single();

    if (leadErr || !lead) {
      return res.status(403).json({ ok: false, error: "Invalid portal access" });
    }

    const lead_id = lead.id;

    // 2) State al (yoksa default)
    const { data: state } = await db
      .from("lead_onboarding_state")
      .select("completed_card_ids, progress_percent, updated_at")
      .eq("lead_id", lead_id)
      .single()
      .catch(() => ({ data: null }));

    // 3) Answers al (son 50 yeter)
    const { data: answersRows, error: ansErr } = await db
      .from("lead_onboarding_answers")
      .select("card_id, answers, created_at")
      .eq("lead_id", lead_id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (ansErr) {
      console.error("[api/public/onboarding-state] Answers fetch error:", ansErr);
      return res.status(500).json({ ok: false, error: ansErr.message });
    }

    // frontende kolaylık: latest answers per card map
    const latestByCard = {};
    for (const row of (answersRows || [])) {
      if (!latestByCard[row.card_id]) {
        latestByCard[row.card_id] = row.answers;
      }
    }

    return res.status(200).json({
      ok: true,
      lead: {
        id: lead_id,
        case_id: lead.case_id,
        portal_status: lead.portal_status,
        email_verified: !!lead.email_verified_at,
      },
      state: {
        completed_card_ids: state?.completed_card_ids || [],
        progress_percent: state?.progress_percent || 0,
        updated_at: state?.updated_at || null,
      },
      latest_answers: latestByCard,
    });
  } catch (e) {
    console.error("[api/public/onboarding-state] Error:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
};

