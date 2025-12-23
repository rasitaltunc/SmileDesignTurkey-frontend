/**
 * Submit lead to Supabase using PostgREST API with Prefer: return=minimal
 * This avoids requiring SELECT permission (RLS blocks anon SELECT)
 * 
 * @param payload Lead data with snake_case column names
 * @returns { success: true } or { success: false, error: string }
 */
export async function submitLead(payload: {
  source: 'contact' | 'onboarding';
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  treatment?: string | null;
  message?: string | null;
  timeline?: string | null;
  lang?: string | null;
  page_url?: string;
  utm_source?: string | null;
  utm_campaign?: string | null;
  utm_medium?: string | null;
  referrer?: string | null;
  device?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  // If Supabase is not configured, silently skip (localStorage fallback)
  if (!baseUrl || !anonKey || baseUrl.trim().length === 0 || anonKey.trim().length === 0) {
    if (import.meta.env.DEV) {
      console.warn('[Lead insert] Supabase not configured - skipping');
    }
    return { success: false, error: 'Supabase not configured' };
  }

  // Check if anon key is still placeholder
  if (anonKey.includes('PASTE') || anonKey.includes('XXXX') || anonKey.length < 20) {
    if (import.meta.env.DEV) {
      console.warn('[Lead insert] Supabase anon key appears to be placeholder - skipping insert');
    }
    return { success: false, error: 'Supabase anon key not configured' };
  }

  try {
    // Ensure baseUrl doesn't have trailing slash
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    
    const response = await fetch(`${cleanBaseUrl}/rest/v1/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Prefer': 'return=minimal', // Do not return inserted row (avoids SELECT requirement)
      },
      body: JSON.stringify({
        // Generate client-side ID (required by schema: id TEXT PRIMARY KEY)
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        // Do NOT send created_at - let DB handle default
        source: payload.source,
        status: 'new', // CRM MVP: Default status for new leads
        name: payload.name || null,
        email: payload.email || null,
        phone: payload.phone || null,
        treatment: payload.treatment || null,
        message: payload.message || null,
        timeline: payload.timeline || null,
        lang: payload.lang || null,
        page_url: payload.page_url || (typeof window !== 'undefined' ? window.location.href : ''),
        utm_source: payload.utm_source || null,
        utm_campaign: payload.utm_campaign || null,
        utm_medium: payload.utm_medium || null,
        referrer: payload.referrer || null,
        // device: payload.device || null, // Commented out - column doesn't exist in DB yet
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (import.meta.env.DEV) {
        console.warn('[Lead insert failed]', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
      }
      return { success: false, error: errorText };
    }

    if (import.meta.env.DEV) {
      console.log('[Lead insert] Successfully submitted to Supabase');
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (import.meta.env.DEV) {
      console.warn('[Lead insert failed]', error);
    }
    return { success: false, error: errorMessage };
  }
}

