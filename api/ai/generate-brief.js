const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;


module.exports = async function handler(req, res) {
    // CORS Headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") return res.status(200).end();

    if (req.method !== "POST") {
        return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    // Input Validation
    const { lead_id } = req.body || {};
    if (!lead_id) {
        return res.status(400).json({ ok: false, error: "Missing lead_id" });
    }

    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Check Cache (DB)
        const { data: cachedBrief } = await supabase
            .from("doctor_briefs")
            .select("*")
            .eq("lead_id", lead_id)
            .gt("expires_at", new Date().toISOString())
            .limit(1)
            .maybeSingle();

        if (cachedBrief) {
            console.log(`[Brief] Cache hit for ${lead_id}`);
            return res.status(200).json({ ok: true, brief: cachedBrief.brief });
        }

        // 2. Fetch Data
        // Fixed: Select only existing columns (id, name, email, phone)
        const { data: lead, error: leadError } = await supabase
            .from("leads")
            .select("id, name, email, phone, message")
            .eq("id", lead_id)
            .single();

        if (leadError || !lead) {
            console.error("[Brief] Lead access error:", leadError);
            return res.status(404).json({ ok: false, error: "Lead not found or access denied" });
        }

        // Graceful handling for optional tables
        let notes = [];
        try {
            const { data, error } = await supabase
                .from("lead_notes")
                .select("content, created_at")
                .eq("lead_id", lead_id)
                .order("created_at", { ascending: false })
                .limit(10);

            if (!error && data) notes = data;
        } catch (e) {
            console.warn("[Brief] Failed to fetch notes (table might be missing)", e);
        }

        let images = [];
        try {
            const { data, error } = await supabase
                .from("lead_documents")
                .select("filename, description")
                .eq("lead_id", lead_id)
                .ilike("type", "%image%");

            if (!error && data) images = data;
        } catch (e) {
            console.warn("[Brief] Failed to fetch documents", e);
        }

        // 3. Prepare AI Prompt
        const notesText = notes ? notes.map(n => `- ${n.content}`).join("\n") : "No notes";
        const imagesText = images ? images.map(i => `${i.filename}: ${i.description || 'No description'}`).join(", ") : "No images";

        // Fallback to OpenAI Key Check
        const openAIKey = process.env.OPENAI_API_KEY;
        if (!openAIKey) {
            console.warn("[Brief] Missing OPENAI_API_KEY");
            return res.status(500).json({ ok: false, error: "Configuration Error: Missing OPENAI_API_KEY" });
        }

        const prompt = `You are a dental briefing expert for a busy dentist. Analyze patient data and create a JSON brief.

Patient Data:
- Name: ${lead.name || "Unknown"}
- Age: ${lead.age || "Unknown"}
- Contact: ${lead.phone || "Unknown"}
- Complaint: "${lead.message || "Not specified"}"
- Recent notes: ${notesText}
- Photos: ${imagesText}

IMPORTANT INSTRUCTIONS:
1. Analyze the "Complaint" and "Recent notes" deeply.
2. DO NOT just echo the message. EXTRACT the actual dental needs.
3. specific key_points are CRITICAL.
4. If the message is in Turkish, keep the brief in Turkish.

Generate ONLY this JSON structure (valid JSON format):
{
  "patient_name": "${lead.name || "Unknown"}",
  "age": numberOrNull,
  "contact": "${lead.phone || "Unknown"}",
  "chief_complaint": "SHORT summary of the main problem (max 10 words, e.g., 'Üst çene diş eksikliği')",
  "key_points": [
    "Extracted specific need 1 (e.g., 'Protez lazım')",
    "Extracted specific need 2 (e.g., 'Altlar kaplama isteniyor')",
    "Extracted specific need 3"
  ],
  "images": [{"filename": "string", "relevance_score": 0.0-1.0, "description": "string"}],
  "next_action": "Specific actionable step (e.g., 'Prepare treatment plan options', 'Request X-ray')",
  "confidence_score": 0.0-1.0 (0.9 if message has details, 0.4 if generic)
}

Rules:
- chief_complaint: MUST be a short summary, NOT the full message.
- key_points: Extract 3-4 distinct medical/dental needs or questions from the text.
- confidence_score: High (0.8+) if the patient was specific about their problem.
- Return ONLY valid JSON.`;

        // 4. Call OpenAI GPT-4o
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${openAIKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: "You are a helpful assistant that outputs strictly JSON." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.2,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const err = await response.text();
            console.error("OpenAI Error:", err);
            throw new Error("AI Generation failed");
        }

        const aiData = await response.json();
        const rawJson = aiData.choices[0].message.content;

        // Clean JSON (usually not needed with json_object mode, but safety first)
        const cleanJson = rawJson.trim();
        const brief = JSON.parse(cleanJson);

        // 5. Store in Cache (DB)
        // Calculate expiration (1 hour from now)
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

        await supabase.from("doctor_briefs").upsert({
            lead_id: lead_id,
            brief: brief,
            confidence_score: brief.confidence_score,
            expires_at: expiresAt,
            updated_at: new Date().toISOString()
        }, { onConflict: "lead_id" });

        return res.status(200).json({ ok: true, brief });

    } catch (error) {
        console.error("[Brief] Error:", error);
        return res.status(500).json({ ok: false, error: error.message || "Internal Server Error" });
    }
};
