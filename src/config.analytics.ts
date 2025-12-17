const rawKey = import.meta.env.VITE_POSTHOG_KEY || '';
const hasPlaceholder = rawKey.includes('XXXX') || rawKey.includes('your_') || rawKey.includes('placeholder');

export const ANALYTICS_CONFIG = {
  posthogKey: rawKey,
  posthogHost: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
  enabled: !!rawKey && !hasPlaceholder && rawKey.trim().length > 0,
} as const;

