# Contact Attempts Log - Phase 2 Implementation

## ✅ Completed Features

### 1. Database: `lead_contact_events` Table
**File:** `supabase/migration_lead_contact_events.sql`

**Schema:**
- `id` (BIGSERIAL PRIMARY KEY)
- `lead_id` (TEXT, FK → leads.id)
- `channel` (TEXT, CHECK: phone/whatsapp/email/sms/other)
- `note` (TEXT, nullable)
- `created_at` (TIMESTAMP WITH TIME ZONE, default NOW())
- `created_by` (TEXT, FK → auth.users.id, nullable)

**Indexes:**
- `idx_lead_contact_events_lead_id` (for lead lookups)
- `idx_lead_contact_events_created_at` (for sorting)
- `idx_lead_contact_events_created_by` (for user tracking)
- `idx_lead_contact_events_lead_created` (composite, for "recent contacts for a lead")

**RLS Policies:**
- ✅ Admin and employee can SELECT
- ✅ Service role can INSERT (via API endpoints)

---

### 2. API Endpoints

#### GET `/api/leads-contact-events?lead_id=xxx&limit=5`
**File:** `api/leads-contact-events.js`

**Auth:** `x-admin-token` (admin-only)

**Response:**
```json
{
  "ok": true,
  "events": [
    {
      "id": 1,
      "lead_id": "lead-123",
      "channel": "phone",
      "note": "Called, left voicemail",
      "created_at": "2025-12-27T10:30:00Z",
      "created_by": null
    }
  ]
}
```

#### POST `/api/leads-contact-events`
**File:** `api/leads-contact-events.js`

**Auth:** `x-admin-token` (admin-only)

**Body:**
```json
{
  "lead_id": "lead-123",
  "channel": "phone",
  "note": "Quick note (optional)"
}
```

**Response:**
```json
{
  "ok": true,
  "event": {
    "id": 1,
    "lead_id": "lead-123",
    "channel": "phone",
    "note": "Quick note",
    "created_at": "2025-12-27T10:30:00Z",
    "created_by": null
  }
}
```

**Side Effects:**
- Also updates `leads.last_contacted_at = now()`

---

### 3. Enhanced: `POST /api/leads-mark-contacted`
**File:** `api/leads-mark-contacted.js`

**Updated Behavior:**
- Now also inserts a contact event (default channel: `phone`)
- Optional `channel` and `note` in request body
- Returns `contact_event` in response

**Request Body (optional fields):**
```json
{
  "lead_id": "lead-123",
  "channel": "whatsapp",  // optional, default: "phone"
  "note": "Sent WhatsApp message"  // optional
}
```

---

### 4. Admin UI: Contact Events Section
**File:** `src/pages/AdminLeads.tsx`

**Location:** Notes modal (between Timeline and Notes sections)

**Features:**
- ✅ **Quick Add Form:**
  - Channel selector (phone/whatsapp/email/sms/other)
  - Note input (optional)
  - "Add" button
  - No page reload (optimistic update)

- ✅ **Contact Events List:**
  - Shows last 5 contact events
  - Channel icons (Phone/WhatsApp/Email/SMS)
  - Formatted date/time
  - Note display (if present)
  - Hover effects

**UI Layout:**
```
┌─────────────────────────────────────┐
│ Contact Attempts                    │
├─────────────────────────────────────┤
│ [Quick Add Form]                    │
│ [Channel ▼] [Note input] [Add]      │
├─────────────────────────────────────┤
│ 📞 Phone — Dec 27, 10:30            │
│    "Called, left voicemail"         │
│                                     │
│ 💬 WhatsApp — Dec 26, 14:20         │
│    "Sent treatment info"            │
└─────────────────────────────────────┘
```

---

## 📋 Production Deployment Steps

### Step 1: Run Migration
```sql
-- Run in Supabase SQL Editor
-- File: supabase/migration_lead_contact_events.sql
```

**Verify:**
```sql
-- Run verification queries
-- File: supabase/verify_contact_events.sql
```

**Expected:**
- ✅ Table exists with 6 columns
- ✅ 5 indexes created
- ✅ RLS enabled
- ✅ 1 SELECT policy (admin/employee)
- ✅ Foreign key to `leads` table

---

### Step 2: Test API Endpoints

#### Test GET (list events)
```bash
curl -X GET "https://your-domain.vercel.app/api/leads-contact-events?lead_id=test-lead-id&limit=5" \
  -H "x-admin-token: YOUR_ADMIN_TOKEN"
```

**Expected:** `{ "ok": true, "events": [] }` (empty if no events)

#### Test POST (add event)
```bash
curl -X POST "https://your-domain.vercel.app/api/leads-contact-events" \
  -H "Content-Type: application/json" \
  -H "x-admin-token: YOUR_ADMIN_TOKEN" \
  -d '{
    "lead_id": "test-lead-id",
    "channel": "phone",
    "note": "Test contact attempt"
  }'
```

**Expected:** `{ "ok": true, "event": { ... } }`

#### Test Mark Contacted (enhanced)
```bash
curl -X POST "https://your-domain.vercel.app/api/leads-mark-contacted" \
  -H "Content-Type: application/json" \
  -H "x-admin-token: YOUR_ADMIN_TOKEN" \
  -d '{
    "lead_id": "test-lead-id",
    "channel": "whatsapp",
    "note": "Sent WhatsApp message"
  }'
```

**Expected:** 
```json
{
  "ok": true,
  "leadId": "test-lead-id",
  "last_contacted_at": "2025-12-27T...",
  "contact_event": { ... }
}
```

---

### Step 3: Test Frontend UI

1. **Login as admin** → `/admin/leads`
2. **Open Notes modal** on any lead
3. **Verify Contact Attempts section:**
   - ✅ Quick Add form visible
   - ✅ Channel selector works
   - ✅ Note input works
   - ✅ "Add" button creates event (no reload)
   - ✅ New event appears in list immediately

4. **Test "Mark Contacted" button:**
   - ✅ Click "Mark Contacted" (green button in header)
   - ✅ Verify contact event is created
   - ✅ Verify `last_contacted_at` updates
   - ✅ Verify event appears in Contact Attempts list

---

## 🎯 Usage Workflow

### Scenario 1: Quick Add Contact Event
1. Open Notes modal for a lead
2. Scroll to "Contact Attempts" section
3. Select channel (phone/whatsapp/email/sms/other)
4. (Optional) Add a note
5. Click "Add"
6. ✅ Event appears immediately (no reload)

### Scenario 2: Mark Contacted (with event)
1. Open Notes modal for a lead
2. Click "Mark Contacted" button (header)
3. ✅ Contact event created (default: phone)
4. ✅ `last_contacted_at` updated
5. ✅ Event appears in Contact Attempts list

### Scenario 3: View Contact History
1. Open Notes modal for a lead
2. Scroll to "Contact Attempts" section
3. ✅ See last 5 contact events
4. ✅ See channel, date/time, notes

---

## 🔍 Verification Queries

### Check recent contact events for a lead
```sql
SELECT 
  id,
  channel,
  note,
  created_at,
  created_by
FROM public.lead_contact_events
WHERE lead_id = 'your-lead-id'
ORDER BY created_at DESC
LIMIT 5;
```

### Count contact events by channel
```sql
SELECT 
  channel,
  COUNT(*) as count
FROM public.lead_contact_events
GROUP BY channel
ORDER BY count DESC;
```

### Find leads with no contact events
```sql
SELECT 
  l.id,
  l.name,
  l.email,
  l.last_contacted_at
FROM public.leads l
LEFT JOIN public.lead_contact_events lce ON l.id = lce.lead_id
WHERE lce.id IS NULL
ORDER BY l.created_at DESC
LIMIT 20;
```

### Find leads with stale contact (7+ days)
```sql
SELECT 
  l.id,
  l.name,
  l.email,
  l.last_contacted_at,
  MAX(lce.created_at) as last_event_at,
  COUNT(lce.id) as event_count
FROM public.leads l
LEFT JOIN public.lead_contact_events lce ON l.id = lce.lead_id
WHERE l.last_contacted_at < NOW() - INTERVAL '7 days'
  OR l.last_contacted_at IS NULL
GROUP BY l.id, l.name, l.email, l.last_contacted_at
ORDER BY l.last_contacted_at DESC NULLS LAST
LIMIT 20;
```

---

## 🔄 Future Enhancements (Optional)

### Automatic Event Creation
- **Trigger on note creation:** Auto-create contact event when note is added
- **Trigger on status change:** Auto-create event when status changes to "contacted"
- **Email/SMS integration:** Auto-create events when emails/SMS are sent

### Enhanced UI
- **Contact frequency chart:** Visualize contact patterns
- **Channel analytics:** Show which channels are most effective
- **Bulk actions:** Mark multiple leads as contacted

### Analytics
- **Response rates:** Correlate contact frequency with conversions
- **Optimal timing:** Learn best days/times to contact
- **Channel effectiveness:** Track which channels lead to bookings

---

## ✅ Checklist

- [x] Database table created (`lead_contact_events`)
- [x] Indexes created (5 indexes)
- [x] RLS policies configured (admin/employee SELECT)
- [x] API endpoint: GET `/api/leads-contact-events`
- [x] API endpoint: POST `/api/leads-contact-events`
- [x] Enhanced: POST `/api/leads-mark-contacted` (creates event)
- [x] Frontend: Contact Events section in Notes modal
- [x] Frontend: Quick Add form (no reload)
- [x] Frontend: Contact events list (last 5)
- [x] Frontend: Channel icons and formatting
- [x] Verification queries provided

---

**Status:** ✅ Ready for Production  
**Files Changed:**
- `supabase/migration_lead_contact_events.sql` (new)
- `supabase/verify_contact_events.sql` (new)
- `api/leads-contact-events.js` (new)
- `api/leads-mark-contacted.js` (enhanced)
- `src/pages/AdminLeads.tsx` (UI added)

