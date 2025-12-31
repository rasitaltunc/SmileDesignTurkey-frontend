// api/ai/normalize.js  (PURE CJS — no TS, no export)
// Vercel Node builder will run this reliably.

module.exports = async function handler(req, res) {
  const requestId = `norm_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  // Log at start
  console.log("ai_endpoint_start", { route: "normalize", requestId, hasKey: !!process.env.OPENAI_API_KEY, model });

  try {
    // CORS (Safari fetch için)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") return res.status(200).end();

    // Healthcheck
    if (req.method === "GET") {
      return res.status(200).json({ ok: true, source: "api/ai/normalize", requestId });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed", requestId });
    }

    // ENV guards
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!url || !serviceKey) {
      return res.status(500).json({
        ok: false,
        error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
        requestId,
      });
    }
    
    // If OPENAI_API_KEY is missing, return 200 with error (not 500)
    if (!openaiKey) {
      return res.status(200).json({
        ok: false,
        error: "MISSING_OPENAI_API_KEY",
        requestId,
        hasOpenAI: false,
        model,
      });
    }

    // Token guard
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const m = String(authHeader || "").match(/^Bearer\s+(.+)$/i);
    const jwt = m ? m[1] : null;
    if (!jwt) return res.status(401).json({ ok: false, error: "Missing Authorization Bearer token", requestId });

    // Parse request body
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { leadId } = body;

    if (!leadId) {
      return res.status(400).json({ ok: false, error: "Missing leadId", requestId });
    }

    // Dynamic import Supabase (keep GET zero-dependency)
    const { createClient } = await import("@supabase/supabase-js");

    // Fetch lead data
    const supabase = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Fetch lead
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      return res.status(404).json({ ok: false, error: "Lead not found", requestId });
    }

    // Fetch notes (latest 30)
    let notes = [];
    try {
      const { data: notesData } = await supabase
        .from("lead_notes")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false })
        .limit(30);
      if (notesData) notes = notesData;
    } catch (err) {
      // Notes table might not exist, continue
      console.debug("[normalize] Notes fetch skipped:", err);
    }

    // Build prompt for OpenAI
    const leadName = lead.name || lead.full_name || "Unknown";
    const leadPhone = lead.phone || "Not provided";
    const leadEmail = lead.email || "Not provided";
    const leadCountry = lead.country || "Unknown";
    const leadStatus = lead.status || "new";
    const leadCreated = lead.created_at || new Date().toISOString();
    const notesText = notes.length > 0
      ? notes.map((n) => `- ${n.note || n.content || ""} (${n.created_at || ""})`).join("\n")
      : "No notes yet";

    const prompt = `You are an AI assistant helping a dental clinic CRM normalize lead information into structured data.

Lead Information:
- Name: ${leadName}
- Phone: ${leadPhone}
- Email: ${leadEmail}
- Country: ${leadCountry}
- Status: ${leadStatus}
- Created: ${leadCreated}
${lead.treatment ? `- Treatment Interest: ${lead.treatment}` : ""}
${lead.source ? `- Source: ${lead.source}` : ""}

Notes (latest 30):
${notesText}

Analyze this lead and return ONLY valid JSON (no markdown, no explanations, no code blocks):
{
  "snapshot": {
    "oneLiner": "<one sentence summary of the lead>",
    "goal": "<primary goal/objective for this lead>",
    "keyFacts": ["<fact1>", "<fact2>", "<fact3>"],
    "nextBestAction": "<what should be done next>"
  },
  "callBrief": {
    "openingLine": "<suggested opening line for phone call. Use 'Smile Design Turkey' or 'GuideHealth team' as the organization name. Example: 'Hello, this is [Your Name] from Smile Design Turkey...'>",
    "mustAsk": ["<question1>", "<question2>", "<question3>"],
    "avoid": ["<topic1>", "<topic2>"],
    "tone": "Calm, confident, premium"
  },
  "risk": {
    "priority": "hot|warm|cool",
    "reasons": ["<reason1>", "<reason2>"],
    "confidence": <number 0-100>
  },
  "memory": {
    "identity": {
      "name": "<extracted name>",
      "country": "<extracted country>",
      "language": "<extracted language or null>"
    },
    "treatment": {
      "type": "<extracted treatment type or null>",
      "teethCount": <number or null>,
      "materials": ["<material1>", "<material2>"],
      "shade": "<extracted shade or null>"
    },
    "constraints": {
      "budget": <number in EUR or null>,
      "timeline": "<extracted timeline or null>",
      "travelDates": "<extracted travel dates or null>"
    },
    "clinical": {
      "concerns": ["<concern1>", "<concern2>"],
      "pain": "<extracted pain level or null>",
      "sensitivity": "<extracted sensitivity or null>"
    },
    "nextSteps": ["<step1>", "<step2>"],
    "missingInfo": ["<missing1>", "<missing2>"]
  }
}`;

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
            content: "You are an AI assistant that returns ONLY valid JSON. Never include markdown, explanations, code blocks, or any text outside the JSON object. The response must be parseable by JSON.parse().",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text().catch(() => "Unknown error");
      console.error("[normalize] OpenAI error", openaiResponse.status, errorText);
      return res.status(500).json({
        ok: false,
        error: "OpenAI API call failed",
        requestId,
      });
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(500).json({
        ok: false,
        error: "OpenAI returned empty response",
        requestId,
      });
    }

    // Robust JSON parse guard
    let normalizedData;
    try {
      // Try to extract JSON from response (handle markdown code blocks if present)
      let jsonText = content.trim();
      // Remove markdown code blocks if present
      if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
      }
      // Find first { and last }
      const firstBrace = jsonText.indexOf("{");
      const lastBrace = jsonText.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonText = jsonText.substring(firstBrace, lastBrace + 1);
      }
      normalizedData = JSON.parse(jsonText);
    } catch (parseErr) {
      console.error("[normalize] JSON parse failed", parseErr, "Content:", content.substring(0, 200));
      return res.status(500).json({
        ok: false,
        error: "AI_JSON_PARSE_FAILED",
        requestId,
      });
    }

    // Persist to lead_ai_memory (Sprint B4)
    try {
      const { createClient: createSupabaseClient } = await import("@supabase/supabase-js");
      const supabaseAdmin = createSupabaseClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const upsertData = {
        lead_id: leadId,
        snapshot_json: normalizedData.snapshot || null,
        call_brief_json: normalizedData.callBrief || null,
        risk_json: normalizedData.risk || null,
        memory_json: normalizedData.memory || null,
        normalized_at: new Date().toISOString(),
        model: model,
        request_id: requestId,
      };

      const { error: upsertError } = await supabaseAdmin
        .from("lead_ai_memory")
        .upsert(upsertData, {
          onConflict: "lead_id",
        });

      if (upsertError) {
        // Log but don't fail the request if table doesn't exist
        if (upsertError.code === "42P01" || upsertError.message?.includes("does not exist")) {
          console.warn("[normalize] Table lead_ai_memory does not exist, skipping persistence", requestId);
        } else {
          console.error("[normalize] Failed to persist AI memory", requestId, upsertError);
        }
      } else {
        console.log("[normalize] AI memory persisted", requestId);
      }
    } catch (persistErr) {
      // Don't fail the request if persistence fails
      console.error("[normalize] Persistence error (non-fatal)", requestId, persistErr);
    }

    return res.status(200).json({
      ok: true,
      requestId,
      hasOpenAI: true,
      normalized: true,
      data: normalizedData,
    });
  } catch (err) {
    console.error("[normalize] fatal", requestId, err);
    return res.status(500).json({
      ok: false,
      error: "Normalize failed (crash)",
      details: err && err.message ? err.message : String(err),
      requestId,
    });
  }
};

