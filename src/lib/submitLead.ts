/**
 * Submit lead with timeout and retry logic
 */
async function submitLeadWithTimeout(
  payload: Parameters<typeof submitLeadInternal>[0],
  timeoutMs: number = 15000,
  retries: number = 1
): Promise<{ success: boolean; error?: string; data?: any; case_id?: string; portal_token?: string }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const result = await submitLeadInternal(payload, controller.signal);
      
      clearTimeout(timeoutId);
      
      if (result.success) {
        return result;
      }
      
      // If not successful and this was not the last attempt, retry
      if (attempt < retries) {
        // Wait a bit before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
      
      return result;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Timeout occurred
        if (attempt < retries) {
          // Retry on timeout
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
        return { success: false, error: 'Request timed out. Please try again or contact us via WhatsApp.' };
      }
      
      // Other errors - return immediately
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }
  
  return { success: false, error: 'Failed after retries. Please try again or contact us via WhatsApp.' };
}

/**
 * Internal submit lead function (without timeout)
 */
async function submitLeadInternal(
  payload: {
    source?: 'contact' | 'onboarding';
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    treatment?: string | null;
    message?: string | null;
    timeline?: string | null;
    lang?: string | null;
    page_url?: string;
    pageUrl?: string;
    utm_source?: string | null;
    utm_campaign?: string | null;
    utm_medium?: string | null;
    utm_term?: string | null;
    utm_content?: string | null;
    referrer?: string | null;
    device?: string | null;
    companyWebsite?: string | null;
  },
  signal?: AbortSignal
): Promise<{ success: boolean; error?: string; data?: any; case_id?: string; portal_token?: string }> {
  try {
    const res = await fetch("/api/secure/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      return { success: false, error: data?.error || "Lead submit failed" };
    }

    return { success: true, data, case_id: data.case_id, portal_token: data.portal_token };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error; // Re-throw abort errors for timeout handling
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (import.meta.env.DEV) {
      console.warn('[Lead insert failed]', error);
    }
    return { success: false, error: errorMessage };
  }
}

/**
 * Submit lead to Supabase using secure API endpoint
 * Uses /api/secure/lead endpoint (no auth required, service role bypasses RLS)
 * 
 * @param payload Lead data with snake_case column names
 * @returns { success: true, data?: any } or { success: false, error: string }
 */
export async function submitLead(payload: {
  source?: 'contact' | 'onboarding';
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  treatment?: string | null;
  message?: string | null;
  timeline?: string | null;
  lang?: string | null;
  page_url?: string;
  pageUrl?: string;
  utm_source?: string | null;
  utm_campaign?: string | null;
  utm_medium?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  referrer?: string | null;
  device?: string | null;
  companyWebsite?: string | null; // Honeypot field
}): Promise<{ success: boolean; error?: string; data?: any; case_id?: string; portal_token?: string }> {
  // Use timeout wrapper with 1 retry (15s timeout per attempt)
  return submitLeadWithTimeout(payload, 15000, 1);
}

