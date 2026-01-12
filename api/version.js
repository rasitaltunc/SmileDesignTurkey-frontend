// api/version.js
// GET /api/version
// Returns build SHA and service info (no auth required - for deployment verification)

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const buildSha =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.VERCEL_GIT_COMMIT_REF ||
    process.env.GITHUB_SHA ||
    null;

  return res.status(200).json({
    ok: true,
    service: "smile-doctor-api",
    buildSha,
    now: new Date().toISOString(),
  });
};

