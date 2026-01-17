const rawKey = import.meta.env.VITE_POSTHOG_KEY || '';
const hasPlaceholder = rawKey.includes('XXXX') || rawKey.includes('your_') || rawKey.includes('placeholder');
// Default to EU region (prevents config.js 404/401/nosniff errors)
const rawHost = import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com';

export const ANALYTICS_CONFIG = {
  posthogKey: rawKey,
  posthogHost: rawHost,
  enabled: !!rawKey && !hasPlaceholder && rawKey.trim().length > 0,
} as const;

