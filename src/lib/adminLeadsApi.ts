/**
 * Secure Admin Leads API Client
 * 
 * Calls Supabase Edge Function to fetch leads server-side.
 * Never exposes Service Role key to client.
 */

const DEFAULT_LIMIT = 1000;

export interface AdminLeadsResponse {
  leads: Array<{
    id: string;
    createdAt: string;
    source: 'contact' | 'onboarding';
    name?: string;
    email?: string;
    phone?: string;
    treatment?: string;
    message?: string;
    timeline?: string;
    lang?: string;
    pageUrl: string;
    utmSource?: string;
    utmCampaign?: string;
    utmMedium?: string;
    referrer?: string;
    device?: string;
  }>;
  count: number;
}

/**
 * Fetch leads from Supabase via secure Edge Function
 * 
 * @param token Admin token (VITE_ADMIN_TOKEN)
 * @param limit Maximum number of leads to fetch (default: 1000)
 * @returns Leads data or throws error
 */
export async function fetchLeadsFromSupabaseSecure(
  token: string,
  limit: number = DEFAULT_LIMIT
): Promise<AdminLeadsResponse> {
  // Get Supabase project URL from env
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL not configured');
  }

  // Extract project ref from URL (e.g., https://abc123.supabase.co -> abc123)
  const projectRefMatch = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/);
  if (!projectRefMatch) {
    throw new Error('Invalid VITE_SUPABASE_URL format');
  }
  const projectRef = projectRefMatch[1];

  // Edge Function URL
  const functionUrl = `https://${projectRef}.supabase.co/functions/v1/admin-leads?token=${encodeURIComponent(token)}&limit=${limit}`;

  try {
    const response = await fetch(functionUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data as AdminLeadsResponse;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch leads from Supabase');
  }
}

