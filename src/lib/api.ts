// src/lib/api.ts
// Authenticated API fetch helpers - ensures Authorization header is always present

import { supabase } from './supabase';

/**
 * Authenticated fetch - automatically adds Authorization header
 */
export async function apiFetchAuth(url: string, init: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;

  const headers = new Headers(init.headers || {});
  headers.set('Accept', 'application/json');
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(url, { ...init, headers });
}

/**
 * Authenticated JSON fetch with automatic error handling
 */
export async function apiJsonAuth<T = any>(url: string, init: RequestInit = {}): Promise<T> {
  const r = await apiFetchAuth(url, init);
  const j = await r.json().catch(() => ({}));
  
  if (!r.ok || j?.ok === false) {
    throw new Error(j?.error || `HTTP ${r.status}`);
  }
  
  return j as T;
}

