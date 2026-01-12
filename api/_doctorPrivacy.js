// api/_doctorPrivacy.js
// Shared helper for doctor endpoints: privacy-safe DTO mapping
// Schema-safe: never assumes columns exist, uses select("*") then allowlist

const { redactPII, caseCodeFromLead } = require("./_privacy");

/**
 * Convert a lead row to a privacy-safe DTO for doctor UI
 * @param {any} lead - Raw lead row from database (select("*"))
 * @returns {object} - Safe DTO with only allowed fields
 */
function toDoctorLeadDTO(lead) {
  if (!lead) return null;

  // ✅ AGE-PROOF: Only return explicitly allowed fields (no age/gender, no PII)
  // ✅ SNAPSHOT-PROOF: snapshot kolonu yok, sadece ai_summary kullan
  const rawSnapshot = (lead && typeof lead.ai_summary === "string" ? lead.ai_summary : "") || "";
  
  // ✅ REF: Privacy-safe reference (prefer lead_uuid UUID, fallback to id TEXT)
  const leadUuid = lead.lead_uuid ? String(lead.lead_uuid).trim() : null;
  const leadId = lead.id ? String(lead.id).trim() : null;
  const ref = leadUuid || leadId || null;
  
  // ✅ CASE_CODE: Unique case code derived from ref (use last 10 alphanumeric chars)
  let case_code = null;
  if (ref) {
    // Extract last 10 alphanumeric characters from ref (remove dashes, take last 10)
    const cleaned = String(ref).replace(/[^a-zA-Z0-9]/g, '');
    const tail = cleaned.slice(-10).toUpperCase();
    case_code = tail ? `CASE-${tail}` : null;
  }
  
  return {
    // ✅ Privacy-safe reference for navigation
    ref: ref,
    // ✅ Unique case code for display
    case_code: case_code,
    name: lead.name ?? 'Unknown',
    treatment: lead.treatment ?? null,
    timeline: lead.timeline ?? null,
    message: lead.message ? redactPII(lead.message) : null, // ✅ PII redaction (only if exists)
    snapshot: rawSnapshot ? redactPII(rawSnapshot) : null, // ✅ Sadece ai_summary'den üret (snapshot kolonu yok)
    doctor_review_status: lead.doctor_review_status ?? 'pending',
    doctor_assigned_at: lead.doctor_assigned_at ?? null,
    updated_at: lead.updated_at ?? null,
    // NOTE: DO NOT include email/phone/meta/utm/referrer/page_url/ip/ua
    // NOTE: DO NOT include age/gender (columns don't exist)
    // NOTE: DO NOT include id, lead_uuid, created_at, status (not needed for doctor UI)
    // NOTE: snapshot kolonu yok, sadece ai_summary kullan
    // NOTE: Only return ref and case_code, not raw id/lead_uuid
  };
}

/**
 * Bucket filter constants for doctor leads
 * unread: doctor_review_status IN ('pending','needs_info')
 * reviewed: doctor_review_status = 'reviewed' (ONLY)
 */
const SAFE_UNREAD = new Set(['pending', 'needs_info']);
const SAFE_REVIEWED = new Set(['reviewed']);

/**
 * Filter leads by bucket (unread vs reviewed)
 * @param {any[]} leads - Array of lead rows
 * @param {string} bucket - 'unread' | 'reviewed'
 * @returns {any[]} - Filtered leads
 */
function filterLeadsByBucket(leads, bucket) {
  if (!Array.isArray(leads)) return [];

  const bucketLower = String(bucket || 'unread').toLowerCase().trim();

  return leads.filter((lead) => {
    const status = lead.doctor_review_status ?? 'pending'; // ✅ Default to pending if null

    if (bucketLower === 'unread' || bucketLower === 'pending') {
      // ✅ Unread: only 'pending' or 'needs_info'
      return SAFE_UNREAD.has(status);
    } else if (bucketLower === 'reviewed') {
      // ✅ Reviewed: only 'reviewed' (not approved/rejected)
      return SAFE_REVIEWED.has(status);
    }

    // Default: return all if bucket is invalid
    return true;
  });
}

module.exports = {
  toDoctorLeadDTO,
  filterLeadsByBucket,
  SAFE_UNREAD,
  SAFE_REVIEWED,
};

