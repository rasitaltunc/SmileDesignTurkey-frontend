export interface WhatsAppLinkParams {
  phoneE164: string;
  text: string;
}

/**
 * Normalizes phone number to E.164 format (digits only)
 */
function normalizePhone(phoneE164: string): string {
  return phoneE164.replace(/[^0-9]/g, '');
}

/**
 * Gets WhatsApp URL in correct format: https://wa.me/<E164>?text=<encoded>
 * @param phoneE164 - Phone number in E.164 format (e.g., +905079573062)
 * @param text - Message text to prefill
 * @returns WhatsApp URL or empty string if phone is invalid
 */
export function getWhatsAppUrl({ phoneE164, text }: WhatsAppLinkParams): string {
  if (!phoneE164 || phoneE164.trim().length === 0) {
    return '';
  }

  const normalized = normalizePhone(phoneE164);
  if (normalized.length === 0) {
    return '';
  }

  const encodedText = encodeURIComponent(text || '');
  return `https://wa.me/${normalized}?text=${encodedText}`;
}

/**
 * @deprecated Use getWhatsAppUrl instead
 */
export function buildWhatsAppLink({ phoneE164, text }: WhatsAppLinkParams): string {
  return getWhatsAppUrl({ phoneE164, text });
}

