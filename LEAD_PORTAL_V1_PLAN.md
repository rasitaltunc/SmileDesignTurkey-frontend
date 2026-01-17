# Lead → Patient Portal Shock Flow (V1) - Implementation Plan

## Overview
After lead submission, user lands in "Pending Review Portal" (private dashboard) with timeline, next actions, uploads, and verification gating. No password required initially.

## Files to Create/Modify

### 1. Database Migration
- `supabase/migration_leads_case_id.sql` - Add `case_id` and `coordinator_email` fields

### 2. Core Portal Logic
- `src/lib/portalSession.ts` - Portal session management (temp token, verification status)
- `src/lib/verification.ts` - Magic link verification (email-based)

### 3. UI Components
- `src/pages/PendingReviewPortal.tsx` - Main portal UI (timeline, CTAs, locked modules)
- `src/components/portal/Timeline.tsx` - Timeline/steps visualization
- `src/components/portal/VerificationBanner.tsx` - "Verify to continue" banner

### 4. Route & Integration
- `src/App.tsx` - Add `/portal` route (unauthenticated initially)
- `src/pages/Onboarding.tsx` - Redirect to `/portal?case_id=XXX` after submission
- `src/lib/submitLead.ts` - Return `case_id` after submission

### 5. Tracking
- `src/lib/analytics.ts` - Add events: `lead_submitted`, `portal_viewed`, `verification_started`, `verification_completed`, `upload_started`, `upload_completed`, `whatsapp_clicked`

## Implementation Steps

1. ✅ Add case_id generation and storage
2. ✅ Create portal session system (localStorage-based temp access)
3. ✅ Build PendingReviewPortal UI
4. ✅ Add verification flow (magic link)
5. ✅ Wire Onboarding → Portal redirect
6. ✅ Add tracking events
7. ✅ Test & commit

