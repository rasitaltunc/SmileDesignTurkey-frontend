// Session Recovery - Automatic auth recovery for invalid refresh tokens

import { toast } from '@/lib/toast';
import { capture } from '../posthog';

interface SessionRecoveryOptions {
  onExpired: () => void;
}

// Manual logout flag to prevent "expired" toast on intentional logout
const manualLogoutRef = { current: false };

/**
 * Clear Supabase auth storage keys safely
 */
export function clearSupabaseStorage(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.includes('-auth-token')) {
        keys.push(key);
      }
    }
    keys.forEach(key => localStorage.removeItem(key));
  } catch (err) {
    console.debug('[sessionRecovery] Failed to clear storage:', err);
  }
}

/**
 * Mark manual logout to prevent "expired" toast
 */
export function markManualLogout(): void {
  manualLogoutRef.current = true;
  // Reset after 1 second
  setTimeout(() => {
    manualLogoutRef.current = false;
  }, 1000);
}

/**
 * Recover from invalid session
 */
async function recoverSession(
  supabase: any,
  reason: 'invalid_refresh_token' | 'signed_out_unexpected',
  onExpired: () => void
): Promise<void> {
  try {
    // Clear storage
    clearSupabaseStorage();
    
    // Sign out locally
    await supabase.auth.signOut({ scope: 'local' });
    
    // Emit audit event (privacy-safe)
    try {
      capture('auth_session_recovered', {
        at: new Date().toISOString(),
        reason,
        path: window.location.pathname,
      });
    } catch (auditErr) {
      // Silent fail
      console.debug('[sessionRecovery] Failed to emit audit:', auditErr);
    }
    
    // Show toast (only if not manual logout)
    if (!manualLogoutRef.current) {
      toast.error('Session expired. Please sign in again.');
    }
    
    // Preserve current path as "next" parameter
    const currentPath = window.location.pathname;
    const isPrivateRoute = currentPath.startsWith('/admin') || 
                          currentPath.startsWith('/employee') ||
                          currentPath.startsWith('/patient') ||
                          currentPath.startsWith('/doctor') ||
                          currentPath === '/plan-dashboard';
    
    if (isPrivateRoute) {
      const next = encodeURIComponent(currentPath);
      window.location.assign(`/login?next=${next}`);
    } else {
      onExpired();
    }
  } catch (err) {
    console.error('[sessionRecovery] Recovery failed:', err);
    // Still redirect even if recovery fails
    onExpired();
  }
}

/**
 * Install session recovery handlers
 */
export function installSessionRecovery(
  supabase: any,
  options: SessionRecoveryOptions
): () => void {
  const { onExpired } = options;
  
  // Check session on boot
  supabase.auth.getSession().then(({ data, error }: any) => {
    if (error) {
      const errorMessage = error.message || '';
      if (/Invalid Refresh Token|Refresh Token Not Found/i.test(errorMessage)) {
        recoverSession(supabase, 'invalid_refresh_token', onExpired);
      }
    }
  }).catch((err: any) => {
    const errorMessage = err?.message || '';
    if (/Invalid Refresh Token|Refresh Token Not Found/i.test(errorMessage)) {
      recoverSession(supabase, 'invalid_refresh_token', onExpired);
    }
  });
  
  // Subscribe to auth state changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: any) => {
    if (event === 'SIGNED_OUT' && !manualLogoutRef.current) {
      // Unexpected sign out (not manual)
      recoverSession(supabase, 'signed_out_unexpected', onExpired);
    }
  });
  
  // Return cleanup function
  return () => {
    subscription?.unsubscribe();
  };
}

