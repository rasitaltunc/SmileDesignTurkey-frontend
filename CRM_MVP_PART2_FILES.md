# 📋 CRM MVP Part 2 - Files Changed

## New Files Created

1. **`supabase/migration_crm_followup_notes.sql`**
   - Adds `follow_up_at` column to leads
   - Creates `lead_notes` table
   - Sets up RLS policies
   - Creates indexes

2. **`api/lead-notes.ts`**
   - GET endpoint for fetching notes
   - POST endpoint for creating notes
   - Auth validation with Supabase JWT
   - Access control enforcement

3. **`CRM_MVP_PART2_SUMMARY.md`**
   - Complete documentation

4. **`CRM_MVP_PART2_FILES.md`**
   - This file

## Files Modified

1. **`api/leads.ts`**
   - Added `follow_up_at` to `LeadUpdate` interface
   - Added `follow_up_at` handling in PATCH endpoint
   - Validates ISO string format
   - Allows null to clear follow-up

2. **`src/pages/AdminLeads.tsx`**
   - Added `follow_up_at` to Lead interface
   - Added `LeadNote` interface
   - Added follow-up column to table
   - Added datetime-local input in edit mode
   - Added Notes button and modal
   - Added notes loading/creation functions

---

## Exact Code Changes

### `api/leads.ts`

**Line 12-17 (Interface):**
```typescript
interface LeadUpdate {
  id: string;
  status?: string;
  notes?: string;
  assigned_to?: string;
  follow_up_at?: string | null; // ✅ ADDED
}
```

**Line 160-173 (PATCH handler):**
```typescript
// ✅ ADDED: Handle follow_up_at
if (follow_up_at !== undefined) {
  if (follow_up_at === null || follow_up_at === '') {
    update.follow_up_at = null;
  } else if (typeof follow_up_at === 'string') {
    const date = new Date(follow_up_at);
    if (isNaN(date.getTime())) {
      return res.status(400).json({ error: 'Invalid follow_up_at format. Must be ISO 8601 string.' });
    }
    update.follow_up_at = date.toISOString();
  }
}
```

### `src/pages/AdminLeads.tsx`

**Line 1-4 (Imports):**
```typescript
import { MessageSquare, Clock } from 'lucide-react'; // ✅ ADDED
```

**Line 15-31 (Interfaces):**
```typescript
interface Lead {
  // ... existing fields
  follow_up_at?: string; // ✅ ADDED
}

interface LeadNote { // ✅ NEW
  id: string;
  lead_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}
```

**Line 45-52 (State):**
```typescript
const [editFollowUpAt, setEditFollowUpAt] = useState<string>(''); // ✅ ADDED

// Notes modal state // ✅ NEW
const [notesLeadId, setNotesLeadId] = useState<string | null>(null);
const [notes, setNotes] = useState<LeadNote[]>([]);
const [newNoteContent, setNewNoteContent] = useState<string>('');
const [isLoadingNotes, setIsLoadingNotes] = useState(false);
const [isSavingNote, setIsSavingNote] = useState(false);
```

**Line 128 (Function signature):**
```typescript
const updateLead = async (leadId: string, updates: { 
  status?: string; 
  notes?: string; 
  assigned_to?: string; 
  follow_up_at?: string | null; // ✅ ADDED
}) => {
```

**Line 200-234 (handleEditStart):**
```typescript
// ✅ ADDED: Format follow_up_at for datetime-local
if (lead.follow_up_at) {
  const date = new Date(lead.follow_up_at);
  const localDateTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  setEditFollowUpAt(localDateTime);
} else {
  setEditFollowUpAt('');
}
```

**Line 236-260 (handleEditSave):**
```typescript
// ✅ ADDED: Handle follow_up_at conversion
const currentFollowUpAt = editingLead.follow_up_at 
  ? new Date(editingLead.follow_up_at).toISOString()
  : null;
const newFollowUpAt = editFollowUpAt 
  ? new Date(editFollowUpAt).toISOString()
  : null;

if (newFollowUpAt !== currentFollowUpAt) {
  updates.follow_up_at = newFollowUpAt || null;
}
```

**Line 270-353 (Notes functions):**
```typescript
// ✅ NEW: loadNotes, createNote, handleOpenNotes, handleCloseNotes
```

**Line 498-501 (Table headers):**
```typescript
<th>Follow-up</th> // ✅ ADDED after Status
```

**Line 558-576 (Follow-up cell):**
```typescript
// ✅ ADDED: Follow-up column with datetime-local input
```

**Line 612-626 (Actions cell):**
```typescript
// ✅ ADDED: Notes button
<button onClick={() => handleOpenNotes(lead.id)}>
  <MessageSquare className="w-4 h-4" />
</button>
```

**Line 636-720 (Notes modal):**
```typescript
// ✅ NEW: Complete notes modal component
```

---

## SQL Migration Details

### File: `supabase/migration_crm_followup_notes.sql`

**What it does:**
1. Adds `follow_up_at` column (if not exists)
2. Creates `lead_notes` table
3. Sets up RLS policies (4 policies)
4. Creates indexes (3 indexes)
5. Adds trigger for `updated_at`

**To run:**
```sql
-- Copy entire file contents
-- Paste in Supabase Dashboard > SQL Editor
-- Click Run
```

---

## API Endpoint Details

### File: `api/lead-notes.ts`

**GET /api/lead-notes?leadId={id}**
- Validates JWT token
- Checks user access to lead
- Returns notes (newest first)

**POST /api/lead-notes**
- Validates JWT token
- Checks user access to lead
- Creates note with `author_id = user.id`
- Returns created note

---

## Manual Test Checklist

- [ ] **Test 1:** Set follow-up date → persists
- [ ] **Test 2:** Clear follow-up date → becomes null
- [ ] **Test 3:** View notes modal → opens and loads
- [ ] **Test 4:** Add note → appears in list
- [ ] **Test 5:** Multiple notes → newest first
- [ ] **Test 6:** Access control → employee can only see assigned leads' notes
- [ ] **Test 7:** Integration → follow-up and notes work together

---

**All files ready for deployment! ✅**

