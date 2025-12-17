import { getSupabaseClient } from './supabaseClient';
import { trackEvent } from './analytics';
import { submitLead } from './submitLead';

export type Lead = {
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
  // Optional metadata
  utmSource?: string;
  utmCampaign?: string;
  utmMedium?: string;
  referrer?: string;
  device?: string;
  // Internal metadata (stored in localStorage only)
  meta?: {
    savedTo?: 'localStorage' | 'supabase';
  };
};

const STORAGE_KEY = 'leads_v1';
const MAX_LEADS = 10000;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Escape CSV field (handles commas, quotes, newlines)
 */
function escapeCsv(value: string): string {
  if (!value) return '';
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Get UTM parameters from URL
 */
function getUtmParams(): { utmSource?: string; utmCampaign?: string; utmMedium?: string } {
  if (typeof window === 'undefined') return {};
  
  const params = new URLSearchParams(window.location.search);
  return {
    utmSource: params.get('utm_source') || undefined,
    utmCampaign: params.get('utm_campaign') || undefined,
    utmMedium: params.get('utm_medium') || undefined,
  };
}

/**
 * Get device info (simple detection)
 */
function getDeviceInfo(): string {
  if (typeof window === 'undefined') return 'unknown';
  
  const ua = navigator.userAgent;
  if (/mobile|android|iphone|ipad/i.test(ua)) {
    return 'mobile';
  }
  if (/tablet|ipad/i.test(ua)) {
    return 'tablet';
  }
  return 'desktop';
}

/**
 * Send lead to webhook (fire-and-forget)
 */
async function sendToWebhook(lead: Lead): Promise<boolean> {
  const webhookUrl = import.meta.env.VITE_LEAD_WEBHOOK_URL;
  if (!webhookUrl || webhookUrl.trim().length === 0) {
    return false;
  }

  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add secret header if configured
    const secret = import.meta.env.VITE_LEAD_WEBHOOK_SECRET;
    if (secret && secret.trim().length > 0) {
      headers['x-lead-secret'] = secret.trim();
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(lead),
    });

    const success = response.ok;
    
    // Track webhook result (no PII)
    trackEvent({
      type: success ? 'lead_webhook_success' : 'lead_webhook_fail',
      source: lead.source,
      pageUrl: lead.pageUrl,
    });

    return success;
  } catch (error) {
    // Track webhook failure
    trackEvent({
      type: 'lead_webhook_fail',
      source: lead.source,
      pageUrl: lead.pageUrl,
    });

    if (import.meta.env.DEV) {
      console.warn('[Leads] Webhook failed:', error);
    }
    return false;
  }
}

/**
 * Submit lead to Supabase table public.leads
 * Only INSERT operation (anon SELECT is blocked by RLS)
 * Does NOT send id/created_at (let DB handle defaults)
 * Returns true on success, false otherwise
 */
export async function submitLeadSupabase(lead: Omit<Lead, 'id' | 'createdAt'>): Promise<boolean> {
  const result = await submitLead({
    source: lead.source,
    name: lead.name || null,
    email: lead.email || null,
    phone: lead.phone || null,
    treatment: lead.treatment || null,
    message: lead.message || null,
    timeline: lead.timeline || null,
    lang: lead.lang || null,
    page_url: lead.pageUrl || (typeof window !== 'undefined' ? window.location.href : ''),
    utm_source: lead.utmSource || null,
    utm_campaign: lead.utmCampaign || null,
    utm_medium: lead.utmMedium || null,
    referrer: lead.referrer || null,
    device: lead.device || null,
  });

  return result.success;
}

/**
 * Saves a lead to localStorage AND Supabase (if configured) AND webhook (if configured)
 * Always saves to localStorage first (fallback behavior)
 * If Supabase insert succeeds, marks meta.savedTo = "supabase" in localStorage
 */
export async function saveLead(lead: Omit<Lead, 'id' | 'createdAt'>): Promise<void> {
  try {
    // Enrich lead with metadata
    const utmParams = getUtmParams();
    const enrichedLead: Lead = {
      ...lead,
      id: generateId(),
      createdAt: new Date().toISOString(),
      utmSource: utmParams.utmSource,
      utmCampaign: utmParams.utmCampaign,
      utmMedium: utmParams.utmMedium,
      referrer: typeof window !== 'undefined' ? document.referrer || undefined : undefined,
      device: getDeviceInfo(),
    };

    // Always save to localStorage first (fallback behavior)
    const existingLeads = listLeadsLocal();
    let leadWithMeta = { ...enrichedLead, meta: { savedTo: 'localStorage' } as any };
    const updatedLeads = [leadWithMeta, ...existingLeads];
    const trimmed = updatedLeads.slice(0, MAX_LEADS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));

    // Submit to Supabase if configured (await it, but don't block on failure)
    try {
      const supabaseSuccess = await submitLeadSupabase(lead);
      if (supabaseSuccess) {
        // Update localStorage to mark as saved to Supabase
        leadWithMeta = { ...enrichedLead, meta: { savedTo: 'supabase' } as any };
        const updatedLeadsWithMeta = [leadWithMeta, ...existingLeads.filter(l => l.id !== enrichedLead.id)];
        const trimmedWithMeta = updatedLeadsWithMeta.slice(0, MAX_LEADS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedWithMeta));
      }
    } catch (error) {
      // Supabase insert failed - continue with localStorage only
      if (import.meta.env.DEV) {
        console.warn('[Leads] Supabase insert failed, continuing with localStorage only:', error);
      }
    }

    // Send to webhook if configured (fire-and-forget)
    sendToWebhook(enrichedLead).catch(() => {
      // Silently fail - don't block UI
    });

    // Track analytics (NO PII - only booleans and metadata)
    trackEvent({
      type: 'submit_lead',
      source: enrichedLead.source,
      lang: enrichedLead.lang || 'unknown',
      hasEmail: !!enrichedLead.email,
      hasPhone: !!enrichedLead.phone,
      hasName: !!enrichedLead.name,
      pageUrl: enrichedLead.pageUrl,
      utm_source: enrichedLead.utmSource,
      utm_campaign: enrichedLead.utmCampaign,
    });
  } catch (error) {
    console.warn('[Leads] Failed to save lead:', error);
  }
}

/**
 * Lists all leads from localStorage (newest first)
 */
export function listLeadsLocal(): Lead[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const leads = JSON.parse(stored) as Lead[];
    return leads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.warn('[Leads] Failed to load local leads:', error);
    return [];
  }
}

/**
 * Fetch leads from Supabase via secure Edge Function
 * 
 * NOTE: This function should NOT be called directly from client.
 * Use fetchLeadsFromSupabaseSecure() from adminLeadsApi.ts instead,
 * which calls the Edge Function with proper authentication.
 * 
 * This function is kept for backward compatibility but will return empty array
 * if RLS is enabled (which it should be in production).
 */
export async function listLeadsSupabase(limit: number = 1000): Promise<Lead[]> {
  // In production, direct SELECT from client is disabled by RLS.
  // Use the secure Edge Function endpoint instead.
  if (import.meta.env.PROD) {
    console.warn('[LeadStore] Direct Supabase SELECT is disabled in production. Use secure Edge Function endpoint.');
    return [];
  }

  const client = getSupabaseClient();
  if (!client) {
    return [];
  }

  try {
    const { data, error } = await client
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      if (import.meta.env.DEV) {
        console.warn('[Supabase] Failed to fetch leads:', error);
      }
      return [];
    }

    // Transform Supabase format to Lead format
    return (data || []).map((row: any) => ({
      id: row.id,
      createdAt: row.created_at,
      source: row.source,
      name: row.name || undefined,
      email: row.email || undefined,
      phone: row.phone || undefined,
      treatment: row.treatment || undefined,
      message: row.message || undefined,
      timeline: row.timeline || undefined,
      lang: row.lang || undefined,
      pageUrl: row.page_url,
      utmSource: row.utm_source || undefined,
      utmCampaign: row.utm_campaign || undefined,
      utmMedium: row.utm_medium || undefined,
      referrer: row.referrer || undefined,
      device: row.device || undefined,
    }));
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[Supabase] Error fetching leads:', error);
    }
    return [];
  }
}

/**
 * Lists unified leads (local + Supabase, deduplicated by id)
 */
export async function listLeadsUnified(): Promise<{ local: Lead[]; supabase: Lead[]; all: Lead[] }> {
  const localLeads = listLeadsLocal();
  const supabaseLeads = await listLeadsSupabase();

  // Deduplicate by id (prefer Supabase if duplicate)
  const leadMap = new Map<string, Lead>();
  
  // Add local leads first
  localLeads.forEach(lead => {
    leadMap.set(lead.id, lead);
  });
  
  // Add Supabase leads (will overwrite local if duplicate id)
  supabaseLeads.forEach(lead => {
    leadMap.set(lead.id, lead);
  });

  // Convert to array and sort by date
  const allLeads = Array.from(leadMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return {
    local: localLeads,
    supabase: supabaseLeads,
    all: allLeads,
  };
}

/**
 * Exports unified leads as CSV
 */
export async function exportLeadsCsvUnified(): Promise<string> {
  const { all } = await listLeadsUnified();
  
  if (all.length === 0) {
    return 'No leads found.';
  }

  const headers = [
    'ID',
    'Created At',
    'Source',
    'Name',
    'Email',
    'Phone',
    'Treatment',
    'Message',
    'Timeline',
    'Language',
    'Page URL',
    'UTM Source',
    'UTM Campaign',
    'UTM Medium',
    'Referrer',
    'Device',
  ];
  const rows = [headers.join(',')];

  all.forEach(lead => {
    const row = [
      lead.id,
      lead.createdAt,
      lead.source,
      escapeCsv(lead.name || ''),
      escapeCsv(lead.email || ''),
      escapeCsv(lead.phone || ''),
      escapeCsv(lead.treatment || ''),
      escapeCsv(lead.message || ''),
      escapeCsv(lead.timeline || ''),
      escapeCsv(lead.lang || ''),
      escapeCsv(lead.pageUrl || ''),
      escapeCsv(lead.utmSource || ''),
      escapeCsv(lead.utmCampaign || ''),
      escapeCsv(lead.utmMedium || ''),
      escapeCsv(lead.referrer || ''),
      escapeCsv(lead.device || ''),
    ];
    rows.push(row.join(','));
  });

  return rows.join('\n');
}

/**
 * Clears all leads from localStorage (does NOT delete Supabase)
 */
export function clearLeadsLocal(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('[Leads] Failed to clear local leads:', error);
  }
}

