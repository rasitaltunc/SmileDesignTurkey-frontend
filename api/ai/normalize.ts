// AI Gateway v1 - Server-side normalize endpoint
// POST /api/ai/normalize
// Authorization: Bearer <supabase_access_token>
// Role: admin | employee only

export default async function handler(req: any, res: any) {
  // CORS gerekmez (aynı origin), ama OPTIONS gelirse cevaplayalım
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      source: "api/ai/normalize",
      message: "AI Gateway normalize endpoint is working",
    });
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
