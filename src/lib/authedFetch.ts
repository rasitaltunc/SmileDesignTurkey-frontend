// src/lib/authedFetch.ts
// Authenticated fetch helper - ensures Authorization header is always present

import { supabase } from './supabase';

export async function authedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  // Get access token from Supabase session
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;

  // Merge Authorization header into existing headers
  const headers = new Headers(init.headers || {});
  
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Optional but helpful: DEV logging
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log('authedFetch:', String(input), 'hasToken:', Boolean(token));
  }

  // If no token, we still make the request but backend will reject with 401
  // This allows backend to return proper error messages instead of frontend failing silently
  return fetch(input, { ...init, headers });
}

