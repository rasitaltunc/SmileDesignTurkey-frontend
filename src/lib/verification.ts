/**
 * Verification System (Supabase Auth OTP Magic Link)
 * Uses Supabase Auth signInWithOtp for secure email verification
 */

import { getSupabaseClient } from './supabaseClient';
import { getPortalSession, createPortalSession } from './portalSession';

/**
 * Send magic link verification email using Supabase Auth OTP
 * The email will contain a link to /portal/verify with PKCE code
 */
export async function startEmailVerification(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' };
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const redirectTo = `${origin}/portal/verify`;

    // Send OTP magic link via Supabase Auth
    const { error } = await supabase.auth.signInWithOtp({
      email: email.toLowerCase().trim(),
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: false, // Only verify existing email, don't create user
      },
    });

    if (error) {
      return { success: false, error: error.message || 'Failed to send verification email' };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

/**
 * Handle verification callback from magic link (PKCE flow)
 * Exchanges code for session and verifies lead email
 */
export async function handleVerifyCallback(
  case_id: string,
  portal_token: string
): Promise<{ success: boolean; email?: string; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' };
    }

    // Extract code from URL hash (Supabase Auth PKCE flow)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const code = hashParams.get('code');
    const error = hashParams.get('error');
    const errorDescription = hashParams.get('error_description');

    if (error) {
      return { success: false, error: errorDescription || error || 'Verification failed' };
    }

    if (!code) {
      return { success: false, error: 'No verification code found' };
    }

    // Exchange code for session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError || !data?.session?.user?.email) {
      return { success: false, error: exchangeError?.message || 'Failed to verify email' };
    }

    const verifiedEmail = data.session.user.email.toLowerCase().trim();

    // Call server endpoint to mark lead as verified
    const verifyResponse = await fetch('/api/secure/verify-lead', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${data.session.access_token}`,
      },
      body: JSON.stringify({ case_id, portal_token }),
    });

    const verifyResult = await verifyResponse.json().catch(() => ({}));
    if (!verifyResponse.ok || !verifyResult.ok) {
      return { success: false, error: verifyResult.error || 'Failed to update verification status' };
    }

    // Update portal session with verified status
    const session = getPortalSession();
    if (session && session.case_id === case_id) {
      createPortalSession(case_id, portal_token, verifiedEmail, session.phone, true);
    }

    // Clear URL hash to remove verification code
    window.history.replaceState(null, '', window.location.pathname + window.location.search);

    return { success: true, email: verifiedEmail };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

