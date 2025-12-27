# Production Deploy Checklist - AI Brief + Booking Stats

## ✅ Step 1: Database Migrations (Run in Supabase SQL Editor)

### A) Add booking statistics columns
**File:** `supabase/migration_leads_booking_stats.sql`

**Run this first:**
```sql
-- Copy entire contents of migration_leads_booking_stats.sql
-- Paste in Supabase SQL Editor → Run
```

**Verify:**
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'leads'
  AND column_name IN ('booking_count', 'has_rescheduled', 'has_cancelled')
ORDER BY column_name;
```

**Expected:** 3 rows returned

---

### B) Add engagement signal column
**File:** `supabase/migration_leads_engagement_signals.sql`

**Run:**
```sql
-- Copy entire contents of migration_leads_engagement_signals.sql
-- Paste in Supabase SQL Editor → Run
```

**Verify:**
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'leads'
  AND column_name = 'last_contacted_at';
```

**Expected:** 1 row returned (`last_contacted_at | timestamp with time zone`)

---

### C) Backfill booking statistics
**File:** `supabase/backfill_booking_stats.sql`

**Run:**
```sql
-- Copy entire contents of backfill_booking_stats.sql
-- Paste in Supabase SQL Editor → Run
```

**Verify:**
```sql
-- Check backfill results
SELECT 
  COUNT(*) as total_leads_with_booking_uid,
  SUM(booking_count) as total_bookings,
  SUM(CASE WHEN has_rescheduled THEN 1 ELSE 0 END) as leads_with_reschedules,
  SUM(CASE WHEN has_cancelled THEN 1 ELSE 0 END) as leads_with_cancellations
FROM public.leads
WHERE cal_booking_uid IS NOT NULL;
```

**Expected:** Non-zero values if you have Cal.com bookings

---

### D) Verify indexes
**Run:**
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'leads'
  AND indexname IN (
    'leads_has_rescheduled_idx',
    'leads_has_cancelled_idx',
    'leads_booking_count_idx',
    'idx_leads_last_contacted_at'
  )
ORDER BY indexname;
```

**Expected:** 4 indexes returned

---

## ✅ Step 2: Vercel Environment Variables (Verify)

**Check Vercel Dashboard → Settings → Environment Variables:**

- ✅ `SUPABASE_URL`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `SUPABASE_ANON_KEY`
- ✅ `ADMIN_TOKEN`

**Test API:**
```bash
curl -X POST "https://smile-design-turkey-frontend.vercel.app/api/leads-ai-analyze" \
  -H "Content-Type: application/json" \
  -H "x-admin-token: YOUR_ADMIN_TOKEN" \
  -d '{"lead_id": "test"}'
```

**Expected:** 404 (lead not found) or 200 (if lead exists)  
**Not Expected:** 401 or 500

---

## ✅ Step 3: Frontend Test

1. **Login** as admin → `/admin/leads`
2. **Open Notes modal** on any lead
3. **Find "Call Intelligence Brief"** section
4. **Click "Generate Brief"** button
5. **Verify:**
   - ✅ Loading: "Generating call briefing..."
   - ✅ Brief appears with structured format
   - ✅ Risk score with color-coded badge (🔴/🟠/🟡/🟢)
   - ✅ Sections: "WHAT HAPPENED", "RISK ASSESSMENT", "WHAT TO SAY ON THE CALL"

---

## ✅ Step 4: Verify Booking Stats (Optional)

If you have Cal.com bookings, verify stats are populated:

```sql
SELECT 
  id,
  name,
  email,
  cal_booking_uid,
  booking_count,
  has_rescheduled,
  has_cancelled
FROM public.leads
WHERE cal_booking_uid IS NOT NULL
LIMIT 10;
```

**Expected:** Non-zero `booking_count` for leads with events

---

## 🎯 Success Criteria

- ✅ All 4 migrations run without errors
- ✅ All columns exist in `leads` table
- ✅ All indexes created
- ✅ Backfill populated booking stats
- ✅ AI analysis endpoint returns 200 with brief
- ✅ Frontend shows "Call Intelligence Brief" section
- ✅ Brief format is structured and readable

---

## 📋 Migration Order (Important!)

**Run in this exact order:**

1. `migration_leads_booking_stats.sql` (adds columns)
2. `migration_leads_engagement_signals.sql` (adds last_contacted_at)
3. `backfill_booking_stats.sql` (populates booking stats)

**Why this order?**
- Columns must exist before backfill can populate them
- Indexes are created in migration files (safe to run multiple times)

---

## ⚠️ Troubleshooting

### "column does not exist"
- Run migration first (Step 1A or 1B)

### "duplicate key value violates unique constraint"
- Index already exists, that's OK (IF NOT EXISTS handles it)

### "0 rows affected" in backfill
- Normal if you have no Cal.com bookings yet
- Check: `SELECT COUNT(*) FROM cal_webhook_events;`

### AI brief not appearing
- Check browser console for errors
- Verify `VITE_ADMIN_TOKEN` in frontend env
- Test API endpoint directly with curl

---

**Status:** ✅ Ready for Production  
**Estimated Time:** 10-15 minutes  
**Risk Level:** Low (additive changes, idempotent migrations)

