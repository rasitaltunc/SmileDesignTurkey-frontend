import { useMemo } from 'react';
import type { LeadRowVM } from '@/components/admin-leads/LeadsTable';
import type { CanonicalAny } from '@/lib/ai/canonicalNote';
import type { CanonicalV11 } from '@/lib/ai/canonicalTypes';
import { computePriority, computeNextAction, getDaysSinceActivity, getActionReasoning } from '@/lib/admin-leads/leadScoring';

// Types (shared with AdminLeads)
interface Lead {
  id: string;
  created_at: string;
  name?: string;
  email?: string;
  phone?: string;
  source: string;
  lang?: string;
  treatment?: string;
  timeline?: string;
  status?: string;
  notes?: string;
  assigned_to?: string;
  follow_up_at?: string;
  page_url?: string;
  utm_source?: string;
  device?: string;
  ai_risk_score?: number | null;
  ai_summary?: string | null;
  ai_last_analyzed_at?: string | null;
  last_contacted_at?: string | null;
}

interface TimelineEvent {
  eventId: number;
  receivedAt: string;
  eventType: string;
  leadId: string;
  [key: string]: any;
}

interface ContactEvent {
  id: number;
  lead_id: string;
  channel: string;
  note: string | null;
  created_at: string;
  created_by: string | null;
}


function isDueTodayISO(dt?: string | null): boolean {
  if (!dt) return false;
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return false;

  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function applyTabFilter(
  allLeads: Lead[],
  tab: string,
  searchQuery: string,
  isAdmin: boolean,
  userId: string | null
): Lead[] {
  // Apply search filter first
  let filtered = allLeads;
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filtered = allLeads.filter(lead => 
      lead.name?.toLowerCase().includes(query) ||
      lead.email?.toLowerCase().includes(query) ||
      lead.phone?.toLowerCase().includes(query)
    );
  }
  
  // Then apply tab filter
  if (isAdmin) {
    // Admin filters apply to all leads
    switch (tab) {
      case 'unassigned':
        return filtered.filter(l => !l.assigned_to);
      case 'due_today':
        return filtered.filter(l => isDueTodayISO(l.follow_up_at));
      case 'appointment_set':
        return filtered.filter(l => l.status === 'appointment_set');
      case 'deposit_paid':
        return filtered.filter(l => l.status === 'deposit_paid');
      case 'all':
      default:
        return filtered;
    }
  } else {
    // Employee filters apply only to assigned leads
    const myLeads = filtered.filter(l => l.assigned_to === userId);
    switch (tab) {
      case 'due_today':
        return myLeads.filter(l => isDueTodayISO(l.follow_up_at));
      case 'appointment_set':
        return myLeads.filter(l => l.status === 'appointment_set');
      case 'deposit_paid':
        return myLeads.filter(l => l.status === 'deposit_paid');
      case 'all':
      default:
        return myLeads;
    }
  }
}

export interface UseLeadTableRowsParams {
  leads: Lead[];
  tab: string;
  searchQuery: string;
  timeline: TimelineEvent[];
  contactEvents: ContactEvent[];
  aiHealthMap: Record<string, { needs_normalize?: boolean; [key: string]: any }>;
  canonicalCacheRef: React.MutableRefObject<Map<string, CanonicalAny>>;
  isAdmin: boolean;
  userId: string | null;
}

export function useLeadTableRows(params: UseLeadTableRowsParams): LeadRowVM[] {
  const {
    leads,
    tab,
    searchQuery,
    timeline,
    contactEvents,
    aiHealthMap,
    canonicalCacheRef,
    isAdmin,
    userId,
  } = params;

  return useMemo<LeadRowVM[]>(() => {
    const filteredLeads = applyTabFilter(leads, tab, searchQuery, isAdmin, userId);
    
    return filteredLeads.map((lead) => {
      // Get canonical note from cache (if available)
      const canonical = canonicalCacheRef.current.get(lead.id);
      
      // Compute priority and next action for this lead
      const leadTimeline = timeline.filter(t => t.leadId === lead.id);
      const leadContactEvents = contactEvents.filter(e => e.lead_id === lead.id);
      const priorityScore = computePriority(
        lead,
        lead.ai_risk_score ?? null,
        lead.last_contacted_at ?? null,
        leadTimeline,
        [], // Notes are now in modal component
        leadContactEvents
      );
      const hasBrief = !!(lead.ai_summary);
      const hasNotes = false; // Notes are in modal, not tracked here
      const hasPhone = !!lead.phone;
      const hasEmail = !!lead.email;
      const nextAction = computeNextAction(
        lead,
        hasBrief,
        hasNotes,
        hasPhone,
        hasEmail,
        lead.last_contacted_at ?? null
      );
      const daysSinceActivity = getDaysSinceActivity(
        lead.last_contacted_at ?? null,
        lead.created_at
      );
      const isStale = daysSinceActivity >= 3;
      
      // Priority badge (prefer canonical, fallback to computed)
      const canonicalRisk = canonical?.risk_score ?? null;
      const canonicalNBA = canonical?.next_best_action ?? null;
      const canonicalMissing = Array.isArray(canonical?.missing_fields) ? canonical.missing_fields : [];
      
      const canonicalPriority = canonical
        ? ((canonical as any)?.priority || 
           (canonicalRisk !== null && canonicalRisk !== undefined
             ? (canonicalRisk >= 70 ? 'hot' : canonicalRisk >= 40 ? 'warm' : 'cool')
             : null))
        : null;
      
      const priorityBadge = canonicalPriority === 'hot' ? { emoji: '🔴', label: 'Hot', color: 'bg-red-100 text-red-800' } :
                           canonicalPriority === 'warm' ? { emoji: '🟠', label: 'Warm', color: 'bg-orange-100 text-orange-800' } :
                           canonicalPriority === 'cool' ? { emoji: '🟢', label: 'Cool', color: 'bg-green-100 text-green-800' } :
                           priorityScore >= 70 ? { emoji: '🔴', label: 'Hot', color: 'bg-red-100 text-red-800' } :
                           priorityScore >= 40 ? { emoji: '🟠', label: 'Warm', color: 'bg-orange-100 text-orange-800' } :
                           { emoji: '🟢', label: 'Cool', color: 'bg-green-100 text-green-800' };
      
      const healthData = aiHealthMap[lead.id];
      const needsNormalize = healthData?.needs_normalize ?? (!canonical || (canonical as CanonicalV11).review_required === true);

      // Helper functions (inline for row computation)
      const normalizePhoneForWa = (raw?: string | null) => {
        if (!raw) return null;
        let digits = String(raw).replace(/[^\d]/g, "");
        if (!digits) return null;
        if (digits.length === 11 && digits.startsWith("0")) digits = "90" + digits.slice(1);
        return digits;
      };
      
      const getWhatsAppUrl = (phone?: string | null) => {
        const p = normalizePhoneForWa(phone);
        if (!p) return null;
        return `https://wa.me/${p}`;
      };
      
      const isWhatsAppLead = `${lead?.source ?? ""} ${(lead as any)?.source_label ?? ""}`.toLowerCase().includes("whatsapp");
      const isOnboardingLead = `${lead?.source ?? ""} ${(lead as any)?.source_label ?? ""}`.toLowerCase().includes("onboarding");
      
      // Compute follow-up status
      let followUpStatus: 'overdue' | 'due_soon' | null = null;
      if (lead.follow_up_at) {
        const followUpDate = new Date(lead.follow_up_at);
        const now = new Date();
        const diffHours = (followUpDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        if (diffHours < 0) {
          followUpStatus = 'overdue';
        } else if (diffHours >= 0 && diffHours <= 24) {
          followUpStatus = 'due_soon';
        }
      }
      
      const actionReasoning = getActionReasoning(
        nextAction.action,
        hasPhone,
        hasEmail,
        hasBrief,
        hasNotes,
        lead.last_contacted_at ?? null,
        priorityScore
      );
      
      return {
        // Lead data
        id: lead.id,
        created_at: lead.created_at,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        source: lead.source,
        source_label: (lead as any).source_label,
        treatment: lead.treatment,
        treatment_type: (lead as any).treatment_type,
        status: lead.status,
        notes: lead.notes,
        assigned_to: lead.assigned_to,
        follow_up_at: lead.follow_up_at,
        next_action: (lead as any).next_action,
        last_contacted_at: lead.last_contacted_at,
        
        // Computed fields
        priorityBadge,
        priorityScore,
        canonicalRisk,
        canonicalNBA: canonicalNBA ? { label: canonicalNBA.label || '', script: Array.isArray(canonicalNBA.script) ? canonicalNBA.script : [] } : null,
        canonicalMissing,
        needsNormalize,
        isStale,
        daysSinceActivity,
        hasBrief,
        hasNotes,
        hasPhone,
        hasEmail,
        nextAction,
        actionReasoning,
        
        // Computed UI helpers
        whatsAppUrl: isWhatsAppLead ? getWhatsAppUrl(lead.phone) : null,
        isWhatsAppLead,
        isOnboardingLead,
        followUpStatus,
      };
    });
  }, [leads, tab, searchQuery, timeline, contactEvents, aiHealthMap, isAdmin, userId]);
  // Note: canonicalCacheRef is intentionally NOT in deps (refs are stable)
}

