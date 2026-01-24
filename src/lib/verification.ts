/**
 * Verification System
 * Custom Token System - backend-driven, session-independent
 * 
 * DEPRECATED: Supabase Auth OTP removed for lead verification.
 * Supabase Auth OTP is now ONLY used for employee/admin login (not lead verification).
 * Lead verification uses custom token system via /api/secure/send-verification
 */

import { getSupabaseClient } from './supabaseClient';
import { getPortalSession, createPortalSession } from './portalSession';

/**
 * Send custom token-based verification email (alternative to Supabase Auth OTP)
 * Uses backend API to generate secure token and send email
 * This method is session-independent and works even when employee is logged in
 */
export async function startCustomEmailVerification(
  case_id: string,
  email: string,
  lead_id?: string // Optional: if provided, backend skips case_id lookup
): Promise<{ success: boolean; error?: string; verifyUrl?: string }> {
  try {
    if (!case_id || !email) {
      return { success: false, error: 'case_id and email are required' };
    }

    const response = await fetch('/api/secure/send-verification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        case_id,
        email: email.toLowerCase().trim(),
        lead_id: lead_id || undefined, // Send lead_id if available (optimization)
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.ok) {
      return { 
        success: false, 
        error: result.error || 'Failed to send verification email' 
      };
    }

    // In production, remove verifyUrl from response (email is sent by backend)
    // For testing, verifyUrl is returned
    return { 
      success: true,
      verifyUrl: result.verifyUrl, // Only for testing - remove in production
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}


