// api/admin/ai-health/bulk.js (POST endpoint for bulk AI health fetch)
// Avoids URL length limits by using POST body instead of query params

module.exports = async function handler(req, res) {
  const requestId = `ai_health_bulk_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  try {
    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") return res.status(200).end();

    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed. Use POST.", requestId });
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
    function getBearerToken(req) {
      const h = req.headers.authorization;
      if (!h) return null;

      const [type, token] = String(h).split(" ");
      if (!type || type.toLowerCase() !== "bearer") return null;
      return token || null;
    }
    
    const jwt = getBearerToken(req);
    if (!jwt) {
      return res.status(401).json({
        ok: false,
        error: "Missing Authorization Bearer token",
        requestId,
      });
    }

    // Parse body
    let leadIds = [];
    if (req.body && req.body.leadIds) {
      leadIds = Array.isArray(req.body.leadIds) 
        ? req.body.leadIds.map(id => String(id).trim()).filter(id => id.length > 0)
        : String(req.body.leadIds).split(",").map(id => id.trim()).filter(id => id.length > 0);
    }

    if (leadIds.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "Missing or empty leadIds in request body",
        requestId,
      });
    }

    // Dynamic import Supabase
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    try {
      const { data, error } = await supabase
        .from("lead_ai_health")
        .select("lead_id, needs_normalize, last_normalized_at, review_required")
        .in("lead_id", leadIds);

      if (error) {
        // View might not exist
        if (error.code === "42P01" || error.message?.includes("does not exist")) {
          console.warn("[ai-health/bulk] View lead_ai_health does not exist", requestId);
          // Return empty map (graceful degradation)
          return res.status(200).json({
            ok: true,
            data: {},
            requestId,
            warning: "View not found",
          });
        }
        throw error;
      }

      // Convert array to map for easy lookup
      const healthMap = {};
      if (data && Array.isArray(data)) {
        data.forEach((row) => {
          healthMap[row.lead_id] = {
            needs_normalize: row.needs_normalize === true,
            last_normalized_at: row.last_normalized_at || null,
            review_required: row.review_required === true,
            updated_at: row.updated_at || null,
          };
        });
      }

      return res.status(200).json({
        ok: true,
        data: healthMap,
        requestId,
      });
    } catch (err) {
      console.error("[ai-health/bulk] Fetch error", requestId, err);
      // Graceful fallback
      return res.status(200).json({
        ok: true,
        data: {},
        requestId,
        warning: err?.message || "Failed to fetch",
      });
    }
  } catch (err) {
    console.error("[ai-health/bulk] fatal", requestId, err);
    return res.status(500).json({
      ok: false,
      error: "AI health bulk fetch failed (crash)",
      details: err && err.message ? err.message : String(err),
      requestId,
    });
  }
};


