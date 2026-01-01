// api/admin/lead/[id].js (PURE CJS — no TS, no export)
// C1.1: Admin lead fetch endpoint with service role

module.exports = async function handler(req, res) {
  const requestId = `lead_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  try {
    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") return res.status(200).end();

    // Healthcheck
    if (req.method === "GET" && !req.query.id) {
      return res.status(200).json({ ok: true, source: "api/admin/lead/[id]", requestId });
    }

    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed", requestId });
    }

    // ENV guards
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({
        ok: false,
        error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
        requestId,
      });
    }

    // Token guard
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const m = String(authHeader || "").match(/^Bearer\s+(.+)$/i);
    const jwt = m ? m[1] : null;
    if (!jwt) {
      return res.status(401).json({
        ok: false,
        error: "Missing Authorization Bearer token",
        requestId,
      });
    }

    // Extract leadId from query
    const leadId = req.query.id;
    if (!leadId) {
      return res.status(400).json({
        ok: false,
        error: "Missing lead id parameter",
        requestId,
      });
    }

    // Debug log
    console.log("FETCH_LEAD_DEBUG", { leadId, requestId });

    // Fetch lead from Supabase using service role (use Supabase client for consistency)
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: lead, error: fetchError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (fetchError || !lead) {
      console.error("[admin/lead] Fetch error", requestId, fetchError);
      return res.status(404).json({
        ok: false,
        error: "LEAD_NOT_FOUND",
        requestId,
      });
    }

    return res.status(200).json({
      ok: true,
      lead: lead,
      requestId,
    });
  } catch (err) {
    console.error("[admin/lead] fatal", requestId, err);
    return res.status(500).json({
      ok: false,
      error: "Lead fetch failed (crash)",
      details: err && err.message ? err.message : String(err),
      requestId,
    });
  }
};

