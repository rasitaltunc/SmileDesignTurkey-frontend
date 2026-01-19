// api/public/onboarding-submit.js
// Public endpoint to submit onboarding card answers
// Validates portal access via case_id + portal_token (no auth required)

const { createClient } = require("@supabase/supabase-js");

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const db = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function computeProgress(completedCount) {
  // Sprint 1: 7 core card varsayımı (0-6)
  const total = 7;
  const pct = Math.round((Math.min(completedCount, total) / total) * 100);
  return Math.max(0, Math.min(100, pct));
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
    const { case_id, portal_token, card_id, answers } = body;

    if (!case_id || !portal_token || !card_id || !answers) {
      return res.status(400).json({ ok: false, error: "case_id, portal_token, card_id, answers required" });
    }

    // 1) Lead'i doğrula (portal access)
    const { data: lead, error: leadErr } = await db
      .from("leads")
      .select("id, case_id, portal_token")
      .eq("case_id", case_id)
      .eq("portal_token", portal_token)
      .single();

    if (leadErr || !lead) {
      return res.status(403).json({ ok: false, error: "Invalid portal access" });
    }

    const lead_id = lead.id;

    // 2) Answer kaydet (card bazlı)
    const { error: insErr } = await db
      .from("lead_onboarding_answers")
      .insert({
        lead_id,
        card_id,
        answers,
      });

    if (insErr) {
      console.error("[api/public/onboarding-submit] Insert error:", insErr);
      return res.status(500).json({ ok: false, error: insErr.message });
    }

    // 3) State upsert (completed cards + progress)
    const { data: stateRow } = await db
      .from("lead_onboarding_state")
      .select("completed_card_ids")
      .eq("lead_id", lead_id)
      .single()
      .catch(() => ({ data: null }));

    const prev = stateRow?.completed_card_ids || [];
    const nextSet = new Set(prev);
    nextSet.add(card_id);
    const completed = Array.from(nextSet);
    const progress_percent = computeProgress(completed.length);

    const { error: upErr } = await db
      .from("lead_onboarding_state")
      .upsert({
        lead_id,
        completed_card_ids: completed,
        progress_percent,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "lead_id",
      });

    if (upErr) {
      console.error("[api/public/onboarding-submit] Upsert error:", upErr);
      return res.status(500).json({ ok: false, error: upErr.message });
    }

    console.log("[api/public/onboarding-submit] Card submitted:", {
      lead_id,
      case_id,
      card_id,
      progress_percent,
    });

    return res.status(200).json({
      ok: true,
      lead_id,
      progress_percent,
      completed_card_ids: completed,
    });
  } catch (e) {
    console.error("[api/public/onboarding-submit] Error:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
};

