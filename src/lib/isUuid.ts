// src/lib/isUuid.ts
// UUID validation utility

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(v?: string | null): boolean {
  if (!v) return false;
  return UUID_RE.test(String(v).trim());
}

