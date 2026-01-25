// api/_lib/requireDoctor.js
// Common helper for doctor role verification
// Returns { ok: true, user, profile, supa } or { ok: false, status, body }

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;

/**
 * Require doctor role - validates JWT and checks profile role
 * @param {Object} req - Request object
 * @returns {Promise<{ok: boolean, status?: number, body?: any, user?: any, profile?: any, supa?: any}>}
 */
async function requireDoctor(req) {
  // ✅ Extract Bearer token
  const auth = req.headers.authorization || req.headers.Authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : null;

  if (!token) {
    return {
      ok: false,
      status: 401,
      body: {
        ok: false,
        error: "Missing bearer token",
        step: "auth_check",
      },
    };
  }

  // ✅ 1) User resolve (use ANON key for auth, SERVICE key for DB)
  if (!SUPABASE_URL || !ANON_KEY) {
    return {
      ok: false,
      status: 500,
      body: {
        ok: false,
        error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY",
        step: "env_check",
      },
    };
  }

  const supaAuth = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let user;
  try {
    const { data: u, error: uErr } = await supaAuth.auth.getUser(token);
    if (uErr || !u?.user) {
      return {
        ok: false,
        status: 401,
        body: {
          ok: false,
          error: "Invalid session",
          step: "jwt_verify",
          detail: uErr?.message || "User not found",
        },
      };
    }
    user = u.user;
  } catch (authErr) {
    return {
      ok: false,
      status: 401,
      body: {
        ok: false,
        error: "Auth verification failed",
        step: "jwt_verify",
        detail: authErr instanceof Error ? authErr.message : String(authErr),
      },
    };
  }

  const uid = user.id;

  // ✅ 2) DB queries with SERVICE role (RLS bypass)
  if (!SERVICE_KEY) {
    return {
      ok: false,
      status: 500,
      body: {
        ok: false,
        error: "Missing SUPABASE_SERVICE_ROLE_KEY",
        step: "env_check",
      },
    };
  }

  const supa = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ✅ Query profile by id (profiles.id = auth.users.id)
  // Schema: profiles(id uuid PK, role text, full_name text, title text, created_at timestamptz)
  let profile;
  let profileErr;

  try {
    const { data: prof, error: err } = await supa
      .from("profiles")
      .select("id, role, full_name, title")
      .eq("id", uid)
      .maybeSingle();

    if (err) {
      profileErr = err;
    } else {
      profile = prof;
    }
  } catch (queryErr) {
    profileErr = queryErr;
  }

  if (profileErr) {
    return {
      ok: false,
      status: 500,
      body: {
        ok: false,
        error: "Profile lookup failed",
        step: "profile_query",
        detail: profileErr.message || String(profileErr),
      },
    };
  }

  if (!profile) {
    return {
      ok: false,
      status: 403,
      body: {
        ok: false,
        error: "Profile not found",
        step: "profile_check",
        debug: { uid },
      },
    };
  }

  // ✅ Normalize role (trim + toLowerCase)
  const roleNorm = String(profile.role || "").trim().toLowerCase();

  if (roleNorm !== "doctor") {
    return {
      ok: false,
      status: 403,
      body: {
        ok: false,
        error: "Forbidden: doctor access only",
        step: "role_check",
        debug: {
          uid,
          rawRole: profile.role || null,
          normalizedRole: roleNorm,
        },
      },
    };
  }

  // ✅ Success
  return {
    ok: true,
    user,
    profile,
    supa, // Service role client for DB operations
  };
}

module.exports = { requireDoctor };
