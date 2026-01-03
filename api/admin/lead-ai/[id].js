// api/admin/lead-ai/[id].js (PURE CJS — no TS, no export)
// Sprint B4: Lead AI Memory persistence endpoint

module.exports = async function handler(req, res) {
  const requestId = `lead_ai_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const route = "api/admin/lead-ai/[id]";

  // Log at start
  console.log("ai_endpoint_start", { route, requestId, method: req.method });

  try {
    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") return res.status(200).end();

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
      const h = req.headers.authorization; // ✅ Node'da hep lowercase gelir
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

    // Extract leadId from query
    const leadId = req.query.id;
    if (!leadId) {
      return res.status(400).json({
        ok: false,
        error: "Missing lead id parameter",
        requestId,
      });
    }

    // Dynamic import Supabase
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // GET: Fetch AI memory
    if (req.method === "GET") {
      try {
        const { data, error } = await supabase
          .from("lead_ai_memory")
          .select("*")
          .eq("lead_id", leadId)
          .single();

        if (error) {
          // Table might not exist or no record found
          if (error.code === "PGRST116") {
            // No rows returned
            return res.status(200).json({
              ok: true,
              data: null,
              requestId,
            });
          }
          // Check if table doesn't exist (42P01 = relation does not exist)
          if (error.code === "42P01" || error.message?.includes("does not exist")) {
            console.warn("[lead-ai] Table lead_ai_memory does not exist", requestId);
            return res.status(200).json({
              ok: true,
              data: null,
              requestId,
              warning: "Table not found",
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

        // Return structured data
        return res.status(200).json({
          ok: true,
          data: {
            snapshot: data.snapshot_json,
            callBrief: data.call_brief_json,
            risk: data.risk_json,
            memory: data.memory_json,
            normalizedAt: data.normalized_at,
            model: data.model,
            requestId: data.request_id,
            updatedAt: data.updated_at,
          },
          requestId,
        });
      } catch (err) {
        console.error("[lead-ai] GET error", requestId, err);
        // Graceful fallback: return null data instead of crashing
        return res.status(200).json({
          ok: true,
          data: null,
          requestId,
          warning: err?.message || "Failed to fetch",
        });
      }
    }

    // POST: Upsert AI memory
    if (req.method === "POST") {
      try {
        const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
        const { snapshot, callBrief, risk, memory, model: payloadModel, requestId: payloadRequestId } = body;

        // Build upsert payload
        const upsertData = {
          lead_id: leadId,
          normalized_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (snapshot !== undefined) upsertData.snapshot_json = snapshot;
        if (callBrief !== undefined) upsertData.call_brief_json = callBrief;
        if (risk !== undefined) upsertData.risk_json = risk;
        if (memory !== undefined) upsertData.memory_json = memory;
        if (payloadModel) upsertData.model = payloadModel;
        if (payloadRequestId) upsertData.request_id = payloadRequestId;

        const { data, error } = await supabase
          .from("lead_ai_memory")
          .upsert(upsertData, {
            onConflict: "lead_id",
          })
          .select()
          .single();

        if (error) {
          // Check if table doesn't exist
          if (error.code === "42P01" || error.message?.includes("does not exist")) {
            console.warn("[lead-ai] Table lead_ai_memory does not exist", requestId);
            return res.status(200).json({
              ok: false,
              error: "TABLE_NOT_FOUND",
              message: "lead_ai_memory table does not exist. Please run migration.",
              requestId,
            });
          }
          throw error;
        }

        return res.status(200).json({
          ok: true,
          data: {
            snapshot: data.snapshot_json,
            callBrief: data.call_brief_json,
            risk: data.risk_json,
            memory: data.memory_json,
            normalizedAt: data.normalized_at,
            model: data.model,
            requestId: data.request_id,
          },
          requestId,
        });
      } catch (err) {
        console.error("[lead-ai] POST error", requestId, err);
        return res.status(500).json({
          ok: false,
          error: "Failed to save AI memory",
          details: err?.message || String(err),
          requestId,
        });
      }
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
      requestId,
    });
  } catch (err) {
    console.error("[lead-ai] fatal", requestId, err);
    return res.status(500).json({
      ok: false,
      error: "Request failed (crash)",
      details: err && err.message ? err.message : String(err),
      requestId,
    });
  }
};

