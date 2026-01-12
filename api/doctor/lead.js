// api/doctor/lead.js
// GET /api/doctor/lead?ref=... (ref = lead_uuid UUID or lead.id TEXT)
// Returns privacy-filtered single lead with snapshot and documents
// Auth: Bearer JWT (doctor role required) - schema-safe (no column assumptions)
// ✅ CRASH-PROOF: Always returns JSON, never crashes

const { createClient } = require("@supabase/supabase-js");
const { toDoctorLeadDTO } = require("./_doctorPrivacy");

// ✅ Build SHA for deployment verification
const buildSha =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.VERCEL_GIT_COMMIT_REF ||
  process.env.GITHUB_SHA ||
  null;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(v) {
  return typeof v === "string" && UUID_RE.test(v.trim());
}

module.exports = async function handler(req, res) {
  const requestId = `doctor_lead_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  // ✅ CRASH-PROOF: Set JSON headers FIRST (before any parsing)
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-store");

  // ✅ CRASH-PROOF: Everything in one top-level try/catch
  try {
    // OPTIONS preflight
    if (req.method === "OPTIONS") {
      return res.status(200).json({ ok: true });
    }

    if (req.method !== "GET") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed",
        step: "method_check",
        requestId,
        buildSha,
      });
    }

    // ✅ CRASH-PROOF: Parse URL safely (do NOT use req.query)
    let url;
    try {
      url = new URL(req.url, "http://localhost");
    } catch (urlErr) {
      return res.status(400).json({
        ok: false,
        error: "Invalid URL",
        step: "url_parse",
        requestId,
        buildSha,
      });
    }

    const ping = url.searchParams.get("ping");
    const debug = url.searchParams.get("debug") === "1";

    // ✅ Ping mode (no auth, no DB) — deploy verification
    if (ping === "1") {
      return res.status(200).json({
        ok: true,
        ping: "doctor/lead",
        requestId,
        buildSha,
      });
    }

    // ✅ Extract ref from query with fallback keys
    let ref =
      url.searchParams.get("ref") ||
      url.searchParams.get("lead_uuid") ||
      url.searchParams.get("lead_id") ||
      url.searchParams.get("leadId") ||
      url.searchParams.get("leadUuid") ||
      null;

    // ✅ Normalize: strip CASE- prefix if present
    if (ref) {
      ref = String(ref).trim();
      if (ref.startsWith("CASE-")) {
        ref = ref.replace(/^CASE-/, "");
      }
    }

    if (!ref) {
      return res.status(400).json({
        ok: false,
        error: "Lead reference missing",
        step: "ref_parse",
        requestId,
        buildSha,
      });
    }

    // ✅ Auth: Extract Bearer token
    const authHeader = req.headers.authorization || req.headers.Authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({
        ok: false,
        error: "Missing Authorization Bearer token",
        step: "auth_check",
        requestId,
        buildSha,
      });
    }

    // ✅ Env check: require SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
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
        ...(debug ? { debug: { hasUrl: !!supabaseUrl, hasServiceKey: !!supabaseServiceKey } } : {}),
      });
    }

    // ✅ Supabase client with service role
    const dbClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // ✅ Use anon key for JWT verification
    const authClient = createClient(
      supabaseUrl,
      supabaseAnonKey || supabaseServiceKey,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // ✅ Verify user from token: supabase.auth.getUser(token)
    let user;
    try {
      const { data: userData, error: userErr } = await authClient.auth.getUser(token);
      if (userErr || !userData?.user) {
        return res.status(401).json({
          ok: false,
          error: "Invalid session",
          step: "jwt_verify",
          requestId,
          buildSha,
          ...(debug ? { debug: { jwtError: userErr?.message } } : {}),
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
        ...(debug ? { debug: { error: authErr?.message } } : {}),
      });
    }

    // ✅ Role check: fetch role from profiles
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
          ...(debug ? { debug: { role: profData?.role || "none", error: profErr?.message } } : {}),
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
        ...(debug ? { debug: { error: roleErr?.message } } : {}),
      });
    }

    // ✅ Determine UUID via regex
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

    // ✅ Fetch lead: filter by doctor_id, resolve ref (UUID or TEXT id), use maybeSingle
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
        // ✅ Do NOT log full lead rows (avoid PII in logs)
        console.error("[doctor/lead] Query error:", {
          requestId,
          buildSha,
          ref: ref.substring(0, 8) + "...",
          refIsUuid,
          error: leadErr.message,
          code: leadErr.code,
        });
        return res.status(500).json({
          ok: false,
          error: leadErr.message || "Lead query failed",
          step: "fetch_lead",
          requestId,
          buildSha,
          ...(debug
            ? {
                debug: {
                  ref: ref.substring(0, 8) + "...",
                  refIsUuid,
                  error: leadErr.message,
                  code: leadErr.code,
                  queryColumn: refIsUuid ? "lead_uuid" : "id",
                },
              }
            : {}),
        });
      }

      if (!leadData) {
        // ✅ Return 404 JSON (NOT 500) for not found
        return res.status(404).json({
          ok: false,
          error: "Lead not found or not assigned to you",
          step: "fetch_lead",
          requestId,
          buildSha,
          ...(debug
            ? {
                debug: {
                  ref: ref.substring(0, 8) + "...",
                  refIsUuid,
                  doctorId: user.id.substring(0, 8) + "...",
                  searchedColumn: refIsUuid ? "lead_uuid" : "id",
                  hint: refIsUuid
                    ? "Searched in lead_uuid column"
                    : "Searched in id (TEXT) column",
                },
              }
            : {}),
        });
      }

      lead = leadData;
    } catch (fetchErr) {
      // ✅ Do NOT log full lead rows (avoid PII in logs)
      console.error("[doctor/lead] Fetch crash:", {
        requestId,
        buildSha,
        ref: ref.substring(0, 8) + "...",
        error: fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
      });
      return res.status(500).json({
        ok: false,
        error: fetchErr instanceof Error ? fetchErr.message : "Lead fetch failed",
        step: "fetch_lead",
        requestId,
        buildSha,
        ...(debug
          ? {
              debug: {
                ref: ref.substring(0, 8) + "...",
                refIsUuid,
                error: String(fetchErr),
              },
            }
          : {}),
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

    // ✅ Documents: NON-FATAL (try/catch around docs query)
    let documents = [];
    let docsError = null;
    try {
      // Try 1: lead_documents by lead_id = lead.id (TEXT)
      let docJoinKey = lead.id; // TEXT column
      let { data: docsData, error: docsErr } = await dbClient
        .from("lead_documents")
        .select("*")
        .eq("lead_id", docJoinKey)
        .order("created_at", { ascending: false });

      // If error mentions missing column or type mismatch, try fallback with lead_uuid
      if (docsErr && (docsErr.message?.includes("column") || docsErr.code === "PGRST116" || docsErr.code === "42804")) {
        // Try 2: lead_documents by lead_uuid = lead.lead_uuid (if available)
        if (lead.lead_uuid) {
          docJoinKey = lead.lead_uuid;
          const fallbackResult = await dbClient
            .from("lead_documents")
            .select("*")
            .eq("lead_uuid", docJoinKey)
            .order("created_at", { ascending: false });

          docsData = fallbackResult.data;
          docsErr = fallbackResult.error;
        }
      }

      if (docsErr) {
        docsError = docsErr;
        // ✅ Do NOT log full lead rows (avoid PII in logs)
        console.debug("[doctor/lead] Documents query error:", {
          error: docsErr?.message,
          code: docsErr?.code,
          joinKey: String(docJoinKey).substring(0, 8) + "...",
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
              type.includes("plan") ||
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

    // ✅ Return success with DTO, documents, requestId, buildSha
    return res.status(200).json({
      ok: true,
      lead: safeLead,
      documents: documents,
      requestId,
      buildSha,
      ...(debug && docsError
        ? { debug: { docsError: docsError.message } }
        : {}),
    });
  } catch (err) {
    // ✅ CRASH-PROOF: Top-level catch - always return JSON
    // ✅ Do NOT log full lead rows (avoid PII in logs)
    console.error("[doctor/lead] Handler crash:", {
      requestId,
      buildSha,
      error: err instanceof Error ? err.message : String(err),
      step: "handler",
    });
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Server error",
      step: "handler",
      requestId,
      buildSha,
      ...(req.url?.includes("debug=1")
        ? {
            debug: {
              error: String(err),
              stack: err?.stack?.split("\n").slice(0, 3),
            },
          }
        : {}),
    });
  }
};
