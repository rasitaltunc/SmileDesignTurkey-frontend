// api/doctor/lead.js
// GET /api/doctor/lead?ref=... (ref = lead_uuid UUID or lead.id TEXT)
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
  const debugMode = req.query?.debug === "1";

  try {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Cache-Control", "no-store");

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed", requestId, buildSha });
    }

    // ✅ Ping mode (no auth, no DB) — deploy verification
    if (req.query?.ping === "1") {
      return res.status(200).json({ ok: true, ping: "doctor/lead", requestId, buildSha });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({
        ok: false,
        error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
        step: "env_check",
        requestId,
        buildSha,
        ...(debugMode ? { debug: { hasUrl: !!supabaseUrl, hasServiceKey: !!supabaseServiceKey } } : {}),
      });
    }

    const jwt = getBearerToken(req);
    if (!jwt) {
      return res.status(401).json({
        ok: false,
        error: "Missing Authorization Bearer token",
        step: "auth_check",
        requestId,
        buildSha,
      });
    }

    // Use anon key for JWT verification
    const authClient = createClient(
      supabaseUrl,
      supabaseAnonKey || supabaseServiceKey,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // Verify JWT and get user
    let user;
    try {
      const { data: userData, error: userErr } = await authClient.auth.getUser(jwt);
      if (userErr || !userData?.user) {
        return res.status(401).json({
          ok: false,
          error: "Invalid session",
          step: "jwt_verify",
          requestId,
          buildSha,
          ...(debugMode ? { debug: { jwtError: userErr?.message } } : {}),
        });
      }
      user = userData.user;
    } catch (authErr) {
      return res.status(401).json({
        ok: false,
        error: "Auth verification failed",
        step: "jwt_verify",
        requestId,
        buildSha,
        ...(debugMode ? { debug: { error: authErr?.message } } : {}),
      });
    }

    // Service role client for DB operations
    const dbClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Verify doctor role
    let profile;
    try {
      const { data: profData, error: profErr } = await dbClient
        .from("profiles")
        .select("id, role")
        .eq("id", user.id)
        .maybeSingle();

      if (profErr || !profData || profData.role !== "doctor") {
        return res.status(403).json({
          ok: false,
          error: "Forbidden: doctor access only",
          step: "role_check",
          requestId,
          buildSha,
          ...(debugMode ? { debug: { role: profData?.role || "none", error: profErr?.message } } : {}),
        });
      }
      profile = profData;
    } catch (roleErr) {
      return res.status(500).json({
        ok: false,
        error: "Role check failed",
        step: "role_check",
        requestId,
        buildSha,
        ...(debugMode ? { debug: { error: roleErr?.message } } : {}),
      });
    }

    // ✅ Parse ref from query or body (backward compatibility)
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const ref =
      (req.query?.ref ? String(req.query.ref).trim() : null) ||
      (req.query?.lead_uuid ? String(req.query.lead_uuid).trim() : null) ||
      (req.query?.leadUuid ? String(req.query.leadUuid).trim() : null) ||
      (req.query?.leadId ? String(req.query.leadId).trim() : null) ||
      (req.query?.lead_id ? String(req.query.lead_id).trim() : null) ||
      (body.ref ? String(body.ref).trim() : null) ||
      (body.lead_uuid ? String(body.lead_uuid).trim() : null) ||
      (body.leadUuid ? String(body.leadUuid).trim() : null) ||
      (body.leadId ? String(body.leadId).trim() : null) ||
      (body.lead_id ? String(body.lead_id).trim() : null);

    if (!ref) {
      return res.status(400).json({
        ok: false,
        error: "Missing ref parameter",
        step: "ref_parse",
        requestId,
        buildSha,
      });
    }

    const refIsUuid = isUuid(ref);

    // ✅ AGE-PROOF: Explicit column allowlist (age/gender/snapshot ASLA yok)
    const selectColumns = [
      "id",
      "lead_uuid",
      "name",
      "treatment",
      "timeline",
      "message",
      "status",
      "doctor_id",
      "doctor_review_status",
      "doctor_assigned_at",
      "updated_at",
      "created_at",
      "ai_summary",
    ].join(",");

    // Fetch lead with doctor_id filter
    let lead;
    try {
      let q = dbClient
        .from("leads")
        .select(selectColumns)
        .eq("doctor_id", user.id); // ✅ Doctor can only see their assigned leads

      // Resolve ref (UUID or TEXT id)
      if (refIsUuid) {
        q = q.eq("lead_uuid", ref);
      } else {
        q = q.eq("id", ref);
      }

      const { data: leadData, error: leadErr } = await q.maybeSingle();

      if (leadErr) {
        console.error("[doctor/lead] Query error:", leadErr, { requestId, buildSha, ref, refIsUuid });
        return res.status(500).json({
          ok: false,
          error: leadErr.message || "Lead query failed",
          step: "fetch_lead",
          requestId,
          buildSha,
          ...(debugMode ? { debug: { ref, refIsUuid, error: leadErr.message, code: leadErr.code, queryColumn: refIsUuid ? "lead_uuid" : "id" } } : {}),
        });
      }

      if (!leadData) {
        // ✅ Enhanced debug: show what we searched for
        console.warn("[doctor/lead] Lead not found:", { ref, refIsUuid, doctorId: user.id, searchedColumn: refIsUuid ? "lead_uuid" : "id" });
        return res.status(404).json({
          ok: false,
          error: "Lead not found or not assigned to you",
          step: "fetch_lead",
          requestId,
          buildSha,
          ...(debugMode ? { 
            debug: { 
              ref, 
              refIsUuid, 
              doctorId: user.id,
              searchedColumn: refIsUuid ? "lead_uuid" : "id",
              hint: refIsUuid ? "Searched in lead_uuid column" : "Searched in id (TEXT) column"
            } 
          } : {}),
        });
      }

      lead = leadData;
    } catch (fetchErr) {
      console.error("[doctor/lead] Fetch crash:", fetchErr, { requestId, buildSha });
      return res.status(500).json({
        ok: false,
        error: fetchErr instanceof Error ? fetchErr.message : "Lead fetch failed",
        step: "fetch_lead",
        requestId,
        buildSha,
        ...(debugMode ? { debug: { ref, refIsUuid, error: String(fetchErr) } } : {}),
      });
    }

    // ✅ Privacy filter: map to safe response using helper - schema-safe
    const safeLead = toDoctorLeadDTO(lead);

    if (!safeLead) {
      return res.status(404).json({
        ok: false,
        error: "Lead not found or not assigned to you",
        step: "dto_map",
        requestId,
        buildSha,
      });
    }

    // Fetch documents (if table exists) - exclude passport/ID, non-fatal
    // ✅ Documents join key: lead_documents.lead_id is TEXT, so use lead.id (TEXT)
    // But if lead_documents.lead_id is UUID, we'd need lead.lead_uuid
    // Based on other endpoints, lead_documents.lead_id is TEXT, so use lead.id
    let documents = [];
    let docsError = null;
    try {
      // ✅ Use lead.id (TEXT) as join key - this matches other endpoints (lead-notes, leads-contact-events)
      const docJoinKey = lead.id; // TEXT column
      const { data: docsData, error: docsErr } = await dbClient
        .from("lead_documents")
        .select("*")
        .eq("lead_id", docJoinKey)
        .order("created_at", { ascending: false });

      if (docsErr) {
        docsError = docsErr;
        console.debug("[doctor/lead] Documents query error (table may not exist or join key mismatch):", {
          error: docsErr?.message,
          code: docsErr?.code,
          joinKey: docJoinKey,
          joinKeyType: typeof docJoinKey,
          hint: "lead_documents.lead_id should be TEXT to match lead.id"
        });
      } else if (docsData && Array.isArray(docsData)) {
        // ✅ Exclude passport/ID documents, only allow photos/x-rays/treatment-plan
        documents = docsData
          .filter((doc) => {
            const type = String(doc.type || "").toLowerCase();
            const filename = String(doc.filename || "").toLowerCase();
            const category = String(doc.category || "").toLowerCase();

            // Exclude passport/ID
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
            // Only allow photos, x-rays, treatment-plan
            return (
              type.includes("photo") ||
              type.includes("xray") ||
              type.includes("x-ray") ||
              type.includes("treatment") ||
              category.includes("photo") ||
              category.includes("xray") ||
              category.includes("treatment")
            );
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
      docsError = docsErr;
      console.debug("[doctor/lead] Documents fetch skipped:", docsErr?.message);
    }

    return res.status(200).json({
      ok: true,
      lead: safeLead,
      documents: documents,
      requestId,
      buildSha,
      ...(debugMode && docsError ? { debug: { docsError: docsError.message } } : {}),
    });
  } catch (err) {
    console.error("[doctor/lead] Handler crash:", err, { requestId, buildSha });
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Internal server error",
      step: "handler",
      requestId,
      buildSha,
      ...(debugMode ? { debug: { error: String(err), stack: err?.stack?.split("\n").slice(0, 3) } } : {}),
    });
  }
};
