import { capture } from './posthog';

// Event type definitions
export type AnalyticsEvent = 
  | { type: 'start_onboarding'; entry: string; lang: string }
  | { type: 'onboarding_step_view'; step: number; lang: string }
  | { type: 'onboarding_step_complete'; step: number; goal?: string; timeline?: string; lang: string }
  | { type: 'view_plan_dashboard'; goal?: string; timeline?: string; lang: string }
  | { type: 'whatsapp_click'; where: string; goal?: string; timeline?: string; lang: string }
  | { type: 'contact_submit'; where: string; hasEmail: boolean; hasPhone: boolean; lang: string }
  | { type: 'cta_click'; where: string; cta: string; lang: string }
  | { type: 'nav_click'; where: string; lang: string }
  | { type: 'hero_get_started_click'; lang: string }
  | { type: 'hero_cta_click'; lang: string }
  | { type: 'pricing_cta_click'; package?: string; lang: string }
  | { type: 'faq_expand'; question: string; lang: string }
  | { type: 'submit_lead'; source: string; hasEmail: boolean; hasPhone: boolean; hasName: boolean; lang: string; pageUrl: string; utm_source?: string; utm_campaign?: string }
  | { type: 'lead_webhook_success'; source: string; pageUrl: string }
  | { type: 'lead_webhook_fail'; source: string; pageUrl: string }
  | { type: 'trust_pack_view'; page: string; lang: string }
  | { type: 'trust_pack_cta_click'; page: string; placement: 'aftercare' | 'proofstrip' | 'trustpack'; lang: string };

const STORAGE_KEY = 'events_v1';
const MAX_EVENTS = 1000; // Prevent localStorage from getting too large

function getStoredEvents(): any[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

function saveEvent(event: AnalyticsEvent) {
  try {
    const events = getStoredEvents();
    events.push({
      ...event,
      timestamp: new Date().toISOString(),
    });
    
    // Keep only the most recent events
    const trimmed = events.slice(-MAX_EVENTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.warn('Failed to save analytics event:', error);
  }
}

export function trackEvent(event: AnalyticsEvent) {
  // Extract event name and properties
  const { type, ...properties } = event;
  
  // Log to console for debugging (dev only)
  if (import.meta.env.DEV) {
    console.log('[Analytics] Event triggered:', {
      eventName: type,
      payload: properties,
      timestamp: new Date().toISOString()
    });
  }
  
  // Save to localStorage (backup)
  try {
    saveEvent(event);
  } catch (error) {
    // Don't break if localStorage fails
    if (import.meta.env.DEV) {
      console.warn('[Analytics] Failed to save to localStorage:', error);
    }
  }
  
  // Send to PostHog via safe wrapper
  capture(type, properties);
}

