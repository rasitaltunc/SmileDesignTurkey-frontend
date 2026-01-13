// api/_doctorLeadResolve.js
// Shared helper for resolving lead references in doctor endpoints
// Handles UUID (id OR lead_uuid) and TEXT (id, case_code) lookups

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(v) {
  return typeof v === "string" && UUID_RE.test(v.trim());
}

/**
 * Normalize lead reference (strip CASE- prefix, decode URI)
 */
function normalizeRef(raw) {
  if (!raw) return null;
  try {
    return decodeURIComponent(String(raw))
      .replace(/^CASE-/, "")
      .trim();
  } catch {
    return String(raw).replace(/^CASE-/, "").trim();
  }
}

/**
 * Fetch lead by reference (UUID or TEXT id)
 * @param {Object} supabase - Supabase client
 * @param {string} leadRef - Lead reference (UUID or TEXT id)
 * @param {string} doctorUserId - Doctor user ID for assignment check
 * @returns {Promise<{lead: Object|null, ref: string|null, error?: string}>}
 */
async function fetchLeadByRef(supabase, leadRef, doctorUserId) {
  const ref = normalizeRef(leadRef);
  if (!ref) return { lead: null, ref: null };

  try {
    // ✅ UUID ise önce id, sonra lead_uuid dene
    if (isUuid(ref)) {
      // Try 1: id column
      let { data, error } = await supabase
        .from("leads")
        .select("id, lead_uuid, doctor_id")
        .eq("id", ref)
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        // Check assignment (only if doctor_id is set AND doctorUserId provided)
        // If doctor_id is null, allow access (lead not yet assigned)
        if (data?.doctor_id && doctorUserId && data.doctor_id !== doctorUserId) {
          return { lead: null, ref, error: "Lead not assigned to doctor" };
        }
        return { lead: data, ref };
      }

      // Try 2: lead_uuid column
      ({ data, error } = await supabase
        .from("leads")
        .select("id, lead_uuid, doctor_id")
        .eq("lead_uuid", ref)
        .limit(1)
        .maybeSingle());

      if (!error && data) {
        // Check assignment (only if doctor_id is set AND doctorUserId provided)
        // If doctor_id is null, allow access (lead not yet assigned)
        if (data?.doctor_id && doctorUserId && data.doctor_id !== doctorUserId) {
          return { lead: null, ref, error: "Lead not assigned to doctor" };
        }
        return { lead: data, ref };
      }

      // Both failed
      if (error) {
        console.error("[fetchLeadByRef] UUID query error:", error, { ref, doctorUserId });
        return { lead: null, ref, error: error.message || "Lead query failed" };
      }
      return { lead: null, ref };
    } else {
      // ✅ TEXT id: try id column (text)
      // Try 1: id column (text)
      let { data, error } = await supabase
        .from("leads")
        .select("id, lead_uuid, doctor_id")
        .eq("id", ref)
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        // Check assignment (only if doctor_id is set AND doctorUserId provided)
        // If doctor_id is null, allow access (lead not yet assigned)
        if (data?.doctor_id && doctorUserId && data.doctor_id !== doctorUserId) {
          return { lead: null, ref, error: "Lead not assigned to doctor" };
        }
        return { lead: data, ref };
      }

      // Query failed
      if (error) {
        console.error("[fetchLeadByRef] TEXT query error:", error, { ref, doctorUserId });
        return { lead: null, ref, error: error.message || "Lead query failed" };
      }
      return { lead: null, ref };
    }
  } catch (err) {
    console.error("[fetchLeadByRef] Exception:", err, { ref, doctorUserId });
    return {
      lead: null,
      ref,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

module.exports = {
  normalizeRef,
  fetchLeadByRef,
  isUuid,
};

