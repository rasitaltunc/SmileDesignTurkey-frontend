/**
 * Get public site URL (production-safe)
 * Uses window.location.origin if available, falls back to env var
 */
export function getPublicSiteUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Fallback to env var (useful for SSR or when window is not available)
  const envUrl = import.meta.env.VITE_PUBLIC_SITE_URL;
  if (envUrl) {
    return envUrl;
  }
  
  // Last resort fallback (should not happen in browser)
  return 'http://localhost:3000';
}

