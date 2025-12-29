// Canonical Diff Engine - Compare v1.0 and v1.1 canonical notes

import type { CanonicalNote } from './normalizeLeadNote';
import type { CanonicalV11 } from './canonicalTypes';

type CanonicalAny = CanonicalNote | CanonicalV11;

export interface Changelog {
  added: string[];
  updated: string[];
  removed: string[];
  conflicts: string[];
}

/**
 * Diff two canonical notes and produce a changelog
 */
export function diffCanonical(
  prev: CanonicalAny | null,
  next: CanonicalAny | null,
  leadGroundTruth?: {
    phone?: string;
    email?: string;
    source?: string;
    status?: string;
  }
): Changelog {
  const changelog: Changelog = {
    added: [],
    updated: [],
    removed: [],
    conflicts: [],
  };

  if (!prev && next) {
    // First canonical note
    changelog.added.push('Initial AI snapshot created');
    return changelog;
  }

  if (!prev || !next) {
    return changelog;
  }

  // Compare facts (v1.1) or summary fields (v1.0)
  const prevFacts = (prev as any).facts || {};
  const nextFacts = (next as any).facts || {};
  const prevSummary = (prev as any).summary_1line || '';
  const nextSummary = (next as any).summary_1line || '';

  // Compare facts fields
  const factKeys = new Set([...Object.keys(prevFacts), ...Object.keys(nextFacts)]);
  factKeys.forEach((key) => {
    const prevVal = prevFacts[key];
    const nextVal = nextFacts[key];

    if (prevVal === undefined && nextVal !== undefined) {
      if (key === 'phone' && leadGroundTruth?.phone && nextVal !== leadGroundTruth.phone) {
        changelog.conflicts.push(`Phone conflict: AI suggested "${nextVal}" but lead has "${leadGroundTruth.phone}"`);
      } else if (key === 'email' && leadGroundTruth?.email && nextVal !== leadGroundTruth.email) {
        changelog.conflicts.push(`Email conflict: AI suggested "${nextVal}" but lead has "${leadGroundTruth.email}"`);
      } else {
        changelog.added.push(`${key.charAt(0).toUpperCase() + key.slice(1)} added: ${formatValue(nextVal)}`);
      }
    } else if (prevVal !== undefined && nextVal === undefined) {
      changelog.removed.push(`${key.charAt(0).toUpperCase() + key.slice(1)} removed`);
    } else if (prevVal !== undefined && nextVal !== undefined && JSON.stringify(prevVal) !== JSON.stringify(nextVal)) {
      changelog.updated.push(`${key.charAt(0).toUpperCase() + key.slice(1)} changed: ${formatValue(prevVal)} → ${formatValue(nextVal)}`);
    }
  });

  // Compare summary (v1.0)
  if (prevSummary && nextSummary && prevSummary !== nextSummary) {
    changelog.updated.push('Summary updated');
  }

  // Compare missing_fields
  const prevMissing = prev.missing_fields || [];
  const nextMissing = next.missing_fields || [];
  const prevMissingSet = new Set(prevMissing);
  const nextMissingSet = new Set(nextMissing);

  prevMissing.forEach((field) => {
    if (!nextMissingSet.has(field)) {
      changelog.updated.push(`Missing field resolved: ${field}`);
    }
  });

  nextMissing.forEach((field) => {
    if (!prevMissingSet.has(field)) {
      changelog.added.push(`Missing field identified: ${field}`);
    }
  });

  // Compare next_best_action
  const prevNBA = prev.next_best_action;
  const nextNBA = next.next_best_action;

  if (prevNBA && nextNBA) {
    if (prevNBA.label !== nextNBA.label) {
      changelog.updated.push(`Next action changed: "${prevNBA.label}" → "${nextNBA.label}"`);
    }
    if (prevNBA.due_hours !== nextNBA.due_hours) {
      changelog.updated.push(`Due hours changed: ${prevNBA.due_hours}h → ${nextNBA.due_hours}h`);
    }
    if ((nextNBA as any).channel && (prevNBA as any).channel && (nextNBA as any).channel !== (prevNBA as any).channel) {
      changelog.updated.push(`Action channel changed: ${(prevNBA as any).channel} → ${(nextNBA as any).channel}`);
    }
  } else if (!prevNBA && nextNBA) {
    changelog.added.push(`Next action set: "${nextNBA.label}"`);
  } else if (prevNBA && !nextNBA) {
    changelog.removed.push('Next action removed');
  }

  // Compare risk_score
  const prevRisk = prev.risk_score;
  const nextRisk = next.risk_score;
  if (prevRisk !== null && nextRisk !== null && prevRisk !== nextRisk) {
    changelog.updated.push(`Risk changed: ${prevRisk} → ${nextRisk}`);
  } else if (prevRisk === null && nextRisk !== null) {
    changelog.added.push(`Risk assessed: ${nextRisk}`);
  } else if (prevRisk !== null && nextRisk === null) {
    changelog.removed.push('Risk score removed');
  }

  // Compare confidence
  const prevConf = prev.confidence;
  const nextConf = next.confidence;
  if (prevConf !== null && nextConf !== null && prevConf !== nextConf) {
    changelog.updated.push(`Confidence changed: ${prevConf}% → ${nextConf}%`);
  } else if (prevConf === null && nextConf !== null) {
    changelog.added.push(`Confidence assessed: ${nextConf}%`);
  } else if (prevConf !== null && nextConf === null) {
    changelog.removed.push('Confidence removed');
  }

  return changelog;
}

function formatValue(val: any): string {
  if (Array.isArray(val)) {
    return val.join(', ');
  }
  if (typeof val === 'object' && val !== null) {
    return JSON.stringify(val);
  }
  return String(val);
}

/**
 * Apply safe merge: overlay lead ground truth into canonical facts
 */
export function safeMergeCanonical(
  canonical: CanonicalV11,
  leadGroundTruth: {
    phone?: string;
    email?: string;
    source?: string;
    status?: string;
  }
): CanonicalV11 {
  const merged = { ...canonical };

  // Overlay ground truth with precedence
  if (leadGroundTruth.phone !== undefined) {
    if (merged.facts.phone && merged.facts.phone !== leadGroundTruth.phone) {
      // Conflict detected - will be in changelog
      merged.facts.phone = leadGroundTruth.phone; // Lead truth wins
    } else {
      merged.facts.phone = leadGroundTruth.phone;
    }
  }

  if (leadGroundTruth.email !== undefined) {
    if (merged.facts.email && merged.facts.email !== leadGroundTruth.email) {
      // Conflict detected
      merged.facts.email = leadGroundTruth.email; // Lead truth wins
    } else {
      merged.facts.email = leadGroundTruth.email;
    }
  }

  if (leadGroundTruth.source !== undefined) {
    merged.facts.source = leadGroundTruth.source;
  }

  return merged;
}

