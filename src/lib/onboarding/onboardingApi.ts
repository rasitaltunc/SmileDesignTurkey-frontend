/**
 * Onboarding API Client
 * Handles card submission and state fetching
 */

import { getPortalSession } from '../portalSession';

export interface OnboardingState {
  lead_id: string;
  progress_percent: number;
  completed_card_ids: string[];
}

/**
 * Submit onboarding card answers
 */
export async function submitOnboardingCard(payload: {
  case_id: string;
  portal_token: string;
  card_id: string;
  answers: Record<string, any>;
}): Promise<{ success: boolean; data?: OnboardingState; error?: string }> {
  try {
    const res = await fetch("/api/public/onboarding-submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) {
      return { success: false, error: json.error || "Failed to submit" };
    }

    return { success: true, data: json };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to submit card",
    };
  }
}

/**
 * Submit card using current portal session
 * Convenience wrapper that automatically gets case_id and portal_token
 */
export async function submitOnboardingCardWithSession(
  card_id: string,
  answers: Record<string, any>
): Promise<{ success: boolean; data?: OnboardingState; error?: string }> {
  const session = getPortalSession();
  if (!session?.case_id || !session?.portal_token) {
    return { success: false, error: "No valid portal session" };
  }

  return submitOnboardingCard({
    case_id: session.case_id,
    portal_token: session.portal_token,
    card_id,
    answers,
  });
}

