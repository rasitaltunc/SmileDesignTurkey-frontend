# Team-Based Lead Assignment Setup

This document explains how to set up and use the team-based lead assignment system for the GuideHealth admin panel.

## Overview

The system allows:
- **Admins** to view ALL leads, assign them to team members, and update status/notes
- **Team members** to view ONLY leads assigned to them and update status/notes

All operations are secured via Vercel serverless functions using Supabase Service Role key (never exposed to client).

## Prerequisites

1. Supabase project with `leads` table
2. Vercel deployment
3. Environment variables configured

## Step 1: Database Migration

Run the migration SQL in your Supabase SQL Editor:

```bash
# File: supabase_migration_leads_team.sql
```

This adds:
- `assigned_to` (TEXT) - Team member ID
- `status` (TEXT) - Lead status (NEW, CONTACTED, QUALIFIED, QUOTE_SENT, CLOSED, LOST)
- `notes` (TEXT) - Internal notes
- `updated_at` (TIMESTAMP) - Auto-updated on changes
- Indexes for performance
- Trigger to maintain `updated_at`

**To run:**
1. Open Supabase Dashboard > SQL Editor
2. Paste contents of `supabase_migration_leads_team.sql`
3. Click "Run"

The migration is idempotent (safe to run multiple times).

## Step 2: Vercel Environment Variables

Add these environment variables in Vercel Dashboard > Settings > Environment Variables:

### Required

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # NEVER expose to client

# Admin Authentication
ADMIN_TOKEN=your-secure-admin-token  # e.g., "rasit123!"

# Employee Authentication
EMPLOYEE_SECRET=your-shared-employee-secret  # Same for all employees
```

### Notes

- `SUPABASE_SERVICE_ROLE_KEY`: Get from Supabase Dashboard > Settings > API > Service Role Key
- `ADMIN_TOKEN`: Choose a strong, random token (e.g., use `openssl rand -hex 32`)
- `EMPLOYEE_SECRET`: Shared secret for all employees (can be same as ADMIN_TOKEN or different)

## Step 3: Deploy

After adding environment variables:

```bash
# Redeploy without cache to ensure env vars are loaded
vercel --prod
```

Or trigger a redeploy from Vercel Dashboard.

## Step 4: Access Admin Panel

1. Visit: `https://your-site.vercel.app/admin/leads`
2. Enter your token (see below)
3. Click "Login"

## Authentication Tokens

### Admin Token

Use your `ADMIN_TOKEN` directly:

```
rasit123!
```

**Capabilities:**
- View ALL leads
- Filter by status and assigned_to
- Update status, notes, and assigned_to
- Assign leads to any team member

### Employee Token

Format: `EMPLOYEE:<employee_id>:<employee_secret>`

Example:
```
EMPLOYEE:agent1:your-shared-secret
EMPLOYEE:agent2:your-shared-secret
```

**Capabilities:**
- View ONLY leads assigned to them (`assigned_to == employee_id`)
- Update status and notes (NOT assigned_to)
- Cannot see unassigned leads or leads assigned to others

### Team Members

Edit `src/pages/AdminLeads.tsx` to add/remove team members:

```typescript
const TEAM = [
  { id: 'rasit', label: 'Rasit (Admin)' },
  { id: 'agent1', label: 'Agent 1' },
  { id: 'agent2', label: 'Agent 2' },
];
```

## API Endpoints

### GET /api/leads

Fetch leads with optional filters.

**Headers:**
```
X-Admin-Token: <your-token>
```

**Query Parameters:**
- `limit` (number, default: 100) - Max results
- `status` (string, optional) - Filter by status
- `assigned_to` (string, optional) - Filter by assignee (admin only)

**Response:**
```json
{
  "data": [
    {
      "id": "lead-123",
      "created_at": "2024-01-15T10:00:00Z",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "source": "onboarding",
      "status": "NEW",
      "assigned_to": "agent1",
      "notes": "Interested in implants",
      ...
    }
  ]
}
```

**Employee Behavior:**
- `assigned_to` filter is ignored
- Always returns only leads where `assigned_to == employee_id`

### PATCH /api/leads

Update lead fields.

**Headers:**
```
X-Admin-Token: <your-token>
Content-Type: application/json
```

**Body:**
```json
{
  "id": "lead-123",
  "status": "CONTACTED",  // optional
  "notes": "Called on Jan 15",  // optional
  "assigned_to": "agent1"  // optional, admin only
}
```

**Response:**
```json
{
  "data": {
    "id": "lead-123",
    "status": "CONTACTED",
    "notes": "Called on Jan 15",
    "assigned_to": "agent1"
  }
}
```

**Employee Restrictions:**
- Cannot update `assigned_to`
- Can only update leads where `assigned_to == employee_id`

## Status Values

- `NEW` - New lead (default)
- `CONTACTED` - Initial contact made
- `QUALIFIED` - Lead qualified
- `QUOTE_SENT` - Quote sent to lead
- `CLOSED` - Deal closed
- `LOST` - Lead lost

## Security Notes

1. **Service Role Key**: Never expose `SUPABASE_SERVICE_ROLE_KEY` to client. It's only used in Vercel serverless functions.

2. **Token Storage**: Tokens are stored in browser memory (not localStorage) for security. Users must re-login on refresh.

3. **CORS**: API endpoints allow CORS from your domain. Adjust in `api/leads.ts` if needed.

4. **Rate Limiting**: Consider adding rate limiting in production (e.g., via Vercel Edge Middleware).

## Troubleshooting

### "Invalid token" error
- Check that token matches exactly (no extra spaces)
- Verify `ADMIN_TOKEN` or `EMPLOYEE_SECRET` in Vercel env vars
- Ensure token format is correct (employee: `EMPLOYEE:id:secret`)

### "Failed to load leads"
- Check Supabase connection (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
- Verify migration ran successfully
- Check Vercel function logs

### Employee sees no leads
- Ensure leads are assigned to their `employee_id`
- Check `assigned_to` field in database
- Verify employee token format: `EMPLOYEE:<id>:<secret>`

### Changes not saving
- Check Vercel function logs for errors
- Verify `SUPABASE_SERVICE_ROLE_KEY` has write permissions
- Ensure migration added `updated_at` trigger

## Development

### Local Testing

For local development, you can test the API by:

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel dev`
3. API will be available at `http://localhost:3000/api/leads`

**Note:** You'll need to set environment variables in `.env.local` or via Vercel CLI.

### Testing Tokens

```bash
# Test admin token
curl -H "X-Admin-Token: your-admin-token" \
  http://localhost:3000/api/leads

# Test employee token
curl -H "X-Admin-Token: EMPLOYEE:agent1:your-secret" \
  http://localhost:3000/api/leads
```

## Files Modified/Created

- `supabase_migration_leads_team.sql` - Database migration
- `api/leads.ts` - Vercel serverless function
- `src/pages/AdminLeads.tsx` - Admin UI (rewritten)
- `src/components/Footer.tsx` - Added dev-only admin link
- `package.json` - Added `@vercel/node` dependency

## Next Steps

1. Run migration in Supabase
2. Add environment variables in Vercel
3. Redeploy
4. Test with admin token
5. Create employee tokens and test employee access
6. Customize team list in `AdminLeads.tsx`

## Support

For issues or questions:
- Check Vercel function logs: Vercel Dashboard > Functions > `/api/leads`
- Check Supabase logs: Supabase Dashboard > Logs
- Review this documentation

