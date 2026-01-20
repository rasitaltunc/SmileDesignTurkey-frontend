// api/public/portal-login-password.js
// Login with email + password (returns portal session credentials)

const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const db = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ✅ Minimum brute-force protection: Track failed attempts in-memory
const failedAttempts = new Map(); // key: "ip:email", value: { count, resetAt }

function getClientIP(req) {
  return req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || 
         req.headers["x-real-ip"] || 
         req.connection?.remoteAddress || 
         "unknown";
}

function resetAttempts(key) {
  failedAttempts.delete(key);
}

function recordFailedAttempt(key) {
  const now = Date.now();
  const resetAt = now + 10 * 60 * 1000; // 10 minutes
  const existing = failedAttempts.get(key);
  
  if (existing && existing.resetAt > now) {
    existing.count += 1;
    existing.resetAt = resetAt;
  } else {
    failedAttempts.set(key, { count: 1, resetAt });
  }
}

function checkRateLimit(key) {
  const entry = failedAttempts.get(key);
  if (!entry) return false;
  
  const now = Date.now();
  if (entry.resetAt < now) {
    // Expired, reset
    resetAttempts(key);
    return false;
  }
  
  return entry.count > 8; // More than 8 attempts in 10 minutes
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  if (!url || !serviceKey) {
    return res.status(500).json({ ok: false, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const email = String(body.email || "").toLowerCase().trim();
    const password = String(body.password || "");

    if (!email || !password) {
      return res.status(400).json({ ok: false, error: "Invalid credentials" }); // Generic error
    }

    // ✅ Rate limiting check
    const clientIP = getClientIP(req);
    const rateLimitKey = `${clientIP}:${email}`;
    
    if (checkRateLimit(rateLimitKey)) {
      return res.status(429).json({ ok: false, error: "Too many attempts, try again later" });
    }

    // Canonical lead bul: en eski active lead (merge mantığına uyum)
    const { data: leads, error: leadErr } = await db
      .from("leads")
      .select("id, case_id, portal_token, status, email")
      .eq("email", email)
      .neq("status", "closed")
      .order("created_at", { ascending: true })
      .limit(1);

    if (leadErr || !leads?.length) {
      // Always return generic error (don't reveal if email exists)
      recordFailedAttempt(rateLimitKey);
      return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }

    const lead = leads[0];

    const { data: authRow } = await db
      .from("lead_portal_auth")
      .select("password_hash")
      .eq("lead_id", lead.id)
      .maybeSingle();

    if (!authRow?.password_hash) {
      // Always return generic error
      recordFailedAttempt(rateLimitKey);
      return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, authRow.password_hash);
    if (!ok) {
      // Record failed attempt
      recordFailedAttempt(rateLimitKey);
      // Always return generic error
      return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }

    // ✅ Success: reset attempts counter
    resetAttempts(rateLimitKey);

    // Return session credentials (frontend will create portal session)
    return res.status(200).json({
      ok: true,
      case_id: lead.case_id,
      portal_token: lead.portal_token,
    });
  } catch (e) {
    console.error("[portal-login-password] Error:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
};

