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

    // Fetch lead from Supabase using service role
    const response = await fetch(`${supabaseUrl}/rest/v1/leads?id=eq.${encodeURIComponent(leadId)}&select=*`, {
      method: "GET",
      headers: {
        "apikey": supabaseServiceKey,
        "Authorization": `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error("[admin/lead] Supabase error", response.status, errorText);
      return res.status(500).json({
        ok: false,
        error: "Failed to fetch lead from database",
        requestId,
      });
    }

    const leads = await response.json();

    if (!leads || leads.length === 0) {
      return res.status(404).json({
        ok: false,
        error: "NOT_FOUND",
        requestId,
      });
    }

    return res.status(200).json({
      ok: true,
      lead: leads[0],
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

