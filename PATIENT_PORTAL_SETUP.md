# Patient Portal v1 - Setup Guide

## ✅ Implementation Complete

Patient Portal v1 has been implemented with:
- ✅ Database table (`patient_portal_links`) with RLS policies
- ✅ Storage bucket (`patient_uploads`) with path-based access control
- ✅ Frontend portal page with upload/download/delete functionality
- ✅ Role-based routing and redirects
- ✅ Helper functions for patient data access

---

## 🚀 Deployment Steps

### Step 1: Run SQL Migration

1. Open **Supabase Dashboard → SQL Editor**
2. Copy the entire contents of `supabase/migration_patient_portal.sql`
3. Run the migration
4. Verify:
   - ✅ Table `patient_portal_links` exists
   - ✅ View `patient_portal_data` exists
   - ✅ RLS is enabled on `patient_portal_links`
   - ✅ Storage bucket `patient_uploads` exists (or create it manually if SQL fails)
   - ✅ Storage policies exist (check Storage → Policies)

**Note**: If bucket creation fails in SQL, create it manually:
- Go to **Storage → Buckets**
- Create bucket: `patient_uploads`
- Set to **Private**
- File size limit: 50MB
- Allowed MIME types: `image/*`, `application/pdf`, `.doc`, `.docx`

### Step 2: Link a Patient to a Lead (Admin Only)

To test the portal, you need to link a patient user to a lead:

```sql
-- Example: Link patient user to a lead
-- Replace <patient_user_id> with actual auth.users.id
-- Replace <lead_id> with actual leads.id

INSERT INTO patient_portal_links (patient_id, lead_id)
VALUES (
  '<patient_user_id>',  -- e.g., from auth.users table
  '<lead_id>'           -- e.g., from leads table
)
ON CONFLICT (patient_id) DO UPDATE SET lead_id = EXCLUDED.lead_id;
```

**To find patient user ID:**
```sql
SELECT id, email FROM auth.users WHERE email = 'patient@smiledesignturkey.com';
```

**To find a lead ID:**
```sql
SELECT id, name, email FROM leads LIMIT 10;
```

### Step 3: Deploy Frontend

Code is already committed and pushed. Vercel will auto-deploy.

**No environment variables needed** - uses existing:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## 🧪 Acceptance Testing

### Test 1: Login & Redirect
1. Login as `patient@smiledesignturkey.com`
2. Should redirect to `/patient/portal`
3. Portal should load without errors

### Test 2: View Portal Data
1. Portal should show patient's linked lead information:
   - Name, Email, Phone, Treatment Interest, Plan Created Date
2. If no linked lead, should show empty state: "Your plan is not yet linked..."

### Test 3: Upload Files
1. Click upload area or choose files
2. Select 2 files (images/PDF/Word docs)
3. Files should show upload progress
4. After upload, files should appear in list
5. Toast notification should show success

### Test 4: Refresh & Persistence
1. Refresh the page
2. Uploaded files should still be listed
3. Patient info should still be visible

### Test 5: Download Files
1. Click download icon on a file
2. File should open in new tab (or download)

### Test 6: Delete Files
1. Click delete icon on a file
2. Confirm deletion
3. File should disappear from list
4. Toast notification should show success

### Test 7: Security (Isolation)
1. Login as patient user A
2. Upload a file
3. Logout
4. Login as patient user B (or different user)
5. Should NOT see patient A's files
6. Verify: Only files in `patient/<patient_B_id>/` folder are visible

---

## 📁 File Structure

```
src/
├── pages/
│   ├── PatientPortal.tsx      # Main portal page
│   └── DoctorPortal.tsx        # Placeholder page
├── lib/
│   └── patientPortal.ts        # Helper functions (getPatientPortalData, uploadPatientFile, etc.)
└── App.tsx                     # Routes added: /patient/portal, /doctor/portal

supabase/
└── migration_patient_portal.sql # Database schema + RLS + storage policies
```

---

## 🔒 Security Summary

### RLS Policies
- **patient_portal_links**: Patient can SELECT only where `patient_id = auth.uid()`
- **patient_portal_data view**: Same RLS as table (patient sees only own data)
- **Admin/Employee**: Can SELECT all portal links (for management)

### Storage Policies
- **INSERT**: Patient can upload only to `patient/<auth.uid()>/*` path
- **SELECT**: Patient can view only files in `patient/<auth.uid()>/*` path
- **UPDATE**: Patient can update only files in `patient/<auth.uid()>/*` path
- **DELETE**: Patient can delete only files in `patient/<auth.uid()>/*` path
- **Admin/Employee**: Can SELECT all files (for management)

### Frontend Security
- ✅ Uses Supabase anon client (no service role exposed)
- ✅ All operations check authentication via `getSession()`
- ✅ Path validation in helper functions (prevents path traversal)
- ✅ Role-based route protection in `App.tsx`

---

## 🐛 Troubleshooting

### "No linked lead" shown even after linking
- Check: `patient_portal_links` table has correct `patient_id` and `lead_id`
- Verify: User is logged in as correct patient user
- Check: RLS policy allows SELECT for this patient

### Upload fails with "Forbidden" or 403
- Check: Storage bucket `patient_uploads` exists
- Check: Storage policies are created correctly
- Verify: File path matches `patient/<auth.uid()>/<filename>` pattern
- Check: Bucket is not public (should be private)

### Files not appearing in list
- Check: Files were uploaded successfully (no errors)
- Check: File path in storage matches `patient/<patient_id>/...`
- Verify: `getPatientFiles()` function lists correct folder
- Check: Browser console for errors

### Download/Open fails
- Check: Signed URL generation works (bucket is private)
- Verify: File still exists in storage
- Check: Storage policies allow SELECT for this path

---

## 📝 Next Steps (Future Enhancements)

1. **Photo Preview**: Show thumbnails for uploaded images
2. **File Categories**: Organize files by type (photos, documents, x-rays)
3. **Comments**: Allow patients to add notes to files
4. **Notifications**: Notify patient when admin reviews/approves files
5. **File Size Optimization**: Compress images before upload
6. **Bulk Upload**: Drag-and-drop multiple files at once
7. **Admin Review**: Admin can view/comment on patient files

---

## ✅ Checklist

- [x] SQL migration created
- [x] Storage bucket policies defined
- [x] Frontend portal page created
- [x] Upload/download/delete functionality
- [x] Routes added to App.tsx
- [x] Login redirect logic updated
- [x] Code committed and pushed
- [ ] **SQL migration run in Supabase** (YOU NEED TO DO THIS)
- [ ] **Link patient user to a lead** (YOU NEED TO DO THIS)
- [ ] **Test all acceptance criteria** (YOU NEED TO DO THIS)

---

**Commit Hash**: `e7fce606`  
**Files Changed**: 6 files (1 SQL migration, 3 new React pages/components, 2 modified)

