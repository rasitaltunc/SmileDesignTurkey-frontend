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

// ✅ UUID validation (kalıcı fix: UUID değilse UUID kolonuna asla dokunma)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(v) {
  if (!v) return false;
  return UUID_RE.test(String(v).trim());
}

// ✅ Safe resolver: returns { id: TEXT, lead_uuid: UUID } or null
async function resolveLeadRow(supabase, anyId) {
  const v = String(anyId || "").trim();
  if (!v) return null;

  // v UUID ise lead_uuid kolonu; değilse id (text) kolonu
  const q = isUuid(v)
    ? supabase.from("leads").select("id, lead_uuid").eq("lead_uuid", v).maybeSingle()
    : supabase.from("leads").select("id, lead_uuid").eq("id", v).maybeSingle();

  const { data, error } = await q;
  if (error) {
    console.warn("[leads-contact-events] Failed to resolve:", v, error?.message);
    return null;
  }
  return data || null; // ✅ Return { id: TEXT, lead_uuid: UUID }
}

module.exports = async function handler(req, res) {
  const requestId = `contact_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  try {
    setCors(res);

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    // Verify auth (Bearer JWT or x-admin-token)
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated) {
      return res.status(401).json({ ok: false, error: authResult.error || "Invalid credentials", requestId });
    }

    // Initialize Supabase client (service role)
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ ok: false, error: "Missing SUPABASE env", requestId });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // ✅ Accept both leadId/lead_id and leadUuid/lead_uuid from query or body
    const body = (req.body && typeof req.body === "object") ? req.body : {};

    const leadId =
      (req.query?.lead_id ? String(req.query.lead_id) : null) ||
      (req.query?.leadId ? String(req.query.leadId) : null) ||
      (body.lead_id ? String(body.lead_id) : null) ||
      (body.leadId ? String(body.leadId) : null);

    const leadUuid =
      (req.query?.lead_uuid ? String(req.query.lead_uuid) : null) ||
      (req.query?.leadUuid ? String(req.query.leadUuid) : null) ||
      (body.lead_uuid ? String(body.lead_uuid) : null) ||
      (body.leadUuid ? String(body.leadUuid) : null);

    if (!leadId && !leadUuid) {
      return res.status(400).json({
        ok: false,
        error: "Missing lead_id/leadId or lead_uuid/leadUuid",
        requestId,
      });
    }

    // ✅ Resolve to TEXT lead_id: if leadId provided, use it; else resolve leadUuid to id
    let resolvedLeadIdText = null;
    if (leadId) {
      resolvedLeadIdText = String(leadId).trim();
    } else if (leadUuid) {
      const leadRow = await resolveLeadRow(supabase, leadUuid);
      if (!leadRow) {
        return res.status(400).json({ 
          ok: false,
          error: "Invalid lead_uuid: not found", 
          requestId 
        });
      }
      resolvedLeadIdText = leadRow.id; // ✅ Use id (TEXT column)
    }

    if (!resolvedLeadIdText) {
      return res.status(400).json({ 
        ok: false,
        error: "Could not resolve lead ID", 
        requestId 
      });
    }

    // GET: List contact events for a lead
    if (req.method === "GET") {
      const limit = parseInt(req.query?.limit || "5", 10);

      const { data: events, error: eventsError } = await supabase
        .from("lead_contact_events")
        .select("*")
        .eq("lead_id", resolvedLeadIdText) // ✅ resolvedLeadIdText is TEXT (id column)
        .order("created_at", { ascending: false })
        .limit(Math.min(limit, 50)); // Cap at 50

      if (eventsError) {
        console.error("[leads-contact-events] Error fetching events:", eventsError, { requestId });
        return res.status(500).json({ 
          ok: false,
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
      const channel = pickString(body.channel || "phone");
      const note = pickString(body.note || "");

      // Validate channel
      const validChannels = ["phone", "whatsapp", "email", "sms", "other"];
      if (!validChannels.includes(channel)) {
        return res.status(400).json({ ok: false, error: `Invalid channel. Must be one of: ${validChannels.join(", ")}`, requestId });
      }

      // Insert contact event
      const { data: event, error: insertError } = await supabase
        .from("lead_contact_events")
        .insert([
          {
            lead_id: resolvedLeadIdText, // ✅ resolvedLeadIdText is TEXT (id column)
            channel: channel,
            note: note || null,
            created_by: authResult.userId || null,
          },
        ])
        .select("*")
        .single();

      if (insertError) {
        console.error("[leads-contact-events] Error inserting event:", insertError, { requestId });
        return res.status(500).json({ ok: false, error: "Failed to create contact event", details: insertError.message, requestId });
      }

      // Update last_contacted_at and optionally status to "contacted"
      const updateData = {
        last_contacted_at: new Date().toISOString(),
      };
      
      // Optionally update status to "contacted" if not already in a later stage
      const updateStatus = body.update_status !== false; // Default: true
      
      if (updateStatus) {
        // Get current lead status
        const { data: currentLead } = await supabase
          .from("leads")
          .select("status")
          .eq("id", resolvedLeadIdText)
          .maybeSingle();
        
        // Only update to "contacted" if status is "new" or null
        const currentStatus = (currentLead?.status || "").toLowerCase();
        if (currentStatus === "new" || !currentStatus) {
          updateData.status = "contacted";
        }
      }

      // Update lead using resolved TEXT id
      const { data: updatedLead, error: updateError } = await supabase
        .from("leads")
        .update(updateData)
        .eq("id", resolvedLeadIdText) // ✅ Use id (TEXT) for update
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

    return res.status(405).json({ ok: false, error: "Method not allowed", requestId });
  } catch (err) {
    console.error("[leads-contact-events] crash", err, { requestId });
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Server error",
      requestId,
    });
  }
};


