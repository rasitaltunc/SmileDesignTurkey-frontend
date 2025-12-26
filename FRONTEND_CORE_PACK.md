# Frontend Core Pack - Notes Modal Fix Reference

**Last Commit:** `9209292cf4ef7444b3ed2dcebb18729b5a7ae6a6`  
**Date:** 2024-12-19  
**Purpose:** Complete reference for Notes Modal layout fixes (sticky footer, clamp width, break-all)

---

## 📁 File Structure

### A) Core Files (Must Have)

1. **`src/pages/AdminLeads.tsx`** ✅ (1003 lines)
   - Notes Modal: Lines 888-998
   - Key features:
     - Portal rendering (`createPortal` to `document.body`)
     - Sticky footer (`sticky bottom-0`)
     - Clamp width (`w-[clamp(860px,82vw,1120px)]`)
     - Break-all for long notes (`break-all` + `overflowWrap: "anywhere"`)
     - Body scroll lock when modal open (lines 155-173)

2. **`src/App.tsx`** ✅ (196 lines)
   - Navbar rendering: Line 189 (`<Navbar variant={navbarVariant} minimal={false} />`)
   - Route guards: Lines 120-181 (admin/employee routes with role checks)
   - Navigation context: Lines 19-27, 188-193

3. **`src/main.tsx`** ✅ (18 lines)
   - App bootstrap with HelmetProvider, LanguageProvider
   - PostHog initialization

4. **`src/lib/supabaseClient.ts`** ✅ (39 lines)
   - Supabase client initialization
   - Cached client pattern
   - Safe fallback if env vars missing

### B) Global Styles

5. **`src/index.css`** ✅ (2483 lines)
   - Tailwind CSS v4.1.3 compiled output
   - Custom properties and theme variables
   - No custom overflow/body styles that would interfere

### C) Config Files (Not Found)

- ❌ `tailwind.config.*` - Not found (using Tailwind v4, config in CSS)
- ❌ `postcss.config.*` - Not found (likely using Vite's built-in PostCSS)

---

## 🎯 Notes Modal Critical Sections

### Modal Structure (AdminLeads.tsx lines 888-998)

```typescript
{/* Notes Modal (PORTAL - hard-sticky footer + safe scroll) */}
{notesLeadId &&
  createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center overflow-hidden">
      {/* MODAL ROOT: medium-wide (blue lines target), fixed height */}
      <div className="
        bg-white
        w-[clamp(860px,82vw,1120px)]
        max-w-[96vw]
        h-[72dvh]
        max-h-[calc(100dvh-2rem)]
        rounded-xl shadow-xl
        flex flex-col
        overflow-hidden
      ">
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          ...
        </div>

        {/* BODY: only this area scrolls */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-4">
          ...
          {/* give body bottom padding so last note never hides behind sticky footer */}
          <div className="h-28" />
        </div>

        {/* FOOTER: STICKY + always visible */}
        <div className="border-t bg-white px-6 py-4 shrink-0 sticky bottom-0">
          ...
        </div>
      </div>
    </div>,
    document.body
  )}
```

### Key Fixes Applied

1. **Sticky Footer:**
   - Footer: `sticky bottom-0 shrink-0`
   - Body: `flex-1 min-h-0 overflow-y-auto`
   - Body padding: `<div className="h-28" />` (prevents last note hiding)

2. **Modal Width:**
   - `w-[clamp(860px,82vw,1120px)]` (matches blue lines, responsive)
   - `max-w-[96vw]` (mobile safety)

3. **Long Notes:**
   - Note content: `break-all` + `style={{ overflowWrap: "anywhere" }}`
   - Note wrapper: `max-w-full overflow-hidden`

4. **Body Scroll Lock:**
   - Lines 155-173: `useEffect` locks body scroll when modal open
   - Prevents background scrolling

---

## 🔍 Navbar/Header Overlap Check

**App.tsx Line 189:**
```typescript
<Navbar variant={navbarVariant} minimal={false} />
```

**AdminLeads.tsx Lines 565-622:**
- Page header is conditionally hidden: `{!notesLeadId && (...)}`
- This prevents header from overlapping modal

**Navbar z-index:** Check `src/components/Navbar.tsx` for sticky/fixed positioning
- Modal uses `z-[9999]` which should be above Navbar

---

## 🚨 Known Issues (From User Feedback)

### ✅ Fixed
- Footer always visible (sticky bottom-0)
- Modal width matches blue lines (clamp)
- Long unbroken notes wrap (break-all)

### ⚠️ Potential Issues
- Navbar might still overlap if z-index is higher than 9999
- Safari scroll might need additional fixes
- Textarea might expand layout if content is very long (max-h-28 should prevent)

---

## 📝 Environment Variables Required

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_API_URL=... (optional, defaults to window.location.origin)
```

---

## 🧪 Test Checklist

1. **Many Notes:**
   - [ ] Footer (Close + Add Note) always visible
   - [ ] Notes list scrolls independently
   - [ ] Last note doesn't hide behind footer

2. **Long Unbroken Note:**
   - [ ] Note wraps (no horizontal overflow)
   - [ ] Modal width doesn't expand
   - [ ] No horizontal scrollbar

3. **Modal Width:**
   - [ ] Desktop: ~860-1120px (matches blue lines)
   - [ ] Mobile: Responsive (max-w-[96vw])

4. **Navbar Overlap:**
   - [ ] Modal appears above Navbar
   - [ ] Page header hidden when modal open

---

## 📦 Files Summary

| File | Lines | Status | Notes |
|------|-------|--------|-------|
| `src/pages/AdminLeads.tsx` | 1003 | ✅ Current | Notes Modal: 888-998 |
| `src/App.tsx` | 196 | ✅ Current | Navbar: 189, Routes: 120-181 |
| `src/main.tsx` | 18 | ✅ Current | Bootstrap only |
| `src/lib/supabaseClient.ts` | 39 | ✅ Current | Client initialization |
| `src/index.css` | 2483 | ✅ Current | Tailwind v4 compiled |
| `tailwind.config.*` | - | ❌ Not found | Using Tailwind v4 CSS config |
| `postcss.config.*` | - | ❌ Not found | Vite built-in PostCSS |
| `api/leads.js` | 180 | ✅ Current | GET/PATCH, JWT auth, role-based |
| `api/lead-notes.js` | 107 | ✅ Current | GET/POST, JWT auth, employee checks |
| `api/employees.js` | 64 | ✅ Current | GET, admin only, RPC role check |
| `vercel.json` | 32 | ✅ Current | API rewrites + CORS headers |

---

## 🎯 Next Steps (If Issues Persist)

1. Check `src/components/Navbar.tsx` for z-index/sticky positioning
2. Verify no global CSS overrides in `src/index.css` (body overflow, etc.)
3. Test in Safari DevTools: `$0.scrollHeight > $0.clientHeight` on notes container
4. Verify modal portal renders to `document.body` (not nested in other containers)

---

## 🔧 Backend/API Layer

### API Routes

1. **`api/leads.js`** ✅ (180 lines)
   - **GET** `/api/leads` - List leads (with role-based filtering)
     - Query params: `status` (optional), `limit` (default 200, max 500)
     - Response: `{ leads: [...], debug: { roleRaw, role, uid, email } }`
     - Employee filter: Only shows leads where `assigned_to === user.id`
   - **PATCH** `/api/leads` - Update lead
     - Body: `{ id, status?, notes?, assigned_to?, follow_up_at?, ... }`
     - Response: `{ lead: {...} }`
     - Role restrictions:
       - Admin: Can update all fields (including `assigned_to`)
       - Employee: Can only update `status`, `notes`, `follow_up_at` (NOT `assigned_to`)
   - **Authentication:** JWT Bearer token (`Authorization: Bearer <token>`)
   - **Role lookup:** Direct query to `profiles` table using service role client
   - **Key features:**
     - Uses `authClient` for JWT validation
     - Uses `dbClient` (service role) for DB operations (RLS bypass)
     - Role normalization: `String(role).trim().toLowerCase()`
     - Auto-sets `assigned_by` and `assigned_at` when admin assigns

2. **`api/lead-notes.js`** ✅ (107 lines)
   - **GET** `/api/lead-notes?lead_id=...` - List notes for a lead
     - Response: `{ notes: [...] }`
     - Employee check: Verifies lead is assigned to employee before access
   - **POST** `/api/lead-notes` - Create new note
     - Body: `{ lead_id, note }` (also accepts `content` or `text`)
     - Response: `{ note: {...} }`
     - Employee check: Verifies lead is assigned to employee before creating
   - **Authentication:** JWT Bearer token
   - **Role-based access:** Admin/Employee only
   - **Key features:**
     - Inserts both `note` and `content` fields for compatibility
     - Employee can only access notes for leads assigned to them

3. **`api/employees.js`** ✅ (64 lines)
   - **GET** `/api/employees` - List employees (admin only)
     - Response: `{ employees: [{ id, full_name, role }] }`
     - Filters: Only returns profiles where `role = 'employee'`
   - **Authentication:** JWT Bearer token
   - **Role restriction:** Admin only (uses `get_current_user_role` RPC)
   - **Key features:**
     - Uses RPC for role verification (different from `leads.js`)
     - Service role client for fetching employee list

### Server Configuration

4. **`vercel.json`** ✅ (32 lines)
   - **Rewrites:**
     - `/api/(.*)` → `/api/$1` (API routes)
     - `/(.*)` → `/index.html` (SPA fallback)
   - **CORS Headers** (for `/api/*`):
     - `Access-Control-Allow-Origin: *`
     - `Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS`
     - `Access-Control-Allow-Headers: Content-Type, Authorization`

### Server Helpers

- ❌ `api/_utils/*` - Not found
- ❌ `api/lib/*` - Not found
- ❌ `api/auth.js` - Not found (auth handled in each route)

**Note:** All API routes use CommonJS (`.js`) to avoid ESM/CJS conflicts on Vercel.

### Environment Variables (Vercel)

```env
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=... (server-side only, never exposed)
SUPABASE_ANON_KEY=... (or VITE_SUPABASE_ANON_KEY)
```

### API Authentication Flow

1. **Client:** Gets JWT from Supabase session (`supabase.auth.getSession()`)
2. **Request:** Sends `Authorization: Bearer <token>` header
3. **Server:** Validates JWT using `authClient.auth.getUser()`
4. **Role Check:** Queries `profiles` table (or uses RPC) to get user role
5. **Authorization:** Enforces role-based access (admin/employee)
6. **DB Operations:** Uses `dbClient` (service role) to bypass RLS

### Common Patterns

- **Token extraction:** `getBearerToken(req)` helper in each file
- **CORS:** Set in each handler + `vercel.json`
- **Error handling:** Always returns JSON `{ error: "..." }`
- **Role normalization:** `String(role).trim().toLowerCase()`
- **Service role:** Used for all DB operations (RLS bypass)

---

**Generated:** 2024-12-19  
**Commit:** `9209292cf4ef7444b3ed2dcebb18729b5a7ae6a6`

