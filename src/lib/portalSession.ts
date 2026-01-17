/**
 * Portal Session Management
 * Handles temporary portal access via localStorage (24h expiry)
 * Used for "soft lead" flow where user hasn't verified yet
 */

const PORTAL_SESSION_KEY = 'portal_session_v1';
const PORTAL_SESSION_EXPIRY_HOURS = 24;

export interface PortalSession {
  case_id: string;
  email?: string;
  phone?: string;
  created_at: string;
  expires_at: string;
}

/**
 * Create a portal session (store in localStorage)
 * Expires after 24 hours
 */
export function createPortalSession(case_id: string, email?: string, phone?: string): void {
  const now = Date.now();
  const expiresAt = now + PORTAL_SESSION_EXPIRY_HOURS * 60 * 60 * 1000;

  const session: PortalSession = {
    case_id,
    email,
    phone,
    created_at: new Date(now).toISOString(),
    expires_at: new Date(expiresAt).toISOString(),
  };

  try {
    localStorage.setItem(PORTAL_SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.warn('[PortalSession] Failed to save session:', error);
  }
}

/**
 * Get current portal session (if valid and not expired)
 */
export function getPortalSession(): PortalSession | null {
  try {
    const stored = localStorage.getItem(PORTAL_SESSION_KEY);
    if (!stored) return null;

    const session: PortalSession = JSON.parse(stored);
    const now = Date.now();
    const expiresAt = new Date(session.expires_at).getTime();

    if (now > expiresAt) {
      // Session expired
      localStorage.removeItem(PORTAL_SESSION_KEY);
      return null;
    }

    return session;
  } catch (error) {
    console.warn('[PortalSession] Failed to read session:', error);
    return null;
  }
}

/**
 * Clear portal session
 */
export function clearPortalSession(): void {
  try {
    localStorage.removeItem(PORTAL_SESSION_KEY);
  } catch (error) {
    console.warn('[PortalSession] Failed to clear session:', error);
  }
}

/**
 * Check if portal session is valid
 */
export function hasValidPortalSession(): boolean {
  return getPortalSession() !== null;
}

