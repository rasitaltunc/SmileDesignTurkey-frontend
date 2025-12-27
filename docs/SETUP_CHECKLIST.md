# Setup Checklist

## ✅ Completed Infrastructure

- [x] Cal.com webhook integration
- [x] Event history (immutable audit trail)
- [x] Lead ↔ event secure ID linking
- [x] Timeline UI in admin panel
- [x] RLS policies (role-based, single source of truth)
- [x] Admin / Employee role separation
- [x] Patient portal with document upload
- [x] Patient intake form

## 🗄️ Database Migrations (Run in Supabase SQL Editor)

Run these in order:

1. **Base Schema**
   ```sql
   -- supabase/leads.sql
   -- Creates base leads table
   ```

2. **CRM Fields**
   ```sql
   -- supabase/migration_crm_*.sql
   -- Adds: status, notes, assigned_to, updated_at
   ```

3. **Cal.com Integration**
   ```sql
   -- supabase/migration_leads_cal_fields.sql
   -- Adds: cal_booking_uid, cal_booking_id, meeting_start, meeting_end
   ```

4. **Event History**
   ```sql
   -- supabase/migration_cal_webhook_events.sql
   -- Creates cal_webhook_events table
   ```

5. **Profiles & RLS**
   ```sql
   -- supabase/profiles_backfill.sql
   -- Ensures all users have profiles with roles
   
   -- supabase/fix_rls_single_source.sql
   -- Updates RLS policies to use profiles.role
   ```

## 🔐 Environment Variables

### Vercel (Production)

Add these in Vercel Dashboard → Settings → Environment Variables:

```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_ANON_KEY=eyJ...
ADMIN_TOKEN=your-admin-token-here
CAL_WEBHOOK_SECRET=your-cal-webhook-secret
CAL_BASE_URL=https://app.cal.com/your-username
```

### Frontend (Vite)

Add these in `.env.local` (or Vercel environment variables):

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_ADMIN_TOKEN=your-admin-token-here
VITE_API_URL=https://your-domain.vercel.app (optional)
```

## 🔗 Cal.com Setup

1. **Webhook Configuration**
   - URL: `https://your-domain.vercel.app/api/cal-webhook`
   - Secret: Same as `CAL_WEBHOOK_SECRET` in Vercel
   - Events: `booking.created`, `booking.rescheduled`, `booking.cancelled`
   - Toggle: ON

2. **Test Webhook**
   ```bash
   curl -X POST "https://your-domain.vercel.app/api/cal-webhook" \
     -H "Content-Type: application/json" \
     -H "x-cal-secret: your-secret" \
     -d '{"type":"ping","payload":{"id":"test"}}'
   ```

3. **Verify Event History**
   - Check Supabase: `SELECT * FROM cal_webhook_events ORDER BY received_at DESC LIMIT 10;`
   - Check Vercel logs: Functions → `api/cal-webhook` → Logs

## 🧪 Test Users

After running `supabase/profiles_backfill.sql`, these test users exist:

- `admin@smiledesignturkey.com` → Admin
- `employee1@smiledesignturkey.com` → Employee
- `patient@smiledesignturkey.com` → Patient
- `doctor@smiledesignturkey.com` → Doctor

## ✅ Verification Steps

### 1. Database
```sql
-- Check profiles exist
SELECT u.email, p.role 
FROM auth.users u 
LEFT JOIN public.profiles p ON p.id = u.id;

-- Check RLS policies
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;

-- Check Cal.com fields
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'leads' 
AND column_name IN ('cal_booking_uid', 'meeting_start', 'meeting_end');
```

### 2. API Endpoints
```bash
# Test admin token
curl -H "x-admin-token: your-token" \
  "https://your-domain.vercel.app/api/leads-timeline?lead_id=test"

# Test Cal.com webhook
curl -X POST "https://your-domain.vercel.app/api/cal-webhook" \
  -H "x-cal-secret: your-secret" \
  -H "Content-Type: application/json" \
  -d '{"type":"booking.created","payload":{"uid":"test123"}}'
```

### 3. Frontend
- [ ] Login as admin → `/admin/leads`
- [ ] Open lead notes modal → Timeline section visible
- [ ] Create Cal.com booking → Check lead created
- [ ] View timeline → Events appear

## 🚨 Common Issues

### "Unauthorized" errors
- Run `supabase/profiles_backfill.sql`
- Run `supabase/fix_rls_single_source.sql`
- Check `profiles.role` is set correctly

### Timeline empty
- Check `cal_booking_uid` exists in lead
- Verify `cal_webhook_events` has records
- Check admin token in frontend

### Webhook not receiving
- Verify `CAL_WEBHOOK_SECRET` in Vercel
- Check Cal.com webhook URL is correct
- Test with `curl` and check Vercel logs

### RLS blocking
- Verify RLS policies use `profiles.role` (not JWT)
- Check service role key is used in API routes
- Verify user has correct role in `profiles` table

## 📚 Documentation

- **Architecture**: `docs/ARCHITECTURE.md`
- **Senior Engineer Context**: `.cursor/prompts/senior-engineer-context.md`
- **API Routes**: See `api/*.js` files
- **Migrations**: See `supabase/*.sql` files

## 🎯 Next Steps

1. Run all migrations in Supabase SQL Editor
2. Set environment variables in Vercel
3. Configure Cal.com webhook
4. Test with real booking
5. Verify timeline appears in admin panel

---

**Status**: ✅ AI-ready CRM infrastructure complete

