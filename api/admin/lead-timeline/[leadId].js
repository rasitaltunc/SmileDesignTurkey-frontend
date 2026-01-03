// api/admin/lead-timeline/[leadId].js (PURE CJS — no TS, no export)
// B6.2: Lead Timeline Events endpoint

module.exports = async function handler(req, res) {
  const requestId = `lead_timeline_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const route = "api/admin/lead-timeline/[leadId]";

  // Log at start
  console.log("timeline_endpoint_start", { route, requestId, method: req.method });

  try {
    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-admin-token");

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

    // Auth guard: Accept either x-admin-token OR Authorization Bearer
    const adminToken = req.headers["x-admin-token"] || req.headers["X-Admin-Token"];
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const m = String(authHeader || "").match(/^Bearer\s+(.+)$/i);
    const jwt = m ? m[1] : null;
    
    // Check if admin token matches
    const adminTokenValid = adminToken && process.env.ADMIN_TOKEN && adminToken === process.env.ADMIN_TOKEN;
    const bearerTokenValid = !!jwt;
    
    if (!adminTokenValid && !bearerTokenValid) {
      return res.status(401).json({
        ok: false,
        error: "Missing authentication: provide either x-admin-token header or Authorization Bearer token",
        requestId,
      });
    }

    // Extract leadId from query
    const leadId = req.query.leadId;
    if (!leadId) {
      return res.status(400).json({
        ok: false,
        error: "Missing leadId parameter",
        requestId,
      });
    }

    // Dynamic import Supabase
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // GET: Fetch timeline events for lead
    if (req.method === "GET") {
      try {
        const { data, error } = await supabase
          .from("lead_timeline_events")
          .select("*")
          .eq("lead_id", leadId)
          .order("created_at", { ascending: false });

        if (error) {
          // Table might not exist
          if (error.code === "42P01" || error.message?.includes("does not exist")) {
            console.warn("[lead-timeline] Table lead_timeline_events does not exist", requestId);
            return res.status(200).json({
              ok: true,
              data: [],
              requestId,
              warning: "Table not found",
            });
          }
          throw error;
        }

        // Return events array (empty if none found)
        return res.status(200).json({
          ok: true,
          data: data || [],
          requestId,
        });
      } catch (err) {
        console.error("[lead-timeline] GET error", requestId, err);
        // Graceful fallback: return empty array instead of crashing
        return res.status(200).json({
          ok: true,
          data: [],
          requestId,
          warning: err?.message || "Failed to fetch",
        });
      }
    }

    // POST: Insert new timeline event
    if (req.method === "POST") {
      try {
        const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
        const { stage, note, payload } = body;

        // Validate required fields
        if (!stage || typeof stage !== "string") {
          return res.status(400).json({
            ok: false,
            error: "Missing or invalid 'stage' field",
            requestId,
          });
        }

        // Build insert payload
        const insertData = {
          lead_id: leadId,
          stage: String(stage),
          actor_role: "consultant",
          created_at: new Date().toISOString(),
        };

        // Optional fields
        if (note !== undefined && note !== null) {
          insertData.note = String(note);
        }
        if (payload !== undefined && payload !== null) {
          // Ensure payload is valid JSONB
          insertData.payload = typeof payload === "object" ? payload : {};
        }

        const { data, error } = await supabase
          .from("lead_timeline_events")
          .insert(insertData)
          .select()
          .single();

        if (error) {
          // Check if table doesn't exist
          if (error.code === "42P01" || error.message?.includes("does not exist")) {
            console.warn("[lead-timeline] Table lead_timeline_events does not exist", requestId);
            return res.status(200).json({
              ok: false,
              error: "TABLE_NOT_FOUND",
              message: "lead_timeline_events table does not exist. Please run migration.",
              requestId,
            });
          }
          throw error;
        }

        // PRO LEVEL: Auto-update lead status when timeline stage is set
        // Stage values match LEAD_STATUS values (single source of truth)
        // Valid stages: new_lead, contacted, qualified, consultation_scheduled, etc.
        const validStages = [
          'new_lead',
          'contacted',
          'qualified',
          'consultation_scheduled',
          'consultation_completed',
          'quote_sent',
          'deposit_paid',
          'appointment_set',
          'treatment_in_progress',
          'treatment_completed',
          'lost',
        ];
        
        if (validStages.includes(stage)) {
          try {
            const { error: updateError } = await supabase
              .from("leads")
              .update({ status: stage })
              .eq("id", leadId);
            
            if (updateError) {
              // Log but don't fail - timeline event was created successfully
              console.warn("[lead-timeline] Failed to update lead status", requestId, {
                leadId,
                stage,
                error: updateError.message,
              });
            } else {
              console.log("[lead-timeline] Auto-updated lead status", requestId, {
                leadId,
                stage,
              });
            }
          } catch (updateErr) {
            // Silent fail - timeline event is more important than status update
            console.warn("[lead-timeline] Error updating lead status", requestId, updateErr);
          }
        }

        return res.status(200).json({
          ok: true,
          data: data,
          requestId,
        });
      } catch (err) {
        console.error("[lead-timeline] POST error", requestId, err);
        return res.status(500).json({
          ok: false,
          error: "Failed to create timeline event",
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
    console.error("[lead-timeline] fatal", requestId, err);
    return res.status(500).json({
      ok: false,
      error: "Request failed (crash)",
      details: err && err.message ? err.message : String(err),
      requestId,
    });
  }
};

