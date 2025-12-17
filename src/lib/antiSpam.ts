/**
 * Anti-spam protection utilities
 */

const HONEYPOT_FIELD = 'companyWebsite';
const MIN_SUBMIT_TIME_MS = 2500; // 2.5 seconds
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX_SUBMITS = 3;
const RATE_LIMIT_STORAGE_KEY = 'lead_submit_timestamps';

export interface AntiSpamResult {
  allowed: boolean;
  reason?: 'honeypot' | 'too_fast' | 'rate_limit';
  message?: string;
}

/**
 * Check if form was filled too quickly (bot detection)
 */
function checkSubmitTime(formOpenTime: number): boolean {
  const timeElapsed = Date.now() - formOpenTime;
  return timeElapsed >= MIN_SUBMIT_TIME_MS;
}

/**
 * Check rate limit (max N submits per window)
 */
function checkRateLimit(): boolean {
  try {
    const stored = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
    const timestamps: number[] = stored ? JSON.parse(stored) : [];
    
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;
    
    // Filter out old timestamps
    const recentTimestamps = timestamps.filter(ts => ts > windowStart);
    
    // Check if limit exceeded
    if (recentTimestamps.length >= RATE_LIMIT_MAX_SUBMITS) {
      return false;
    }
    
    // Add current timestamp
    recentTimestamps.push(now);
    localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(recentTimestamps));
    
    return true;
  } catch (error) {
    // If localStorage fails, allow submission (graceful degradation)
    console.warn('[AntiSpam] Rate limit check failed:', error);
    return true;
  }
}

/**
 * Validate form submission against anti-spam rules
 */
export function validateSubmission(
  formData: Record<string, any>,
  formOpenTime: number
): AntiSpamResult {
  // Check honeypot field
  if (formData[HONEYPOT_FIELD] && formData[HONEYPOT_FIELD].trim().length > 0) {
    return {
      allowed: false,
      reason: 'honeypot',
      message: 'Thank you for your interest. We will get back to you soon.',
    };
  }

  // Check submit time
  if (!checkSubmitTime(formOpenTime)) {
    return {
      allowed: false,
      reason: 'too_fast',
      message: 'Please take a moment to review your information before submitting.',
    };
  }

  // Check rate limit
  if (!checkRateLimit()) {
    return {
      allowed: false,
      reason: 'rate_limit',
      message: 'You have submitted multiple requests recently. Please wait a few minutes before submitting again.',
    };
  }

  return { allowed: true };
}

/**
 * Get honeypot field name (for form rendering)
 */
export function getHoneypotFieldName(): string {
  return HONEYPOT_FIELD;
}

