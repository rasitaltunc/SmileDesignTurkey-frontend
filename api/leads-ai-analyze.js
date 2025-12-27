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

    // 4) Calculate enhanced risk score (starts at 50 = neutral)
    let riskScore = 50;

    // Extract key signals
    const rescheduleCount = timelineEvents.filter(
      (e) => e.event_type === "booking.rescheduled"
    ).length;
    const hasCancelled = timelineEvents.some(
      (e) => e.event_type === "booking.cancelled"
    );
    const hasBookingCreated = timelineEvents.some(
      (e) => e.event_type === "booking.created"
    );
    const hasPhone = !!lead.phone;
    const hasNotes = !!(lead.notes && lead.notes.trim() !== "");
    const hasMultipleNotes = leadNotes.length > 1;

    // Negative signals (increase risk)
    if (hasCancelled) {
      riskScore += 40;
    }
    riskScore += rescheduleCount * 20; // Reduced from 25, less punitive

    if (hasBookingCreated && !hasPhone && !hasNotes) {
      riskScore += 15; // Missing critical info
    }

    // Multiple events in <24h (urgency/confusion)
    let multipleEventsIn24h = false;
    if (timelineEvents.length >= 2) {
      const sortedEvents = [...timelineEvents].sort(
        (a, b) => new Date(a.received_at || a.created_at) - new Date(b.received_at || b.created_at)
      );
      
      for (let i = 1; i < sortedEvents.length; i++) {
        const prevTime = new Date(sortedEvents[i - 1].received_at || sortedEvents[i - 1].created_at);
        const currTime = new Date(sortedEvents[i].received_at || sortedEvents[i].created_at);
        const hoursDiff = (currTime - prevTime) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
          multipleEventsIn24h = true;
          riskScore += 10;
          break;
        }
      }
    }

    // Urgency: Meeting in <24h but no notes (unprepared)
    if (hasBookingCreated && lead.meeting_start) {
      const meetingTime = new Date(lead.meeting_start);
      const now = new Date();
      const hoursToMeeting = (meetingTime - now) / (1000 * 60 * 60);
      if (hoursToMeeting > 0 && hoursToMeeting < 24 && !hasNotes) {
        riskScore += 20; // High urgency, low preparation
      }
    }

    // Positive signals (decrease risk)
    if (hasNotes) {
      riskScore -= 10; // Has context
    }
    if (hasPhone) {
      riskScore -= 5; // Can contact directly
    }
    if (hasMultipleNotes) {
      riskScore -= 5; // High engagement
    }
    if (lead.status === "deposit_paid") {
      riskScore -= 30; // High commitment
    } else if (lead.status === "appointment_set") {
      riskScore -= 10; // Progress made
    }

    // Time decay: Older stable bookings are less risky
    if (hasBookingCreated) {
      const createdEvent = timelineEvents.find((e) => e.event_type === "booking.created");
      if (createdEvent) {
        const createdTime = new Date(createdEvent.received_at || createdEvent.created_at);
        const daysSinceCreated = (Date.now() - createdTime.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceCreated > 30 && !hasCancelled && rescheduleCount === 0) {
          riskScore -= 10; // Stale but stable
        }
      }
    }

    // Clamp to 0-100
    riskScore = Math.max(0, Math.min(100, riskScore));

    // 5) Generate enhanced "Call Intelligence Brief"
    const whatHappened = [];
    const riskFactors = [];
    const whatToSay = [];
    let priority = "";

    // Determine priority level
    if (riskScore >= 70) {
      priority = "Immediate";
    } else if (riskScore >= 40) {
      priority = "24 hours";
    } else {
      priority = "Standard";
    }

    // WHAT HAPPENED - Contextual timeline summary
    if (hasBookingCreated) {
      const createdEvent = timelineEvents.find((e) => e.event_type === "booking.created");
      if (createdEvent) {
        const createdDate = new Date(createdEvent.received_at || createdEvent.created_at);
        const daysAgo = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        whatHappened.push(
          `Booking created ${daysAgo === 0 ? "today" : `${daysAgo} day${daysAgo > 1 ? "s" : ""} ago`} (${createdDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })})`
        );
      }
    }

    if (rescheduleCount > 0) {
      whatHappened.push(
        `Rescheduled ${rescheduleCount} time${rescheduleCount > 1 ? "s" : ""}${rescheduleCount >= 2 ? " — pattern of changes" : ""}`
      );
    }

    if (hasCancelled) {
      whatHappened.push("Booking was cancelled — needs immediate attention");
    }

    // Add meeting urgency if applicable
    if (lead.meeting_start) {
      const meetingTime = new Date(lead.meeting_start);
      const now = new Date();
      const hoursToMeeting = (meetingTime - now) / (1000 * 60 * 60 * 24);
      if (hoursToMeeting > 0 && hoursToMeeting < 1) {
        whatHappened.push("⚠️ Meeting scheduled in less than 24 hours");
      }
    }

    // Fill gaps
    if (whatHappened.length === 0) {
      whatHappened.push("No booking events recorded yet");
    }
    if (whatHappened.length < 3 && leadNotes.length > 0) {
      whatHappened.push(`${leadNotes.length} internal note${leadNotes.length > 1 ? "s" : ""} — good engagement`);
    }
    if (whatHappened.length < 3 && lead.source) {
      whatHappened.push(`Source: ${lead.source === "cal.com" ? "Cal.com booking" : lead.source}`);
    }

    // RISK ASSESSMENT - Key concerns and opportunities
    if (hasCancelled) {
      riskFactors.push("Cancellation indicates potential disengagement");
    } else if (rescheduleCount >= 2) {
      riskFactors.push("Multiple reschedules suggest scheduling conflicts or uncertainty");
    } else if (rescheduleCount === 1) {
      riskFactors.push("One reschedule — monitor for patterns");
    }

    if (!hasPhone && hasBookingCreated) {
      riskFactors.push("Missing phone number — harder to reach directly");
    }

    if (multipleEventsIn24h) {
      riskFactors.push("Multiple changes in 24h — may indicate confusion or urgency");
    }

    if (lead.meeting_start) {
      const meetingTime = new Date(lead.meeting_start);
      const now = new Date();
      const hoursToMeeting = (meetingTime - now) / (1000 * 60 * 60 * 24);
      if (hoursToMeeting > 0 && hoursToMeeting < 24 && !hasNotes) {
        riskFactors.push("Meeting soon but no preparation notes — may need confirmation");
      }
    }

    // Positive signals (opportunities)
    if (hasNotes) {
      riskFactors.push("✓ Has context notes — good foundation for conversation");
    }
    if (lead.status === "deposit_paid") {
      riskFactors.push("✓ Deposit paid — high commitment, low risk");
    } else if (lead.status === "appointment_set") {
      riskFactors.push("✓ Appointment confirmed — progressing well");
    }

    if (riskFactors.length === 0) {
      riskFactors.push("No major risk factors identified");
    }

    // WHAT TO SAY ON THE CALL - Contextual talking points
    if (hasCancelled) {
      whatToSay.push("Open with empathy: 'I noticed your appointment was cancelled. I wanted to check in and see if we can find a better time.'");
      whatToSay.push("Ask: 'What would work better for your schedule?' — understand their constraints");
      whatToSay.push("Offer flexibility: 'We have availability [timeframes] — what works for you?'");
    } else if (rescheduleCount > 0) {
      whatToSay.push("Acknowledge the change: 'I see we've adjusted the time a couple of times. Let's make sure this new slot works perfectly for you.'");
      whatToSay.push("Confirm details: 'Just to confirm, you're all set for [date/time]?'");
      whatToSay.push("Probe gently: 'Is there anything we can do to make this more convenient?'");
    } else if (lead.meeting_start) {
      const meetingTime = new Date(lead.meeting_start);
      const hoursToMeeting = (meetingTime - Date.now()) / (1000 * 60 * 60 * 24);
      if (hoursToMeeting < 1) {
        whatToSay.push("Urgent confirmation: 'Hi! Just confirming your appointment tomorrow at [time]. Everything still good?'");
      } else {
        whatToSay.push("Confirm appointment details and answer any questions they have");
      }
      whatToSay.push("Gather preferences: 'What are you most excited about for your treatment?'");
    } else {
      whatToSay.push("Confirm appointment details and answer any questions");
    }

    if (!hasPhone) {
      whatToSay.push("Request contact info: 'Could I get your phone number for easier communication?'");
    }

    if (!hasNotes && hasBookingCreated) {
      whatToSay.push("Gather context: 'What made you interested in [treatment]? What timeline are you thinking?'");
    } else if (hasNotes) {
      whatToSay.push("Reference previous conversation: 'Based on our previous discussion about [topic from notes]...'");
    }

    // Ensure 3 bullets
    while (whatToSay.length < 3) {
      whatToSay.push("Be warm and professional — focus on understanding their needs");
    }

    // Calculate staleness (days since last contact)
    let lastContactedText = "Never contacted";
    let followUpSuggestion = "";
    if (lead.last_contacted_at) {
      const lastContacted = new Date(lead.last_contacted_at);
      const daysSinceContact = Math.floor((Date.now() - lastContacted.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceContact === 0) {
        lastContactedText = "Contacted today";
        followUpSuggestion = "Recent contact — follow up if needed";
      } else if (daysSinceContact === 1) {
        lastContactedText = "Contacted yesterday";
        followUpSuggestion = "Recent contact — standard follow-up";
      } else if (daysSinceContact < 7) {
        lastContactedText = `Contacted ${daysSinceContact} days ago`;
        followUpSuggestion = "Moderate staleness — consider follow-up";
      } else if (daysSinceContact < 30) {
        lastContactedText = `Contacted ${daysSinceContact} days ago`;
        followUpSuggestion = "⚠️ Stale contact — prioritize follow-up";
        // Increase risk for staleness
        riskScore = Math.min(100, riskScore + 15);
      } else {
        lastContactedText = `Contacted ${daysSinceContact} days ago`;
        followUpSuggestion = "⚠️ Very stale — high priority follow-up";
        // Significant risk increase
        riskScore = Math.min(100, riskScore + 25);
      }
    } else {
      // Never contacted + has booking = should contact
      if (hasBookingCreated) {
        followUpSuggestion = "⚠️ Never contacted — immediate follow-up recommended";
        riskScore = Math.min(100, riskScore + 20);
      }
    }

    // Recalculate priority if risk score changed
    if (riskScore >= 70) {
      priority = "Immediate";
    } else if (riskScore >= 40) {
      priority = "24 hours";
    } else {
      priority = "Standard";
    }

    // Format enhanced "Call Intelligence Brief"
    const riskLevel = riskScore >= 70 ? "High" : riskScore >= 40 ? "Medium" : riskScore >= 20 ? "Low" : "Very Low";
    
    const aiSummary = `CALL INTELLIGENCE BRIEF
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Risk Level: ${riskLevel} (${Math.round(riskScore)}/100)
Priority: ${priority}
Last Contacted: ${lastContactedText}
${followUpSuggestion ? `Follow-up: ${followUpSuggestion}` : ''}

WHAT HAPPENED
${whatHappened.slice(0, 3).map((b) => `• ${b}`).join("\n")}

RISK ASSESSMENT
${riskFactors.slice(0, 3).map((b) => `• ${b}`).join("\n")}

WHAT TO SAY ON THE CALL
${whatToSay.slice(0, 3).map((b) => `• ${b}`).join("\n")}

CONTEXT
Source: ${lead.source || "unknown"} | Last activity: ${timelineEvents.length > 0 ? "Recent" : "None"} | ${hasPhone ? "Has phone" : "No phone"} | ${hasNotes ? "Has notes" : "No notes"}`;

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

