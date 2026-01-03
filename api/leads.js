// api/leads.js
const { createClient } = require("@supabase/supabase-js");

function getBearerToken(req) {
  const h = req.headers["authorization"] || req.headers["Authorization"];
  if (!h) return null;
  const parts = String(h).split(" ");
  if (parts.length === 2 && parts[0].toLowerCase() === "bearer") return parts[1];
  return null;
}

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return res.status(500).json({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
  }

  // ✅ Anon key with fallback
  const anonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    "";

  if (!anonKey) {
    return res.status(500).json({ error: "Missing SUPABASE_ANON_KEY (or VITE_SUPABASE_ANON_KEY)" });
  }

  // ✅ JWT-based auth
  const jwt = getBearerToken(req);
  if (!jwt) return res.status(401).json({ error: "Missing Authorization Bearer token" });

  // DEBUG header (verify handler execution)
  res.setHeader("x-sdt-api", "leads-v1");

  // auth-bound client (uses caller JWT for auth checks)
  const authClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Verify user via authClient
  const { data: userData, error: userErr } = await authClient.auth.getUser();
  if (userErr || !userData?.user) return res.status(401).json({ error: "Invalid session" });

  const user = userData.user;

  // DB client (service role) - used for DB operations (RLS bypass)
  const dbClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ✅ Role from profiles table (service-role bypasses RLS, more reliable than RPC)
  const { data: prof, error: profErr } = await dbClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profErr) {
    return res.status(500).json({ error: "Failed to read profile role", details: profErr.message });
  }

  // ✅ Normalize role (might be "Admin", "ADMIN", with spaces, etc.)
  const roleRaw = prof?.role;
  const role = String(prof?.role || "").trim().toLowerCase();
  const isAdmin = role === "admin";
  const isEmployee = role === "employee";

  // 🔒 Leads are ONLY for admin/employee
  if (!isAdmin && !isEmployee) {
    return res.status(403).json({ error: "Forbidden: leads access is admin/employee only" });
  }

  // GET /api/leads
  if (req.method === "GET") {
    const { status } = req.query || {};
    const limit = Math.min(parseInt(req.query?.limit || "200", 10) || 200, 500);

    let q = dbClient.from("leads").select("*").order("created_at", { ascending: false }).limit(limit);

    if (status && status !== "all") q = q.eq("status", status);

    // employee sees only assigned leads
    if (isEmployee) q = q.eq("assigned_to", user.id);

    const { data, error } = await q;
    if (error) return res.status(500).json({ error: error.message });
    // TEMP DEBUG: role bilgisini response'a ekle
    return res.status(200).json({ leads: data, debug: { roleRaw, role, uid: user.id, email: user.email } });
  }

  // PATCH /api/leads
  if (req.method === "PATCH") {
    try {
      const body = req.body || {};
      const id = body.id || body.lead_id;
      const lead_uuid = body.lead_uuid;

      const updates = body.updates ? { ...body.updates } : { ...body };
      delete updates.id;
      delete updates.lead_id;
      delete updates.lead_uuid;

      if (!id && !lead_uuid) return res.status(400).json({ error: "Missing id or lead_uuid" });
      if (!Object.keys(updates).length) return res.status(400).json({ error: "No updates provided" });

      // ✅ Admin: her şeyi yapabilir; Employee: assignment alanlarını değiştiremez
      const allowedForAll = [
        "status",
        "notes",
        "follow_up_at",
        "next_action",
        "contacted_at",
        "patient_id",
      ];

      const allowedForAdminExtra = [
        "assigned_to",
        "assigned_at",
        "assigned_by",
      ];

      const allowed = isAdmin ? [...allowedForAll, ...allowedForAdminExtra] : allowedForAll;

      const filtered = Object.fromEntries(
        Object.entries(updates).filter(([k]) => allowed.includes(k))
      );

      if (Object.keys(filtered).length === 0) {
        return res.status(400).json({ error: "No allowed fields to update" });
      }

      // 🔒 Only admin can change assignment
      let assignedToChanged = false;
      let previousAssignedTo = null;
      let newAssignedTo = null;
      
      if (Object.prototype.hasOwnProperty.call(filtered, "assigned_to")) {
        if (!isAdmin) {
          return res.status(403).json({
            error: "Only admins can change assigned_to",
            debug: { roleRaw, role, uid: user.id, email: user.email }
          });
        }

        // Get previous assigned_to before update
        const leadIdForQuery = id || lead_uuid;
        if (leadIdForQuery) {
          const { data: existingLead } = await dbClient
            .from("leads")
            .select("assigned_to")
            .eq(id ? "id" : "lead_uuid", leadIdForQuery)
            .single();
          
          previousAssignedTo = existingLead?.assigned_to || null;
          newAssignedTo = filtered.assigned_to || null;
          
          // Only create timeline event if assignment actually changed
          assignedToChanged = previousAssignedTo !== newAssignedTo;
        }

        // prevent spoofing
        filtered.assigned_by = user.id;
        filtered.assigned_at = new Date().toISOString();
      }

      // ✅ UPDATE query: limit yok, single ile net
      let q = dbClient
        .from("leads")
        .update(filtered)
        .select("*");

      if (isEmployee) q = q.eq("assigned_to", user.id);

      q = id ? q.eq("id", id) : q.eq("lead_uuid", lead_uuid);

      const { data, error } = await q.single();

      if (error) {
        return res.status(500).json({ error: error.message, hint: error.hint || null });
      }

      // ✅ Create timeline event if assignment changed
      if (assignedToChanged && data) {
        try {
          const leadIdForTimeline = data.id || id || lead_uuid;
          
          // Get employee name if assigned
          let employeeName = "Unassigned";
          if (newAssignedTo) {
            const { data: employeeData } = await dbClient
              .from("profiles")
              .select("full_name")
              .eq("id", newAssignedTo)
              .single();
            
            employeeName = employeeData?.full_name || `Employee ${newAssignedTo.slice(0, 8)}`;
          }

          // Insert timeline event
          const timelineNote = newAssignedTo 
            ? `Assigned to ${employeeName}`
            : "Unassigned";
          
          await dbClient
            .from("lead_timeline_events")
            .insert({
              lead_id: leadIdForTimeline,
              stage: "contacted", // Use existing stage or create "assigned" if needed
              actor_role: "consultant",
              note: timelineNote,
              payload: {
                assigned_to: newAssignedTo,
                assigned_by: user.id,
                assigned_at: filtered.assigned_at,
              },
              created_at: new Date().toISOString(),
            });
        } catch (timelineErr) {
          // Don't fail the update if timeline insert fails
          console.warn("[Leads PATCH] Timeline event insert failed:", timelineErr);
        }
      }

      // ✅ Create timeline event if next_action changed
      const nextActionChanged = Object.prototype.hasOwnProperty.call(filtered, "next_action");
      if (nextActionChanged && data) {
        try {
          const leadIdForTimeline = data.id || id || lead_uuid;
          const newNextAction = filtered.next_action;
          const actionLabels: Record<string, string> = {
            send_whatsapp: "Send WhatsApp",
            request_photos: "Request photos",
            doctor_review: "Doctor review",
            offer_sent: "Offer sent",
            book_call: "Book call",
          };
          
          const actionLabel = newNextAction ? (actionLabels[newNextAction] || newNextAction) : "No action";
          const timelineNote = `Next action: ${actionLabel}`;
          
          await dbClient
            .from("lead_timeline_events")
            .insert({
              lead_id: leadIdForTimeline,
              stage: data.status || "contacted",
              actor_role: "consultant",
              note: timelineNote,
              payload: {
                next_action: newNextAction,
              },
              created_at: new Date().toISOString(),
            });
        } catch (timelineErr) {
          console.warn("[Leads PATCH] Timeline event insert failed for next_action:", timelineErr);
        }
      }

      // ✅ Create timeline event if follow_up_at changed
      const followUpChanged = Object.prototype.hasOwnProperty.call(filtered, "follow_up_at");
      if (followUpChanged && data) {
        try {
          const leadIdForTimeline = data.id || id || lead_uuid;
          const newFollowUpAt = filtered.follow_up_at;
          
          const timelineNote = newFollowUpAt 
            ? `Follow-up scheduled: ${new Date(newFollowUpAt).toLocaleString()}`
            : "Follow-up removed";
          
          await dbClient
            .from("lead_timeline_events")
            .insert({
              lead_id: leadIdForTimeline,
              stage: data.status || "contacted",
              actor_role: "consultant",
              note: timelineNote,
              payload: {
                follow_up_at: newFollowUpAt,
              },
              created_at: new Date().toISOString(),
            });
        } catch (timelineErr) {
          console.warn("[Leads PATCH] Timeline event insert failed for follow_up_at:", timelineErr);
        }
      }

      return res.status(200).json({ lead: data });
    } catch (e) {
      return res.status(500).json({ error: e?.message || "Server error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
};
