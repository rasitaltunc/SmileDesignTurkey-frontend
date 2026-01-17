/**
 * Verification System (Magic Link)
 * V1: Email magic link only (OTP/SMS can be added later)
 */

import { getSupabaseClient } from './supabaseClient';
import { createPortalSession } from './portalSession';

/**
 * Send magic link verification email
 * For now, this is a placeholder that simulates the flow
 * In production, this should trigger Supabase Auth email or custom email service
 */
export async function sendMagicLink(email: string, case_id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' };
    }

    // TODO: In production, use Supabase Auth magic link or custom email service
    // For V1, we'll show a simple "check your email" message
    // The actual magic link should include a signed token: /portal?token=XXX&case_id=YYY
    
    // Store a temporary verification token (24h expiry)
    const token = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    
    try {
      localStorage.setItem(`verification_token_${case_id}`, JSON.stringify({
        token,
        email,
        expires_at: expiresAt,
      }));
    } catch (err) {
      console.warn('[Verification] Failed to store token:', err);
    }

    // In production: Send actual email with link like:
    // https://guidehealth.com/portal/verify?token=XXX&case_id=YYY
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

/**
 * Verify magic link token
 * Creates authenticated session if valid
 */
export async function verifyMagicLink(token: string, case_id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const stored = localStorage.getItem(`verification_token_${case_id}`);
    if (!stored) {
      return { success: false, error: 'Invalid or expired verification link' };
    }

    const data = JSON.parse(stored);
    if (data.token !== token || Date.now() > data.expires_at) {
      localStorage.removeItem(`verification_token_${case_id}`);
      return { success: false, error: 'Verification link expired' };
    }

    // Create portal session
    createPortalSession(case_id, data.email);

    // Clean up token
    localStorage.removeItem(`verification_token_${case_id}`);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

