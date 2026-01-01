// api/admin/ai-health/[leadId].js (PURE CJS — no TS, no export)
// AI Health freshness indicator endpoint using lead_ai_health view

module.exports = async function handler(req, res) {
  const requestId = `ai_health_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  try {
    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") return res.status(200).end();

    // Healthcheck
    if (req.method === "GET" && !req.query.leadId && !req.query.leadIds) {
      return res.status(200).json({ ok: true, source: "api/admin/ai-health/[leadId]", requestId });
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

    // Dynamic import Supabase
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Check if bulk fetch (multiple leadIds)
    const leadIdsParam = req.query.leadIds;
    if (leadIdsParam) {
      // Bulk fetch: comma-separated leadIds
      const leadIds = String(leadIdsParam)
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id.length > 0);

      if (leadIds.length === 0) {
        return res.status(400).json({
          ok: false,
          error: "Invalid leadIds parameter",
          requestId,
        });
      }

      try {
        const { data, error } = await supabase
          .from("lead_ai_health")
          .select("lead_id, needs_normalize, last_normalized_at, review_required")
          .in("lead_id", leadIds);

        if (error) {
          // View might not exist
          if (error.code === "42P01" || error.message?.includes("does not exist")) {
            console.warn("[ai-health] View lead_ai_health does not exist", requestId);
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
            };
          });
        }

        return res.status(200).json({
          ok: true,
          data: healthMap,
          requestId,
        });
      } catch (err) {
        console.error("[ai-health] Bulk fetch error", requestId, err);
        // Graceful fallback
        return res.status(200).json({
          ok: true,
          data: {},
          requestId,
          warning: err?.message || "Failed to fetch",
        });
      }
    }

    // Single lead fetch
    const leadId = req.query.leadId;
    if (!leadId) {
      return res.status(400).json({
        ok: false,
        error: "Missing leadId parameter",
        requestId,
      });
    }

    try {
      const { data, error } = await supabase
        .from("lead_ai_health")
        .select("lead_id, needs_normalize, last_normalized_at, review_required")
        .eq("lead_id", leadId)
        .single();

      if (error) {
        // View might not exist or no row found
        if (error.code === "42P01" || error.message?.includes("does not exist")) {
          console.warn("[ai-health] View lead_ai_health does not exist", requestId);
          return res.status(200).json({
            ok: true,
            data: null,
            requestId,
            warning: "View not found",
          });
        }
        if (error.code === "PGRST116") {
          // No rows returned
          return res.status(200).json({
            ok: true,
            data: null,
            requestId,
          });
        }
        throw error;
      }

      if (!data) {
        return res.status(200).json({
          ok: true,
          data: null,
          requestId,
        });
      }

      return res.status(200).json({
        ok: true,
        data: {
          needs_normalize: data.needs_normalize === true,
          last_normalized_at: data.last_normalized_at || null,
          review_required: data.review_required === true,
        },
        requestId,
      });
    } catch (err) {
      console.error("[ai-health] Fetch error", requestId, err);
      // Graceful fallback
      return res.status(200).json({
        ok: true,
        data: null,
        requestId,
        warning: err?.message || "Failed to fetch",
      });
    }
  } catch (err) {
    console.error("[ai-health] fatal", requestId, err);
    return res.status(500).json({
      ok: false,
      error: "AI health fetch failed (crash)",
      details: err && err.message ? err.message : String(err),
      requestId,
    });
  }
};

