/**
 * Onboarding API Client
 * Handles card submission and state fetching
 */

import { getPortalSession } from '../portalSession';

export interface OnboardingState {
  lead_id: string;
  progress_percent: number;
  completed_card_ids: string[];
  updated_at: string | null;
}

export interface OnboardingStateResponse {
  state: {
    lead_id: string;
    completed_card_ids: string[];
    progress_percent: number;
    updated_at: string | null;
  };
  latest_answers: Record<string, any>;
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
      const errorMsg = json.error || "Failed to submit";
      if (import.meta.env.DEV) {
        console.error("[onboardingApi] submitOnboardingCard error:", {
          status: res.status,
          error: errorMsg,
          details: json.details,
          response: json,
        });
      }
      return { success: false, error: errorMsg };
    }

    // ✅ Normalize: latest_answers top-level → state içine koy
    const normalizedState = {
      ...(json.state || {}),
      latest_answers: json.latest_answers || {},
    };

    return { success: true, data: { state: normalizedState, latest_answers: json.latest_answers } };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Failed to submit card";
    if (import.meta.env.DEV) {
      console.error("[onboardingApi] submitOnboardingCard exception:", error);
    }
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Submit card using current portal session
 * Convenience wrapper that automatically gets case_id and portal_token
 * Returns updated state and latest_answers
 */
export async function submitOnboardingCardWithSession(
  card_id: string,
  answers: Record<string, any>
): Promise<OnboardingStateResponse> {
  const session = getPortalSession();
  if (!session?.case_id || !session?.portal_token) {
    throw new Error("No valid portal session");
  }

  const result = await submitOnboardingCard({
    case_id: session.case_id,
    portal_token: session.portal_token,
    card_id,
    answers,
  });

  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to submit card");
  }

  // result.data already has normalized state from submitOnboardingCard
  return {
    state: result.data.state,
  } as OnboardingStateResponse;
}

/**
 * Fetch onboarding state using current portal session
 * Uses GET method with query params for better caching/debugging
 */
export async function fetchOnboardingStateWithSession() {
  const session = getPortalSession();
  if (!session?.case_id || !session?.portal_token) {
    throw new Error("Missing portal session");
  }

  // Use GET with query params (supports browser caching, easier debugging)
  const url = new URL("/api/public/onboarding-state", window.location.origin);
  url.searchParams.set("case_id", session.case_id);
  url.searchParams.set("portal_token", session.portal_token);

  const res = await fetch(url.toString(), {
    method: "GET",
  });

  const json = await res.json().catch(() => ({}));
  
  if (!res.ok || !json.ok) {
    const errorMsg = json.error || "Failed to load onboarding state";
    if (import.meta.env.DEV) {
      console.error("[onboardingApi] fetchOnboardingStateWithSession error:", {
        status: res.status,
        error: errorMsg,
        response: json,
      });
    }
    throw new Error(errorMsg);
  }
  
  // ✅ Normalize: latest_answers top-level → state içine koy
  const normalizedState = {
    ...(json.state || {}),
    latest_answers: json.latest_answers || {},
  };
  
  return {
    success: true,
    lead: json.lead,
    state: normalizedState,
  } as {
    success: true;
    lead: { id: string; case_id: string; portal_status: string | null; email_verified: boolean };
    state: {
      completed_card_ids: string[];
      progress_percent: number;
      updated_at: string | null;
      latest_answers: Record<string, any>;
    };
  };
}

/**
 * Set portal password (requires active portal session)
 */
export async function setPortalPassword(password: string): Promise<{ ok: true; has_password: true }> {
  const session = getPortalSession();
  if (!session?.case_id || !session?.portal_token) {
    throw new Error("No valid portal session");
  }

  const res = await fetch("/api/public/portal-set-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      case_id: session.case_id,
      portal_token: session.portal_token,
      password,
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) {
    throw new Error(json.error || "Failed to set password");
  }
  
  return json as { ok: true; has_password: true };
}

