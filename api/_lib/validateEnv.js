// api/_lib/validateEnv.js
// Runtime environment validation - fail fast if critical vars missing

/**
 * Validates required server environment variables
 * Throws if any critical var is missing
 * Call this at the top of every API route that needs Supabase
 */
function validateServerEnv() {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY', 
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    const error = new Error(
      `[ENV VALIDATION FAILED] Missing required server environment variables: ${missing.join(', ')}\n` +
      `This usually means:\n` +
      `1. Vercel environment variables not set correctly\n` +
      `2. Variables set in wrong environment (Production/Preview/Development)\n` +
      `3. Deployment happened before variables were added\n\n` +
      `Fix: Go to Vercel Dashboard → Project Settings → Environment Variables\n` +
      `Add missing variables to ALL environments (Production + Preview + Development)`
    );
    
    // Log detailed diagnostic
    console.error('[validateServerEnv] CRITICAL:', error.message);
    console.error('[validateServerEnv] Available env keys:', Object.keys(process.env).filter(k => 
      k.includes('SUPABASE') || k.includes('VERCEL')
    ));
    
    throw error;
  }

  // Success - log for debugging
  console.log('[validateServerEnv] ✅ All required server env vars present');
  
  return {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
  };
}

/**
 * Validates optional env vars and warns if missing
 */
function validateOptionalEnv() {
  const optional = [
    'OPENAI_API_KEY',
    'RESEND_API_KEY',
    'RESEND_FROM_EMAIL'
  ];

  const missing = optional.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.warn('[validateOptionalEnv] ⚠️ Missing optional env vars (some features may not work):', missing.join(', '));
  }

  return {
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    hasResend: !!process.env.RESEND_API_KEY
  };
}

module.exports = {
  validateServerEnv,
  validateOptionalEnv
};
