# Supabase Production-Safe Lead Capture Setup

This guide explains how to set up secure lead capture with Supabase.

## Overview

- ✅ Leads are saved to **localStorage** (fallback) + **Supabase** (production)
- ✅ Public can **INSERT** leads (anon key)
- ❌ Public **CANNOT** read leads (RLS blocks SELECT)
- ✅ Admins read leads via **secure Edge Function** (Service Role key server-side)

## Step-by-Step Setup

### 1. Create Supabase Table

1. Go to Supabase Dashboard > SQL Editor
2. Paste and run `supabase/leads.sql`
3. This creates the table with RLS enabled

### 2. Deploy Edge Function

The Edge Function allows admins to read leads securely without exposing Service Role key.

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link your project (get project-ref from Dashboard > Settings > General)
supabase link --project-ref your-project-ref

# Set secrets in Supabase Dashboard:
# 1. Go to: Edge Functions > admin-leads > Settings
# 2. Add these secrets:
#    - ADMIN_TOKEN: Your admin token (same as VITE_ADMIN_TOKEN)
#    - SUPABASE_SERVICE_ROLE_KEY: From Dashboard > Settings > API
#    - SUPABASE_URL: Your project URL (optional)

# Deploy
supabase functions deploy admin-leads
```

### 3. Configure Environment Variables

**Client-side (.env.local):**
```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ADMIN_TOKEN=your-admin-token
```

**Server-side (Supabase Dashboard > Edge Functions > admin-leads > Settings):**
```
ADMIN_TOKEN=your-admin-token
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_URL=https://your-project-ref.supabase.co
```

### 4. Test

1. Submit a lead via contact form or onboarding
2. Check Supabase Dashboard > Table Editor > leads (should see the lead)
3. Go to `/admin/leads?token=your-admin-token`
4. Click "Load from Supabase" button
5. Should see leads from Supabase

## Security Model

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ├─ INSERT leads (anon key) ✅
       │
       ├─ SELECT leads (anon key) ❌ BLOCKED by RLS
       │
       └─ GET /functions/v1/admin-leads?token=...
              │
              ▼
       ┌──────────────────┐
       │ Edge Function    │
       │ (Service Role)   │ ✅
       └──────────────────┘
              │
              ▼
       ┌─────────────┐
       │  Supabase   │
       │   leads     │
       └─────────────┘
```

## Troubleshooting

### "Unauthorized" error when loading Supabase leads

- Check that `VITE_ADMIN_TOKEN` matches `ADMIN_TOKEN` in Edge Function settings
- Verify token is passed in URL: `/admin/leads?token=your-token`

### "Failed to fetch leads from Supabase"

- Check Edge Function is deployed: `supabase functions list`
- Verify secrets are set in Dashboard > Edge Functions > admin-leads > Settings
- Check function logs: `supabase functions logs admin-leads`

### Leads not appearing in Supabase

- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
- Check browser console for errors
- Verify RLS policy allows INSERT (should be enabled by default)

## Local Development

```bash
# Serve Edge Function locally
supabase functions serve admin-leads --env-file .env.local

# Function will be at: http://localhost:54321/functions/v1/admin-leads
```

## Production Deployment

After deploying your frontend:

1. Ensure Edge Function is deployed: `supabase functions deploy admin-leads`
2. Set production secrets in Supabase Dashboard
3. Update `VITE_SUPABASE_URL` in your hosting platform's env vars
4. Test admin page: `https://your-domain.com/admin/leads?token=your-token`

