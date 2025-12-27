// api/env-check.js
// Environment variable check endpoint (for debugging)
// NEVER returns secret values, only metadata

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Check CAL_WEBHOOK_SECRET (never return the value)
  const secret = process.env.CAL_WEBHOOK_SECRET;
  const hasSecret = !!secret;
  const secretLength = secret ? secret.length : 0;

  // Check CAL_BASE_URL (optional, for Cal.com base URL)
  const baseUrl = process.env.CAL_BASE_URL || null;
  const hasBaseUrl = !!baseUrl;

  // Check ADMIN_TOKEN (for debugging token issues)
  const adminToken = process.env.ADMIN_TOKEN;
  const hasAdminToken = !!adminToken;
  const adminTokenLength = adminToken ? adminToken.length : 0;

  return res.status(200).json({
    hasSecret,
    secretLength,
    hasBaseUrl,
    baseUrl,
    hasAdminToken,
    adminTokenLength,
  });
};

