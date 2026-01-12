// api/doctor/note/save.js
// POST /api/doctor/note/save
// Saves doctor note content and items
// Body: { note_id, note_markdown, items:[{catalog_item_id, qty, notes, unit_price_override?}] }
// Auth: Bearer JWT (doctor role required)

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
  const requestId = `doctor_note_save_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  try {
    if (req.method === "OPTIONS") {
      return res.status(200).json({ ok: true });
    }

    if (req.method !== "POST") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed",
        step: "method_check",
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

    // ✅ Auth
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

    const authClient = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY || SERVICE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

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

    // ✅ Verify doctor role
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

      if (profErr || !profData || profData.role !== "doctor") {
        return res.status(403).json({
          ok: false,
          error: "Forbidden: doctor access only",
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

    // ✅ Parse body
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const noteId = body.note_id ? String(body.note_id).trim() : null;
    const noteMarkdown = body.note_markdown || "";
    const items = Array.isArray(body.items) ? body.items : [];

    if (!noteId) {
      return res.status(400).json({
        ok: false,
        error: "Missing note_id parameter",
        step: "param_check",
        requestId,
        buildSha,
      });
    }

    // ✅ Verify note exists and belongs to doctor
    const { data: note, error: noteErr } = await dbClient
      .from("doctor_notes")
      .select("*")
      .eq("id", noteId)
      .eq("doctor_id", user.id)
      .maybeSingle();

    if (noteErr || !note) {
      return res.status(404).json({
        ok: false,
        error: "Note not found or not owned by you",
        step: "fetch_note",
        requestId,
        buildSha,
      });
    }

    if (note.status === "approved") {
      return res.status(400).json({
        ok: false,
        error: "Cannot edit approved note",
        step: "note_status_check",
        requestId,
        buildSha,
      });
    }

    // ✅ Update note
    const { error: updateErr } = await dbClient
      .from("doctor_notes")
      .update({
        note_markdown: noteMarkdown,
        updated_at: new Date().toISOString(),
      })
      .eq("id", noteId);

    if (updateErr) {
      console.error("[doctor/note/save] Note update error:", updateErr, { requestId });
      return res.status(500).json({
        ok: false,
        error: updateErr.message || "Failed to update note",
        step: "update_note",
        requestId,
        buildSha,
      });
    }

    // ✅ Delete existing items and insert new ones
    await dbClient.from("doctor_note_items").delete().eq("doctor_note_id", noteId);

    if (items.length > 0) {
      // Fetch catalog item names for items
      const catalogItemIds = items.map((item) => item.catalog_item_id).filter(Boolean);
      let catalogItemsMap = {};

      if (catalogItemIds.length > 0) {
        const { data: catalogItems } = await dbClient
          .from("catalog_items")
          .select("id, name")
          .in("id", catalogItemIds);

        catalogItemsMap = (catalogItems || []).reduce((acc, item) => {
          acc[item.id] = item.name;
          return acc;
        }, {});
      }

      // Get default prices if unit_price_override not provided
      const { data: defaultPriceBook } = await dbClient
        .from("price_book")
        .select("id")
        .eq("is_default", true)
        .maybeSingle();

      const priceBookId = defaultPriceBook?.id || null;

      const itemsToInsert = await Promise.all(
        items.map(async (item) => {
          let unitPrice = item.unit_price_override || 0;

          // Fetch from price book if no override
          if (!item.unit_price_override && priceBookId && item.catalog_item_id) {
            const { data: priceItem } = await dbClient
              .from("price_book_items")
              .select("unit_price")
              .eq("price_book_id", priceBookId)
              .eq("catalog_item_id", item.catalog_item_id)
              .maybeSingle();
            unitPrice = priceItem?.unit_price || 0;
          }

          return {
            doctor_note_id: noteId,
            catalog_item_id: item.catalog_item_id || null,
            catalog_item_name: catalogItemsMap[item.catalog_item_id] || item.name || "Unknown",
            qty: item.qty || 1,
            unit_price: unitPrice,
            notes: item.notes || null,
            created_at: new Date().toISOString(),
          };
        })
      );

      const { error: itemsErr } = await dbClient.from("doctor_note_items").insert(itemsToInsert);

      if (itemsErr) {
        console.error("[doctor/note/save] Items insert error:", itemsErr, { requestId });
        return res.status(500).json({
          ok: false,
          error: itemsErr.message || "Failed to save items",
          step: "insert_items",
          requestId,
          buildSha,
        });
      }
    }

    return res.status(200).json({
      ok: true,
      requestId,
      buildSha,
    });
  } catch (err) {
    console.error("[doctor/note/save] Handler crash:", err, { requestId });
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Server error",
      step: "handler",
      requestId,
      buildSha,
    });
  }
};

