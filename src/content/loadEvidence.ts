import evidenceData from './evidence.json';
import type { EvidenceConfig, EvidenceSection, EvidenceItem } from './evidence.schema';

// Safe placeholder URLs
const PLACEHOLDER_IMAGE = '/evidence/placeholder.svg';
const PLACEHOLDER_PDF = '/evidence/placeholder.svg';
const PLACEHOLDER_VIDEO = '/evidence/placeholder.svg';

/**
 * Check if a URL is a placeholder or missing
 */
function isPlaceholder(url: string): boolean {
  return url === '#' || url === '' || url.includes('placeholder');
}

/**
 * Get safe fallback URL for a given type
 */
function getPlaceholderUrl(type: EvidenceItem['type']): string {
  switch (type) {
    case 'image':
      return PLACEHOLDER_IMAGE;
    case 'video':
      return PLACEHOLDER_VIDEO;
    case 'pdf':
      return PLACEHOLDER_PDF;
    case 'link':
      return '#';
    default:
      return PLACEHOLDER_IMAGE;
  }
}

/**
 * Replace placeholder or missing URLs with safe fallbacks
 */
function sanitizeItem(item: EvidenceItem): EvidenceItem {
  if (isPlaceholder(item.url)) {
    return {
      ...item,
      url: getPlaceholderUrl(item.type),
    };
  }
  return item;
}

/**
 * Load and validate evidence configuration
 */
export function loadEvidenceConfig(): EvidenceConfig {
  const config = evidenceData as EvidenceConfig;
  
  // Sanitize all items
  const sanitizedSections = config.sections.map((section) => ({
    ...section,
    items: section.items.map(sanitizeItem),
  }));

  return {
    ...config,
    sections: sanitizedSections,
  };
}

/**
 * Get evidence sections required for a specific page
 */
export function getEvidenceForPage(pageKey: 'home' | 'pricing' | 'process'): EvidenceSection[] {
  const config = loadEvidenceConfig();
  const requiredKeys = config.required[pageKey] || [];
  
  return config.sections
    .filter((section) => requiredKeys.includes(section.key))
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        // Filter by language if specified (default to showing all if no lang filter needed)
        // For now, show all items
        return true;
      }),
    }));
}

/**
 * Get a single evidence item by ID
 */
export function getEvidenceItemById(id: string): EvidenceItem | null {
  const config = loadEvidenceConfig();
  
  for (const section of config.sections) {
    const item = section.items.find((item) => item.id === id);
    if (item) {
      return sanitizeItem(item);
    }
  }
  
  return null;
}

/**
 * Get all evidence items (flattened)
 */
export function getAllEvidenceItems(): EvidenceItem[] {
  const config = loadEvidenceConfig();
  return config.sections.flatMap((section) => section.items.map(sanitizeItem));
}

