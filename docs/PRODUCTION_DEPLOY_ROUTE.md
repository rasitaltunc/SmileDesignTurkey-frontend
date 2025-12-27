# Production Deploy Route - AI Brief Enhancement

**Commit:** `e4ebe817`  
**Date:** Latest  
**Status:** Ready for Production

## Changes Included

✅ Call Intelligence Brief format (structured output)  
✅ Enhanced risk scoring (50 neutral start, positive signals)  
✅ Admin UX improvements ("Generate Brief" microcopy)  
✅ Schema migration: `last_contacted_at` column

---

## Deployment Checklist

### A) Database Migration (REQUIRED)

**File:** `supabase/migration_leads_engagement_signals.sql`

**Steps:**
1. Open Supabase Dashboard → SQL Editor
2. Copy entire contents of `supabase/migration_leads_engagement_signals.sql`
3. Paste and Run
4. Verify:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'leads' 
   AND column_name = 'last_contacted_at';
   ```
   Should return: `last_contacted_at | timestamp with time zone`

**Impact:** Adds `last_contacted_at` column (nullable, safe to run)

---

### B) Vercel Environment Variables (VERIFY)

**Required Variables:**
- ✅ `SUPABASE_URL` - Should exist
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Should exist
- ✅ `SUPABASE_ANON_KEY` - Should exist
- ✅ `ADMIN_TOKEN` - Should exist (for `/api/leads-ai-analyze`)

**Verification:**
```bash
# Test admin token endpoint
curl -X POST "https://your-domain.vercel.app/api/leads-ai-analyze" \
  -H "Content-Type: application/json" \
  -H "x-admin-token: YOUR_ADMIN_TOKEN" \
  -d '{"lead_id": "test-lead-id"}'
```

**Expected:** 404 (lead not found) or 200 (if lead exists)  
**Not Expected:** 401 (invalid credentials) or 500 (missing env)

---

### C) Frontend Environment Variables (VERIFY)

**Required Variables:**
- ✅ `VITE_SUPABASE_URL` - Should exist
- ✅ `VITE_SUPABASE_ANON_KEY` - Should exist
- ✅ `VITE_ADMIN_TOKEN` - Should exist (for frontend API calls)

**Verification:**
- Check browser console for errors
- Check Network tab: `/api/leads-ai-analyze` should not return 401

---

### D) Testing Steps

#### 1. Verify Migration
```sql
-- Run in Supabase SQL Editor
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'leads' 
AND column_name IN ('last_contacted_at', 'ai_risk_score', 'ai_summary', 'ai_last_analyzed_at')
ORDER BY column_name;
```

**Expected:** All 4 columns should exist

#### 2. Test AI Analysis Endpoint
```bash
# Replace with actual lead_id from your database
curl -X POST "https://your-domain.vercel.app/api/leads-ai-analyze" \
  -H "Content-Type: application/json" \
  -H "x-admin-token: YOUR_ADMIN_TOKEN" \
  -d '{"lead_id": "actual-lead-id-here"}'
```

**Expected Response:**
```json
{
  "ok": true,
  "leadId": "lead-123",
  "ai_risk_score": 65,
  "ai_summary": "CALL INTELLIGENCE BRIEF\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n..."
}
```

#### 3. Test Frontend UI
1. Login as admin → `/admin/leads`
2. Click "Notes" button on any lead
3. In Notes modal, find "Call Intelligence Brief" section
4. Click "Generate Brief" button
5. Verify:
   - ✅ Loading state shows "Generating call briefing..."
   - ✅ Brief appears with structured format
   - ✅ Risk score displays with color-coded badge
   - ✅ "What happened", "Risk assessment", "What to say" sections visible

#### 4. Verify Risk Scoring
Test with different lead scenarios:

**High Risk (should score ≥70):**
- Lead with cancelled booking
- Lead with 2+ reschedules
- Lead with meeting <24h but no notes

**Low Risk (should score <40):**
- Lead with deposit_paid status
- Lead with notes and phone
- Stable booking (30+ days old, no changes)

---

## Rollback Plan (If Needed)

If issues occur:

1. **Frontend:** Revert to previous commit (UI changes are non-breaking)
2. **Backend:** Old endpoint still works, new format is additive
3. **Database:** `last_contacted_at` is nullable, safe to keep

**No data loss risk** - All changes are additive.

---

## Post-Deploy Verification

### Success Criteria
- ✅ Migration runs without errors
- ✅ AI analysis endpoint returns 200 with brief
- ✅ Frontend shows "Call Intelligence Brief" section
- ✅ Risk scores are reasonable (0-100 range)
- ✅ Brief format is structured and readable

### Monitoring
- Check Vercel function logs: `/api/leads-ai-analyze`
- Monitor error rates (should be <1%)
- Track adoption: % of leads with AI analysis

---

## Next Steps (Optional)

After successful deploy:
1. Update `last_contacted_at` when notes are added (future enhancement)
2. Add priority badges to lead list (Phase 2)
3. Implement automated follow-up suggestions (Phase 3)

---

**Status:** ✅ Ready for Production  
**Risk Level:** Low (additive changes, backward compatible)  
**Estimated Time:** 5-10 minutes

