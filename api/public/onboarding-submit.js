// api/public/onboarding-submit.js
// Public endpoint to submit onboarding card answers
// Validates portal access via case_id + portal_token (no auth required)
// POST only (OPTIONS ok)

const { createClient } = require("@supabase/supabase-js");

/**
 * Shared helper: Read JSON body from Vercel serverless request
 * Handles string, object, or stream scenarios
 */
async function readJson(req) {
  if (!req.body) return {};
  if (typeof req.body === "object" && !(req.body instanceof Buffer)) {
    return req.body;
  }
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body || "{}");
    } catch (e) {
      return {};
    }
  }
  // Handle stream (collect chunks)
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const body = Buffer.concat(chunks).toString();
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
  });
}

function getDb() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

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

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    // Validate env vars
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_KEY;

    if (!url || !serviceKey) {
      console.error("[onboarding-submit] Missing env vars:", {
        hasUrl: !!url,
        hasServiceKey: !!serviceKey,
      });
      return res.status(500).json({
        ok: false,
        error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
      });
    }

    // Robust JSON body parsing
    const body = await readJson(req);
    const { case_id, portal_token, card_id, answers } = body || {};

    // Validate required fields
    if (!case_id || !portal_token || !card_id || !answers) {
      return res.status(400).json({
        ok: false,
        error: "case_id, portal_token, card_id, answers required",
        details: {
          hasCaseId: !!case_id,
          hasPortalToken: !!portal_token,
          hasCardId: !!card_id,
          hasAnswers: !!answers,
        },
      });
    }

    const db = getDb();

    // 1) Lead'i doğrula (portal access)
    const { data: lead, error: leadErr } = await db
      .from("leads")
      .select("id, case_id, portal_token")
      .eq("case_id", case_id)
      .maybeSingle();

    if (leadErr) {
      console.error("[onboarding-submit] Lead fetch error:", {
        error: leadErr,
        case_id,
      });
      return res.status(400).json({
        ok: false,
        error: "Failed to verify lead",
        details: leadErr.message,
      });
    }

    if (!lead || lead.portal_token !== portal_token) {
      console.error("[onboarding-submit] Invalid portal access:", {
        case_id,
        hasLead: !!lead,
        tokenMatch: lead?.portal_token === portal_token,
      });
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const lead_id = lead.id;

    // 2) Answer kaydet (card bazlı) - upsert to handle duplicate submissions
    const { error: insErr } = await db
      .from("lead_onboarding_answers")
      .upsert(
        {
          lead_id,
          card_id,
          answers,
        },
        {
          onConflict: "lead_id,card_id",
        }
      );

    if (insErr) {
      console.error("[onboarding-submit] Insert error:", {
        error: insErr,
        lead_id,
        card_id,
      });
      return res.status(500).json({
        ok: false,
        error: insErr.message || "Failed to save answers",
        details: insErr.code,
      });
    }

    // 3) State upsert (completed cards + progress)
    const { data: stateRow, error: stateFetchErr } = await db
      .from("lead_onboarding_state")
      .select("completed_card_ids")
      .eq("lead_id", lead_id)
      .maybeSingle();

    if (stateFetchErr) {
      console.error("[onboarding-submit] State fetch error:", stateFetchErr);
      // Non-fatal: continue with empty array
    }

    const prev = stateRow?.completed_card_ids || [];
    const nextSet = new Set(prev);
    nextSet.add(card_id);
    const completed = Array.from(nextSet);
    const progress_percent = computeProgress(completed.length);

    const { error: upErr } = await db
      .from("lead_onboarding_state")
      .upsert(
        {
          lead_id,
          completed_card_ids: completed,
          progress_percent,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "lead_id",
        }
      );

    if (upErr) {
      console.error("[onboarding-submit] Upsert error:", {
        error: upErr,
        lead_id,
      });
      return res.status(500).json({
        ok: false,
        error: upErr.message || "Failed to update progress",
        details: upErr.code,
      });
    }

    // After saving answers + updating lead_onboarding_state, fetch fresh state + latest answers
    const { data: stateRow } = await db
      .from("lead_onboarding_state")
      .select("lead_id, completed_card_ids, progress_percent, updated_at")
      .eq("lead_id", lead_id)
      .maybeSingle();

    const { data: ansRows } = await db
      .from("lead_onboarding_answers")
      .select("card_id, answers, created_at")
      .eq("lead_id", lead_id)
      .order("created_at", { ascending: false })
      .limit(50);

    const latest_answers = {};
    for (const r of ansRows || []) {
      if (!latest_answers[r.card_id]) {
        latest_answers[r.card_id] = r.answers;
      }
    }

    console.log("[onboarding-submit] Card submitted:", {
      lead_id,
      case_id,
      card_id,
      progress_percent: stateRow?.progress_percent || progress_percent,
    });

    return res.status(200).json({
      ok: true,
      state: stateRow || {
        lead_id,
        completed_card_ids: completed,
        progress_percent,
        updated_at: new Date().toISOString(),
      },
      latest_answers,
    });
  } catch (e) {
    console.error("[onboarding-submit] Error:", e);
    return res.status(500).json({
      ok: false,
      error: e?.message || "Server error",
    });
  }
};

// Local test instructions (dev only):
// curl -X POST http://localhost:3000/api/public/onboarding-submit \
//   -H "Content-Type: application/json" \
//   -d '{"case_id":"GH-2026-TEST","portal_token":"test123","card_id":"c0_prefs","answers":{"q_language":"English"}}'
