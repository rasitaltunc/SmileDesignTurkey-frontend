// api/doctor/ai/brief.js
// POST /api/doctor/ai/brief
// Generate PII-safe doctor brief for lead review
// Auth: Bearer JWT (doctor role required)

const { createClient } = require("@supabase/supabase-js");
// ✅ Vercel module resolution: _privacy.js is in api/ directory, two levels up from api/doctor/ai/
const { redactPII, caseCodeFromLead } = require("../../_privacy");

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

  // ✅ CRASH-PROOF: Set JSON headers FIRST
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  try {
    if (req.method === "OPTIONS") return res.status(200).json({ ok: true });

    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed", requestId });
    }

    // ✅ Env check: require SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (do this FIRST)
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
      });
    }

    // ✅ OPENAI_API_KEY guard: if missing, return graceful error (don't crash)
    if (!OPENAI_API_KEY || OPENAI_API_KEY.trim().length === 0) {
      return res.status(503).json({
        ok: false,
        error: "AI not configured",
        message: "OPENAI_API_KEY missing or invalid",
        step: "openai_check",
        requestId,
      });
    }

    const jwt = getBearerToken(req);
    if (!jwt) {
      return res.status(401).json({
        ok: false,
        error: "Missing Authorization Bearer token",
        step: "auth_check",
        requestId,
      });
    }

    // ✅ Use anon key for JWT verification (fallback to service key if anon key missing)
    const authClient = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY || SERVICE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // Verify JWT and get user
    let user;
    try {
      const { data: userData, error: userErr } = await authClient.auth.getUser(jwt);
      if (userErr || !userData?.user) {
        return res.status(401).json({
          ok: false,
          error: "Invalid session",
          step: "jwt_verify",
          requestId,
        });
      }
      user = userData.user;
    } catch (authErr) {
      return res.status(401).json({
        ok: false,
        error: "Auth verification failed",
        step: "jwt_verify",
        requestId,
      });
    }

    // ✅ Service role client for DB operations (MUST use SERVICE_KEY, not anon key)
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // ✅ Verify doctor role
    let profile;
    try {
      const { data: profData, error: profErr } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profErr || !profData || profData.role !== "doctor") {
        return res.status(403).json({
          ok: false,
          error: "Forbidden: doctor access only",
          step: "role_check",
          requestId,
        });
      }
      profile = profData;
    } catch (roleErr) {
      return res.status(500).json({
        ok: false,
        error: "Role check failed",
        step: "role_check",
        requestId,
      });
    }

    // Parse request body or query
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    let ref = body.ref || req.query?.ref ? String(body.ref || req.query.ref).trim() : null;

    if (!ref) {
      return res.status(400).json({
        ok: false,
        error: "Missing ref parameter",
        step: "ref_parse",
        requestId,
      });
    }

    // ✅ Normalize: strip CASE- prefix if present
    if (ref.startsWith("CASE-")) {
      ref = ref.replace(/^CASE-/, "");
    }

    // ✅ Schema-safe: Use select("*") then map to allowlist
    let q = supabase
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
      return res.status(500).json({
        ok: false,
        error: leadErr.message || "Lead query failed",
        step: "fetch_lead",
        requestId,
      });
    }

    if (!lead) {
      return res.status(404).json({
        ok: false,
        error: "Lead not found or not assigned to you",
        step: "fetch_lead",
        requestId,
      });
    }

    // ✅ Load clinic_settings (default)
    let clinicSettings = { brand_voice: "", legal_disclaimer: "" };
    try {
      const { data: settings } = await supabase
        .from("clinic_settings")
        .select("brand_voice, legal_disclaimer")
        .eq("key", "default")
        .maybeSingle();
      if (settings) {
        clinicSettings.brand_voice = settings.brand_voice || "";
        clinicSettings.legal_disclaimer = settings.legal_disclaimer || "";
      }
    } catch (settingsErr) {
      console.debug("[doctor/ai/brief] Clinic settings fetch skipped:", settingsErr?.message);
    }

    // ✅ Load prompt template (doctor_brief_v1, active)
    let templateText = null;
    try {
      const { data: template } = await supabase
        .from("prompt_templates")
        .select("template")
        .eq("key", "doctor_brief_v1")
        .eq("is_active", true)
        .maybeSingle();
      if (template) {
        templateText = template.template;
      }
    } catch (templateErr) {
      console.debug("[doctor/ai/brief] Template fetch skipped:", templateErr?.message);
    }

    // ✅ Load doctor preferences
    let doctorPrefs = {
      locale: "en",
      brief_style: "bullets",
      tone: "warm_expert",
      risk_tolerance: "balanced",
      specialties: [],
      preferred_materials: {},
      clinic_protocol_notes: null,
    };
    try {
      const { data: prefs } = await supabase
        .from("doctor_preferences")
        .select("*")
        .eq("doctor_id", user.id)
        .maybeSingle();
      if (prefs) {
        doctorPrefs = {
          locale: prefs.locale || "en",
          brief_style: prefs.brief_style || "bullets",
          tone: prefs.tone || "warm_expert",
          risk_tolerance: prefs.risk_tolerance || "balanced",
          specialties: prefs.specialties || [],
          preferred_materials: prefs.preferred_materials || {},
          clinic_protocol_notes: prefs.clinic_protocol_notes || null,
        };
      }
    } catch (prefsErr) {
      console.debug("[doctor/ai/brief] Doctor preferences fetch skipped:", prefsErr?.message);
    }

    // ✅ Build sanitized context (PII-redacted, schema-safe)
    const caseCode = caseCodeFromLead(lead) || "UNKNOWN";
    const treatment = lead.treatment || "General inquiry";
    const timeline = lead.timeline || "Not specified";
    const message = redactPII(lead.message || "");
    const snapshot = redactPII(lead.ai_summary || lead.snapshot || "");
    const reviewStatus = lead.doctor_review_status || "pending";

    // ✅ Fetch documents (types only, no URLs that may contain tokens) - non-fatal
    let documentLabels = [];
    let hasXray = false;
    let hasCbct = false;
    let hasPano = false;
    let hasPhotos = false;
    
    try {
      const { data: docsData } = await supabase
        .from("lead_documents")
        .select("type, filename, category")
        .eq("lead_id", lead.id)
        .limit(20);

      if (docsData && Array.isArray(docsData)) {
        // ✅ Exclude passport/ID documents
        const filteredDocs = docsData.filter((doc) => {
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
        });

        // ✅ Check for specific document types
        for (const doc of filteredDocs) {
          const type = String(doc.type || "").toLowerCase();
          const filename = String(doc.filename || "").toLowerCase();
          const category = String(doc.category || "").toLowerCase();
          const combined = `${type} ${filename} ${category}`.toLowerCase();

          if (combined.includes("cbct") || combined.includes("cone beam")) {
            hasCbct = true;
          }
          if (combined.includes("panoramic") || combined.includes("pano") || combined.includes("pan")) {
            hasPano = true;
          }
          if (combined.includes("xray") || combined.includes("x-ray") || combined.includes("radiograph")) {
            hasXray = true;
          }
          if (
            combined.includes("photo") ||
            combined.includes("image") ||
            type.includes("photo") ||
            type.includes("image")
          ) {
            hasPhotos = true;
          }
        }

        documentLabels = filteredDocs.map(
          (doc) => `${doc.type || "document"}${doc.category ? ` (${doc.category})` : ""}`
        );
      }
    } catch (docsErr) {
      // Table might not exist, continue
      console.debug("[doctor/ai/brief] Documents fetch skipped:", docsErr?.message);
    }

    // ✅ Format doctor preferences for template
    const doctorPrefsText = `Locale: ${doctorPrefs.locale}
Brief Style: ${doctorPrefs.brief_style}
Tone: ${doctorPrefs.tone}
Risk Tolerance: ${doctorPrefs.risk_tolerance}
Specialties: ${doctorPrefs.specialties.join(", ") || "None specified"}
Preferred Materials: ${JSON.stringify(doctorPrefs.preferred_materials)}
Protocol Notes: ${doctorPrefs.clinic_protocol_notes || "None"}`;

    // ✅ Build documents metadata with missing diagnostics info
    const missingDiagnostics = [];
    if (!hasCbct && !hasPano && !hasXray) {
      missingDiagnostics.push("CBCT or Panoramic X-ray");
    } else if (!hasCbct) {
      missingDiagnostics.push("CBCT (3D imaging)");
    }
    if (!hasPano && !hasXray) {
      missingDiagnostics.push("Panoramic X-ray");
    }
    
    const documentsMeta = documentLabels.length > 0
      ? `- Available Documents: ${documentLabels.join(", ")}`
      : "- Documents: None";
    
    const missingDiagnosticsText = missingDiagnostics.length > 0
      ? `\n\nIMPORTANT: Missing Diagnostic Imaging: ${missingDiagnostics.join(", ")}. This is a PROVISIONAL estimate based on available information. A definitive treatment plan requires the missing diagnostic imaging (CBCT/Panoramic X-ray) for accurate assessment.`
      : "";

    // ✅ Use template if available, otherwise fallback to hardcoded prompt
    let prompt;
    if (templateText) {
      // Replace template placeholders
      prompt = templateText
        .replace(/\{\{brand_voice\}\}/g, clinicSettings.brand_voice || "")
        .replace(/\{\{legal_disclaimer\}\}/g, clinicSettings.legal_disclaimer || "")
        .replace(/\{\{doctor_preferences\}\}/g, doctorPrefsText)
        .replace(/\{\{case_code\}\}/g, caseCode)
        .replace(/\{\{treatment\}\}/g, treatment)
        .replace(/\{\{timeline\}\}/g, timeline)
        .replace(/\{\{review_status\}\}/g, reviewStatus)
        .replace(/\{\{documents_meta\}\}/g, documentsMeta + missingDiagnosticsText)
        .replace(/\{\{lead_message\}\}/g, message || "No patient message available")
        .replace(/\{\{snapshot\}\}/g, snapshot || "No summary available yet")
        .replace(/\{\{lead\}\}/g, JSON.stringify({ case_code: caseCode, treatment, timeline }));
    } else {
      // Fallback to original hardcoded prompt (with doctor preferences context added)
      prompt = `You are an AI assistant helping a dental clinic doctor review a patient case. 
You MUST NOT output any emails, phone numbers, links, or addresses. If present in the input, ignore them completely.

Clinic Brand Voice:
${clinicSettings.brand_voice || "Professional, warm, and patient-centered."}

Legal Disclaimer:
${clinicSettings.legal_disclaimer || "This is a preliminary assessment. Final treatment plan requires in-person consultation."}

Doctor Preferences:
${doctorPrefsText}

Case Information:
- Case Code: ${caseCode}
- Treatment Interest: ${treatment}
- Timeline: ${timeline}
- Review Status: ${reviewStatus}
${documentsMeta}${missingDiagnosticsText}

Patient Message (PII-redacted):
${message || "No patient message available"}

Employee/Admin Summary (PII-redacted):
${snapshot || "No summary available yet"}

${missingDiagnostics.length > 0 ? `NOTE: This is a PROVISIONAL assessment. Missing diagnostic imaging: ${missingDiagnostics.join(", ")}. Generate a provisional plan that clearly states what diagnostics are needed for definitive assessment.` : ""}

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
    }

    // Call OpenAI via fetch (no SDK to avoid module issues)
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
            content: `You are an AI assistant for dental clinic doctors. You MUST NOT output any emails, phone numbers, links, addresses, or any PII. Always output markdown format. Be concise and professional.${
              missingDiagnostics.length > 0
                ? ` IMPORTANT: When diagnostic imaging (CBCT/Panoramic X-ray) is missing, still generate a PROVISIONAL plan that clearly states what diagnostics are needed for definitive assessment. Use a warm, expert, and inviting tone.`
                : ""
            }`,
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

    // ✅ Parse brief JSON if possible, also return rendered summary
    let briefJson = null;
    try {
      // Try to parse as JSON (if AI returns structured data)
      briefJson = JSON.parse(aiText);
    } catch {
      // Not JSON, that's fine - it's markdown
    }

    // Return markdown brief (PII-safe) + JSON if available + missing_inputs
    const buildSha =
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.VERCEL_GIT_COMMIT_REF ||
      process.env.GITHUB_SHA ||
      null;

    return res.status(200).json({
      ok: true,
      brief: aiText.trim(),
      brief_json: briefJson,
      missing_inputs: {
        has_xray: hasXray,
        has_cbct: hasCbct,
        has_pano: hasPano,
        has_photos: hasPhotos,
      },
      requestId,
      buildSha,
    });
  } catch (err) {
    console.error("[doctor/ai/brief] Handler crash:", err, { requestId });
    const buildSha =
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.VERCEL_GIT_COMMIT_REF ||
      process.env.GITHUB_SHA ||
      null;

    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Internal server error",
      requestId,
      buildSha,
    });
  }
};

