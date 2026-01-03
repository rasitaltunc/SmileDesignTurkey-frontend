// api/admin/lead-tasks/[leadId].js (PURE CJS — no TS, no export)
// Sprint B5: Lead AI Tasks endpoint

module.exports = async function handler(req, res) {
  const requestId = `lead_tasks_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const route = "api/admin/lead-tasks/[leadId]";

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

    // Extract leadId from query (support both leadId and id for flexibility)
    const leadId = req.query.leadId || req.query.id;
    if (!leadId) {
      return res.status(400).json({
        ok: false,
        error: "MISSING_LEAD_ID",
        requestId,
      });
    }

    // Dynamic import Supabase
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // GET: Fetch tasks for lead
    if (req.method === "GET") {
      try {
        const { data, error } = await supabase
          .from("lead_ai_tasks")
          .select("*")
          .eq("lead_id", leadId)
          .order("priority", { ascending: false }) // hot > warm > cool
          .order("created_at", { ascending: false });

        if (error) {
          // Check if table doesn't exist
          if (error.code === "42P01" || error.message?.includes("does not exist")) {
            console.warn("[lead-tasks] Table lead_ai_tasks does not exist", requestId);
            return res.status(200).json({
              ok: true,
              tasks: [],
              requestId,
              warning: "Table not found",
            });
          }
          throw error;
        }

        return res.status(200).json({
          ok: true,
          tasks: data || [],
          requestId,
        });
      } catch (err) {
        console.error("[lead-tasks] GET error", requestId, err);
        // Graceful fallback: return empty array
        return res.status(200).json({
          ok: true,
          tasks: [],
          requestId,
          warning: err?.message || "Failed to fetch",
        });
      }
    }

    // POST: Create or update task
    if (req.method === "POST") {
      try {
        const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
        const { action, taskId, task } = body;

        // Mark task as done
        if (action === "mark_done" && taskId) {
          const { data, error } = await supabase
            .from("lead_ai_tasks")
            .update({
              status: "done",
              updated_at: new Date().toISOString(),
            })
            .eq("id", taskId)
            .eq("lead_id", leadId)
            .select()
            .single();

          if (error) {
            if (error.code === "42P01" || error.message?.includes("does not exist")) {
              return res.status(200).json({
                ok: false,
                error: "TABLE_NOT_FOUND",
                message: "lead_ai_tasks table does not exist. Please run migration.",
                requestId,
              });
            }
            throw error;
          }

          return res.status(200).json({
            ok: true,
            task: data,
            requestId,
          });
        }

        // Create new task (manual)
        if (action === "create" && task) {
          const newTask = {
            lead_id: leadId,
            type: task.type || "follow_up",
            title: task.title || "Untitled Task",
            description: task.description || null,
            priority: task.priority || "warm",
            due_at: task.dueAt || null,
            status: "open",
            source: "manual",
          };

          // Validate
          if (!newTask.title.trim()) {
            return res.status(400).json({
              ok: false,
              error: "Task title is required",
              requestId,
            });
          }

          const { data, error } = await supabase
            .from("lead_ai_tasks")
            .insert(newTask)
            .select()
            .single();

          if (error) {
            if (error.code === "42P01" || error.message?.includes("does not exist")) {
              return res.status(200).json({
                ok: false,
                error: "TABLE_NOT_FOUND",
                message: "lead_ai_tasks table does not exist. Please run migration.",
                requestId,
              });
            }
            throw error;
          }

          return res.status(200).json({
            ok: true,
            task: data,
            requestId,
          });
        }

        return res.status(400).json({
          ok: false,
          error: "Invalid action or missing parameters",
          requestId,
        });
      } catch (err) {
        console.error("[lead-tasks] POST error", requestId, err);
        return res.status(500).json({
          ok: false,
          error: "Failed to process task",
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
    console.error("[lead-tasks] fatal", requestId, err);
    return res.status(500).json({
      ok: false,
      error: "Request failed (crash)",
      details: err && err.message ? err.message : String(err),
      requestId,
    });
  }
};

