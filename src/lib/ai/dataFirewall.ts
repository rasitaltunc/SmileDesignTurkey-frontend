// AI Data Firewall - PII Redaction + Prompt Injection Guard

export type RedactionKind = "email" | "phone" | "iban" | "trid" | "credit_card" | "passport_like";

export interface InjectionSignal {
  pattern: string;
  match: string;
  index?: number;
}

export interface FirewallReport {
  redaction: {
    applied: boolean;
    counts: Record<RedactionKind, number>;
    samples_masked: Partial<Record<RedactionKind, string[]>>;
  };
  injection: {
    detected: boolean;
    signals: InjectionSignal[];
  };
  detected_contacts: {
    emails_masked: string[];
    phones_masked: string[];
  };
}

// Mask email: keep first char + "***" + last char of local part, keep domain
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '[REDACTED_EMAIL]';
  
  if (local.length <= 2) {
    return `***@${domain}`;
  }
  
  const first = local[0];
  const last = local[local.length - 1];
  return `${first}***${last}@${domain}`;
}

// Normalize phone: extract digits only
function normalizePhoneDigits(text: string): string {
  return text.replace(/\D/g, '');
}

// Mask phone: keep last 2-4 digits
export function maskPhone(phone: string): string {
  const digits = normalizePhoneDigits(phone);
  if (digits.length < 10) return '[REDACTED_PHONE]';
  
  const lastDigits = digits.slice(-4);
  return `***${lastDigits}`;
}

// Redact PII from text
export function redactPII(text: string): { text: string; report: FirewallReport } {
  const report: FirewallReport = {
    redaction: {
      applied: false,
      counts: {
        email: 0,
        phone: 0,
        iban: 0,
        trid: 0,
        credit_card: 0,
        passport_like: 0,
      },
      samples_masked: {},
    },
    injection: {
      detected: false,
      signals: [],
    },
    detected_contacts: {
      emails_masked: [],
      phones_masked: [],
    },
  };

  let sanitized = text;

  // Email pattern
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emails = text.match(emailRegex) || [];
  emails.forEach((email) => {
    const masked = maskEmail(email);
    sanitized = sanitized.replace(email, '[REDACTED_EMAIL]');
    report.redaction.counts.email++;
    if (!report.redaction.samples_masked.email) {
      report.redaction.samples_masked.email = [];
    }
    if (report.redaction.samples_masked.email.length < 3) {
      report.redaction.samples_masked.email.push(masked);
    }
    if (report.detected_contacts.emails_masked.length < 10) {
      report.detected_contacts.emails_masked.push(masked);
    }
  });

  // Phone pattern (10+ digits, flexible format)
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{2,4}[-.\s]?\d{2,4}/g;
  const phones = text.match(phoneRegex) || [];
  phones.forEach((phone) => {
    const digits = normalizePhoneDigits(phone);
    if (digits.length >= 10) {
      const masked = maskPhone(phone);
      sanitized = sanitized.replace(phone, '[REDACTED_PHONE]');
      report.redaction.counts.phone++;
      if (!report.redaction.samples_masked.phone) {
        report.redaction.samples_masked.phone = [];
      }
      if (report.redaction.samples_masked.phone.length < 3) {
        report.redaction.samples_masked.phone.push(masked);
      }
      if (report.detected_contacts.phones_masked.length < 10) {
        report.detected_contacts.phones_masked.push(masked);
      }
    }
  });

  // IBAN (TR + 2 digits + 22-24 alphanumeric)
  const ibanRegex = /\bTR\d{2}[0-9A-Z]{22,24}\b/gi;
  const ibans = text.match(ibanRegex) || [];
  ibans.forEach((iban) => {
    sanitized = sanitized.replace(iban, '[REDACTED_IBAN]');
    report.redaction.counts.iban++;
    if (!report.redaction.samples_masked.iban) {
      report.redaction.samples_masked.iban = [];
    }
    if (report.redaction.samples_masked.iban.length < 3) {
      report.redaction.samples_masked.iban.push('TR**' + iban.slice(-4));
    }
  });

  // Turkish ID (11 digits, word boundaries)
  const tridRegex = /\b\d{11}\b/g;
  const trids = text.match(tridRegex) || [];
  trids.forEach((trid) => {
    // Basic validation: first digit should be 1-9
    if (trid[0] !== '0') {
      sanitized = sanitized.replace(trid, '[REDACTED_TRID]');
      report.redaction.counts.trid++;
      if (!report.redaction.samples_masked.trid) {
        report.redaction.samples_masked.trid = [];
      }
      if (report.redaction.samples_masked.trid.length < 3) {
        report.redaction.samples_masked.trid.push('***' + trid.slice(-4));
      }
    }
  });

  // Credit card (13-19 digits, Luhn check)
  const ccRegex = /\b\d{13,19}\b/g;
  const ccs = text.match(ccRegex) || [];
  ccs.forEach((cc) => {
    // Simple Luhn check
    let sum = 0;
    let isEven = false;
    for (let i = cc.length - 1; i >= 0; i--) {
      let digit = parseInt(cc[i]);
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      isEven = !isEven;
    }
    if (sum % 10 === 0) {
      sanitized = sanitized.replace(cc, '[REDACTED_CC]');
      report.redaction.counts.credit_card++;
      if (!report.redaction.samples_masked.credit_card) {
        report.redaction.samples_masked.credit_card = [];
      }
      if (report.redaction.samples_masked.credit_card.length < 3) {
        report.redaction.samples_masked.credit_card.push('****' + cc.slice(-4));
      }
    }
  });

  // Passport-like (near keywords)
  const passportKeywords = /\b(passport|pasaport|passport\s+no|pasaport\s+no|passport\s+number)\b/gi;
  if (passportKeywords.test(text)) {
    // Look for alphanumeric patterns near keywords (8-12 chars)
    const passportRegex = /\b[A-Z0-9]{8,12}\b/g;
    const passports = text.match(passportRegex) || [];
    passports.forEach((passport) => {
      sanitized = sanitized.replace(passport, '[REDACTED_PASSPORT]');
      report.redaction.counts.passport_like++;
      if (!report.redaction.samples_masked.passport_like) {
        report.redaction.samples_masked.passport_like = [];
      }
      if (report.redaction.samples_masked.passport_like.length < 3) {
        report.redaction.samples_masked.passport_like.push('***' + passport.slice(-4));
      }
    });
  }

  report.redaction.applied = Object.values(report.redaction.counts).some(count => count > 0);

  return { text: sanitized, report };
}

// Detect prompt injection signals
export function detectInjectionSignals(text: string): InjectionSignal[] {
  const patterns: Array<{ pattern: string; regex: RegExp }> = [
    { pattern: 'ignore previous instructions', regex: /ignore\s+previous\s+instructions/gi },
    { pattern: 'disregard above', regex: /disregard\s+(above|previous|prior)/gi },
    { pattern: 'system prompt', regex: /system\s+prompt/gi },
    { pattern: 'developer message', regex: /developer\s+message/gi },
    { pattern: 'you are chatgpt', regex: /you\s+are\s+(chatgpt|gpt|claude|assistant)/gi },
    { pattern: 'do anything now', regex: /do\s+anything\s+now/gi },
    { pattern: 'DAN', regex: /\bDAN\b/gi },
    { pattern: 'function call', regex: /function\s+call/gi },
    { pattern: 'tool', regex: /\btool\b/gi },
    { pattern: 'BEGIN SYSTEM', regex: /BEGIN\s+SYSTEM/gi },
    { pattern: '### SYSTEM', regex: /###\s+SYSTEM/gi },
    { pattern: 'role: system', regex: /role:\s*system/gi },
    { pattern: 'role: developer', regex: /role:\s*developer/gi },
    { pattern: 'new instructions', regex: /new\s+instructions/gi },
    { pattern: 'override', regex: /\boverride\b/gi },
  ];

  const signals: InjectionSignal[] = [];
  const seen = new Set<string>();

  patterns.forEach(({ pattern, regex }) => {
    const matches = text.matchAll(regex);
    for (const match of matches) {
      const key = `${pattern}:${match[0]}`;
      if (!seen.has(key) && signals.length < 8) {
        seen.add(key);
        signals.push({
          pattern,
          match: match[0],
          index: match.index,
        });
      }
    }
  });

  return signals;
}

// Sanitize text for AI (injection detection + PII redaction)
export function sanitizeForAI(text: string): { text: string; report: FirewallReport } {
  // First detect injection on raw text
  const injectionSignals = detectInjectionSignals(text);
  
  // Then redact PII
  const { text: sanitized, report } = redactPII(text);
  
  // Combine reports
  report.injection.detected = injectionSignals.length > 0;
  report.injection.signals = injectionSignals;

  return { text: sanitized, report };
}

// Wrap untrusted content block
export function wrapUntrustedBlock(label: string, content: string): string {
  return `<<<UNTRUSTED_${label}_BEGIN>>>
${content}
<<<UNTRUSTED_${label}_END>>>`;
}

// Sanitize notes for AI
export function sanitizeNotesForAI(
  notes: Array<{ note: string; created_at: string; id?: string }>
): { sanitizedNotes: Array<{ id?: string; created_at: string; role?: string; content_sanitized: string }>; report: FirewallReport } {
  const aggregatedReport: FirewallReport = {
    redaction: {
      applied: false,
      counts: {
        email: 0,
        phone: 0,
        iban: 0,
        trid: 0,
        credit_card: 0,
        passport_like: 0,
      },
      samples_masked: {},
    },
    injection: {
      detected: false,
      signals: [],
    },
    detected_contacts: {
      emails_masked: [],
      phones_masked: [],
    },
  };

  const sanitizedNotes = notes.map((note) => {
    const { text: sanitized, report } = sanitizeForAI(note.note);
    
    // Aggregate counts
    Object.keys(report.redaction.counts).forEach((key) => {
      aggregatedReport.redaction.counts[key as RedactionKind] += report.redaction.counts[key as RedactionKind];
    });

    // Aggregate samples (keep first 3 per kind)
    Object.keys(report.redaction.samples_masked).forEach((key) => {
      if (!aggregatedReport.redaction.samples_masked[key as RedactionKind]) {
        aggregatedReport.redaction.samples_masked[key as RedactionKind] = [];
      }
      const samples = report.redaction.samples_masked[key as RedactionKind] || [];
      samples.forEach((sample) => {
        if (aggregatedReport.redaction.samples_masked[key as RedactionKind]!.length < 3) {
          aggregatedReport.redaction.samples_masked[key as RedactionKind]!.push(sample);
        }
      });
    });

    // Aggregate injection signals
    if (report.injection.detected) {
      aggregatedReport.injection.detected = true;
      report.injection.signals.forEach((signal) => {
        const key = `${signal.pattern}:${signal.match}`;
        if (aggregatedReport.injection.signals.length < 8 && 
            !aggregatedReport.injection.signals.some(s => `${s.pattern}:${s.match}` === key)) {
          aggregatedReport.injection.signals.push(signal);
        }
      });
    }

    // Aggregate detected contacts
    report.detected_contacts.emails_masked.forEach((email) => {
      if (aggregatedReport.detected_contacts.emails_masked.length < 10 &&
          !aggregatedReport.detected_contacts.emails_masked.includes(email)) {
        aggregatedReport.detected_contacts.emails_masked.push(email);
      }
    });
    report.detected_contacts.phones_masked.forEach((phone) => {
      if (aggregatedReport.detected_contacts.phones_masked.length < 10 &&
          !aggregatedReport.detected_contacts.phones_masked.includes(phone)) {
        aggregatedReport.detected_contacts.phones_masked.push(phone);
      }
    });

    return {
      id: note.id,
      created_at: note.created_at,
      content_sanitized: sanitized,
    };
  });

  aggregatedReport.redaction.applied = Object.values(aggregatedReport.redaction.counts).some(count => count > 0);

  return { sanitizedNotes, report: aggregatedReport };
}

// Sanitize timeline for AI
export function sanitizeTimelineForAI(
  timeline: Array<{
    eventType: string;
    receivedAt: string;
    title?: string;
    additionalNotes?: string;
  }>
): { sanitizedTimeline: Array<{ eventType: string; receivedAt: string; title_sanitized?: string; notes_sanitized?: string }>; report: FirewallReport } {
  const aggregatedReport: FirewallReport = {
    redaction: {
      applied: false,
      counts: {
        email: 0,
        phone: 0,
        iban: 0,
        trid: 0,
        credit_card: 0,
        passport_like: 0,
      },
      samples_masked: {},
    },
    injection: {
      detected: false,
      signals: [],
    },
    detected_contacts: {
      emails_masked: [],
      phones_masked: [],
    },
  };

  const sanitizedTimeline = timeline.map((event) => {
    const textsToSanitize: string[] = [];
    if (event.title) textsToSanitize.push(event.title);
    if (event.additionalNotes) textsToSanitize.push(event.additionalNotes);

    let titleSanitized = event.title;
    let notesSanitized = event.additionalNotes;

    textsToSanitize.forEach((text) => {
      const { text: sanitized, report } = sanitizeForAI(text);
      
      if (text === event.title) {
        titleSanitized = sanitized;
      }
      if (text === event.additionalNotes) {
        notesSanitized = sanitized;
      }

      // Aggregate (same logic as notes)
      Object.keys(report.redaction.counts).forEach((key) => {
        aggregatedReport.redaction.counts[key as RedactionKind] += report.redaction.counts[key as RedactionKind];
      });

      if (report.injection.detected) {
        aggregatedReport.injection.detected = true;
        report.injection.signals.forEach((signal) => {
          const key = `${signal.pattern}:${signal.match}`;
          if (aggregatedReport.injection.signals.length < 8 && 
              !aggregatedReport.injection.signals.some(s => `${s.pattern}:${s.match}` === key)) {
            aggregatedReport.injection.signals.push(signal);
          }
        });
      }

      report.detected_contacts.emails_masked.forEach((email) => {
        if (aggregatedReport.detected_contacts.emails_masked.length < 10 &&
            !aggregatedReport.detected_contacts.emails_masked.includes(email)) {
          aggregatedReport.detected_contacts.emails_masked.push(email);
        }
      });
      report.detected_contacts.phones_masked.forEach((phone) => {
        if (aggregatedReport.detected_contacts.phones_masked.length < 10 &&
            !aggregatedReport.detected_contacts.phones_masked.includes(phone)) {
          aggregatedReport.detected_contacts.phones_masked.push(phone);
        }
      });
    });

    return {
      eventType: event.eventType,
      receivedAt: event.receivedAt,
      title_sanitized: titleSanitized,
      notes_sanitized: notesSanitized,
    };
  });

  aggregatedReport.redaction.applied = Object.values(aggregatedReport.redaction.counts).some(count => count > 0);

  return { sanitizedTimeline, report: aggregatedReport };
}

