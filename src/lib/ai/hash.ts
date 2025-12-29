// Hash helper for canonical run_hash

/**
 * Compute SHA-256 hash of a string and return hex representation
 */
export async function sha256Hex(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get short hash (first 16 hex chars) for display
 */
export async function shortHash(str: string): Promise<string> {
  const full = await sha256Hex(str);
  return full.substring(0, 16);
}

