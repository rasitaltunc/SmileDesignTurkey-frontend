// Dynamic import for posthog-js (heavy ~165KB) - lazy load when needed
import { ANALYTICS_CONFIG } from '../config.analytics';

let posthogInitialized = false;
let posthogInstance: any = null;
let posthogModule: typeof import('posthog-js') | null = null;

/**
 * Route guard: only allow analytics on public routes
 * Blocks admin/doctor/employee routes (hard block)
 */
const isAnalyticsAllowedRoute = (): boolean => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname || '/';

  // Hard block: internal apps never load analytics
  if (path.startsWith('/admin')) return false;
  if (path.startsWith('/doctor')) return false;
  if (path.startsWith('/employee')) return false;

  // Allow public pages only
  return true;
};

// Check if PostHog should be enabled (prod only, or via ENV override)
const shouldEnablePosthog = () => {
  // Allow ENV override
  const envOverride = import.meta.env.VITE_ENABLE_POSTHOG;
  if (envOverride === 'false') return false;
  if (envOverride === 'true') return true;
  
  // Default: only in production
  return import.meta.env.PROD;
};

/**
 * Initialize PostHog (lazy loads posthog-js when called)
 * Safe to call multiple times - will only initialize once.
 * 
 * HARD BLOCK: Never initializes on admin/doctor/employee routes.
 */
export async function initPosthog(): Promise<void> {
  // Only initialize in browser
  if (typeof window === 'undefined') {
    return;
  }

  // ✅ HARD BLOCK: never init outside public routes
  // This ensures posthog-js is NEVER imported on internal routes
  if (!isAnalyticsAllowedRoute()) {
    if (import.meta.env.DEV) {
      console.log('[PostHog] Blocked initialization - internal route');
    }
    return;
  }

  // Don't initialize if already done
  if (posthogInitialized && posthogInstance) {
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
  // Guard: if VITE_POSTHOG_KEY is missing => do not init at all
  if (!ANALYTICS_CONFIG.enabled) {
    if (import.meta.env.DEV) {
      console.log('[PostHog] Skipping initialization - key missing or placeholder');
    }
    return;
  }
  
  // Additional guard: ensure key is actually present
  if (!ANALYTICS_CONFIG.posthogKey || ANALYTICS_CONFIG.posthogKey.trim().length === 0) {
    if (import.meta.env.DEV) {
      console.log('[PostHog] Skipping initialization - VITE_POSTHOG_KEY not set');
    }
    return;
  }

  try {
    // Lazy load posthog-js module
    if (!posthogModule) {
      posthogModule = await import('posthog-js');
    }
    
    const posthog = posthogModule.default;
    
    if (import.meta.env.DEV) {
      console.log('[PostHog] Initializing...', {
        key: ANALYTICS_CONFIG.posthogKey ? `${ANALYTICS_CONFIG.posthogKey.substring(0, 10)}...` : 'MISSING',
        host: ANALYTICS_CONFIG.posthogHost,
      });
    }
    
    posthog.init(ANALYTICS_CONFIG.posthogKey, {
      api_host: ANALYTICS_CONFIG.posthogHost,
      autocapture: false, // Manual events only
      disable_session_recording: true, // Disable session recording
      // Use same host for UI to prevent config.js fetch from eu-assets (prevents 404/401/nosniff)
      ui_host: ANALYTICS_CONFIG.posthogHost,
      // Batch requests to reduce network errors
      request_batching: true,
      // Disable internal metrics to reduce requests
      _capture_metrics: false,
      loaded: (ph) => {
        if (import.meta.env.DEV) {
          console.log('[PostHog] Initialized successfully');
        }
        // Expose to window for backward compatibility (but prefer using posthogInstance)
        if (typeof window !== 'undefined') {
          (window as any).posthog = ph;
        }
        
        // Wrap capture to catch and silence errors
        const originalCapture = ph.capture.bind(ph);
        ph.capture = (eventName: string, properties?: Record<string, any>) => {
          try {
            originalCapture(eventName, properties);
          } catch (err) {
            // Silent fail - don't break app if PostHog fails
            // Only log in dev
            if (import.meta.env.DEV) {
              console.warn('[PostHog] capture() failed (silenced in prod):', eventName);
            }
          }
        };
      },
      // Catch initialization errors (soft-fail)
      persistence: 'localStorage+cookie',
      // Disable opt-out UI (we handle privacy separately)
      opt_out_capturing_by_default: false,
    });
    
    posthogInstance = posthog;
    posthogInitialized = true;
    
    if (import.meta.env.DEV) {
      console.log('[PostHog] Initialization complete');
    }
  } catch (error) {
    // Soft-fail: only log in dev, silent in prod
    if (import.meta.env.DEV) {
      console.warn('[PostHog] Failed to initialize (silenced in prod):', error);
    }
    posthogInstance = null;
    posthogInitialized = false;
    posthogModule = null;
    // Don't throw - app continues without analytics
  }
}

/**
 * Capture event (lazy init on first call if needed)
 * Safe wrapper - never throws, auto-initializes PostHog if needed.
 * 
 * HARD NO-OP: Never executes on admin/doctor/employee routes.
 */
export function capture(eventName: string, properties?: Record<string, any>) {
  // ✅ HARD NO-OP on internal routes (prevents any posthog-js import)
  if (!isAnalyticsAllowedRoute()) {
    if (import.meta.env.DEV) {
      console.log('[PostHog] capture() blocked - internal route:', eventName);
    }
    return;
  }

  // Auto-init if public route and not yet initialized
  if (!posthogInitialized && shouldEnablePosthog() && ANALYTICS_CONFIG.enabled) {
    initPosthog().catch(() => {
      // Silent fail - continue without analytics
    });
  }
  
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

