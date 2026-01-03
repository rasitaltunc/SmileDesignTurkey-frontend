// api/patient-intake.js
// Handles patient intake form submissions
// Public can POST (form submission), admin/employee can GET (view intakes)

const { createClient } = require("@supabase/supabase-js");

function getBearerToken(req) {
  const h = req.headers.authorization; // ✅ Node'da hep lowercase gelir
  if (!h) return null;

  const [type, token] = String(h).split(" ");
  if (!type || type.toLowerCase() !== "bearer") return null;
  return token || null;
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return res.status(500).json({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
  }

  // Service role client for DB operations
  const dbClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ============================================
  // POST: Public form submission
  // ============================================
  if (req.method === "POST") {
    try {
      const body = req.body || {};
      
      // Validate required fields
      const fullName = String(body.full_name || "").trim();
      if (!fullName || fullName.length < 2) {
        return res.status(400).json({ error: "full_name is required (min 2 characters)" });
      }

      // Prepare intake data
      const intakeData = {
        full_name: fullName,
        phone: body.phone ? String(body.phone).trim() : null,
        email: body.email ? String(body.email).trim() : null,
        country: body.country ? String(body.country).trim() : null,
        treatment_type: body.treatment_type ? String(body.treatment_type).trim() : null,
        notes: body.notes ? String(body.notes).trim() : null,
        source: body.source || "intake_form",
        status: "pending",
        page_url: body.page_url || null,
        utm_source: body.utm_source || null,
        device: body.device || null,
      };

      // Insert intake (RLS allows public INSERT)
      const { data, error } = await dbClient
        .from("patient_intakes")
        .insert([intakeData])
        .select("id, created_at")
        .single();

      if (error) {
        console.error("[patient-intake] Insert error:", error);
        return res.status(500).json({ error: error.message || "Failed to create intake" });
      }

      return res.status(201).json({
        success: true,
        intake_id: data.id,
        message: "Intake submitted successfully",
      });
    } catch (e) {
      console.error("[patient-intake] POST error:", e);
      return res.status(500).json({ error: e?.message || "Server error" });
    }
  }

  // ============================================
  // GET: Admin/Employee view intakes
  // ============================================
  if (req.method === "GET") {
    const jwt = getBearerToken(req);
    if (!jwt) {
      return res.status(401).json({ error: "Missing Authorization Bearer token" });
    }

    // Verify user and role
    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
    if (!anonKey) {
      return res.status(500).json({ error: "Missing SUPABASE_ANON_KEY" });
    }

    const authClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData?.user) {
      return res.status(401).json({ error: "Invalid session" });
    }

    // Check role
    const { data: profile } = await dbClient
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();

    const role = String(profile?.role || "").trim().toLowerCase();
    const isAdmin = role === "admin";
    const isEmployee = role === "employee";

    if (!isAdmin && !isEmployee) {
      return res.status(403).json({ error: "Forbidden: admin/employee only" });
    }

    // Query parameters
    const status = req.query?.status || "all";
    const limit = Math.min(parseInt(req.query?.limit || "50", 10) || 50, 200);

    let q = dbClient
      .from("patient_intakes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status && status !== "all") {
      q = q.eq("status", status);
    }

    const { data, error } = await q;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ intakes: data || [] });
  }

  return res.status(405).json({ error: "Method not allowed" });
};

