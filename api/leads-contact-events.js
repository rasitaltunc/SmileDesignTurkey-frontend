// api/leads-contact-events.js
// GET /api/leads-contact-events?lead_id=xxx (list events)
// POST /api/leads-contact-events (add event)
// Auth: Bearer JWT or x-admin-token

const { createClient } = require("@supabase/supabase-js");

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-admin-token");
}

function getBearerToken(req) {
  const h = req.headers.authorization; // ✅ Node'da hep lowercase gelir
  if (!h) return null;

  const [type, token] = String(h).split(" ");
  if (!type || type.toLowerCase() !== "bearer") return null;
  return token || null;
}

function getAdminToken(req) {
  return (req.headers["x-admin-token"] || "").toString();
}

async function verifyAuth(req) {
  const bearerToken = getBearerToken(req);
  const adminToken = getAdminToken(req);
  const expectedAdminToken = process.env.ADMIN_TOKEN || "";

  // If admin token matches, allow
  if (expectedAdminToken && adminToken === expectedAdminToken) {
    return { authenticated: true, userId: null };
  }

  // If bearer token, verify with Supabase
  if (bearerToken) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return { authenticated: false, error: "Missing SUPABASE env" };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    try {
      const { data: { user }, error } = await supabase.auth.getUser(bearerToken);
      if (error || !user) {
        return { authenticated: false, error: "Invalid token" };
      }
      return { authenticated: true, userId: user.id };
    } catch (err) {
      return { authenticated: false, error: "Token verification failed" };
    }
  }

  return { authenticated: false, error: "No valid auth token" };
}

function pickString(v) {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return "";
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Verify auth (Bearer JWT or x-admin-token)
  const authResult = await verifyAuth(req);
  if (!authResult.authenticated) {
    return res.status(401).json({ error: authResult.error || "Invalid credentials" });
  }

  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  // Initialize Supabase client (service role)
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: "Missing SUPABASE env", requestId });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // GET: List contact events for a lead
    if (req.method === "GET") {
      const leadId = pickString(req.query?.lead_id || req.query?.leadId);
      const limit = parseInt(req.query?.limit || "5", 10);

      if (!leadId) {
        return res.status(400).json({ error: "Missing lead_id" });
      }

      const { data: events, error: eventsError } = await supabase
        .from("lead_contact_events")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false })
        .limit(Math.min(limit, 50)); // Cap at 50

      if (eventsError) {
        console.error("[leads-contact-events] Error fetching events:", eventsError, { requestId });
        return res.status(500).json({ 
          error: "Failed to fetch contact events",
          details: eventsError.message,
          hint: eventsError.message.includes("relation") ? "Table 'lead_contact_events' may not exist. Run migration: supabase/migration_lead_contact_events.sql" : eventsError.message,
          requestId,
        });
      }

      return res.status(200).json({ ok: true, events: events || [], requestId });
    }

    // POST: Add new contact event
    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      const leadId = pickString(body.lead_id || body.leadId);
      const channel = pickString(body.channel || "phone");
      const note = pickString(body.note || "");

      if (!leadId) {
        return res.status(400).json({ error: "Missing lead_id" });
      }

      // Validate channel
      const validChannels = ["phone", "whatsapp", "email", "sms", "other"];
      if (!validChannels.includes(channel)) {
        return res.status(400).json({ error: `Invalid channel. Must be one of: ${validChannels.join(", ")}` });
      }

      // Insert contact event
      const { data: event, error: insertError } = await supabase
        .from("lead_contact_events")
        .insert([
          {
            lead_id: leadId,
            channel: channel,
            note: note || null,
            created_by: authResult.userId || null,
          },
        ])
        .select("*")
        .single();

      if (insertError) {
        console.error("[leads-contact-events] Error inserting event:", insertError, { requestId });
        return res.status(500).json({ error: "Failed to create contact event", details: insertError.message, requestId });
      }

      // Update last_contacted_at and optionally status to "contacted"
      const updateData = {
        last_contacted_at: new Date().toISOString(),
      };
      
      // Optionally update status to "contacted" if not already in a later stage
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      const updateStatus = body.update_status !== false; // Default: true
      
      if (updateStatus) {
        // Get current lead status
        const { data: currentLead } = await supabase
          .from("leads")
          .select("status")
          .eq("id", leadId)
          .single();
        
        // Only update to "contacted" if status is "new" or null
        const currentStatus = (currentLead?.status || "").toLowerCase();
        if (currentStatus === "new" || !currentStatus) {
          updateData.status = "contacted";
        }
      }

      const { data: updatedLead, error: updateError } = await supabase
        .from("leads")
        .update(updateData)
        .eq("id", leadId)
        .select("id, last_contacted_at, status")
        .single();

      if (updateError) {
        console.error("[leads-contact-events] Error updating lead:", updateError, { requestId });
        // Don't fail - event was created successfully
      }

      return res.status(200).json({ 
        ok: true, 
        event,
        lead: updatedLead || null,
        requestId,
      });
    }

    return res.status(405).json({ error: "Method not allowed", requestId });
  } catch (error) {
    console.error("[leads-contact-events] Unhandled error:", error, { requestId });
    return res.status(500).json({ error: "Internal server error", details: error.message, requestId });
  }
};

