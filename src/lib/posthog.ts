import posthog from 'posthog-js';
import { ANALYTICS_CONFIG } from '../config.analytics';

let posthogInitialized = false;
let posthogInstance: typeof posthog | null = null;

// Check if PostHog should be enabled (prod only, or via ENV override)
const shouldEnablePosthog = () => {
  // Allow ENV override
  const envOverride = import.meta.env.VITE_ENABLE_POSTHOG;
  if (envOverride === 'false') return false;
  if (envOverride === 'true') return true;
  
  // Default: only in production
  return import.meta.env.PROD;
};

export function initPosthog() {
  // Only initialize in browser
  if (typeof window === 'undefined') {
    return;
  }

  // Don't initialize if already done
  if (posthogInitialized) {
    return;
  }

  // Check if PostHog should be enabled (prod only by default)
  if (!shouldEnablePosthog()) {
    if (import.meta.env.DEV) {
      console.log('[PostHog] Skipping initialization - disabled in dev mode');
    }
    return;
  }

  // Check if enabled (key exists and is not a placeholder)
  if (!ANALYTICS_CONFIG.enabled) {
    if (import.meta.env.DEV) {
      console.log('[PostHog] Skipping initialization - key missing or placeholder');
    }
    return;
  }

  try {
    if (import.meta.env.DEV) {
      console.log('[PostHog] Initializing...', {
        key: ANALYTICS_CONFIG.posthogKey ? `${ANALYTICS_CONFIG.posthogKey.substring(0, 10)}...` : 'MISSING',
        host: ANALYTICS_CONFIG.posthogHost,
      });
    }
    
    posthog.init(ANALYTICS_CONFIG.posthogKey, {
      api_host: ANALYTICS_CONFIG.posthogHost,
      autocapture: false, // Manual events only
      loaded: (ph) => {
        if (import.meta.env.DEV) {
          console.log('[PostHog] Initialized successfully');
        }
        // Expose to window for backward compatibility (but prefer using posthogInstance)
        if (typeof window !== 'undefined') {
          (window as any).posthog = ph;
        }
      },
    });
    
    posthogInstance = posthog;
    posthogInitialized = true;
    
    if (import.meta.env.DEV) {
      console.log('[PostHog] Initialization complete');
    }
  } catch (error) {
    console.error('[PostHog] Failed to initialize:', error);
    posthogInstance = null;
    posthogInitialized = false;
  }
}

export function capture(eventName: string, properties?: Record<string, any>) {
  // Safe wrapper - never throws
  if (!posthogInitialized || !posthogInstance) {
    if (import.meta.env.DEV) {
      console.log('[PostHog] capture() called but not initialized:', eventName);
    }
    return;
  }

  try {
    posthogInstance.capture(eventName, properties);
    if (import.meta.env.DEV) {
      console.log('[PostHog] Event captured:', eventName, properties);
    }
  } catch (error) {
    // Silently fail - don't break the app
    if (import.meta.env.DEV) {
      console.warn('[PostHog] Failed to capture event:', eventName, error);
    }
  }
}

/**
 * Get PostHog instance (for backward compatibility with window.posthog usage)
 */
export function getPosthogInstance() {
  return posthogInstance;
}

