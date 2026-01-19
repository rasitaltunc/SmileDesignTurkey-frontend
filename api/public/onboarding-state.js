// api/public/onboarding-state.js
// Public endpoint to fetch onboarding state and answers
// Validates portal access via case_id + portal_token
// Supports both GET and POST methods

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
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase env vars (SUPABASE_URL / SERVICE_ROLE_KEY)");
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

module.exports = async function handler(req, res) {
  try {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // Handle preflight - return 204 as per spec
    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }

    // Only allow GET and POST
    if (req.method !== "GET" && req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    // Read params: GET from query, POST from body
    let case_id, portal_token;
    
    if (req.method === "GET") {
      case_id = req.query?.case_id;
      portal_token = req.query?.portal_token;
    } else {
      const body = await readJson(req);
      case_id = body.case_id;
      portal_token = body.portal_token;
    }

    if (!case_id || !portal_token) {
      return res.status(400).json({ ok: false, error: "case_id + portal_token required" });
    }

    const db = getDb();

    // Lead doğrula (case_id + portal_token)
    const { data: lead, error: leadErr } = await db
      .from("leads")
      .select("id, case_id, portal_token, email_verified_at, portal_status")
      .eq("case_id", case_id)
      .maybeSingle();

    if (leadErr) {
      console.error("[onboarding-state] Lead fetch error:", leadErr);
      throw leadErr;
    }

    if (!lead || lead.portal_token !== portal_token) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    // State al (yoksa default)
    const { data: state, error: stateErr } = await db
      .from("lead_onboarding_state")
      .select("lead_id, completed_card_ids, progress_percent, updated_at")
      .eq("lead_id", lead.id)
      .maybeSingle();

    if (stateErr) {
      console.error("[onboarding-state] State fetch error:", stateErr);
      // Non-fatal: continue with default state
    }

    // Latest answers per card (tek seferde çekip map'le)
    const { data: rows, error: ansErr } = await db
      .from("lead_onboarding_answers")
      .select("card_id, answers, created_at")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (ansErr) {
      console.error("[onboarding-state] Answers fetch error:", ansErr);
      // Non-fatal: continue with empty answers
    }

    // frontende kolaylık: latest answers per card map
    const latest_answers = {};
    for (const r of rows || []) {
      if (!latest_answers[r.card_id]) {
        latest_answers[r.card_id] = r.answers;
      }
    }

    return res.status(200).json({
      ok: true,
      lead: {
        id: lead.id,
        case_id: lead.case_id,
        portal_status: lead.portal_status,
        email_verified: !!lead.email_verified_at,
      },
      state: state || {
        lead_id: lead.id,
        completed_card_ids: [],
        progress_percent: 0,
        updated_at: null,
      },
      latest_answers,
    });
  } catch (e) {
    console.error("[onboarding-state] error:", e);
    return res.status(500).json({
      ok: false,
      error: e?.message || "Server error",
    });
  }
};

// Local test instructions (dev only):
// curl "http://localhost:3000/api/public/onboarding-state?case_id=GH-2026-TEST&portal_token=test123"
// curl -X POST http://localhost:3000/api/public/onboarding-state -H "Content-Type: application/json" -d '{"case_id":"GH-2026-TEST","portal_token":"test123"}'
