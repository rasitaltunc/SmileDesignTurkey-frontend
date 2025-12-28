# DEBUG PACK - Vercel + Supabase / API Sorunu

## 📁 İlgili Dosyalar

### 1. API Endpoints

#### `api/leads.js`
```javascript
// api/leads.js
const { createClient } = require("@supabase/supabase-js");

function getBearerToken(req) {
  const h = req.headers["authorization"] || req.headers["Authorization"];
  if (!h) return null;
  const parts = String(h).split(" ");
  if (parts.length === 2 && parts[0].toLowerCase() === "bearer") return parts[1];
  return null;
}

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return res.status(500).json({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
  }

  // ✅ Anon key with fallback
  const anonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    "";

  if (!anonKey) {
    return res.status(500).json({ error: "Missing SUPABASE_ANON_KEY (or VITE_SUPABASE_ANON_KEY)" });
  }

  // ✅ JWT-based auth
  const jwt = getBearerToken(req);
  if (!jwt) return res.status(401).json({ error: "Missing Authorization Bearer token" });

  // DEBUG header (verify handler execution)
  res.setHeader("x-sdt-api", "leads-v1");

  // auth-bound client (uses caller JWT for auth checks)
  const authClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Verify user via authClient
  const { data: userData, error: userErr } = await authClient.auth.getUser();
  if (userErr || !userData?.user) return res.status(401).json({ error: "Invalid session" });

  const user = userData.user;

  // DB client (service role) - used for DB operations (RLS bypass)
  const dbClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ✅ Role from profiles table (service-role bypasses RLS, more reliable than RPC)
  const { data: prof, error: profErr } = await dbClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profErr) {
    return res.status(500).json({ error: "Failed to read profile role", details: profErr.message });
  }

  // ✅ Normalize role (might be "Admin", "ADMIN", with spaces, etc.)
  const roleRaw = prof?.role;
  const role = String(prof?.role || "").trim().toLowerCase();
  const isAdmin = role === "admin";
  const isEmployee = role === "employee";

  // 🔒 Leads are ONLY for admin/employee
  if (!isAdmin && !isEmployee) {
    return res.status(403).json({ error: "Forbidden: leads access is admin/employee only" });
  }

  // GET /api/leads
  if (req.method === "GET") {
    const { status } = req.query || {};
    const limit = Math.min(parseInt(req.query?.limit || "200", 10) || 200, 500);

    let q = dbClient.from("leads").select("*").order("created_at", { ascending: false }).limit(limit);

    if (status && status !== "all") q = q.eq("status", status);

    // employee sees only assigned leads
    if (isEmployee) q = q.eq("assigned_to", user.id);

    const { data, error } = await q;
    if (error) return res.status(500).json({ error: error.message });
    // TEMP DEBUG: role bilgisini response'a ekle
    return res.status(200).json({ leads: data, debug: { roleRaw, role, uid: user.id, email: user.email } });
  }

  // PATCH /api/leads
  if (req.method === "PATCH") {
    try {
      const body = req.body || {};
      const id = body.id || body.lead_id;
      const lead_uuid = body.lead_uuid;

      const updates = body.updates ? { ...body.updates } : { ...body };
      delete updates.id;
      delete updates.lead_id;
      delete updates.lead_uuid;

      if (!id && !lead_uuid) return res.status(400).json({ error: "Missing id or lead_uuid" });
      if (!Object.keys(updates).length) return res.status(400).json({ error: "No updates provided" });

      // ✅ Admin: her şeyi yapabilir; Employee: assignment alanlarını değiştiremez
      const allowedForAll = [
        "status",
        "notes",
        "follow_up_at",
        "next_action",
        "contacted_at",
        "patient_id",
      ];

      const allowedForAdminExtra = [
        "assigned_to",
        "assigned_at",
        "assigned_by",
      ];

      const allowed = isAdmin ? [...allowedForAll, ...allowedForAdminExtra] : allowedForAll;

      const filtered = Object.fromEntries(
        Object.entries(updates).filter(([k]) => allowed.includes(k))
      );

      if (Object.keys(filtered).length === 0) {
        return res.status(400).json({ error: "No allowed fields to update" });
      }

      // 🔒 Only admin can change assignment
      if (Object.prototype.hasOwnProperty.call(filtered, "assigned_to")) {
        if (!isAdmin) {
          return res.status(403).json({
            error: "Only admins can change assigned_to",
            debug: { roleRaw, role, uid: user.id, email: user.email }
          });
        }

        // prevent spoofing
        filtered.assigned_by = user.id;
        filtered.assigned_at = new Date().toISOString();
      }

      // ✅ UPDATE query: limit yok, single ile net
      let q = dbClient
        .from("leads")
        .update(filtered)
        .select("*");

      if (isEmployee) q = q.eq("assigned_to", user.id);

      q = id ? q.eq("id", id) : q.eq("lead_uuid", lead_uuid);

      const { data, error } = await q.single();

      if (error) {
        return res.status(500).json({ error: error.message, hint: error.hint || null });
      }

      return res.status(200).json({ lead: data });
    } catch (e) {
      return res.status(500).json({ error: e?.message || "Server error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
};
```

#### `api/lead-notes.js`
```javascript
// api/lead-notes.js
const { createClient } = require("@supabase/supabase-js");

function getBearerToken(req) {
  const h = req.headers["authorization"] || req.headers["Authorization"];
  if (!h) return null;
  const parts = String(h).split(" ");
  if (parts.length === 2 && parts[0].toLowerCase() === "bearer") return parts[1];
  return null;
}

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return res.status(500).json({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const jwt = getBearerToken(req);
  if (!jwt) return res.status(401).json({ error: "Missing Authorization Bearer token" });

  const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
  const user = userData?.user;
  if (userErr || !user) return res.status(401).json({ error: "Invalid session" });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = profile?.role || "unknown";
  const isAdmin = role === "admin";
  const isEmployee = role === "employee";

  if (!isAdmin && !isEmployee) {
    return res.status(403).json({ error: "Forbidden: notes are admin/employee only" });
  }

  // GET /api/lead-notes?lead_id=...
  if (req.method === "GET") {
    const lead_id = req.query?.lead_id;
    if (!lead_id) return res.status(400).json({ error: "Missing lead_id" });

    // employee can only access notes for leads assigned to them
    if (isEmployee) {
      const { data: lead } = await supabase
        .from("leads")
        .select("id, assigned_to")
        .eq("id", lead_id)
        .single();

      if (!lead || lead.assigned_to !== user.id) {
        return res.status(403).json({ error: "Forbidden: not assigned" });
      }
    }

    const { data, error } = await supabase
      .from("lead_notes")
      .select("*")
      .eq("lead_id", lead_id)
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ notes: data });
  }

  // POST /api/lead-notes
  if (req.method === "POST") {
    const body = req.body || {};
    const lead_id = body.lead_id || body.leadId;
    const noteText = body.note || body.content || body.text;

    if (!lead_id || !noteText) return res.status(400).json({ error: "Missing lead_id or note" });

    if (isEmployee) {
      const { data: lead } = await supabase
        .from("leads")
        .select("id, assigned_to")
        .eq("id", lead_id)
        .single();

      if (!lead || lead.assigned_to !== user.id) {
        return res.status(403).json({ error: "Forbidden: not assigned" });
      }
    }

    // Insert with both note and content for compatibility
    const { data, error } = await supabase
      .from("lead_notes")
      .insert([{ lead_id, note: noteText, content: noteText }])
      .select("*")
      .limit(1);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ note: data?.[0] || null });
  }

  return res.status(405).json({ error: "Method not allowed" });
};
```

#### `api/employees.js`
```javascript
// api/employees.js
const { createClient } = require("@supabase/supabase-js");

function getBearerToken(req) {
  const h = req.headers["authorization"] || req.headers["Authorization"];
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return res.status(500).json({ error: "Missing server env vars" });
  }

  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: "Missing bearer token" });

  // Verify JWT + role via RPC
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  const authClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: role, error: roleErr } = await authClient.rpc("get_current_user_role");
  if (roleErr) return res.status(401).json({ error: "Invalid token" });

  if (String(role).toLowerCase() !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  // Admin-only: fetch employees using service role
  const adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await adminClient
    .from("profiles")
    .select("id, full_name, role")
    .eq("role", "employee")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ employees: data || [] });
};
```

### 2. Supabase Client

#### `src/lib/supabaseClient.ts`
```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

/**
 * Initialize Supabase client only if env vars are present
 * Returns null if not configured (safe fallback)
 */
export function getSupabaseClient(): SupabaseClient | null {
  // Return cached client if already initialized
  if (supabaseClient) {
    return supabaseClient;
  }

  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  // Only initialize if both env vars exist and are non-empty
  if (!url || !anonKey || url.trim().length === 0 || anonKey.trim().length === 0) {
    return null;
  }

  try {
    supabaseClient = createClient(url, anonKey);
    return supabaseClient;
  } catch (error) {
    console.warn('[Supabase] Failed to initialize client:', error);
    return null;
  }
}

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  return getSupabaseClient() !== null;
}
```

### 3. Vercel Configuration

#### `vercel.json`
```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PATCH, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type, Authorization"
        }
      ]
    }
  ]
}
```

### 4. Environment Variables (Vercel)

#### Gerekli ENV Değişkenleri:

**Frontend (Vite):**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous/public key

**Backend (API Functions):**
- `SUPABASE_URL` - Supabase project URL (aynı değer)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (GÜVENLİK: asla client'a gitmemeli!)
- `SUPABASE_ANON_KEY` - Supabase anonymous key (JWT verify için, opsiyonel)
- `VITE_SUPABASE_ANON_KEY` - Frontend'den almak için (fallback, opsiyonel)

**Opsiyonel:**
- `VITE_API_URL` - Custom API base URL (opsiyonel, default: `window.location.origin`)

**Not:** 
- API functions'da `SUPABASE_ANON_KEY` veya `VITE_SUPABASE_ANON_KEY` kullanılabilir (JWT verify için)
- `SUPABASE_SERVICE_ROLE_KEY` sadece backend'de, asla frontend'de kullanılmamalı
- Frontend'de API URL: `import.meta.env.VITE_API_URL || window.location.origin`

### 5. Frontend API Kullanımı (Örnek)

#### `src/pages/AdminLeads.tsx` (API çağrıları)

```typescript
// JWT token alma
const supabase = getSupabaseClient();
const { data: sessionData } = await supabase.auth.getSession();
const token = sessionData?.session?.access_token;

// API çağrısı
const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
const response = await fetch(`${apiUrl}/api/leads`, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
});
```

### 6. Auth Store

#### `src/store/authStore.ts`
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getSupabaseClient } from '../lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  role: string | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithTestUser: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  fetchRole: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      role: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const supabase = getSupabaseClient();
          if (!supabase) {
            throw new Error('Supabase client not configured. Check your .env file.');
          }

          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            set({ isAuthenticated: false, role: null, user: null });
            throw error;
          }

          const uid = data.user?.id;
          if (!uid) {
            set({ isAuthenticated: false, role: null, user: null });
            throw new Error('Login succeeded but no user returned');
          }

          // Role'u direkt çek (RPC kullanıyor)
          const { data: roleData, error: roleErr } = await supabase.rpc('get_current_user_role');
          const role = roleErr ? null : (String(roleData || '').trim().toLowerCase() || null);

          set({
            user: data.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            role,
          });

          return { user: data.user, role };
        } catch (e: any) {
          set({
            error: e?.message || 'Login failed',
            isLoading: false,
            isAuthenticated: false,
            user: null,
            role: null,
          });
          throw e;
        }
      },

      loginWithTestUser: async (email: string, password: string) => {
        // Similar to login, returns { user, role }
        // ...
      },

      logout: async () => {
        // Clears user, isAuthenticated, role
        // ...
      },

      checkSession: async () => {
        // Checks existing session and fetches role
        // ...
      },

      fetchRole: async () => {
        // Fetches role using RPC: get_current_user_role
        // ...
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
```

**Önemli:**
- `fetchRole()` Supabase RPC fonksiyonu kullanıyor: `get_current_user_role`
- Role store'da persist ediliyor (localStorage)
- Login/logout sonrası role otomatik çekiliyor

### 7. API Endpoint Summary

| Endpoint | Method | Auth | Role Required | Description |
|----------|--------|------|---------------|-------------|
| `/api/leads` | GET | JWT Bearer | admin/employee | List leads (employee sees only assigned) |
| `/api/leads` | PATCH | JWT Bearer | admin/employee | Update lead (admin: all fields, employee: limited) |
| `/api/lead-notes` | GET | JWT Bearer | admin/employee | Get notes for a lead |
| `/api/lead-notes` | POST | JWT Bearer | admin/employee | Create a note for a lead |
| `/api/employees` | GET | JWT Bearer | admin | Get list of employees |

**Authentication Flow:**
1. Frontend: User logs in via Supabase Auth → receives JWT token
2. Frontend: Stores token in session (managed by Supabase client)
3. Frontend: Calls API with `Authorization: Bearer <token>` header
4. Backend: Extracts token from header
5. Backend: Verifies token via `supabase.auth.getUser(jwt)`
6. Backend: Fetches user role from `profiles` table (service role bypasses RLS)
7. Backend: Checks role permissions and executes request

### 8. Package Dependencies

#### `package.json` (ilgili kısımlar)
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.89.0",
    "zustand": "^5.0.9"
  },
  "devDependencies": {
    "@vercel/node": "^3.2.29",
    "typescript": "^5.4.5",
    "vite": "6.3.5"
  }
}
```

## 🔍 Debug Checklist

1. **Vercel Environment Variables:**
   - [ ] `SUPABASE_URL` tanımlı mı?
   - [ ] `SUPABASE_SERVICE_ROLE_KEY` tanımlı mı?
   - [ ] `SUPABASE_ANON_KEY` veya `VITE_SUPABASE_ANON_KEY` tanımlı mı?
   - [ ] `VITE_SUPABASE_URL` frontend için tanımlı mı?
   - [ ] `VITE_SUPABASE_ANON_KEY` frontend için tanımlı mı?

2. **API Function Execution:**
   - [ ] API endpoint'e istek gidiyor mu? (Network tab'da görünüyor mu?)
   - [ ] `x-sdt-api: leads-v1` header'ı response'da var mı? (handler çalışıyor mu?)
   - [ ] CORS header'ları response'da var mı?

3. **Authentication:**
   - [ ] JWT token gönderiliyor mu? (`Authorization: Bearer <token>`)
   - [ ] JWT token geçerli mi? (Supabase'de verify ediliyor mu?)
   - [ ] User profile'da `role` alanı var mı ve doğru mu? (`admin` veya `employee`)

4. **Database:**
   - [ ] `profiles` tablosunda user'ın `role` değeri doğru mu?
   - [ ] `leads` tablosunda data var mı?
   - [ ] RLS policies doğru çalışıyor mu? (Service role kullanıldığı için bypass ediyor olmalı)

## 📝 Önemli Notlar

- API functions CommonJS (`module.exports`) kullanıyor (ESM/CommonJS conflict'i önlemek için)
- JWT authentication kullanılıyor (eski `x-admin-token` kaldırıldı)
- Role kontrolü `profiles` tablosundan yapılıyor (service role ile RLS bypass)
- Service role key **ASLA** frontend'e gitmemeli, sadece API functions'da kullanılmalı

