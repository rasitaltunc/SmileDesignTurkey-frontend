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

  // ✅ CRITICAL: Debug env vars in development
  if (import.meta.env.DEV) {
    console.log('[Supabase Client] Env check:', {
      hasUrl: !!url,
      urlLength: url?.length || 0,
      hasAnonKey: !!anonKey,
      anonKeyLength: anonKey?.length || 0,
      urlPrefix: url?.substring(0, 20) || 'missing',
    });
  }

  // Only initialize if both env vars exist and are non-empty
  if (!url || !anonKey || url.trim().length === 0 || anonKey.trim().length === 0) {
    if (import.meta.env.DEV) {
      console.error('[Supabase Client] Missing env vars:', {
        VITE_SUPABASE_URL: url ? 'present' : 'MISSING',
        VITE_SUPABASE_ANON_KEY: anonKey ? 'present' : 'MISSING',
      });
    }
    return null;
  }

  try {
    supabaseClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    
    // ✅ Verify client is properly initialized
    if (import.meta.env.DEV) {
      console.log('[Supabase Client] Initialized successfully:', {
        url: url.substring(0, 30) + '...',
        hasAnonKey: !!anonKey,
      });
    }
    
    return supabaseClient;
  } catch (error) {
    console.error('[Supabase] Failed to initialize client:', error);
    return null;
  }
}

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  return getSupabaseClient() !== null;
}

