// src/lib/api.ts
// Authenticated API fetch helpers - ensures Authorization header is always present

import { supabase } from './supabase';

/**
 * Authenticated fetch - automatically adds Authorization header
 */
export async function apiFetchAuth(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  if (!supabase) throw new Error("Supabase client not configured");

  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error("Session expired");

  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(input, { ...init, headers });
}

/**
 * Authenticated JSON fetch with automatic error handling
 */
export async function apiJsonAuth<T = any>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await apiFetchAuth(url, init);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error || `Request failed: ${res.status}`);
  }
  return json as T;
}

