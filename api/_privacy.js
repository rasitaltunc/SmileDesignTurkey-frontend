// api/_privacy.js
// Privacy utilities for doctor endpoints - PII redaction and safe data extraction

/**
 * Redacts PII (Personally Identifiable Information) from text
 */
function redactPII(input) {
  if (!input) return input;
  let text = String(input);

  // Emails
  text = text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted email]");

  // Phone-like patterns (broad)
  text = text.replace(/(\+?\d[\d\s().-]{6,}\d)/g, "[redacted phone]");

  // URLs
  text = text.replace(/https?:\/\/\S+/gi, "[redacted url]");

  return text;
}

/**
 * Generates a case code from lead UUID (e.g., "CASE-XXXXXXXX")
 */
function caseCodeFromLead(lead) {
  const u = lead?.lead_uuid ? String(lead.lead_uuid) : "";
  if (!u) return null;
  // Extract first 8 characters of UUID, uppercase
  const code = u.slice(0, 8).toUpperCase().replace(/-/g, "");
  return `CASE-${code}`;
}

module.exports = { redactPII, caseCodeFromLead };

