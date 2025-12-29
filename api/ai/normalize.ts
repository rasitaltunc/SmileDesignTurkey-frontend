// AI Gateway v1 - Server-side normalize endpoint
// POST /api/ai/normalize
// Authorization: Bearer <supabase_access_token>
// Role: admin | employee only

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Handle OPTIONS
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  // Health check: GET returns JSON
  if (req.method === 'GET') {
    res.status(200).json({
      ok: true,
      source: 'api/ai/normalize',
      message: 'AI Gateway normalize endpoint is working',
    });
    return;
  }

  // POST handler (will be implemented later)
  if (req.method === 'POST') {
    res.status(200).json({
      ok: true,
      message: 'POST endpoint ready',
    });
    return;
  }

  // Method not allowed
  res.status(405).json({
    ok: false,
    error: 'Method not allowed',
  });
}
