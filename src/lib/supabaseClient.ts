import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

/**
 * Initialize Supabase client only if env vars are present
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

