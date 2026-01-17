/**
 * Pure helper functions for lead scoring and next action computation.
 * No side effects, no dependencies on React or external APIs.
 */

/**
 * Calculate days since last activity (lastContactedAt) or since lead creation.
 */
export function getDaysSinceActivity(lastContactedAt: string | null, createdAt: string): number {
  const date = lastContactedAt ? new Date(lastContactedAt) : new Date(createdAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Compute priority score (0-100) for a lead.
 */
export function computePriority(
  lead: any,
  aiRiskScore: number | null,
  lastContactedAt: string | null,
  timeline: any[],
  notes: any[] = [],
  contactEvents: any[]
): number {
  let score = 0;

  // Booking varsa +40
  const hasBooking = timeline.some((e) => e.eventType?.includes('booking'));
  if (hasBooking) score += 40;

  // Never contacted ise +25
  if (!lastContactedAt && contactEvents.length === 0) {
    score += 25;
  }

  // Son aktivite çok yeni ise (24-48h) +20
  if (lastContactedAt) {
    const lastContact = new Date(lastContactedAt);
    const now = new Date();
    const hoursSince = (now.getTime() - lastContact.getTime()) / (1000 * 60 * 60);
    if (hoursSince >= 24 && hoursSince <= 48) {
      score += 20;
    }
  }

  // Not yoksa +10
  if (!notes || notes.length === 0) {
    score += 10;
  }

  // Telefon yoksa -10
  if (!lead.phone) {
    score -= 10;
  }

  // AI risk score varsa ekle (0-100 scale)
  if (aiRiskScore !== null) {
    score += aiRiskScore * 0.3; // 30% weight
  }

  // Clamp to 0-100
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Compute the next best action for a lead.
 */
export function computeNextAction(
  lead: any,
  hasBrief: boolean,
  hasNotes: boolean,
  hasPhone: boolean,
  hasEmail: boolean,
  lastContactedAt: string | null
): { icon: string; label: string; action: string } {
  // Phone varsa → Call/WhatsApp öncelik
  if (hasPhone) {
    if (!lastContactedAt) {
      return { icon: '📞', label: 'Call now', action: 'call' };
    }
    return { icon: '💬', label: 'WhatsApp first', action: 'whatsapp' };
  }

  // Phone yok email varsa → Email
  if (hasEmail && !hasPhone) {
    return { icon: '✉️', label: 'Email', action: 'email' };
  }

  // AI brief yoksa ve lead yeni ise → Generate brief öner
  if (!hasBrief && !lastContactedAt) {
    return { icon: '🧠', label: 'Generate brief', action: 'brief' };
  }

  // Not yoksa → Add note öner
  if (!hasNotes) {
    return { icon: '📝', label: 'Add note', action: 'note' };
  }

  // Default: follow up
  return { icon: '📞', label: 'Follow up', action: 'call' };
}

/**
 * Generate reasoning text for a recommended action.
 */
export function getActionReasoning(
  action: string,
  hasPhone: boolean,
  hasEmail: boolean,
  hasBrief: boolean,
  hasNotes: boolean,
  lastContactedAt: string | null,
  priorityScore: number
): string {
  if (action === 'call') {
    if (!lastContactedAt) {
      return "Recommended because the lead is new and has no contact attempts yet.";
    }
    return "Recommended because phone contact is the fastest way to connect.";
  }

  if (action === 'whatsapp') {
    return "Recommended because WhatsApp is preferred for international leads.";
  }

  if (action === 'email') {
    if (!hasPhone) {
      return "Recommended because phone number is not available.";
    }
    return "Recommended for detailed communication and documentation.";
  }

  if (action === 'brief') {
    if (priorityScore >= 70) {
      return "Recommended because this is a high-priority lead and needs preparation.";
    }
    return "Recommended to generate AI-powered insights before contacting.";
  }

  if (action === 'note') {
    return "Recommended to document initial observations about this lead.";
  }

  return "Recommended based on lead status and priority.";
}



