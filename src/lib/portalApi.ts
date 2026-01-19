/**
 * Portal API Client
 * Fetches portal data from secure API endpoint using case_id + portal_token
 */

import { getPortalSession } from './portalSession';

export interface PortalData {
  id: string; // lead_id for send-verification endpoint
  case_id: string;
  created_at: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  treatment: string | null;
  message: string | null;
  timeline: string | null;
  portal_status: string;
  email_verified_at: string | null;
  coordinator_email: string | null;
  next_step: 'verify' | 'upload';
}

/**
 * Fetch portal data from API
 * Uses portal_token from session (never in URL)
 */
export async function fetchPortalData(): Promise<{ success: boolean; data?: PortalData; error?: string }> {
  const session = getPortalSession();
  if (!session || !session.case_id || !session.portal_token) {
    return { success: false, error: 'No valid portal session' };
  }

  try {
    const res = await fetch('/api/public/portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        case_id: session.case_id,
        portal_token: session.portal_token,
      }),
    });

    const result = await res.json().catch(() => ({}));
    if (!res.ok || !result.ok) {
      return { success: false, error: result.error || 'Failed to fetch portal data' };
    }

    return { success: true, data: result.data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

