// api/leads-ai-analyze.js
// POST /api/leads-ai-analyze
// AI analysis endpoint for lead risk scoring and call briefing
// Server-only: uses SUPABASE_SERVICE_ROLE_KEY

const { createClient } = require("@supabase/supabase-js");

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-token");
}

function getAdminToken(req) {
  return (req.headers["x-admin-token"] || "").toString();
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

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  // Verify admin token
  const adminToken = getAdminToken(req);
  const expectedToken = process.env.ADMIN_TOKEN || "";

  if (!expectedToken || adminToken !== expectedToken) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // Parse request body
  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  const leadId = pickString(body.lead_id || body.leadId);

  if (!leadId) {
    return res.status(400).json({ error: "Missing lead_id" });
  }

  // Initialize Supabase client (service role)
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: "Missing SUPABASE env" });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // 1) Fetch lead by id
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    // 2) Fetch timeline events by cal_booking_uid
    let timelineEvents = [];
    if (lead.cal_booking_uid) {
      const { data: events, error: eventsError } = await supabase
        .from("cal_webhook_events")
        .select("*")
        .eq("cal_booking_uid", lead.cal_booking_uid)
        .order("received_at", { ascending: true });

      if (!eventsError && events) {
        timelineEvents = events;
      }
    }

    // 3) Fetch lead notes (gracefully skip if table doesn't exist)
    let leadNotes = [];
    try {
      const { data: notes, error: notesError } = await supabase
        .from("lead_notes")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });

      if (!notesError && notes) {
        leadNotes = notes;
      }
    } catch (err) {
      // Table might not exist, skip gracefully
      console.warn("[leads-ai-analyze] lead_notes table not accessible, skipping:", err.message);
    }

    // 4) Calculate risk score
    let riskScore = 0;

    // +25 per reschedule
    const rescheduleCount = timelineEvents.filter(
      (e) => e.event_type === "booking.rescheduled"
    ).length;
    riskScore += rescheduleCount * 25;

    // +40 if cancelled
    const hasCancelled = timelineEvents.some(
      (e) => e.event_type === "booking.cancelled"
    );
    if (hasCancelled) {
      riskScore += 40;
    }

    // +15 if booking created but missing notes/phone
    const hasBookingCreated = timelineEvents.some(
      (e) => e.event_type === "booking.created"
    );
    if (hasBookingCreated && (!lead.notes || lead.notes.trim() === "") && !lead.phone) {
      riskScore += 15;
    }

    // +10 if multiple events in <24h
    if (timelineEvents.length >= 2) {
      const sortedEvents = [...timelineEvents].sort(
        (a, b) => new Date(a.received_at || a.created_at) - new Date(b.received_at || b.created_at)
      );
      
      for (let i = 1; i < sortedEvents.length; i++) {
        const prevTime = new Date(sortedEvents[i - 1].received_at || sortedEvents[i - 1].created_at);
        const currTime = new Date(sortedEvents[i].received_at || sortedEvents[i].created_at);
        const hoursDiff = (currTime - prevTime) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
          riskScore += 10;
          break; // Only count once
        }
      }
    }

    // Clamp to 0-100
    riskScore = Math.max(0, Math.min(100, riskScore));

    // 5) Generate AI summary
    const whatHappened = [];
    const whatToSay = [];
    let riskPriority = "";

    // What happened (3 bullets)
    if (hasBookingCreated) {
      const createdEvent = timelineEvents.find((e) => e.event_type === "booking.created");
      if (createdEvent) {
        const createdDate = new Date(createdEvent.received_at || createdEvent.created_at);
        whatHappened.push(
          `Booking created on ${createdDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
        );
      }
    }

    if (rescheduleCount > 0) {
      whatHappened.push(`Rescheduled ${rescheduleCount} time${rescheduleCount > 1 ? "s" : ""}`);
    }

    if (hasCancelled) {
      whatHappened.push("Booking was cancelled");
    } else if (timelineEvents.length > 0) {
      const lastEvent = timelineEvents[timelineEvents.length - 1];
      if (lastEvent.event_type === "booking.rescheduled") {
        whatHappened.push("Most recent action: rescheduled");
      }
    }

    // Fill up to 3 bullets
    if (whatHappened.length === 0) {
      whatHappened.push("No booking events recorded");
    }
    if (whatHappened.length < 3 && leadNotes.length > 0) {
      whatHappened.push(`${leadNotes.length} internal note${leadNotes.length > 1 ? "s" : ""} added`);
    }
    if (whatHappened.length < 3 && lead.source) {
      whatHappened.push(`Source: ${lead.source}`);
    }

    // What to say on the call (3 bullets)
    if (hasCancelled) {
      whatToSay.push("Acknowledge the cancellation and ask if they'd like to reschedule");
      whatToSay.push("Understand their reason for cancelling");
    } else if (rescheduleCount > 0) {
      whatToSay.push("Confirm the new appointment time works for them");
      whatToSay.push("Ask if there's anything we can do to make it more convenient");
    } else {
      whatToSay.push("Confirm appointment details and answer any questions");
    }

    if (!lead.phone) {
      whatToSay.push("Request phone number for better communication");
    }

    if (!lead.notes || lead.notes.trim() === "") {
      whatToSay.push("Gather treatment preferences and timeline expectations");
    } else {
      whatToSay.push("Reference previous notes and continue the conversation");
    }

    // Ensure 3 bullets
    while (whatToSay.length < 3) {
      whatToSay.push("Be friendly and professional, focus on their needs");
    }

    // Risk/priority one-liner
    if (riskScore >= 70) {
      riskPriority = "High risk: Multiple red flags detected. Prioritize immediate follow-up.";
    } else if (riskScore >= 40) {
      riskPriority = "Medium risk: Some concerns noted. Follow up within 24 hours.";
    } else if (riskScore >= 20) {
      riskPriority = "Low risk: Minor issues. Standard follow-up recommended.";
    } else {
      riskPriority = "Low risk: No major concerns. Standard engagement.";
    }

    // Format AI summary
    const aiSummary = `What happened:\n${whatHappened.slice(0, 3).map((b) => `• ${b}`).join("\n")}\n\nWhat to say on the call:\n${whatToSay.slice(0, 3).map((b) => `• ${b}`).join("\n")}\n\n${riskPriority}`;

    // 6) Update lead with AI analysis
    const { data: updatedLead, error: updateError } = await supabase
      .from("leads")
      .update({
        ai_risk_score: riskScore,
        ai_summary: aiSummary,
        ai_last_analyzed_at: new Date().toISOString(),
      })
      .eq("id", leadId)
      .select("id, ai_risk_score, ai_summary, ai_last_analyzed_at")
      .single();

    if (updateError) {
      console.error("[leads-ai-analyze] Error updating lead:", updateError);
      return res.status(500).json({ error: "Failed to update lead with AI analysis" });
    }

    return res.status(200).json({
      ok: true,
      leadId: updatedLead.id,
      ai_risk_score: updatedLead.ai_risk_score,
      ai_summary: updatedLead.ai_summary,
    });
  } catch (error) {
    console.error("[leads-ai-analyze] Unhandled error:", error);
    return res.status(500).json({ error: "Internal server error", details: error.message });
  }
};

