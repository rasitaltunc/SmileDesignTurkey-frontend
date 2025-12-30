// api/ai/normalize.js  (PURE CJS — no TS, no export)
// Vercel Node builder will run this reliably.

module.exports = async function handler(req, res) {
  const requestId = `norm_${Date.now()}_${Math.random().toString(16).slice(2)}`;

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
    if (!openaiKey) {
      return res.status(500).json({
        ok: false,
        error: "Missing OPENAI_API_KEY",
        requestId,
      });
    }

    // Token guard
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const m = String(authHeader || "").match(/^Bearer\s+(.+)$/i);
    const jwt = m ? m[1] : null;
    if (!jwt) return res.status(401).json({ ok: false, error: "Missing Authorization Bearer token", requestId });

    // For now: no-op success so UI stops failing.
    // Next step: plug in real normalize logic (Supabase fetch + OpenAI)
    return res.status(200).json({ ok: true, requestId, normalized: false, message: "Normalize endpoint alive (no-op)" });
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

