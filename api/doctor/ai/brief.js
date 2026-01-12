// api/doctor/ai/brief.js
// POST /api/doctor/ai/brief
// Generate PII-safe doctor brief for lead review
// Auth: Bearer JWT (doctor role required)

const { createClient } = require("@supabase/supabase-js");
const { redactPII, caseCodeFromLead } = require("../_privacy");

function getBearerToken(req) {
  const h = req.headers.authorization;
  if (!h) return null;
  const [type, token] = String(h).split(" ");
  if (!type || type.toLowerCase() !== "bearer") return null;
  return token || null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(v) {
  return typeof v === "string" && UUID_RE.test(v.trim());
}

module.exports = async function handler(req, res) {
  const requestId = `doctor_brief_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  try {
    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") return res.status(200).end();

    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed", requestId });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({
        ok: false,
        error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
        requestId,
      });
    }

    // ✅ OPENAI_API_KEY guard: if missing, return graceful error (don't crash)
    if (!openaiKey || openaiKey.trim().length === 0) {
      return res.status(503).json({
        ok: false,
        error: "AI not configured",
        message: "OPENAI_API_KEY missing or invalid",
        requestId,
      });
    }

    const jwt = getBearerToken(req);
    if (!jwt) {
      return res.status(401).json({ ok: false, error: "Missing Authorization Bearer token", requestId });
    }

    // Use anon key for JWT verification (as per existing pattern)
    const authClient = createClient(
      supabaseUrl,
      supabaseAnonKey || supabaseServiceKey,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // Verify JWT and get user
    const { data: userData, error: userErr } = await authClient.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return res.status(401).json({ ok: false, error: "Invalid session", requestId });
    }

    const user = userData.user;

    // Service role client for DB operations
    const dbClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Verify doctor role
    const { data: profile, error: profErr } = await dbClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profErr || profile?.role !== "doctor") {
      return res.status(403).json({ ok: false, error: "Forbidden: doctor access only", requestId });
    }

    // Parse request body or query
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const ref = body.ref || req.query?.ref ? String(body.ref || req.query.ref).trim() : null;

    if (!ref) {
      return res.status(400).json({ ok: false, error: "Missing ref parameter", requestId });
    }

    // ✅ Schema-safe: Use select("*") then map to allowlist
    let q = dbClient
      .from("leads")
      .select("*")
      .eq("doctor_id", user.id); // ✅ Doctor can only see their assigned leads

    // Resolve ref (UUID or TEXT id)
    if (isUuid(ref)) {
      q = q.eq("lead_uuid", ref);
    } else {
      q = q.eq("id", ref);
    }

    const { data: lead, error: leadErr } = await q.maybeSingle();

    if (leadErr) {
      console.error("[doctor/ai/brief] Lead query error:", leadErr, { requestId });
      return res.status(500).json({ ok: false, error: leadErr.message, requestId });
    }

    if (!lead) {
      return res.status(404).json({ ok: false, error: "Lead not found or not assigned to you", requestId });
    }

    // ✅ Build sanitized context (PII-redacted, schema-safe)
    const caseCode = caseCodeFromLead(lead) || "UNKNOWN";
    const treatment = lead.treatment || "General inquiry";
    const timeline = lead.timeline || "Not specified";
    const message = redactPII(lead.message || "");
    const snapshot = redactPII(lead.ai_summary || lead.snapshot || "");
    const reviewStatus = lead.doctor_review_status || "pending";

    // Fetch documents (types only, no URLs that may contain tokens)
    let documentLabels = [];
    try {
      const { data: docsData } = await dbClient
        .from("lead_documents")
        .select("type, filename, category")
        .eq("lead_id", lead.id)
        .limit(20);

      if (docsData && Array.isArray(docsData)) {
        // ✅ Exclude passport/ID documents
        documentLabels = docsData
          .filter((doc) => {
            const type = String(doc.type || "").toLowerCase();
            const filename = String(doc.filename || "").toLowerCase();
            const category = String(doc.category || "").toLowerCase();
            
            if (
              type.includes("passport") ||
              type.includes("id") ||
              filename.includes("passport") ||
              filename.includes("id") ||
              category.includes("passport") ||
              category.includes("id")
            ) {
              return false;
            }
            return true;
          })
          .map((doc) => `${doc.type || "document"}${doc.category ? ` (${doc.category})` : ""}`);
      }
    } catch (docsErr) {
      // Table might not exist, continue
      console.debug("[doctor/ai/brief] Documents fetch skipped:", docsErr?.message);
    }

    // ✅ Build PII-safe prompt for doctor
    const prompt = `You are an AI assistant helping a dental clinic doctor review a patient case. 
You MUST NOT output any emails, phone numbers, links, or addresses. If present in the input, ignore them completely.

Case Information:
- Case Code: ${caseCode}
- Treatment Interest: ${treatment}
- Timeline: ${timeline}
- Review Status: ${reviewStatus}
${documentLabels.length > 0 ? `- Available Documents: ${documentLabels.join(", ")}` : "- Documents: None"}

Patient Message (PII-redacted):
${message || "No patient message available"}

Employee/Admin Summary (PII-redacted):
${snapshot || "No summary available yet"}

Based on the above sanitized information, generate a clinical review brief in markdown format. Output ONLY the following sections (no other text):

## Case Summary
[1-2 sentence summary of the case, no PII]

## Clinical Hypotheses
- [Hypothesis 1 - non-definitive, professional]
- [Hypothesis 2 - non-definitive, professional]
- [Hypothesis 3 - non-definitive, professional]

## Missing Questions
- [Question 1 that should be asked]
- [Question 2 that should be asked]
- [Question 3 that should be asked]

## Suggested Evaluation Plan
- [Evaluation step 1]
- [Evaluation step 2]
- [Evaluation step 3]

## Risk Flags / Urgency
[Brief assessment of urgency/risk level and why]

## Draft Doctor Review Text
[Short, professional review text suitable for doctor_review_notes field - 2-3 sentences max]`;

    // Call OpenAI via fetch (no SDK to avoid module issues)
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "system",
            content: "You are an AI assistant for dental clinic doctors. You MUST NOT output any emails, phone numbers, links, addresses, or any PII. Always output markdown format. Be concise and professional.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    // ✅ Catch OpenAI API errors gracefully
    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json().catch(() => ({ error: { message: "OpenAI API error" } }));
      const errorMessage = errorData.error?.message || errorData.error || "OpenAI API request failed";
      console.error("[doctor/ai/brief] OpenAI API error", requestId, openaiResponse.status, errorMessage);
      return res.status(503).json({
        ok: false,
        error: "OPENAI_API_ERROR",
        message: errorMessage,
        requestId,
      });
    }

    const openaiData = await openaiResponse.json();
    const aiText = openaiData.choices[0]?.message?.content || "";

    if (!aiText || aiText.trim().length === 0) {
      return res.status(503).json({
        ok: false,
        error: "AI_RESPONSE_EMPTY",
        message: "AI returned empty response",
        requestId,
      });
    }

    // Return markdown brief (PII-safe)
    return res.status(200).json({
      ok: true,
      brief: aiText.trim(),
      requestId,
    });
  } catch (err) {
    console.error("[doctor/ai/brief] Handler crash:", err, { requestId });
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Internal server error",
      requestId,
    });
  }
};

