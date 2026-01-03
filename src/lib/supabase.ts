/**
 * Supabase client for optional lead storage
 * 
 * This module provides a safe Supabase client that only initializes if env vars are present.
 * Used for INSERT operations (RLS allows anon INSERT).
 * 
 * SQL Schema (run in Supabase SQL editor):
 * See supabase/leads.sql for complete schema with RLS policies.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

/**
 * Get Supabase client (initializes only if env vars are configured)
 * Returns null if not configured (safe fallback)
 */
export function getSupabaseClient(): SupabaseClient | null {
  // Return cached client if already initialized
  if (supabaseClient) {
    return supabaseClient;
  }

  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  // Only initialize if both env vars exist and are non-empty
  if (!url || !anonKey || url.trim().length === 0 || anonKey.trim().length === 0) {
    return null;
  }

  try {
    supabaseClient = createClient(url, anonKey);
    return supabaseClient;
  } catch (error) {
    console.warn('[Supabase] Failed to initialize client:', error);
    return null;
  }
}

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  return getSupabaseClient() !== null;
}

/**
 * Export supabase client instance (for direct use)
 * Note: This may be null if env vars are not configured
 */
export const supabase = getSupabaseClient();

import { submitLead } from './submitLead';

export async function saveLeadToSupabase(lead: {
  source: 'contact' | 'onboarding';
  name?: string;
  email?: string;
  phone?: string;
  treatment?: string;
  message?: string;
  timeline?: string;
  lang?: string;
  pageUrl: string;
}): Promise<boolean> {
  const result = await submitLead({
    source: lead.source,
    name: lead.name || null,
    email: lead.email || null,
    phone: lead.phone || null,
    treatment: lead.treatment || null,
    message: lead.message || null,
    timeline: lead.timeline || null,
    lang: lead.lang || null,
    page_url: lead.pageUrl,
  });

  return result.success;
}

export async function fetchLeadsFromSupabase(limit: number = 1000): Promise<any[]> {
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
      console.warn('[Supabase] Failed to fetch leads:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.warn('[Supabase] Error fetching leads:', error);
    return [];
  }
}

