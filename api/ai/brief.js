// api/ai/brief.js (PURE CJS — no TS, no export)
// B2: AI Read Mode - Generate call brief and snapshot for a lead

module.exports = async function handler(req, res) {
  const requestId = `brief_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  // Log at start
  console.log("ai_endpoint_start", { route: "brief", requestId, hasKey: !!process.env.OPENAI_API_KEY, model });

  try {
    // CORS (Safari fetch için)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") return res.status(200).end();

    // Healthcheck
    if (req.method === "GET") {
      return res.status(200).json({ ok: true, source: "api/ai/brief", requestId });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed", requestId });
    }

    // ENV guards
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({
        ok: false,
        error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
        requestId,
      });
    }

    // Token guard
    function getBearerToken(req) {
      const h = req.headers.authorization; // ✅ Node'da hep lowercase gelir
      if (!h) return null;

      const [type, token] = String(h).split(" ");
      if (!type || type.toLowerCase() !== "bearer") return null;
      return token || null;
    }
    
    const jwt = getBearerToken(req);
    if (!jwt) {
      return res.status(401).json({ ok: false, error: "Missing Authorization Bearer token", requestId });
    }

    // Parse request
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { leadId } = body;

    if (!leadId) {
      return res.status(400).json({ ok: false, error: "Missing leadId", requestId });
    }

    // Dynamic import Supabase (keep GET zero-dependency)
    const { createClient } = await import("@supabase/supabase-js");

    // Fetch lead data
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
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

    // Fetch notes (if lead_notes table exists)
    let notes = [];
    try {
      const { data: notesData } = await supabase
        .from("lead_notes")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (notesData) notes = notesData;
    } catch (err) {
      // Notes table might not exist, continue
      console.debug("[brief] Notes fetch skipped:", err);
    }

    // ✅ OPENAI_API_KEY guard: if missing, return graceful error (don't crash)
    if (!openaiKey || openaiKey.trim().length === 0) {
      // Demo mode: rules-based brief from lead data
      const leadName = lead.name || lead.full_name || "Lead";
      const leadCountry = lead.country || "Unknown";
      const leadStatus = lead.status || "new";
      
      // Infer goal from notes keywords
      const notesText = notes.length > 0
        ? notes.map((n) => (n.note || n.content || "").toLowerCase()).join(" ")
        : "";
      let goal = "Smile design consultation";
      if (notesText.includes("implant")) {
        goal = "Implant consultation";
      } else if (notesText.includes("veneer")) {
        goal = "Veneer smile design";
      } else if (notesText.includes("crown") || notesText.includes("zirkon") || notesText.includes("zircon")) {
        goal = "Crown / zircon plan";
      } else if (notesText.includes("whitening") || notesText.includes("bleaching")) {
        goal = "Whitening";
      }
      
      // Build key facts
      const keyFacts = [];
      if (lead.phone) keyFacts.push(`Phone: ${lead.phone}`);
      if (leadCountry !== "Unknown") keyFacts.push(`Country: ${leadCountry}`);
      if (lead.created_at) {
        const createdDate = new Date(lead.created_at).toLocaleDateString();
        keyFacts.push(`Created: ${createdDate}`);
      }
      keyFacts.push(`Status: ${leadStatus}`);
      if (notesText.includes("budget") || notesText.includes("price") || notesText.includes("cost")) {
        keyFacts.push("Budget mentioned in notes");
      }
      
      // Calculate risk priority based on missing info count
      let missingCount = 0;
      if (!lead.phone) missingCount++;
      if (!lead.email) missingCount++;
      if (notes.length === 0) missingCount++;
      if (!lead.treatment) missingCount++;
      
      let priority = "cool";
      if (missingCount <= 1) {
        priority = "hot";
      } else if (missingCount <= 2) {
        priority = "warm";
      }
      
      const riskReasons = [];
      if (!lead.phone) riskReasons.push("No phone number");
      if (!lead.email) riskReasons.push("No email");
      if (notes.length === 0) riskReasons.push("No notes yet");
      if (missingCount === 0) riskReasons.push("Complete lead information");
      
      // Generate demo brief
      const demoBrief = {
        snapshot: {
          oneLiner: `${leadName} from ${leadCountry} - status: ${leadStatus}`,
          goal: goal,
          keyFacts: keyFacts,
          nextBestAction: "Ask for photos + expectations + timeline + budget range",
        },
        callBrief: {
          openingLine: `Hello ${leadName}, thank you for your interest in our dental services. How can I help you today?`,
          mustAsk: [
            "Send clear photos",
            "Desired tooth shade",
            "Any pain/sensitivity?",
            "Travel dates",
          ],
          avoid: [
            "Price first without context",
            "Overpromising results",
          ],
          tone: "Calm, confident, premium",
        },
        risk: {
          priority: priority,
          reasons: riskReasons.length > 0 ? riskReasons : ["Standard consultation lead"],
          confidence: 55,
        },
      };
      
      return res.status(200).json({
        ok: true,
        hasOpenAI: false,
        demo: true,
        requestId,
        model,
        brief: demoBrief,
      });
    }

    // Build prompt for OpenAI
    const leadName = lead.name || lead.full_name || "Unknown";
    const leadPhone = lead.phone || "Not provided";
    const leadCountry = lead.country || "Unknown";
    const leadStatus = lead.status || "new";
    const leadCreated = lead.created_at || new Date().toISOString();
    const notesText = notes.length > 0
      ? notes.map((n) => `- ${n.note || n.content || ""} (${n.created_at || ""})`).join("\n")
      : "No notes yet";

    const prompt = `You are an AI assistant helping a dental clinic CRM analyze a lead.

Lead Information:
- Name: ${leadName}
- Phone: ${leadPhone}
- Country: ${leadCountry}
- Status: ${leadStatus}
- Created: ${leadCreated}
${lead.treatment ? `- Treatment Interest: ${lead.treatment}` : ""}
${lead.source ? `- Source: ${lead.source}` : ""}

Notes:
${notesText}

Analyze this lead and return ONLY valid JSON (no markdown, no explanations):
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
            content: "You are an AI assistant that returns ONLY valid JSON. Never include markdown, explanations, or any text outside the JSON object.",
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
      console.error("[brief] OpenAI API error", requestId, openaiResponse.status, errorMessage);
      return res.status(200).json({
        ok: false,
        error: "OPENAI_API_ERROR",
        message: errorMessage,
        requestId,
      });
    }

    const openaiData = await openaiResponse.json();
    const aiText = openaiData.choices[0]?.message?.content || "";

    // Extract JSON from response
    let cleaned = aiText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      // ✅ Graceful fail: return 200 with error (don't crash)
      return res.status(200).json({
        ok: false,
        error: "AI_JSON_PARSE_FAILED",
        message: "No valid JSON found in AI response",
        requestId,
      });
    }

    const jsonText = cleaned.substring(firstBrace, lastBrace + 1);
    let brief;
    try {
      brief = JSON.parse(jsonText);
    } catch (parseErr) {
      // ✅ Graceful fail: return 200 with error (don't crash)
      return res.status(200).json({
        ok: false,
        error: "AI_JSON_PARSE_FAILED",
        message: parseErr.message || "Failed to parse AI JSON response",
        requestId,
      });
    }

    // Validate structure
    if (!brief.snapshot || !brief.callBrief || !brief.risk) {
      // ✅ Graceful fail: return 200 with error (don't crash)
      return res.status(200).json({
        ok: false,
        error: "AI_JSON_PARSE_FAILED",
        message: "Missing required fields in AI response",
        requestId,
      });
    }

    return res.status(200).json({
      ok: true,
      hasOpenAI: true,
      requestId,
      brief,
    });
  } catch (err) {
    console.error("[brief] Fatal error", requestId, err);
    // ✅ Graceful fail: return 200 with error (don't crash the function)
    return res.status(200).json({
      ok: false,
      error: "BRIEF_GENERATION_FAILED",
      message: err?.message || String(err) || "Unknown error",
      requestId,
    });
  }
};

