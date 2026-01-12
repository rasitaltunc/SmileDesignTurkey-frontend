// api/catalog/price.js
// GET /api/catalog/price?catalogItemId=...
// Returns default price from default price_book for a catalog item
// Auth: Bearer JWT (doctor or employee role required)

const { createClient } = require("@supabase/supabase-js");

const buildSha =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.VERCEL_GIT_COMMIT_REF ||
  process.env.GITHUB_SHA ||
  null;

function getBearerToken(req) {
  const h = req.headers.authorization || req.headers.Authorization || "";
  if (!h) return null;
  const [type, token] = String(h).split(" ");
  if (!type || type.toLowerCase() !== "bearer") return null;
  return token || null;
}

module.exports = async function handler(req, res) {
  const requestId = `catalog_price_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  // ✅ CRASH-PROOF: Set JSON headers FIRST
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  try {
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

    // ✅ Parse URL safely
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

    const catalogItemId = url.searchParams.get("catalogItemId") || null;

    if (!catalogItemId) {
      return res.status(400).json({
        ok: false,
        error: "Missing catalogItemId parameter",
        step: "param_check",
        requestId,
        buildSha,
      });
    }

    // ✅ Env check
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return res.status(500).json({
        ok: false,
        error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
        step: "env_check",
        requestId,
        buildSha,
      });
    }

    // ✅ Auth: Extract Bearer token
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({
        ok: false,
        error: "Missing Authorization Bearer token",
        step: "auth_check",
        requestId,
        buildSha,
      });
    }

    // ✅ Use anon key for JWT verification
    const authClient = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY || SERVICE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // ✅ Verify user
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
      });
    }

    // ✅ Verify role (doctor or employee/admin)
    const dbClient = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let profile;
    try {
      const { data: profData, error: profErr } = await dbClient
        .from("profiles")
        .select("id, role")
        .eq("id", user.id)
        .maybeSingle();

      if (profErr || !profData) {
        return res.status(403).json({
          ok: false,
          error: "Forbidden: profile not found",
          step: "role_check",
          requestId,
          buildSha,
        });
      }

      const allowedRoles = ["doctor", "employee", "admin"];
      if (!allowedRoles.includes(profData.role)) {
        return res.status(403).json({
          ok: false,
          error: "Forbidden: doctor or employee access only",
          step: "role_check",
          requestId,
          buildSha,
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
      });
    }

    // ✅ Fetch default price_book (is_default = true)
    try {
      const { data: defaultPriceBook, error: pbErr } = await dbClient
        .from("price_book")
        .select("id")
        .eq("is_default", true)
        .maybeSingle();

      if (pbErr) {
        console.error("[catalog/price] Price book query error:", pbErr, { requestId });
        return res.status(500).json({
          ok: false,
          error: pbErr.message || "Price book query failed",
          step: "fetch_price_book",
          requestId,
          buildSha,
        });
      }

      if (!defaultPriceBook) {
        return res.status(404).json({
          ok: false,
          error: "Default price book not found",
          step: "fetch_price_book",
          requestId,
          buildSha,
        });
      }

      // ✅ Fetch price from price_book_items
      const { data: priceItem, error: priceErr } = await dbClient
        .from("price_book_items")
        .select("unit_price")
        .eq("price_book_id", defaultPriceBook.id)
        .eq("catalog_item_id", catalogItemId)
        .maybeSingle();

      if (priceErr) {
        console.error("[catalog/price] Price item query error:", priceErr, { requestId });
        return res.status(500).json({
          ok: false,
          error: priceErr.message || "Price query failed",
          step: "fetch_price",
          requestId,
          buildSha,
        });
      }

      // Return price (0 if not found in price book)
      return res.status(200).json({
        ok: true,
        catalogItemId: catalogItemId,
        priceBookId: defaultPriceBook.id,
        unitPrice: priceItem?.unit_price || 0,
        requestId,
        buildSha,
      });
    } catch (fetchErr) {
      console.error("[catalog/price] Fetch crash:", fetchErr, { requestId });
      return res.status(500).json({
        ok: false,
        error: fetchErr instanceof Error ? fetchErr.message : "Internal server error",
        step: "fetch_price",
        requestId,
        buildSha,
      });
    }
  } catch (err) {
    console.error("[catalog/price] Handler crash:", err, { requestId });
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Server error",
      step: "handler",
      requestId,
      buildSha,
    });
  }
};

