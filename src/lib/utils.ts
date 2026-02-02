import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get public site URL (production-safe)
 * Uses window.location.origin if available, falls back to env var
 * NEVER returns localhost unless in dev mode
 */
export function getPublicSiteUrl(): string {
  // Always prefer window.location.origin in browser (most accurate)
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;

    // In production, reject localhost (security check)
    if (import.meta.env.PROD && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      console.warn('[getPublicSiteUrl] localhost detected in production, using env fallback');
      // Fall through to env var check
    } else {
      return origin;
    }
  }

  // Fallback to env var (useful for SSR or when window is not available)
  const envUrl = import.meta.env.VITE_PUBLIC_SITE_URL;
  if (envUrl && envUrl.trim().length > 0) {
    // Validate env URL doesn't contain localhost in production
    if (import.meta.env.PROD && (envUrl.includes('localhost') || envUrl.includes('127.0.0.1'))) {
      console.error('[getPublicSiteUrl] VITE_PUBLIC_SITE_URL contains localhost in production');
      throw new Error('Invalid VITE_PUBLIC_SITE_URL: localhost not allowed in production');
    }
    return envUrl.trim();
  }

  // Only allow localhost fallback in dev mode
  if (import.meta.env.DEV) {
    console.warn('[getPublicSiteUrl] Using localhost fallback (dev mode only)');
    return 'http://localhost:5173'; // Vite default port
  }

  // Production: no valid URL found
  throw new Error('getPublicSiteUrl: No valid site URL found. Set VITE_PUBLIC_SITE_URL or ensure window.location.origin is available.');
}

/**
 * Get returnTo destination from URL query params with smart defaults
 * Returns portal path if user has valid portal session, otherwise onboarding
 */
export function getReturnToFromQuery(searchParams: URLSearchParams, hasValidPortalSession: () => boolean, defaultPortalPath: string = '/portal'): string {
  // Explicit returnTo takes precedence
  const returnTo = searchParams.get('returnTo');
  if (returnTo && returnTo.trim().length > 0) {
    return returnTo.trim();
  }

  // If user has valid portal session, default to portal
  if (hasValidPortalSession()) {
    return defaultPortalPath;
  }

  // Otherwise default to onboarding
  return '/onboarding';
}

