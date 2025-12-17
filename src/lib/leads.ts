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
};

const STORAGE_KEY = 'leads_v1';
const MAX_LEADS = 10000; // Prevent localStorage from getting too large

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Saves a lead to localStorage (append to existing leads)
 * Also saves to Supabase if configured (fire-and-forget, non-blocking)
 */
export function saveLead(lead: Omit<Lead, 'id' | 'createdAt'>): void {
  try {
    const existingLeads = listLeads();
    
    const newLead: Lead = {
      ...lead,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };

    // Always save to localStorage first (existing behavior)
    const updatedLeads = [newLead, ...existingLeads];
    const trimmed = updatedLeads.slice(0, MAX_LEADS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));

    // Optional: Send to Supabase if configured (fire-and-forget, non-blocking)
    submitLead({
      source: newLead.source,
      name: newLead.name || null,
      email: newLead.email || null,
      phone: newLead.phone || null,
      treatment: newLead.treatment || null,
      message: newLead.message || null,
      timeline: newLead.timeline || null,
      lang: newLead.lang || null,
      page_url: newLead.pageUrl || (typeof window !== 'undefined' ? window.location.href : ''),
    }).catch(() => {
      // Silently fail - don't block UI
    });

    // Optional: Send to webhook if configured (fire-and-forget)
    const webhookUrl = import.meta.env.VITE_LEAD_WEBHOOK_URL;
    if (webhookUrl && webhookUrl.trim().length > 0) {
      sendToWebhook(newLead, webhookUrl).catch(() => {
        // Silently fail - don't block UI
      });
    }
  } catch (error) {
    console.warn('[Leads] Failed to save lead:', error);
  }
}

/**
 * Lists all leads from localStorage (newest first)
 * 
 * TODO: Admin read from Supabase requires server-side endpoint (Edge Function/service role)
 * because RLS blocks anon SELECT. See README_SUPABASE.md for secure admin endpoint setup.
 */
export function listLeads(): Lead[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const leads = JSON.parse(stored) as Lead[];
    return leads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.warn('[Leads] Failed to load leads:', error);
    return [];
  }
}

/**
 * Exports leads as CSV string
 */
export function exportLeadsCsv(): string {
  const leads = listLeads();
  
  if (leads.length === 0) {
    return 'No leads found.';
  }

  // CSV header
  const headers = ['ID', 'Created At', 'Source', 'Name', 'Email', 'Phone', 'Treatment', 'Message', 'Timeline', 'Language', 'Page URL'];
  const rows = [headers.join(',')];

  // CSV rows
  leads.forEach(lead => {
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
    ];
    rows.push(row.join(','));
  });

  return rows.join('\n');
}

/**
 * Clears all leads from localStorage
 */
export function clearLeads(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('[Leads] Failed to clear leads:', error);
  }
}

/**
 * Escapes CSV field (handles commas, quotes, newlines)
 */
function escapeCsv(value: string): string {
  if (!value) return '';
  // If contains comma, quote, or newline, wrap in quotes and escape quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Sends lead to webhook (fire-and-forget)
 */
async function sendToWebhook(lead: Lead, webhookUrl: string): Promise<void> {
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(lead),
    });
  } catch (error) {
    // Silently fail - webhook is optional
    if (import.meta.env.DEV) {
      console.warn('[Leads] Webhook failed:', error);
    }
  }
}

