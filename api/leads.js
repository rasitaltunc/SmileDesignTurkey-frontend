// api/leads.js
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

// ✅ Status normalization (sigorta - hata tekrar asla çıkmasın)
const STATUS_MAP = {
  new_lead: "new",
  appointment: "appointment_set",
  deposit: "deposit_paid",
};

const VALID_STATUSES = new Set([
  "new",
  "contacted",
  "deposit_paid",
  "appointment_set",
  "arrived",
  "completed",
  "lost",
]);

function normalizeStatus(input) {
  if (input === null || input === undefined) return null;
  const raw = String(input).trim().toLowerCase();
  if (!raw) return null;
  const mapped = STATUS_MAP[raw] || raw;
  return VALID_STATUSES.has(mapped) ? mapped : "new"; // ✅ safe fallback
}

function getBearerToken(req) {
  const h = req.headers.authorization; // ✅ Node'da hep lowercase gelir
  if (!h) return null;

  const [type, token] = String(h).split(" ");
  if (!type || type.toLowerCase() !== "bearer") return null;
  return token || null;
}

module.exports = async function handler(req, res) {
  const requestId = `leads_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  // ✅ Version tracking headers (her response'da görünsün)
  res.setHeader("x-sdt-api", "leads-vNEXT"); // her bugfixte bunu arttır
  res.setHeader("x-sdt-commit", process.env.VERCEL_GIT_COMMIT_SHA || "unknown");
  res.setHeader("x-request-id", requestId);

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      return res.status(500).json({ ok: false, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY", requestId });
    }

    const jwt = getBearerToken(req);
    if (!jwt) return res.status(401).json({ ok: false, error: "Missing Authorization Bearer token", requestId });

    // ✅ Tek client: service role
    const dbClient = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // ✅ JWT doğrulama artık anon key istemiyor
    const { data: userData, error: userErr } = await dbClient.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return res.status(401).json({ ok: false, error: "Invalid session", details: userErr?.message, requestId });
    }

    const user = userData.user;

    // role çek
    const { data: prof, error: profErr } = await dbClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profErr) {
      return res.status(500).json({ ok: false, error: "Failed to read profile role", details: profErr.message, requestId });
    }

    const role = String(prof?.role || "").trim().toLowerCase();
    const isAdmin = role === "admin";
    const isEmployee = role === "employee";
    const isDoctor = role === "doctor";
    if (!isAdmin && !isEmployee && !isDoctor) {
      return res.status(403).json({ ok: false, error: "Forbidden: leads access is admin/employee/doctor only", requestId });
    }

    // GET /api/leads
    if (req.method === "GET") {
      const id = req.query?.id;

      // ✅ Safe status filter: normalize and validate, never error
      const statusRaw = String(req.query?.status ?? "all").toLowerCase();
      let statusFilter = null;
      if (statusRaw && statusRaw !== "all") {
        const mapped = STATUS_MAP[statusRaw] || statusRaw;
        if (VALID_STATUSES.has(mapped)) statusFilter = mapped;
        // If invalid, treat as "all" (no filter) - never error
      }

      const limit = Math.min(parseInt(req.query?.limit || "200", 10) || 200, 500);

      let q = dbClient.from("leads").select("*").order("created_at", { ascending: false }).limit(limit);

      // ✅ Support id parameter for single lead fetch
      if (id) q = q.eq("id", id).limit(1);

      if (statusFilter) q = q.eq("status", statusFilter);

      // employee sees only assigned leads
      if (isEmployee) q = q.eq("assigned_to", user.id);
      
      // doctor sees only leads assigned to them
      if (isDoctor) q = q.eq("doctor_id", user.id);

      const { data, error } = await q;
      if (error) return res.status(500).json({ ok: false, error: error.message, requestId });

      // ✅ If id parameter provided, return single lead format
      if (id) {
        return res.status(200).json({ ok: true, lead: data?.[0] || null, leads: data || [], requestId });
      }

      return res.status(200).json({ ok: true, leads: data || [], requestId });
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

        if (!id && !lead_uuid) return res.status(400).json({ ok: false, error: "Missing id or lead_uuid", requestId });
        if (!Object.keys(updates).length) return res.status(400).json({ ok: false, error: "No updates provided", requestId });

        // ✅ Admin: her şeyi yapabilir; Employee: assignment alanlarını değiştiremez; Doctor: sadece review alanları
        const allowedForAll = [
          "status",
          "notes",
          "follow_up_at",
          "next_action",
          "contacted_at",
          "patient_id",
          "doctor_id", // ✅ Admin/employee can assign doctor
        ];

        const allowedForAdminExtra = [
          "assigned_to",
          "assigned_at",
          "assigned_by",
        ];

        const allowedForDoctor = [
          "doctor_review_status",
          "doctor_review_notes",
        ];

        let allowed;
        if (isDoctor) {
          allowed = allowedForDoctor;
        } else if (isAdmin) {
          allowed = [...allowedForAll, ...allowedForAdminExtra];
        } else {
          allowed = allowedForAll;
        }

        const filtered = Object.fromEntries(
          Object.entries(updates).filter(([k]) => allowed.includes(k))
        );

        // ✅ Doctor can only update review fields - reject if other fields are sent
        if (isDoctor) {
          const disallowedFields = Object.keys(updates).filter((k) => !allowed.includes(k));
          if (disallowedFields.length > 0) {
            return res.status(403).json({ 
              ok: false, 
              error: `Doctor can only update doctor_review_status and doctor_review_notes. Disallowed fields: ${disallowedFields.join(", ")}`, 
              requestId 
            });
          }
        }

        if (Object.keys(filtered).length === 0) {
          return res.status(400).json({ ok: false, error: "No allowed fields to update", requestId });
        }

        // ✅ Status normalization (sigorta - hata tekrar asla çıkmasın)
        if (filtered.status) {
          filtered.status = normalizeStatus(filtered.status);
        }

        // 🔒 Only admin can change assignment
        let assignedToChanged = false;
        let previousAssignedTo = null;
        let newAssignedTo = null;
        
        if (Object.prototype.hasOwnProperty.call(filtered, "assigned_to")) {
          if (!isAdmin) {
            return res.status(403).json({
              ok: false,
              error: "Only admins can change assigned_to",
              requestId
            });
          }

          // Get previous assigned_to before update
          const leadIdForQuery = id || lead_uuid;
          if (leadIdForQuery) {
            const { data: existingLead } = await dbClient
              .from("leads")
              .select("assigned_to, status")
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

        // ✅ Doctor assignment: admin/employee can assign doctor
        let doctorIdChanged = false;
        let previousDoctorId = null;
        let newDoctorId = null;
        
        if (Object.prototype.hasOwnProperty.call(filtered, "doctor_id")) {
          // Get previous doctor_id before update
          const leadIdForQuery = id || lead_uuid;
          if (leadIdForQuery) {
            const { data: existingLead } = await dbClient
              .from("leads")
              .select("doctor_id")
              .eq(id ? "id" : "lead_uuid", leadIdForQuery)
              .single();
            
            previousDoctorId = existingLead?.doctor_id || null;
            newDoctorId = filtered.doctor_id || null;
            
            // Only create timeline event if assignment actually changed
            doctorIdChanged = previousDoctorId !== newDoctorId;
          }

          // Auto-set doctor_assigned_at and doctor_assigned_by
          filtered.doctor_assigned_at = new Date().toISOString();
          filtered.doctor_assigned_by = user.id;
        }

        // ✅ Get existing lead before update (for status normalization)
        const leadIdForQuery = id || lead_uuid;
        let existingLead = null;
        if (leadIdForQuery) {
          const { data: existingLeadData } = await dbClient
            .from("leads")
            .select("status")
            .eq(id ? "id" : "lead_uuid", leadIdForQuery)
            .single();
          existingLead = existingLeadData;
        }
        
        // ✅ Normalize existing status (DB'de bozuk status varsa düzelt)
        const existingStatus = normalizeStatus(existingLead?.status) || "new";

        // ✅ UPDATE query: limit yok, single ile net
        let q = dbClient
          .from("leads")
          .update(filtered)
          .select("*");

        // Apply role-based filters BEFORE await
        if (isEmployee) q = q.eq("assigned_to", user.id);
        if (isDoctor) q = q.eq("doctor_id", user.id);

        // Apply ID filter
        q = id ? q.eq("id", id) : q.eq("lead_uuid", lead_uuid);

        // Execute query AFTER all filters are applied
        const { data: updatedLead, error: updErr } = await q.single();

        if (updErr) {
          return res.status(500).json({ ok: false, error: updErr.message, hint: updErr.hint || null, requestId });
        }

        // ✅ Create timeline event if assignment changed
        if (assignedToChanged && updatedLead) {
          try {
            const leadIdForTimeline = updatedLead.id || id || lead_uuid;
            
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
            
            // ✅ Use normalized status for timeline stage (safe fallback chain)
            // ✅ Use normalized status for timeline stage (safe fallback chain)
            const stageForTimeline = normalizeStatus(filtered.status ?? updatedLead?.status ?? existingStatus) || "new";
            
            await dbClient
              .from("lead_timeline_events")
              .insert({
                lead_id: leadIdForTimeline,
                stage: stageForTimeline,
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
            console.warn("[Leads PATCH] Timeline event insert failed:", timelineErr, { requestId });
          }
        }

        // ✅ Create timeline event if next_action changed
        const nextActionChanged = Object.prototype.hasOwnProperty.call(filtered, "next_action");
        if (nextActionChanged && updatedLead) {
          try {
            const leadIdForTimeline = updatedLead.id || id || lead_uuid;
            const newNextAction = filtered.next_action;
            const actionLabels = {
              send_whatsapp: "Send WhatsApp",
              request_photos: "Request photos",
              doctor_review: "Doctor review",
              offer_sent: "Offer sent",
              book_call: "Book call",
            };
            
            const actionLabel = newNextAction ? (actionLabels[newNextAction] || newNextAction) : "No action";
            const timelineNote = `Next action: ${actionLabel}`;
            
            // ✅ Use normalized status for timeline stage (safe fallback chain)
            const stageForTimeline = normalizeStatus(filtered.status ?? updatedLead?.status ?? existingStatus) || "new";
            
            await dbClient
              .from("lead_timeline_events")
              .insert({
                lead_id: leadIdForTimeline,
                stage: stageForTimeline,
                actor_role: "consultant",
                note: timelineNote,
                payload: {
                  next_action: newNextAction,
                },
                created_at: new Date().toISOString(),
              });
          } catch (timelineErr) {
            console.warn("[Leads PATCH] Timeline event insert failed for next_action:", timelineErr, { requestId });
          }
        }

        // ✅ Create timeline event if follow_up_at changed
        const followUpChanged = Object.prototype.hasOwnProperty.call(filtered, "follow_up_at");
        if (followUpChanged && updatedLead) {
          try {
            const leadIdForTimeline = updatedLead.id || id || lead_uuid;
            const newFollowUpAt = filtered.follow_up_at;
            
            const timelineNote = newFollowUpAt 
              ? `Follow-up scheduled: ${new Date(newFollowUpAt).toLocaleString()}`
              : "Follow-up removed";
            
            // ✅ Use normalized status for timeline stage (safe fallback chain)
            const stageForTimeline = normalizeStatus(filtered.status ?? updatedLead?.status ?? existingStatus) || "new";
            
            await dbClient
              .from("lead_timeline_events")
              .insert({
                lead_id: leadIdForTimeline,
                stage: stageForTimeline,
                actor_role: "consultant",
                note: timelineNote,
                payload: {
                  follow_up_at: newFollowUpAt,
                },
                created_at: new Date().toISOString(),
              });
          } catch (timelineErr) {
            console.warn("[Leads PATCH] Timeline event insert failed for follow_up_at:", timelineErr, { requestId });
          }
        }

        // ✅ Create timeline event if doctor_id changed
        if (doctorIdChanged && updatedLead) {
          try {
            const leadIdForTimeline = updatedLead.id || id || lead_uuid;
            
            // Get doctor name if assigned
            let doctorName = "Unassigned";
            if (newDoctorId) {
              const { data: doctorData } = await dbClient
                .from("profiles")
                .select("full_name")
                .eq("id", newDoctorId)
                .single();
              
              doctorName = doctorData?.full_name || `Doctor ${newDoctorId.slice(0, 8)}`;
            }

            // Insert timeline event
            const timelineNote = newDoctorId 
              ? `Assigned doctor ${doctorName}`
              : "Doctor unassigned";
            
            // ✅ Use normalized status for timeline stage (safe fallback chain)
            const stageForTimeline = normalizeStatus(filtered.status ?? updatedLead?.status ?? existingStatus) || "new";
            
            await dbClient
              .from("lead_timeline_events")
              .insert({
                lead_id: leadIdForTimeline,
                stage: stageForTimeline,
                actor_role: "consultant",
                note: timelineNote,
                payload: {
                  doctor_id: newDoctorId,
                  doctor_assigned_by: user.id,
                  doctor_assigned_at: filtered.doctor_assigned_at,
                },
                created_at: new Date().toISOString(),
              });
          } catch (timelineErr) {
            // Don't fail the update if timeline insert fails
            console.warn("[Leads PATCH] Timeline event insert failed for doctor_id:", timelineErr, { requestId });
          }
        }

        // ✅ 3) DOCTOR REVIEW AUTOMATION (doctor only, after timeline events)
        const reviewStatusChanged = Object.prototype.hasOwnProperty.call(filtered, "doctor_review_status");
        if (reviewStatusChanged && isDoctor && updatedLead) {
          try {
            const newReviewStatus = filtered.doctor_review_status;
            let autoNextAction = null;
            let timelineNote = "";

            if (newReviewStatus === "approved_for_booking") {
              autoNextAction = "ready_for_booking";
              timelineNote = "Doctor approved for booking";
            } else if (newReviewStatus === "needs_info") {
              autoNextAction = "request_photos";
              timelineNote = "Doctor requested more info";
            }

            // Auto-update next_action if review status requires it
            if (autoNextAction) {
              const { data: leadWithAction, error: actionErr } = await dbClient
                .from("leads")
                .update({ next_action: autoNextAction })
                .eq("id", updatedLead.id)
                .select("next_action, status")
                .single();
              
              // Update local data for response
              if (leadWithAction && !actionErr) {
                updatedLead.next_action = leadWithAction.next_action;
                // Also update status if it changed
                if (leadWithAction.status) {
                  updatedLead.status = leadWithAction.status;
                }
              }
            }

            // Create timeline event for review status change
            if (timelineNote) {
              const leadIdForTimeline = updatedLead.id || id || lead_uuid;
              const stageForTimeline = normalizeStatus(updatedLead.status ?? existingStatus) || "new";
              
              await dbClient
                .from("lead_timeline_events")
                .insert({
                  lead_id: leadIdForTimeline,
                  stage: stageForTimeline,
                  actor_role: "doctor",
                  note: timelineNote,
                  payload: {
                    doctor_review_status: newReviewStatus,
                    next_action: autoNextAction,
                  },
                  created_at: new Date().toISOString(),
                });
            }
          } catch (reviewErr) {
            console.warn("[Leads PATCH] Doctor review automation failed:", reviewErr, { requestId });
          }
        }

        // ✅ 4) RESPOND (after all side effects)
        return res.status(200).json({ ok: true, lead: updatedLead, requestId });
      } catch (e) {
        console.error("[api/leads] PATCH crash", requestId, e);
        return res.status(500).json({ ok: false, error: e?.message || "Server error", requestId });
      }
    }

    return res.status(405).json({ ok: false, error: "Method not allowed", requestId });
  } catch (e) {
    console.error("[api/leads] crash", requestId, e);
    return res.status(500).json({ ok: false, error: "Internal server error", requestId });
  }
};
