// api/doctor/lead.js
// GET /api/doctor/lead?ref=... (ref = lead_uuid or lead.id)
// Returns privacy-filtered single lead with snapshot and documents
// Auth: Bearer JWT (doctor role required) - schema-safe (no column assumptions)

const { createClient } = require("@supabase/supabase-js");
const { toDoctorLeadDTO } = require("./_doctorPrivacy");

// ✅ Build SHA for deployment verification
const buildSha =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.VERCEL_GIT_COMMIT_REF ||
  process.env.GITHUB_SHA ||
  null;

function getBearerToken(req) {
  const h = req.headers.authorization;
  if (!h) return null;
  const [type, token] = String(h).split(" ");
  if (!type || type.toLowerCase() !== "bearer") return null;
  return token || null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(v) {
  return typeof v === "string" && UUID_RE.test(v.trim());
}

module.exports = async function handler(req, res) {
  const requestId = `doctor_lead_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  try {
    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Cache-Control", "no-store");

    if (req.method === "OPTIONS") return res.status(200).end();

    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed", requestId, buildSha });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY; // For JWT verification

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({
        ok: false,
        error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
        requestId,
        buildSha,
      });
    }

    const jwt = getBearerToken(req);
    if (!jwt) {
      return res.status(401).json({ ok: false, error: "Missing Authorization Bearer token", requestId, buildSha });
    }

    // Use anon key for JWT verification (as per existing pattern in api/leads.js)
    const authClient = createClient(
      supabaseUrl,
      supabaseAnonKey || supabaseServiceKey,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // Verify JWT and get user
    const { data: userData, error: userErr } = await authClient.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return res.status(401).json({ ok: false, error: "Invalid session", requestId, buildSha });
    }

    const user = userData.user;

    // Service role client for DB operations
    const dbClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Verify doctor role
    const { data: profile, error: profErr } = await dbClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profErr || profile?.role !== "doctor") {
      return res.status(403).json({ ok: false, error: "Forbidden: doctor access only", requestId, buildSha });
    }

    // Get ref parameter (UUID or TEXT id)
    const ref = req.query?.ref ? String(req.query.ref).trim() : null;
    if (!ref) {
      return res.status(400).json({ ok: false, error: "Missing ref parameter", requestId, buildSha });
    }

    // ✅ Schema-safe: Use select("*") then map to allowlist (no column assumptions)
    let q = dbClient
      .from("leads")
      .select("*")
      .eq("doctor_id", user.id); // ✅ Doctor can only see their assigned leads

    // Resolve ref (UUID or TEXT id)
    if (isUuid(ref)) {
      q = q.eq("lead_uuid", ref);
    } else {
      q = q.eq("id", ref);
    }

    const { data: lead, error } = await q.maybeSingle();

    if (error) {
      console.error("[doctor/lead] Query error:", error, { requestId, buildSha });
      return res.status(500).json({ ok: false, error: error.message, requestId, buildSha });
    }

    if (!lead) {
      return res.status(404).json({ ok: false, error: "Lead not found or not assigned to you", requestId, buildSha });
    }

    // ✅ Privacy filter: map to safe response using helper - schema-safe
    const safeLead = toDoctorLeadDTO(lead);
    
    if (!safeLead) {
      return res.status(404).json({ ok: false, error: "Lead not found or not assigned to you", requestId, buildSha });
    }

    // Fetch documents (if table exists) - exclude passport/ID
    let documents = [];
    try {
      const { data: docsData, error: docsErr } = await dbClient
        .from("lead_documents")
        .select("*")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false });

      if (docsErr) {
        console.debug("[doctor/lead] Documents query error (table may not exist):", docsErr?.message);
      } else if (docsData && Array.isArray(docsData)) {
        // ✅ Exclude passport/ID documents
        documents = docsData
          .filter((doc) => {
            const type = String(doc.type || "").toLowerCase();
            const filename = String(doc.filename || "").toLowerCase();
            const category = String(doc.category || "").toLowerCase();
            
            // Exclude if contains passport/ID indicators
            if (
              type.includes("passport") ||
              type.includes("id") ||
              filename.includes("passport") ||
              filename.includes("id") ||
              category.includes("passport") ||
              category.includes("id")
            ) {
              return false;
            }
            return true;
          })
          .map((doc) => ({
            id: doc.id || null,
            type: doc.type || "other",
            url: doc.url || null,
            filename: doc.filename || null,
            created_at: doc.created_at || null,
          }));
      }
    } catch (docsErr) {
      // Table might not exist, continue without crashing
      console.debug("[doctor/lead] Documents fetch skipped:", docsErr?.message);
    }

    return res.status(200).json({
      ok: true,
      lead: safeLead,
      documents: documents,
      requestId,
      buildSha,
    });
  } catch (err) {
    console.error("[doctor/lead] Handler crash:", err, { requestId, buildSha });
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Internal server error",
      requestId,
      buildSha,
    });
  }
};

