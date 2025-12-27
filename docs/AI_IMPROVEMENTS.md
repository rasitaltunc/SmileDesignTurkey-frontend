# AI Analysis Improvements - Product Engineering Plan

## 1. Enhanced "Call Intelligence Brief" Format

### Current State
- Basic risk score (0-100)
- Simple bullet points
- Generic call guidance

### Proposed Structure
```
┌─────────────────────────────────────────┐
│ CALL INTELLIGENCE BRIEF                 │
├─────────────────────────────────────────┤
│ Risk Level: [High/Medium/Low] (XX/100) │
│ Priority: [Immediate/24h/Standard]      │
│                                         │
│ WHAT HAPPENED                           │
│ • [Contextual timeline summary]          │
│ • [Key behavioral signals]               │
│ • [Missing information gaps]             │
│                                         │
│ RISK ASSESSMENT                         │
│ • [Primary risk factor]                  │
│ • [Secondary concerns]                   │
│ • [Opportunity signals]                  │
│                                         │
│ WHAT TO SAY ON THE CALL                 │
│ • [Opening line]                         │
│ • [Key questions to ask]                 │
│ • [Information to gather]                │
│                                         │
│ CONTEXT                                 │
│ Source: [cal.com/contact/onboarding]    │
│ Last activity: [X hours/days ago]        │
│ Treatment interest: [if available]      │
└─────────────────────────────────────────┘
```

## 2. Minimal Schema Enhancements

### A. Add `last_contacted_at` to leads
**Purpose**: Track when lead was last contacted (manual or automated)
**Migration**: `ALTER TABLE leads ADD COLUMN last_contacted_at TIMESTAMP WITH TIME ZONE;`
**AI Signal**: Staleness indicator (no contact in 7+ days = risk)

### B. Add `engagement_score` to leads (computed)
**Purpose**: Composite signal from multiple factors
**Migration**: Virtual column or computed on-demand
**AI Signal**: 
- +10 per timeline event
- +20 if has notes
- +15 if has phone
- -30 if cancelled
- -20 per reschedule

### C. Add `time_to_meeting_hours` to cal_webhook_events
**Purpose**: Calculate hours between booking.created and meeting_start
**Migration**: Computed field or stored in payload
**AI Signal**: Urgency indicator (meeting in <24h = high priority)

### D. Add `reschedule_reason` to cal_webhook_events.payload
**Purpose**: If Cal.com provides cancellation reason
**Migration**: Already in JSONB, just extract
**AI Signal**: Pattern detection (e.g., "too early" vs "conflict")

## 3. Enhanced Risk Scoring Algorithm

### Current Issues
- Too simplistic (linear addition)
- Doesn't consider time decay
- Missing positive signals

### Proposed Algorithm
```javascript
// Base score starts at 50 (neutral)
let riskScore = 50;

// Negative signals (increase risk)
if (hasCancelled) riskScore += 40;
riskScore += rescheduleCount * 20; // Reduced from 25
if (missingPhone && hasBooking) riskScore += 15;
if (multipleEventsIn24h) riskScore += 10;
if (lastContactedDaysAgo > 7) riskScore += 15; // Staleness
if (meetingInLessThan24h && noNotes) riskScore += 20; // Urgency + unprepared

// Positive signals (decrease risk)
if (hasNotes) riskScore -= 10;
if (hasPhone) riskScore -= 5;
if (hasMultipleNotes) riskScore -= 5; // Engagement
if (status === 'deposit_paid') riskScore -= 30; // High commitment

// Time decay: older bookings are less risky
const daysSinceCreated = (now - bookingCreated) / (1000 * 60 * 60 * 24);
if (daysSinceCreated > 30) riskScore -= 10; // Stale but stable

// Clamp 0-100
riskScore = Math.max(0, Math.min(100, riskScore));
```

## 4. Admin UX Improvements

### A. Priority Badges in Lead List
- Add visual indicator column: 🔴 High | 🟠 Medium | 🟡 Low | 🟢 Safe
- Sortable by risk score
- Color-coded row backgrounds (subtle)

### B. Microcopy Enhancements
- "Analyze" → "Generate Call Brief"
- Empty state: "No analysis yet. Generate a call briefing to see risk assessment and talking points."
- Success: "Call brief generated. Review before calling."

### C. Contextual Cues
- Show "Last analyzed: X minutes ago" if recent
- "⚠️ High risk detected" banner for scores ≥70
- "⏰ Meeting in <24h" urgency badge
- "📞 No phone number" warning

### D. Quick Actions
- "Call Now" button (opens phone link if phone exists)
- "Add Note" quick action
- "Reschedule" quick action (if booking exists)

## 5. Implementation Priority

### Phase 1: Quick Wins (No Schema Changes)
1. ✅ Enhanced AI prompt structure
2. ✅ Better risk scoring algorithm
3. ✅ Improved microcopy
4. ✅ Priority badges in UI

### Phase 2: Schema Enhancements
1. Add `last_contacted_at` column
2. Compute `engagement_score` on-demand
3. Extract `time_to_meeting_hours` from payload

### Phase 3: Advanced Signals
1. Pattern detection (reschedule reasons)
2. Predictive scoring (ML-ready features)
3. Automated follow-up suggestions

## 6. Success Metrics

- **Adoption**: % of leads with AI analysis
- **Accuracy**: Correlation between risk score and actual outcomes
- **Action**: % of high-risk leads contacted within 24h
- **Efficiency**: Time saved per call preparation

