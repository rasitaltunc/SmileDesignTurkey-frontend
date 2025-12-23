# 🚀 CRM Status Fix - Deployment Steps

## 📋 Quick Checklist

- [ ] Run SQL migration
- [ ] Deploy code changes
- [ ] Test status updates
- [ ] Verify normalization

---

## Step 1: Database Migration

### Run SQL Migration

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project
   - Navigate to: **SQL Editor**

2. **Run Migration**
   - Open file: `supabase/migration_normalize_status_values.sql`
   - Copy entire contents
   - Paste into SQL Editor
   - Click **Run**

3. **Verify Migration**
   ```sql
   -- Check status distribution (should only show lowercase)
   SELECT status, COUNT(*) 
   FROM leads 
   GROUP BY status 
   ORDER BY status;
   
   -- Should return: new, contacted, booked, paid, completed (all lowercase)
   ```

---

## Step 2: Deploy Code

### Git Commit & Push

```bash
# Add all changes
git add .

# Commit
git commit -m "fix: Normalize CRM lead status values to lowercase canonical format"

# Push to trigger Vercel deployment
git push origin main
```

### Or Deploy via Vercel CLI

```bash
vercel --prod
```

---

## Step 3: Manual Testing

### Test 1: Verify Existing Data Normalized

```sql
-- Run in Supabase SQL Editor
SELECT status, COUNT(*) as count 
FROM leads 
GROUP BY status 
ORDER BY status;
```

**Expected:** Only lowercase values (`new`, `contacted`, `booked`, `paid`, `completed`)

### Test 2: New Lead Gets Default Status

1. Submit a new lead via contact form
2. Open `/admin/leads`
3. **Verify:**
   - Status shows **"New"** (Title Case)
   - Badge is yellow
   - Database has `'new'` (lowercase)

### Test 3: Status Update Works

1. Edit a lead
2. Change status to "Contacted"
3. Save
4. **Verify:**
   - UI shows "Contacted" (Title Case)
   - Badge is blue
   - Refresh page → still "Contacted"
   - Database has `'contacted'` (lowercase)

### Test 4: Status Filter Works

1. Use status dropdown → select "Contacted"
2. **Verify:** Only contacted leads shown
3. Clear filter
4. **Verify:** All leads shown

---

## ✅ Verification

### Database Check
```sql
-- Should return 0 rows (no invalid statuses)
SELECT id, status 
FROM leads 
WHERE status NOT IN ('new', 'contacted', 'booked', 'paid', 'completed');
```

### UI Check
- Status badges show Title Case (New, Contacted, etc.)
- Status dropdown works
- Status changes persist after refresh

### API Check
- Status updates work
- Invalid statuses are rejected
- Case variations are normalized

---

## 🐛 If Issues Occur

1. **Hard refresh browser:** Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
2. **Check Vercel logs:** Dashboard → Functions → logs
3. **Check Supabase logs:** Dashboard → Logs
4. **Verify migration ran:** Check status distribution query

---

**Deployment Complete! ✅**

