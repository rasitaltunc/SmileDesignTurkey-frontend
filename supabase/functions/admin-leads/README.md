# Admin Leads Edge Function

Secure server-side endpoint to read leads from Supabase.

## Setup

1. **Install Supabase CLI:**
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase:**
   ```bash
   supabase login
   ```

3. **Link your project:**
   ```bash
   supabase link --project-ref your-project-ref
   ```
   (Find your project ref in Supabase Dashboard > Settings > General)

4. **Set environment variables in Supabase Dashboard:**
   - Go to: Edge Functions > admin-leads > Settings
   - Add secrets:
     - `ADMIN_TOKEN`: Your admin token (same as `VITE_ADMIN_TOKEN`)
     - `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (Dashboard > Settings > API)
     - `SUPABASE_URL`: Your Supabase project URL (optional, auto-detected)

5. **Deploy:**
   ```bash
   supabase functions deploy admin-leads
   ```

## Usage

The function will be available at:
```
https://your-project-ref.supabase.co/functions/v1/admin-leads?token=your-admin-token
```

## Security

- ✅ Uses Service Role key server-side (never exposed to client)
- ✅ Requires admin token verification
- ✅ Bypasses RLS (service role has full access)
- ✅ CORS enabled for frontend access

## Local Development

```bash
# Start Supabase locally (optional)
supabase start

# Serve function locally
supabase functions serve admin-leads --env-file .env.local
```

## Environment Variables

Set these in Supabase Dashboard > Edge Functions > admin-leads > Settings:

- `ADMIN_TOKEN`: Admin token (same as `VITE_ADMIN_TOKEN`)
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key from Dashboard > Settings > API
- `SUPABASE_URL`: Project URL (optional, auto-detected)

