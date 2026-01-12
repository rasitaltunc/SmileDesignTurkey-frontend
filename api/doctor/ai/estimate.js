// api/doctor/ai/estimate.js
// POST /api/doctor/ai/estimate
// Parses natural language doctor estimate into structured items, searches catalog, creates draft items
// Body: { note_id, estimate_text }
// Auth: Bearer JWT (doctor role required)

const { createClient } = require("@supabase/supabase-js");

const buildSha =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.VERCEL_GIT_COMMIT_REF ||
  process.env.GITHUB_SHA ||
  null;

function getBearerToken(req) {
  const h = req.headers.authorization || req.headers.Authorization || "";
  if (!h) return null;
  const [type, token] = String(h).split(" ");
  if (!type || type.toLowerCase() !== "bearer") return null;
  return token || null;
}

module.exports = async function handler(req, res) {
  const requestId = `doctor_ai_estimate_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  try {
    if (req.method === "OPTIONS") {
      return res.status(200).json({ ok: true });
    }

    if (req.method !== "POST") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed",
        step: "method_check",
        requestId,
        buildSha,
      });
    }

    // ✅ Env check
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return res.status(500).json({
        ok: false,
        error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
        step: "env_check",
        requestId,
        buildSha,
      });
    }

    if (!OPENAI_API_KEY || OPENAI_API_KEY.trim().length === 0) {
      return res.status(503).json({
        ok: false,
        error: "AI not configured",
        message: "OPENAI_API_KEY missing or invalid",
        step: "openai_check",
        requestId,
        buildSha,
      });
    }

    // ✅ Auth
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({
        ok: false,
        error: "Missing Authorization Bearer token",
        step: "auth_check",
        requestId,
        buildSha,
      });
    }

    const authClient = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY || SERVICE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    let user;
    try {
      const { data: userData, error: userErr } = await authClient.auth.getUser(token);
      if (userErr || !userData?.user) {
        return res.status(401).json({
          ok: false,
          error: "Invalid session",
          step: "jwt_verify",
          requestId,
          buildSha,
        });
      }
      user = userData.user;
    } catch (authErr) {
      return res.status(401).json({
        ok: false,
        error: "Auth verification failed",
        step: "jwt_verify",
        requestId,
        buildSha,
      });
    }

    // ✅ Verify doctor role
    const dbClient = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let profile;
    try {
      const { data: profData, error: profErr } = await dbClient
        .from("profiles")
        .select("id, role")
        .eq("id", user.id)
        .maybeSingle();

      if (profErr || !profData || profData.role !== "doctor") {
        return res.status(403).json({
          ok: false,
          error: "Forbidden: doctor access only",
          step: "role_check",
          requestId,
          buildSha,
        });
      }
      profile = profData;
    } catch (roleErr) {
      return res.status(500).json({
        ok: false,
        error: "Role check failed",
        step: "role_check",
        requestId,
        buildSha,
      });
    }

    // ✅ Parse body
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const noteId = body.note_id ? String(body.note_id).trim() : null;
    const estimateText = body.estimate_text ? String(body.estimate_text).trim() : null;

    if (!noteId || !estimateText) {
      return res.status(400).json({
        ok: false,
        error: "Missing note_id or estimate_text parameter",
        step: "param_check",
        requestId,
        buildSha,
      });
    }

    // ✅ Verify note exists and belongs to doctor
    const { data: note, error: noteErr } = await dbClient
      .from("doctor_notes")
      .select("*")
      .eq("id", noteId)
      .eq("doctor_id", user.id)
      .maybeSingle();

    if (noteErr || !note) {
      return res.status(404).json({
        ok: false,
        error: "Note not found or not owned by you",
        step: "fetch_note",
        requestId,
        buildSha,
      });
    }

    if (note.status === "approved") {
      return res.status(400).json({
        ok: false,
        error: "Cannot modify approved note",
        step: "note_status_check",
        requestId,
        buildSha,
      });
    }

    // ✅ Fetch all catalog items for context (to help AI match)
    const { data: allCatalogItems, error: catalogErr } = await dbClient
      .from("catalog_items")
      .select("id, name, kind")
      .order("name", { ascending: true });

    if (catalogErr) {
      console.error("[doctor/ai/estimate] Catalog query error:", catalogErr, { requestId });
    }

    const catalogContext = (allCatalogItems || [])
      .map((item) => `${item.kind}: ${item.name}`)
      .join(", ");

    // ✅ Call OpenAI to parse estimate text into structured JSON
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const prompt = `You are an AI assistant helping a dental clinic doctor parse a natural language treatment estimate into structured items.

Doctor's estimate text:
"${estimateText}"

Available catalog items (for reference, format: kind: name):
${catalogContext.substring(0, 2000)}...

Parse the estimate text and extract:
1. Items with quantities (procedure, material, or service)
2. Questions that need clarification
3. Assumptions you made

Output ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "items": [
    {"kind": "procedure|material|service", "query": "search query for catalog", "refQty": number},
    ...
  ],
  "questions": ["question 1", "question 2", ...],
  "assumptions": ["assumption 1", "assumption 2", ...]
}

Rules:
- kind must be one of: procedure, material, service
- query should be a search-friendly string (e.g., "zirconia crown monolithic", "implant fixture straumann")
- refQty is the quantity mentioned (extract numbers from text)
- If quantity not mentioned, use refQty: 1
- questions: list any clarifications needed
- assumptions: list any assumptions you made (e.g., "Assuming upper jaw esthetic zone")`;

    let aiResponse;
    try {
      const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: "system",
              content:
                "You are an AI assistant for dental clinic doctors. Parse natural language estimates into structured JSON. Always output valid JSON only, no markdown formatting.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.2,
          max_tokens: 1500,
          response_format: { type: "json_object" },
        }),
      });

      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.json().catch(() => ({ error: { message: "OpenAI API error" } }));
        const errorMessage = errorData.error?.message || "OpenAI API request failed";
        console.error("[doctor/ai/estimate] OpenAI API error", requestId, openaiResponse.status, errorMessage);
        return res.status(503).json({
          ok: false,
          error: "OPENAI_API_ERROR",
          message: errorMessage,
          step: "openai_call",
          requestId,
          buildSha,
        });
      }

      const openaiData = await openaiResponse.json();
      const aiText = openaiData.choices[0]?.message?.content || "";

      if (!aiText || aiText.trim().length === 0) {
        return res.status(503).json({
          ok: false,
          error: "AI_RESPONSE_EMPTY",
          message: "AI returned empty response",
          step: "parse_ai_response",
          requestId,
          buildSha,
        });
      }

      // Parse JSON (handle markdown code blocks if present)
      const cleanedText = aiText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      aiResponse = JSON.parse(cleanedText);
    } catch (parseErr) {
      console.error("[doctor/ai/estimate] AI parse error:", parseErr, { requestId, aiText: aiText?.substring(0, 200) });
      return res.status(500).json({
        ok: false,
        error: "Failed to parse AI response",
        step: "parse_ai_response",
        requestId,
        buildSha,
      });
    }

    // ✅ Get default price book
    const { data: defaultPriceBook, error: pbErr } = await dbClient
      .from("price_book")
      .select("id")
      .eq("is_default", true)
      .maybeSingle();

    const priceBookId = defaultPriceBook?.id || null;

    // ✅ For each item, fuzzy search catalog and create draft items
    const matchedItems = [];
    const unmatchedQueries = [];

    if (aiResponse.items && Array.isArray(aiResponse.items)) {
      for (const item of aiResponse.items) {
        const query = item.query || "";
        const kind = item.kind || "procedure";
        const refQty = item.refQty || 1;

        // ✅ Fuzzy search: find best match in catalog
        // Simple approach: search by name containing query words
        const queryWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
        let bestMatch = null;
        let bestScore = 0;

        for (const catalogItem of allCatalogItems || []) {
          if (catalogItem.kind !== kind) continue;

          const catalogName = catalogItem.name.toLowerCase();
          let score = 0;

          // Count matching words
          for (const word of queryWords) {
            if (catalogName.includes(word)) {
              score += word.length; // Longer matches score higher
            }
          }

          // Exact match bonus
          if (catalogName.includes(query.toLowerCase())) {
            score += 100;
          }

          if (score > bestScore) {
            bestScore = score;
            bestMatch = catalogItem;
          }
        }

        if (bestMatch && bestScore > 0) {
          // ✅ Get price from price book
          let unitPrice = 0;
          if (priceBookId) {
            const { data: priceItem } = await dbClient
              .from("price_book_items")
              .select("unit_price")
              .eq("price_book_id", priceBookId)
              .eq("catalog_item_id", bestMatch.id)
              .maybeSingle();
            unitPrice = priceItem?.unit_price || 0;
          }

          matchedItems.push({
            catalog_item_id: bestMatch.id,
            catalog_item_name: bestMatch.name,
            qty: refQty,
            unit_price: unitPrice,
            notes: `AI matched: "${query}"`,
            match_score: bestScore,
          });
        } else {
          unmatchedQueries.push({
            query: query,
            kind: kind,
            refQty: refQty,
          });
        }
      }
    }

    // ✅ Insert matched items as draft (only if not already exists for this note)
    const insertedItems = [];
    if (matchedItems.length > 0) {
      // Check existing items to avoid duplicates
      const { data: existingItems } = await dbClient
        .from("doctor_note_items")
        .select("catalog_item_id, qty")
        .eq("doctor_note_id", noteId);

      const existingMap = new Map();
      (existingItems || []).forEach((item) => {
        const key = `${item.catalog_item_id}_${item.qty}`;
        existingMap.set(key, true);
      });

      const itemsToInsert = matchedItems
        .filter((item) => {
          const key = `${item.catalog_item_id}_${item.qty}`;
          return !existingMap.has(key);
        })
        .map((item) => ({
          doctor_note_id: noteId,
          catalog_item_id: item.catalog_item_id,
          catalog_item_name: item.catalog_item_name,
          qty: item.qty,
          unit_price: item.unit_price,
          notes: item.notes,
          created_at: new Date().toISOString(),
        }));

      if (itemsToInsert.length > 0) {
        const { data: inserted, error: insertErr } = await dbClient
          .from("doctor_note_items")
          .insert(itemsToInsert)
          .select();

        if (insertErr) {
          console.error("[doctor/ai/estimate] Items insert error:", insertErr, { requestId });
        } else {
          insertedItems.push(...(inserted || []));
        }
      }
    }

    return res.status(200).json({
      ok: true,
      items: insertedItems,
      unmatched: unmatchedQueries,
      questions: aiResponse.questions || [],
      assumptions: aiResponse.assumptions || [],
      requestId,
      buildSha,
    });
  } catch (err) {
    console.error("[doctor/ai/estimate] Handler crash:", err, { requestId });
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Server error",
      step: "handler",
      requestId,
      buildSha,
    });
  }
};

