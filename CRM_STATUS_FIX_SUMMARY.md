# ✅ CRM Lead Status System - End-to-End Fix

## 🎯 Problem Fixed

**Issue:** Status values were inconsistent across the system:
- Database had mixed case: `NEW`, `New`, `Contacted`, `CONTACTED`
- UI displayed inconsistent formats
- API didn't normalize incoming values

**Solution:** Standardized to **lowercase canonical values** everywhere:
- Database: `new`, `contacted`, `booked`, `paid`, `completed`
- UI Display: **Title Case** (New, Contacted, Booked, Paid, Completed)
- API: Normalizes and validates all inputs

---

## 📁 Files Changed

### 1. Database Migration
**File:** `supabase/migration_normalize_status_values.sql` (NEW)
- Normalizes ALL existing status values to lowercase
- Handles any case variations: `NEW`, `New`, `new`, `Contacted`, etc.
- Maps old values to new canonical values
- Sets default to `'new'`
- Adds constraint to enforce only canonical values

### 2. API Endpoint
**File:** `api/leads.ts`
- ✅ Normalizes incoming status to lowercase
- ✅ Validates against canonical values only
- ✅ Returns clear error messages with Title Case suggestions

### 3. Frontend UI
**File:** `src/pages/AdminLeads.tsx`
- ✅ Displays status in **Title Case** (New, Contacted, etc.)
- ✅ Stores status in **lowercase** (new, contacted, etc.)
- ✅ Normalizes status when editing (handles any case from DB)
- ✅ Normalizes filter values

---

## 🗄️ SQL Migration

### File: `supabase/migration_normalize_status_values.sql`

**What it does:**
1. Ensures `status` column exists with default `'new'`
2. Normalizes ALL existing values to lowercase using `LOWER(TRIM(status))`
3. Maps old status values to new canonical values:
   - `qualified` → `contacted`
   - `quote_sent` → `booked`
   - `closed` → `completed`
   - `lost` → `contacted`
4. Sets NULL/empty values to `'new'`
5. Updates column default to `'new'`
6. Drops old constraint and adds new one with canonical values only
7. Creates index for performance

**To run:**
```sql
-- Copy contents of migration_normalize_status_values.sql
-- Paste in Supabase Dashboard > SQL Editor
-- Click Run
```

---

## 🔌 API Changes

### Status Normalization

**Before:**
```typescript
if (typeof status === 'string' && status.trim()) {
  update.status = status; // Could be any case
}
```

**After:**
```typescript
if (typeof status === 'string' && status.trim()) {
  const normalizedStatus = status.trim().toLowerCase(); // Always lowercase
  // Validate against canonical values
  if (!validStatuses.includes(normalizedStatus)) {
    return res.status(400).json({ error: 'Invalid status...' });
  }
  update.status = normalizedStatus; // Store lowercase
}
```

**Benefits:**
- ✅ Accepts any case input (`NEW`, `New`, `new` → all become `new`)
- ✅ Always stores canonical lowercase
- ✅ Clear error messages with Title Case suggestions

---

## 🎨 UI Changes

### Display: Title Case
```typescript
// Status badge shows Title Case
{STATUS_OPTIONS.find(s => s.value === lead.status?.toLowerCase())?.label || 
 (lead.status ? lead.status.charAt(0).toUpperCase() + lead.status.slice(1).toLowerCase() : 'New')}
```

### Storage: Lowercase
```typescript
// When saving, always normalize to lowercase
const normalizedEditStatus = editStatus.toLowerCase();
updates.status = normalizedEditStatus;
```

### Filter: Normalized
```typescript
// Filter comparison uses lowercase
if (filterStatus) {
  query = query.eq('status', filterStatus.toLowerCase());
}
```

---

## ✅ Canonical Status Values

| Value (DB) | Display (UI) | Badge Color | Description |
|------------|--------------|-------------|-------------|
| `new` | New | 🟡 Yellow | Just submitted |
| `contacted` | Contacted | 🔵 Blue | Initial contact made |
| `booked` | Booked | 🟣 Purple | Appointment booked |
| `paid` | Paid | 🟢 Green | Payment received |
| `completed` | Completed | 🟢 Emerald | Service completed |

---

## 🧪 Manual Test Steps

### Test 1: Verify Migration Normalized Existing Data

```sql
-- Run in Supabase SQL Editor
SELECT status, COUNT(*) as count 
FROM leads 
GROUP BY status 
ORDER BY status;

-- Expected: Only lowercase values
-- new, contacted, booked, paid, completed
```

### Test 2: New Lead Gets Default Status

1. Submit a new lead via contact form
2. Open AdminLeads page (`/admin/leads`)
3. **Verify:**
   - New lead appears with status **"New"** (Title Case display)
   - Status badge is yellow
   - Database value is `'new'` (lowercase)

**SQL Check:**
```sql
SELECT id, name, status, created_at 
FROM leads 
ORDER BY created_at DESC 
LIMIT 1;
-- status should be: 'new'
```

### Test 3: Status Update Normalizes Input

1. **Test with uppercase input:**
   - Edit a lead
   - Manually type `"CONTACTED"` in status field (if possible)
   - Save
   - **Verify:** Status becomes `'contacted'` in database

2. **Test with mixed case:**
   - Edit a lead
   - Change status to "Booked" (from dropdown)
   - Save
   - **Verify:** 
     - UI shows "Booked" (Title Case)
     - Database has `'booked'` (lowercase)
     - Badge is purple

### Test 4: Status Persists After Refresh

1. Change a lead's status from "New" to "Contacted"
2. **Verify:** Status badge immediately updates (optimistic UI)
3. Refresh page (F5)
4. **Verify:** Status is still "Contacted" (Title Case display)
5. **SQL Check:**
   ```sql
   SELECT id, status FROM leads WHERE id = 'your-lead-id';
   -- Should return: status = 'contacted' (lowercase)
   ```

### Test 5: Status Filter Works

1. Use status dropdown filter
2. Select "Contacted"
3. **Verify:** Only leads with `status = 'contacted'` are shown
4. Clear filter
5. **Verify:** All leads shown again

### Test 6: Invalid Status Rejected

**Test via API directly:**
```bash
curl -X PATCH https://your-site.vercel.app/api/leads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"id":"test-id","status":"INVALID"}'

# Expected: 400 error with message about valid statuses
```

### Test 7: Case Insensitive Input Accepted

**Test via API:**
```bash
# All of these should work and normalize to 'contacted':
curl ... -d '{"id":"test-id","status":"CONTACTED"}'  # Uppercase
curl ... -d '{"id":"test-id","status":"Contacted"}'  # Title Case
curl ... -d '{"id":"test-id","status":"contacted"}'  # Lowercase (canonical)
```

---

## 🔍 Verification Queries

### Check Status Distribution
```sql
SELECT status, COUNT(*) as count 
FROM leads 
GROUP BY status 
ORDER BY status;
```

**Expected Result:**
- Only lowercase values: `new`, `contacted`, `booked`, `paid`, `completed`
- No uppercase or mixed case values

### Check for Invalid Statuses
```sql
SELECT id, status 
FROM leads 
WHERE status NOT IN ('new', 'contacted', 'booked', 'paid', 'completed');
```

**Expected Result:** 0 rows

### Check Default Value
```sql
SELECT column_default 
FROM information_schema.columns 
WHERE table_name = 'leads' AND column_name = 'status';
```

**Expected Result:** `'new'::text`

### Check Constraint
```sql
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'leads'::regclass 
AND conname = 'leads_status_check';
```

**Expected Result:** Constraint enforcing `('new', 'contacted', 'booked', 'paid', 'completed')`

---

## 🚀 Deployment Steps

### Step 1: Run Database Migration

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy contents of `supabase/migration_normalize_status_values.sql`
3. Paste and click **Run**
4. Verify with queries above

### Step 2: Deploy Code Changes

```bash
git add .
git commit -m "fix: Normalize CRM lead status values to lowercase canonical format"
git push origin main
```

### Step 3: Verify Deployment

1. Check Vercel deployment succeeded
2. Test all manual test steps above
3. Verify no errors in browser console
4. Verify no errors in Vercel function logs

---

## 🐛 Troubleshooting

### Issue: Still seeing mixed case in UI

**Solution:**
1. Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)
2. Clear browser cache
3. Verify migration ran successfully
4. Check database directly: `SELECT status FROM leads LIMIT 10;`

### Issue: Status updates not persisting

**Check:**
1. API endpoint is deployed
2. Environment variables set in Vercel
3. Supabase Service Role Key is correct
4. Check browser console for errors
5. Check Vercel function logs

### Issue: Invalid status error

**Check:**
1. Status value is one of: `new`, `contacted`, `booked`, `paid`, `completed`
2. API normalizes to lowercase automatically
3. If still error, check API logs for exact error message

---

## ✅ Summary

**What's Fixed:**
- ✅ Database: All status values normalized to lowercase
- ✅ API: Normalizes and validates all status inputs
- ✅ UI: Displays Title Case, stores lowercase
- ✅ Consistency: One canonical format everywhere

**Canonical Values:**
- `new` (default)
- `contacted`
- `booked`
- `paid`
- `completed`

**Display Format:**
- New, Contacted, Booked, Paid, Completed (Title Case)

**Storage Format:**
- new, contacted, booked, paid, completed (lowercase)

---

**Status System Fixed! ✅**

All status values are now consistent across database, API, and UI.

