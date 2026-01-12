// api/employee/quote/from-note.js
// POST /api/employee/quote/from-note
// Creates draft quote + quote_items from doctor_note using catalog prices
// Body: { doctor_note_id }
// Auth: Bearer JWT (employee/admin role required)

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
  const requestId = `quote_from_note_${Date.now()}_${Math.random().toString(16).slice(2)}`;

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

    // ✅ Verify employee/admin role
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

      const allowedRoles = ["employee", "admin"];
      if (!allowedRoles.includes(profData.role)) {
        return res.status(403).json({
          ok: false,
          error: "Forbidden: employee or admin access only",
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
    const doctorNoteId = body.doctor_note_id ? String(body.doctor_note_id).trim() : null;

    if (!doctorNoteId) {
      return res.status(400).json({
        ok: false,
        error: "Missing doctor_note_id parameter",
        step: "param_check",
        requestId,
        buildSha,
      });
    }

    // ✅ Fetch doctor note (must be approved)
    const { data: note, error: noteErr } = await dbClient
      .from("doctor_notes")
      .select("*, leads(id, assigned_to)")
      .eq("id", doctorNoteId)
      .eq("status", "approved")
      .maybeSingle();

    if (noteErr || !note) {
      return res.status(404).json({
        ok: false,
        error: "Approved doctor note not found",
        step: "fetch_note",
        requestId,
        buildSha,
      });
    }

    // ✅ Verify lead assignment (employee can only create quotes for assigned leads)
    if (profile.role === "employee" && note.leads?.assigned_to !== user.id) {
      return res.status(403).json({
        ok: false,
        error: "Lead not assigned to you",
        step: "lead_assignment_check",
        requestId,
        buildSha,
      });
    }

    // ✅ Fetch note items
    const { data: noteItems, error: itemsErr } = await dbClient
      .from("doctor_note_items")
      .select("*")
      .eq("doctor_note_id", doctorNoteId)
      .order("created_at", { ascending: true });

    if (itemsErr) {
      console.error("[employee/quote/from-note] Items query error:", itemsErr, { requestId });
    }

    // ✅ Get default price book
    const { data: defaultPriceBook, error: pbErr } = await dbClient
      .from("price_book")
      .select("id")
      .eq("is_default", true)
      .maybeSingle();

    if (pbErr || !defaultPriceBook) {
      return res.status(500).json({
        ok: false,
        error: "Default price book not found",
        step: "fetch_price_book",
        requestId,
        buildSha,
      });
    }

    // ✅ Create draft quote
    const quoteNumber = `QUOTE-${Date.now()}`;
    const { data: quote, error: quoteErr } = await dbClient
      .from("quotes")
      .insert({
        lead_id: note.lead_id,
        doctor_note_id: doctorNoteId,
        quote_number: quoteNumber,
        status: "draft",
        discount: 0,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (quoteErr) {
      console.error("[employee/quote/from-note] Quote creation error:", quoteErr, { requestId });
      return res.status(500).json({
        ok: false,
        error: quoteErr.message || "Failed to create quote",
        step: "create_quote",
        requestId,
        buildSha,
      });
    }

    // ✅ Create quote_items from note_items (use catalog prices from default price book)
    if (noteItems && noteItems.length > 0) {
      const quoteItemsToInsert = await Promise.all(
        noteItems.map(async (noteItem) => {
          let unitPrice = noteItem.unit_price || 0;

          // If catalog_item_id exists, fetch from price book
          if (noteItem.catalog_item_id) {
            const { data: priceItem } = await dbClient
              .from("price_book_items")
              .select("unit_price")
              .eq("price_book_id", defaultPriceBook.id)
              .eq("catalog_item_id", noteItem.catalog_item_id)
              .maybeSingle();
            unitPrice = priceItem?.unit_price || unitPrice;
          }

          return {
            quote_id: quote.id,
            catalog_item_id: noteItem.catalog_item_id || null,
            catalog_item_name: noteItem.catalog_item_name || "Unknown",
            qty: noteItem.qty || 1,
            unit_price: unitPrice,
            notes: noteItem.notes || null,
            created_at: new Date().toISOString(),
          };
        })
      );

      const { error: itemsInsertErr } = await dbClient.from("quote_items").insert(quoteItemsToInsert);

      if (itemsInsertErr) {
        console.error("[employee/quote/from-note] Quote items insert error:", itemsInsertErr, { requestId });
        // Don't fail, just log
      }
    }

    return res.status(200).json({
      ok: true,
      quote: quote,
      requestId,
      buildSha,
    });
  } catch (err) {
    console.error("[employee/quote/from-note] Handler crash:", err, { requestId });
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Server error",
      step: "handler",
      requestId,
      buildSha,
    });
  }
};

