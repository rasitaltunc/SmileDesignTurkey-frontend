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
    
    function getBearerToken(req) {
      const h = req.headers.authorization; // ✅ Node'da hep lowercase gelir
      if (!h) return null;

      const [type, token] = String(h).split(" ");
      if (!type || type.toLowerCase() !== "bearer") return null;
      return token || null;
    }
    
    const jwt = getBearerToken(req);
    
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

    // ✅ Extract leadId from query - accept both leadId (route param) and lead_uuid (query param)
    const leadIdFromRoute = req.query.leadId || null;
    const leadUuidFromQuery = req.query.lead_uuid ? String(req.query.lead_uuid).trim() : null;
    const leadIdRaw = leadUuidFromQuery || leadIdFromRoute;
    
    if (!leadIdRaw) {
      return res.status(400).json({
        ok: false,
        error: "Missing leadId or lead_uuid parameter",
        requestId,
      });
    }

    // Dynamic import Supabase (needed for UUID resolution)
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // ✅ UUID validation helper
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    function isUuid(v) {
      if (!v) return false;
      return UUID_RE.test(String(v).trim());
    }

    // ✅ Resolve lead_uuid to UUID if needed
    let leadId = String(leadIdRaw).trim();
    if (!isUuid(leadId)) {
      // Try to resolve from leads table
      try {
        const { data, error } = await supabase
          .from("leads")
          .select("id")
          .eq("lead_uuid", leadId)
          .maybeSingle();
        
        if (error || !data) {
          return res.status(400).json({
            ok: false,
            error: "Invalid leadId: not found or cannot resolve to UUID",
            requestId,
          });
        }
        
        leadId = data.id;
      } catch (err) {
        return res.status(400).json({
          ok: false,
          error: "Failed to resolve leadId to UUID",
          requestId,
        });
      }
    }

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

        const { data: insertedEvent, error } = await supabase
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

        // PRO LEVEL: Auto-update lead status when timeline stage is set (single source of truth)
        // Stage values match DB constraint: CHECK (status IN ('new', 'contacted', 'deposit_paid', 'appointment_set', 'arrived', 'completed', 'lost'))
        // Valid stages: DB canonical values only
        const validStages = [
          'new',
          'contacted',
          'deposit_paid',
          'appointment_set',
          'arrived',
          'completed',
          'lost',
        ];
        
        let updatedLead = null;
        let leadUpdateError = null;
        
        if (validStages.includes(stage)) {
          // After inserting timeline event successfully, update lead status
          console.log("[lead-timeline] Updating lead status", { requestId, leadId, stage });
          const { data: updatedLeadData, error: leadUpdateErr } = await supabase
            .from("leads")
            .update({
              status: stage, // e.g. "deposit_paid"
              updated_at: new Date().toISOString(),
            })
            .eq("id", leadId)
            .select("id,status,updated_at")
            .single();

          if (leadUpdateErr) {
            leadUpdateError = leadUpdateErr;
            console.error("LEAD_STATUS_UPDATE_ERROR", { requestId, leadId, stage, leadUpdateError });
          } else {
            updatedLead = updatedLeadData;
            console.log("[lead-timeline] ✅ Auto-updated lead status", requestId, {
              leadId,
              stage,
              updatedStatus: updatedLead?.status,
              updatedAt: updatedLead?.updated_at,
            });
          }
        } else {
          console.warn("[lead-timeline] Stage not in validStages, skipping lead update", { requestId, leadId, stage, validStages });
        }

        return res.status(200).json({
          ok: true,
          requestId,
          data: {
            event: insertedEvent,
            lead: updatedLead || null,
          },
          warning: leadUpdateError ? "LEAD_STATUS_UPDATE_FAILED" : undefined,
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

