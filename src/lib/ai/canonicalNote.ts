// Canonical Note Utilities - Extract and parse canonical JSON from notes

import type { CanonicalNote } from './normalizeLeadNote';

export interface CanonicalV1 extends CanonicalNote {
  version: '1.0';
}

/**
 * Check if a note content is a canonical note
 */
export function isCanonicalNote(content: string): boolean {
  return content.trim().startsWith('[AI_CANONICAL_NOTE v1.0]');
}

/**
 * Extract JSON string from canonical note content
 */
export function extractCanonicalJson(content: string): string | null {
  if (!isCanonicalNote(content)) return null;

  const lines = content.split('\n');
  const jsonStart = lines.findIndex(l => l.trim().startsWith('{'));
  
  if (jsonStart === -1) return null;
  
  return lines.slice(jsonStart).join('\n');
}

/**
 * Parse canonical note content into CanonicalV1 object
 */
export function parseCanonical(content: string): CanonicalV1 | null {
  if (!isCanonicalNote(content)) return null;

  try {
    const jsonText = extractCanonicalJson(content);
    if (!jsonText) return null;

    const parsed = JSON.parse(jsonText);
    
    // Validate it's a valid canonical note
    if (parsed.version === '1.0' && parsed.leadId) {
      return parsed as CanonicalV1;
    }
    
    return null;
  } catch (err) {
    console.error('[canonicalNote] Failed to parse canonical:', err);
    return null;
  }
}

/**
 * Find and parse the latest canonical note from an array of notes
 */
export function findLatestCanonical(notes: Array<{ note: string; created_at: string }>): CanonicalV1 | null {
  // Find latest canonical note (by created_at)
  const canonicalNotes = notes
    .filter(n => isCanonicalNote(n.note))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (canonicalNotes.length === 0) return null;

  return parseCanonical(canonicalNotes[0].note);
}

