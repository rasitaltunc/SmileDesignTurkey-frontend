// api/employee/quote/generate-pdf.js
// POST /api/employee/quote/generate-pdf
// Generates proforma PDF, uploads to storage, stores pdf path
// Body: { quote_id }
// Auth: Bearer JWT (employee/admin role required)

const { createClient } = require("@supabase/supabase-js");
const { generateQuotePDF } = require("../../_pdfUtils");

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
  const requestId = `quote_generate_pdf_${Date.now()}_${Math.random().toString(16).slice(2)}`;

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

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return res.status(500).json({
        ok: false,
        error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
        step: "env_check",
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

    // ✅ Verify employee/admin role
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

      if (profErr || !profData) {
        return res.status(403).json({
          ok: false,
          error: "Forbidden: profile not found",
          step: "role_check",
          requestId,
          buildSha,
        });
      }

      const allowedRoles = ["employee", "admin"];
      if (!allowedRoles.includes(profData.role)) {
        return res.status(403).json({
          ok: false,
          error: "Forbidden: employee or admin access only",
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
    const quoteId = body.quote_id ? String(body.quote_id).trim() : null;

    if (!quoteId) {
      return res.status(400).json({
        ok: false,
        error: "Missing quote_id parameter",
        step: "param_check",
        requestId,
        buildSha,
      });
    }

    // ✅ Fetch quote with lead info
    const { data: quote, error: quoteErr } = await dbClient
      .from("quotes")
      .select("*, leads(id, assigned_to)")
      .eq("id", quoteId)
      .maybeSingle();

    if (quoteErr || !quote) {
      return res.status(404).json({
        ok: false,
        error: "Quote not found",
        step: "fetch_quote",
        requestId,
        buildSha,
      });
    }

    // ✅ Verify lead assignment
    if (profile.role === "employee" && quote.leads?.assigned_to !== user.id) {
      return res.status(403).json({
        ok: false,
        error: "Lead not assigned to you",
        step: "lead_assignment_check",
        requestId,
        buildSha,
      });
    }

    // ✅ Fetch quote items
    const { data: quoteItems, error: itemsErr } = await dbClient
      .from("quote_items")
      .select("*")
      .eq("quote_id", quoteId)
      .order("created_at", { ascending: true });

    if (itemsErr) {
      console.error("[employee/quote/generate-pdf] Items query error:", itemsErr, { requestId });
    }

    // ✅ Generate case code
    const caseCode = quote.lead_id ? `CASE-${quote.lead_id.substring(0, 8).toUpperCase()}` : "CASE-UNKNOWN";

    // ✅ Generate PDF
    let pdfBytes;
    try {
      pdfBytes = await generateQuotePDF({
        clinicName: "Smile Design Turkey",
        caseCode: caseCode,
        leadId: quote.lead_id,
        quoteNumber: quote.quote_number || `QUOTE-${quoteId}`,
        items: (quoteItems || []).map((item) => ({
          catalog_item_name: item.catalog_item_name,
          qty: item.qty,
          unit_price: item.unit_price,
          total: item.qty * item.unit_price,
        })),
        discount: quote.discount || 0,
        generatedAt: new Date().toISOString(),
      });
    } catch (pdfErr) {
      console.error("[employee/quote/generate-pdf] PDF generation error:", pdfErr, { requestId });
      return res.status(500).json({
        ok: false,
        error: "Failed to generate PDF",
        step: "generate_pdf",
        requestId,
        buildSha,
      });
    }

    // ✅ Upload PDF to Supabase Storage
    const fileName = `quote-${quoteId}-${Date.now()}.pdf`;
    const storagePath = `${user.id}/${fileName}`;

    const { error: uploadErr } = await dbClient.storage
      .from("quotes")
      .upload(storagePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadErr) {
      console.error("[employee/quote/generate-pdf] PDF upload error:", uploadErr, { requestId });
      return res.status(500).json({
        ok: false,
        error: "Failed to upload PDF",
        step: "upload_pdf",
        requestId,
        buildSha,
      });
    }

    // ✅ Update quote: store PDF path
    const { error: updateErr } = await dbClient
      .from("quotes")
      .update({
        pdf_storage_path: storagePath,
        pdf_generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", quoteId);

    if (updateErr) {
      console.error("[employee/quote/generate-pdf] Quote update error:", updateErr, { requestId });
      return res.status(500).json({
        ok: false,
        error: "Failed to update quote",
        step: "update_quote",
        requestId,
        buildSha,
      });
    }

    return res.status(200).json({
      ok: true,
      pdfPath: storagePath,
      requestId,
      buildSha,
    });
  } catch (err) {
    console.error("[employee/quote/generate-pdf] Handler crash:", err, { requestId });
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Server error",
      step: "handler",
      requestId,
      buildSha,
    });
  }
};

