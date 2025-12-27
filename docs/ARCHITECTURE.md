# System Architecture

## Overview

Smile Design Turkey CRM is a health tourism CRM system built with:
- **Frontend**: Vite + React + TypeScript
- **Backend**: Vercel Serverless Functions (`/api/*`)
- **Database**: Supabase (PostgreSQL + RLS)
- **Integration**: Cal.com webhook for appointment management

## Core Principles

1. **Security First**: RLS policies, service role only on server, no client-side secrets
2. **Idempotent Operations**: UPSERT patterns, unique indexes
3. **Immutable Audit Trail**: Event history never deleted
4. **Role-Based Access**: Single source of truth (`profiles.role`)

## Database Schema

### Core Tables

#### `public.leads`
- Primary lead storage
- Fields: `id`, `cal_booking_uid`, `cal_booking_id`, `meeting_start`, `meeting_end`, `email`, `name`, `status`, `source`, etc.
- Unique constraint on `cal_booking_uid` (one lead per booking)
- RLS: Public INSERT, Admin/Employee SELECT

#### `public.cal_webhook_events`
- Immutable audit trail for Cal.com webhooks
- Fields: `id`, `received_at`, `event_type`, `trigger_event`, `cal_booking_uid`, `lead_id`, `payload` (JSONB)
- Never deleted (audit trail)
- RLS: Admin/Employee SELECT, Service role INSERT

#### `public.profiles`
- User profiles with roles
- Fields: `id` (FK to `auth.users`), `role` (admin/employee/patient/doctor)
- Single source of truth for authorization
- RLS: Users can SELECT own profile

#### `public.lead_notes`
- Internal notes for leads
- Fields: `id`, `lead_id`, `author_id`, `note`, `created_at`
- RLS: Admin/Employee can CRUD

### Migrations

Run these in order in Supabase SQL Editor:

1. `supabase/leads.sql` - Base leads table
2. `supabase/migration_crm_*.sql` - CRM fields (status, notes, assigned_to)
3. `supabase/migration_leads_cal_fields.sql` - Cal.com fields
4. `supabase/migration_cal_webhook_events.sql` - Event history table
5. `supabase/profiles_backfill.sql` - Ensure all users have profiles
6. `supabase/fix_rls_single_source.sql` - RLS policies using profiles.role

## API Routes

### `/api/cal-webhook` (POST)
- **Auth**: `x-cal-secret` header (or query param)
- **Purpose**: Receive Cal.com webhook events
- **Flow**:
  1. Verify secret
  2. Normalize event type
  3. Insert to `cal_webhook_events` (immutable)
  4. Upsert to `leads` (by `cal_booking_uid`)
  5. Update event history with `lead_id`
- **Idempotent**: Yes (UPSERT by `cal_booking_uid`)

### `/api/leads-timeline` (GET)
- **Auth**: `x-admin-token` header
- **Purpose**: Get timeline events for a lead
- **Flow**:
  1. Verify admin token
  2. Get lead by ID
  3. Query `cal_webhook_events` by `cal_booking_uid`
  4. Return sorted timeline
- **Response**: `{ ok: true, timeline: [...] }`

### `/api/lead-notes` (GET, POST)
- **Auth**: JWT Bearer token
- **Purpose**: Manage lead notes
- **RLS**: Admin/Employee only

### `/api/leads` (GET, PATCH)
- **Auth**: JWT Bearer token
- **Purpose**: Read/update leads
- **RLS**: Admin (all), Employee (assigned only)

## Security Model

### Authentication
- **Frontend**: Supabase Auth (JWT tokens)
- **Admin APIs**: `x-admin-token` header (from `VITE_ADMIN_TOKEN`)
- **Webhooks**: `x-cal-secret` header (from `CAL_WEBHOOK_SECRET`)

### Authorization
- **Single Source**: `profiles.role` (not JWT claims)
- **RLS Policies**: Check `EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')`
- **Service Role**: Only in Vercel API routes (never exposed to client)

### Row Level Security (RLS)
- **Leads**: Public INSERT, Admin/Employee SELECT
- **cal_webhook_events**: Admin/Employee SELECT, Service role INSERT
- **lead_notes**: Admin/Employee CRUD
- **profiles**: Users can SELECT own profile

## Cal.com Integration Flow

```
Cal.com Webhook
    ↓
/api/cal-webhook (Vercel)
    ↓
1. Verify secret
2. Normalize event type
3. Insert to cal_webhook_events (idempotent)
    ↓
4. Extract booking data (uid, email, name, times)
5. Upsert to leads (by cal_booking_uid)
    ↓
6. Update cal_webhook_events.lead_id
    ↓
Response: 200 OK
```

### Event Types
- `booking.created` → Create/update lead, status='booked'
- `booking.rescheduled` → Update lead (meeting times)
- `booking.cancelled` → (TODO: Update status)

## Frontend Architecture

### State Management
- **Auth**: `useAuthStore` (Zustand)
- **Leads**: Server state (fetch on mount)
- **Notes**: Local state in modal

### Route Protection
- **Public**: `/`, `/treatments`, `/pricing`, etc.
- **Protected**: `/admin/*`, `/employee/*`, `/patient/*`, `/doctor/*`
- **Guard**: `App.tsx` checks `isAuthenticated` and `role`

### Components
- **AdminLeads**: Main admin panel with leads table, notes modal, timeline
- **PatientPortal**: Patient document upload/view
- **Login**: Demo login with test users

## Best Practices

### Database
1. Always use unique indexes for UPSERT operations
2. Never match by non-unique fields (use IDs)
3. Use `profiles.role` for authorization (not JWT)
4. Service role key only in API routes

### API Routes
1. Always set CORS headers
2. Verify auth before processing
3. Return 200 for webhooks (even on errors, log them)
4. Use idempotent operations (UPSERT)

### Frontend
1. Fetch with JWT from Supabase session
2. Use admin token from env var
3. Handle loading/error states
4. Follow Tailwind patterns

## Environment Variables

### Vercel (Production)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `ADMIN_TOKEN`
- `CAL_WEBHOOK_SECRET`
- `CAL_BASE_URL`

### Frontend (Vite)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ADMIN_TOKEN`
- `VITE_API_URL` (optional, defaults to origin)

## Future Enhancements

1. **AI Integration**: Use event history for timeline reasoning
2. **Analytics**: Query `cal_webhook_events` for booking patterns
3. **Automation**: Auto-assign leads based on booking data
4. **Notifications**: Alert on booking changes
5. **Reporting**: Dashboard with booking metrics

## Troubleshooting

### Webhook not receiving events
1. Check `CAL_WEBHOOK_SECRET` in Vercel
2. Verify Cal.com webhook URL is correct
3. Check Vercel function logs
4. Test with `curl` and `x-cal-secret` header

### Timeline empty
1. Check `cal_booking_uid` exists in lead
2. Verify `cal_webhook_events` has records
3. Check RLS policies allow SELECT
4. Verify admin token in frontend

### RLS blocking access
1. Run `supabase/profiles_backfill.sql`
2. Run `supabase/fix_rls_single_source.sql`
3. Verify `profiles.role` is set correctly
4. Check RLS policies use `profiles.role` (not JWT)

