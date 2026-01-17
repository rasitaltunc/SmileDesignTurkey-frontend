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
}): Promise<{ success: boolean; error?: string; data?: any; case_id?: string }> {
  try {
    const res = await fetch("/api/secure/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      return { success: false, error: data?.error || "Lead submit failed" };
    }

    return { success: true, data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (import.meta.env.DEV) {
      console.warn('[Lead insert failed]', error);
    }
    return { success: false, error: errorMessage };
  }
}

