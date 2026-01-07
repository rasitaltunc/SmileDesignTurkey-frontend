// src/lib/authedFetch.ts
// Authenticated fetch helper - ensures Authorization header is always present

import { supabase } from './supabase';

export interface AuthedFetchError {
  ok: false;
  error: string;
  code?: string;
  details?: any;
}

export async function authedFetch(
  url: string,
  init?: RequestInit
): Promise<Response> {
  // Get access token from Supabase session
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    throw new Error(`Session error: ${sessionError.message}`);
  }

  const token = sessionData?.session?.access_token;
  
  if (!token) {
    throw new Error('Missing access token. Please login again.');
  }

  // Merge Authorization header into existing headers
  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${token}`);
  
  // Ensure Content-Type is set for JSON requests
  if (init?.body && typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Create new init with merged headers
  const authedInit: RequestInit = {
    ...init,
    headers,
  };

  return fetch(url, authedInit);
}

