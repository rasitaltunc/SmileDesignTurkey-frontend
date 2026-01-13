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
 * @returns {Promise<{lead: Object|null, ref: string|null}>}
 */
async function fetchLeadByRef(supabase, leadRef, doctorUserId) {
  const ref = normalizeRef(leadRef);
  if (!ref) return { lead: null, ref: null };

  let q = supabase
    .from("leads")
    .select("id, lead_uuid, case_code, doctor_id")
    .limit(1);

  if (isUuid(ref)) {
    // ✅ CRITICAL: UUID ise iki kolonu da dene (id OR lead_uuid)
    q = q.or(`id.eq.${ref},lead_uuid.eq.${ref}`);
  } else {
    // TEXT id: try id, case_code, CASE-{case_code}
    q = q.or(`case_code.eq.${ref},case_code.eq.CASE-${ref},id.eq.${ref}`);
  }

  const { data, error } = await q.maybeSingle();
  if (error) throw error;

  // Güvenlik: doctor_id kontrol (optional - can be relaxed if needed)
  if (data?.doctor_id && doctorUserId && data.doctor_id !== doctorUserId) {
    return { lead: null, ref };
  }

  return { lead: data || null, ref };
}

module.exports = {
  normalizeRef,
  fetchLeadByRef,
  isUuid,
};

