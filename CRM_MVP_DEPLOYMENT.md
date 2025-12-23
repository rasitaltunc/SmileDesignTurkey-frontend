# 🚀 CRM MVP - Part 1: Lead Pipeline + Status - Deployment Guide

## 📋 Overview

This guide covers the deployment of the CRM MVP Lead Pipeline feature with status management.

**What's Changed:**
- ✅ Status values updated to: `new`, `contacted`, `booked`, `paid`, `completed`
- ✅ AdminLeads UI updated with new statuses and optimistic updates
- ✅ API endpoint updated to use Supabase Auth JWT validation
- ✅ New leads automatically get `new` status

---

## 📁 Files Changed

### 1. Database Migration
- **File:** `supabase/migration_crm_status_values.sql`
- **Purpose:** Updates existing status values and adds constraint

### 2. Frontend Updates
- **File:** `src/pages/AdminLeads.tsx`
  - Updated status options to new values
  - Added optimistic UI updates
  - Updated status colors/badges
  - Added API endpoint support (with fallback to direct Supabase)

### 3. Backend API
- **File:** `api/leads.ts` (NEW - TypeScript version)
- **File:** `api/leads.js` (LEGACY - can be removed after migration)
- **Purpose:** Server-side endpoint with Supabase Auth JWT validation

### 4. Lead Submission
- **File:** `src/lib/submitLead.ts`
- **Change:** New leads now include `status: 'new'`

---

## 🗄️ Step 1: Database Migration

### Run SQL Migration

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project
   - Navigate to: **SQL Editor**

2. **Run Migration**
   - Open file: `supabase/migration_crm_status_values.sql`
   - Copy entire contents
   - Paste into SQL Editor
   - Click **Run**

3. **Verify Migration**
   ```sql
   -- Check status distribution
   SELECT status, COUNT(*) FROM leads GROUP BY status;
   
   -- Check constraint exists
   SELECT conname, pg_get_constraintdef(oid) 
   FROM pg_constraint 
   WHERE conrelid = 'leads'::regclass 
   AND conname = 'leads_status_check';
   ```

**Expected Result:**
- All existing leads have status values: `new`, `contacted`, `booked`, `paid`, or `completed`
- Constraint enforces these 5 values only

---

## 🔧 Step 2: Environment Variables

### Vercel Environment Variables

Add/Update these in **Vercel Dashboard** → **Settings** → **Environment Variables**:

#### Required (Backend API)
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### Optional (Frontend - for API endpoint)
```bash
VITE_API_URL=https://your-site.vercel.app
```

**Note:** 
- `SUPABASE_SERVICE_ROLE_KEY` should **NEVER** be exposed to client
- Get it from: Supabase Dashboard → Settings → API → Service Role Key
- If `VITE_API_URL` is not set, frontend will use direct Supabase client (still works)

---

## 📦 Step 3: Deploy to Vercel

### Option A: Git Push (Recommended)
```bash
# Commit changes
git add .
git commit -m "feat: CRM MVP - Lead Pipeline Status Management"

# Push to trigger deployment
git push origin main
```

### Option B: Vercel CLI
```bash
# Install Vercel CLI if not installed
npm i -g vercel

# Deploy
vercel --prod
```

### Option C: Vercel Dashboard
1. Go to Vercel Dashboard
2. Select your project
3. Click **Deployments** → **Redeploy** (or wait for auto-deploy on git push)

---

## ✅ Step 4: Manual Testing

### Test 1: New Lead Gets 'new' Status

1. **Submit a new lead** via contact form or onboarding
2. **Open AdminLeads page** (`/admin/leads`)
3. **Verify:**
   - New lead appears in table
   - Status column shows **"New"** badge (yellow)
   - Status value in database is `'new'`

**SQL Check:**
```sql
SELECT id, name, email, status, created_at 
FROM leads 
ORDER BY created_at DESC 
LIMIT 1;
```

---

### Test 2: Change Status Persists

1. **In AdminLeads page:**
   - Find a lead with status `'new'`
   - Click **Edit** button
   - Change status dropdown to **"Contacted"**
   - Click **Save** (✓ icon)

2. **Verify UI:**
   - Status badge immediately updates to **"Contacted"** (blue) - *Optimistic UI*
   - No error message appears

3. **Refresh page:**
   - Press F5 or click Refresh button
   - Status should still be **"Contacted"**

4. **Database Check:**
   ```sql
   SELECT id, status, updated_at 
   FROM leads 
   WHERE id = 'your-lead-id';
   ```
   - Status should be `'contacted'`
   - `updated_at` should be recent timestamp

---

### Test 3: All Status Values Work

Test each status transition:

1. **new → contacted**
   - Change status to "Contacted"
   - Verify badge is blue
   - Refresh and verify persists

2. **contacted → booked**
   - Change status to "Booked"
   - Verify badge is purple
   - Refresh and verify persists

3. **booked → paid**
   - Change status to "Paid"
   - Verify badge is green
   - Refresh and verify persists

4. **paid → completed**
   - Change status to "Completed"
   - Verify badge is emerald green
   - Refresh and verify persists

---

### Test 4: Error Handling

1. **Test Network Error:**
   - Open browser DevTools → Network tab
   - Set to "Offline" mode
   - Try to change status
   - **Expected:** Error message appears, status reverts

2. **Test Invalid Status:**
   - (If testing API directly) Send invalid status value
   - **Expected:** API returns 400 error with validation message

---

### Test 5: Status Filter

1. **Filter by Status:**
   - Use status dropdown filter at top
   - Select "Contacted"
   - **Expected:** Only leads with `status = 'contacted'` are shown

2. **Clear Filter:**
   - Click X button next to filter
   - **Expected:** All leads shown again

---

## 🐛 Troubleshooting

### Issue: Status changes don't persist

**Check:**
1. API endpoint is deployed and accessible
2. Environment variables are set in Vercel
3. Supabase Service Role Key is correct
4. Check browser console for errors

**Debug:**
```bash
# Test API endpoint directly
curl -X PATCH https://your-site.vercel.app/api/leads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"id":"test-lead-id","status":"contacted"}'
```

---

### Issue: New leads don't have status

**Check:**
1. Migration ran successfully
2. `submitLead.ts` includes `status: 'new'`
3. Database default is set: `ALTER TABLE leads ALTER COLUMN status SET DEFAULT 'new';`

**Fix:**
```sql
-- Manually set status for leads without status
UPDATE leads SET status = 'new' WHERE status IS NULL;
```

---

### Issue: Old status values still showing

**Check:**
1. Migration ran completely
2. Frontend code is deployed (check browser cache)
3. Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)

**Fix:**
```sql
-- Re-run status migration
UPDATE leads SET status = 'new' WHERE status NOT IN ('new', 'contacted', 'booked', 'paid', 'completed');
```

---

## 📊 Status Values Reference

| Status Value | Label | Badge Color | Description |
|--------------|-------|-------------|-------------|
| `new` | New | Yellow | Just submitted, not contacted yet |
| `contacted` | Contacted | Blue | Initial contact made |
| `booked` | Booked | Purple | Appointment/consultation booked |
| `paid` | Paid | Green | Payment received |
| `completed` | Completed | Emerald | Treatment/service completed |

---

## 🔐 Security Notes

1. **API Endpoint:**
   - ✅ Uses Supabase Auth JWT validation
   - ✅ Service Role Key only on server (never exposed)
   - ✅ Employee users can only update their assigned leads
   - ✅ Admin users can update any lead

2. **Database:**
   - ✅ Status constraint prevents invalid values
   - ✅ RLS policies (if applied) enforce access control

---

## 📝 Next Steps (Future Enhancements)

- [ ] Add status change history/audit log
- [ ] Add status transition rules (e.g., can't go from `new` to `completed`)
- [ ] Add bulk status update
- [ ] Add status-based notifications
- [ ] Add status analytics/dashboard

---

## ✅ Deployment Checklist

- [ ] SQL migration ran successfully
- [ ] Environment variables set in Vercel
- [ ] Code deployed to Vercel
- [ ] New lead gets `new` status ✅
- [ ] Status changes persist ✅
- [ ] Status filter works ✅
- [ ] Error handling works ✅
- [ ] All 5 status values work ✅

---

**Deployment Complete! 🎉**

For issues or questions, check:
- Browser console for frontend errors
- Vercel function logs for API errors
- Supabase logs for database errors

