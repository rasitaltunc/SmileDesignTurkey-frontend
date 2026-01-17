import { useState, useEffect, useRef, useContext, useMemo, lazy, Suspense } from 'react';
import { RefreshCw, X, Save, LogOut, MessageSquare, CheckCircle2, RotateCcw, XCircle, Clock, Brain, AlertTriangle, Phone, Mail, MessageCircle, Copy, HelpCircle, FileText, User, ChevronRight } from 'lucide-react';
import { toast } from '@/lib/toast';
import { NavigationContext } from '@/lib/navigationContext';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';

// Lazy load LeadNotesModal (heavy modal with editor/upload functionality)
const LeadNotesModal = lazy(() => import('@/components/LeadNotesModal'));
import LeadsFilters from '@/components/admin-leads/LeadsFilters';
import LeadsTable, { type LeadRowVM } from '@/components/admin-leads/LeadsTable';
import { useLeadTableRows } from '@/hooks/admin-leads/useLeadTableRows';
import { handleNextAction as handleNextActionImpl } from '@/lib/admin-leads/leadActions';
import { useAiHealth } from '@/hooks/admin-leads/useAiHealth';
import { useCanonicalCache } from '@/hooks/admin-leads/useCanonicalCache';
import { useLeadKeyboardNav } from '@/hooks/admin-leads/useLeadKeyboardNav';
import { runLeadAIAnalysis, normalizeLeadIfNeeded } from '@/lib/admin-leads/aiActions';
import type { CanonicalAny } from '@/lib/ai/canonicalNote';
import type { CanonicalV11 } from '@/lib/ai/canonicalTypes';
import type { MemoryV1, MemoryScope } from '@/lib/ai/memoryVault';
// briefLead: dynamic import on button click (reduces admin chunk size)
// import { briefLead, type BriefResponse } from '@/lib/ai/briefLead';
type BriefResponse = {
  ok: boolean;
  error?: string;
  brief?: string;
  [key: string]: any;
};

// Copy to clipboard helper
const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Copied');
  } catch (err) {
    toast.error('Copy failed');
  }
};

// Component to format AI Brief output for better readability
function FormattedAIBrief({ content }: { content: string }) {
  // Parse the AI brief format and render it nicely
  const lines = content.split('\n');
  const sections: { title?: string; items: string[] }[] = [];
  let currentSection: { title?: string; items: string[] } = { items: [] };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Detect section headers (uppercase, no bullet)
    if (trimmed.match(/^[A-Z\s]+$/) && !trimmed.startsWith('•') && trimmed.length > 3 && trimmed.length < 50) {
      if (currentSection.items.length > 0) {
        sections.push(currentSection);
      }
      currentSection = { title: trimmed, items: [] };
    } else if (trimmed.startsWith('•')) {
      currentSection.items.push(trimmed.substring(1).trim());
    } else if (trimmed.includes(':')) {
      // Key-value pairs (Risk Level, Priority, etc.)
      currentSection.items.push(trimmed);
    } else {
      currentSection.items.push(trimmed);
    }
  }
  if (currentSection.items.length > 0) {
    sections.push(currentSection);
  }

  // If parsing failed, just show the raw content
  if (sections.length === 0) {
    return (
      <div className="text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
        {content}
      </div>
    );
  }

  return (
    <div className="space-y-4 text-sm">
      {sections.map((section, idx) => {
        // First section is usually the header
        if (idx === 0 && !section.title) {
          return (
            <div key={idx} className="space-y-2">
              {section.items.map((item, itemIdx) => {
                if (item.includes(':')) {
                  const [key, ...valueParts] = item.split(':');
                  const value = valueParts.join(':').trim();
                  return (
                    <div key={itemIdx} className="flex gap-2">
                      <span className="font-semibold text-gray-700 min-w-[120px]">{key}:</span>
                      <span className="text-gray-600">{value}</span>
                    </div>
                  );
                }
                return (
                  <div key={itemIdx} className="text-gray-600">
                    {item}
                  </div>
                );
              })}
            </div>
          );
        }

        // Check if this section should have a copy button
        const copyableSections = [
          'SUGGESTED OPENING',
          'CONFIRM DETAILS',
          'ACKNOWLEDGE THE CHANGE',
          'PROBE GENTLY',
          'REQUEST CONTACT INFO',
        ];
        const shouldShowCopy = section.title && copyableSections.some(
          (key) => section.title?.toUpperCase().includes(key)
        );
        const sectionText = section.items.join('\n');

        return (
          <div key={idx} className="border-l-2 border-blue-200 pl-3">
            {section.title && (
              <div className="flex items-center justify-between gap-2 mb-2">
                <h5 className="font-semibold text-gray-800 text-base">
                  {section.title}
                </h5>
                {shouldShowCopy && sectionText && (
                  <button
                    type="button"
                    onClick={() => copyText(sectionText)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                    title="Copy"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </button>
                )}
              </div>
            )}
            <ul className="space-y-1.5">
              {section.items.map((item, itemIdx) => (
                <li key={itemIdx} className="text-gray-700 flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

// Single source of truth: Lead Status (DB canonical values - matches DB constraint)
// DB constraint: CHECK (status IN ('new', 'contacted', 'deposit_paid', 'appointment_set', 'arrived', 'completed', 'lost'))
// Label güzel, value canonical (DB'nin istediği değer)
export const LEAD_STATUS = [
  'new',
  'contacted',
  'deposit_paid',
  'appointment_set',
  'arrived',
  'completed',
  'lost',
] as const;

// Status labels for UI (güzel görünsün, value DB canonical)
const LEAD_STATUS_LABEL: Record<string, string> = {
  new: 'New Lead',
  contacted: 'Contacted',
  deposit_paid: 'Deposit Paid',
  appointment_set: 'Appointment Set',
  arrived: 'Arrived',
  completed: 'Completed',
  lost: 'Lost',
};

// Legacy: Derived from LEAD_STATUS for backward compatibility
const LEAD_STATUSES = LEAD_STATUS.map((status) => ({
  value: status,
  label: LEAD_STATUS_LABEL[status] || status,
}));

// Helper: Map lead status to timeline stage (1:1 mapping since they share the same source)
const statusToTimelineStage = (status: string | null | undefined): string | null => {
  if (!status) return null;
  const normalized = status.toLowerCase().trim();
  
  // Direct 1:1 mapping (status and timeline stage are the same)
  // Legacy mappings for old status values (backward compatibility)
  const legacyMapping: Record<string, string> = {
    'new_lead': 'new',
    'qualified': 'contacted',
    'consultation_scheduled': 'appointment_set',
    'consultation_completed': 'appointment_set',
    'quote_sent': 'appointment_set',
    'booked': 'appointment_set',
    'paid': 'deposit_paid',
    'treatment_in_progress': 'arrived',
    'treatment_completed': 'completed',
    'closed': 'completed',
  };
  
  // Check if it's a valid LEAD_STATUS (DB canonical)
  if (LEAD_STATUS.includes(normalized as any)) {
    return normalized;
  }
  
  // Check legacy mappings (map old values to DB canonical)
  if (legacyMapping[normalized]) {
    return legacyMapping[normalized];
  }
  
  return null;
};

// Helper: Add timeline event when status changes
const addTimelineEventForStatus = async (
  leadId: string,
  status: string | null | undefined,
  token: string,
  note?: string
): Promise<void> => {
  const stage = statusToTimelineStage(status);
  if (!stage) return; // No mapping, skip
  
  try {
    const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
    const response = await fetch(`${apiUrl}/api/admin/lead-timeline/${encodeURIComponent(leadId)}?leadId=${encodeURIComponent(leadId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        stage: stage,
        note: note || `Status changed to ${status}`,
        payload: {},
      }),
    });
    
    if (!response.ok) {
      // Silent fail - don't break the flow if timeline event fails
      console.warn('[Timeline] Failed to add event for status change:', await response.json().catch(() => ({})));
      return;
    }
  } catch (err) {
    // Silent fail - don't break the flow
    console.warn('[Timeline] Error adding event for status change:', err);
  }
};



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

interface LeadNote {
  id: string;
  lead_id: string;
  author_id: string;
  note: string;
  created_at: string;
  updated_at: string;
}

export default function AdminLeads() {
  const { user, isAuthenticated, logout, role } = useAuthStore();
  const { navigate } = useContext(NavigationContext);
  const isAdmin = role === 'admin';
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Quick filter tabs
  type LeadTab = 'all' | 'unassigned' | 'due_today' | 'appointment_set' | 'deposit_paid';
  const [tab, setTab] = useState<LeadTab>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  
  // Edit state
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editStatus, setEditStatus] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editFollowUpAt, setEditFollowUpAt] = useState<string>('');

  // Notes modal state
  const [notesLeadId, setNotesLeadId] = useState<string | null>(null);
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [isSyncingMemory, setIsSyncingMemory] = useState(false);
  const [canonicalNote, setCanonicalNote] = useState<CanonicalAny | null>(null);
  const [memoryVault, setMemoryVault] = useState<{
    patient: MemoryV1 | null;
    doctor: MemoryV1 | null;
    internal: MemoryV1 | null;
  }>({
    patient: null,
    doctor: null,
    internal: null,
  });
  const lastActiveElRef = useRef<HTMLElement | null>(null);
  const firstFocusableRef = useRef<HTMLElement | null>(null);

  // Keyboard navigation state
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const leadRowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [showCheatSheet, setShowCheatSheet] = useState(false);

  // Canonical note cache (via hook)
  const { canonicalCacheRef, setCanonical } = useCanonicalCache<CanonicalAny>();
  
  // AI health (via hook)
  const supabase = getSupabaseClient();
  const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
  const { aiHealthMap, refreshAiHealth } = useAiHealth({
    supabase,
    apiUrl,
    leadIds: leads.map(l => l.id),
    enabled: isAuthenticated,
  });

  // Notes modal scroll/focus management is now handled by LeadNotesModal component


  // Timeline state
  interface TimelineEvent {
    eventId: number;
    receivedAt: string;
    eventType: string;
    triggerEvent: string | null;
    calBookingUid: string | null;
    calBookingId: string | null;
    startTime: string | null;
    endTime: string | null;
    previousMeetingStart: string | null;
    previousMeetingEnd: string | null;
    title: string | null;
    additionalNotes: string | null;
  }
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);

  // AI analysis state
  const [aiRiskScore, setAiRiskScore] = useState<number | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  
  // B2: AI Brief state
  const [briefData, setBriefData] = useState<BriefResponse | null>(null);
  const [isLoadingBrief, setIsLoadingBrief] = useState(false);
  
  // Contact tracking state
  const [lastContactedAt, setLastContactedAt] = useState<string | null>(null);
  const [isMarkingContacted, setIsMarkingContacted] = useState(false);
  
  // Contact events state
  interface ContactEvent {
    id: number;
    lead_id: string;
    channel: string;
    note: string | null;
    created_at: string;
    created_by: string | null;
  }
  const [contactEvents, setContactEvents] = useState<ContactEvent[]>([]);
  const [isLoadingContactEvents, setIsLoadingContactEvents] = useState(false);
  const [newContactChannel, setNewContactChannel] = useState<string>("phone");
  const [newContactNote, setNewContactNote] = useState<string>("");
  const [isAddingContact, setIsAddingContact] = useState(false);

  // Note: Body scroll lock removed - overlay handles scrolling now
  // Modal uses overlay scroll architecture, so body scroll lock is not needed

  // Employee assignment state
  const [employees, setEmployees] = useState<Array<{ id: string; full_name: string | null; role: string | null; created_at: string | null }>>([]);
  const [assigningLeadId, setAssigningLeadId] = useState<string | null>(null);
  const [selectedEmployeeByLead, setSelectedEmployeeByLead] = useState<Record<string, string>>({});

  // Patient intakes state (admin only)
  const [intakes, setIntakes] = useState<Array<{
    id: string;
    created_at: string;
    full_name: string;
    phone?: string;
    email?: string;
    country?: string;
    treatment_type?: string;
    notes?: string;
    lead_id?: string;
    status: string;
  }>>([]);
  const [isLoadingIntakes, setIsLoadingIntakes] = useState(false);
  const [convertingIntakeId, setConvertingIntakeId] = useState<string | null>(null);

  // Redirect to login if not authenticated (soft redirect via router)
  useEffect(() => {
    if (!isAuthenticated) {
      // Use router navigation instead of direct history manipulation
      // This prevents flash/white screen issues
      const timer = setTimeout(() => {
        window.location.assign('/login');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated]);

  // Load leads from API
  const loadLeads = async () => {
    if (!isAuthenticated || !user) return;

    setIsLoading(true);
    setError(null);

    try {
      // Get JWT token from Supabase session
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase client not configured.');
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      if (!token) {
        // session daha yüklenmemiş olabilir
        console.warn("[AdminLeads] No token yet, skipping loadLeads");
        setIsLoading(false);
        return;
      }

      // Build query params (quick filters are frontend-only, no backend params needed)
      const params = new URLSearchParams();

      // Use current origin if VITE_API_URL not set (for Vercel deployments)
      const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
      const queryString = params.toString();
      const url = `${apiUrl}/api/leads${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to load leads' }));
        throw new Error(errorData.error || 'Failed to load leads');
      }

      const result = await response.json();
      const loadedLeads = result.leads || [];
      setLeads(loadedLeads);

      // ✅ Hydrate dropdown selections from DB values
      const initialSelections: Record<string, string> = {};
      for (const l of loadedLeads) {
        if (l.assigned_to) initialSelections[l.id] = l.assigned_to;
      }
      setSelectedEmployeeByLead(prev => ({ ...prev, ...initialSelections }));
      
      // AI health is automatically fetched by useAiHealth hook
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load leads';
      setError(errorMessage);
      console.error('[AdminLeads] Error loading leads:', err);
    } finally {
      setIsLoading(false);
    }
  };
  

  // Load employees (admin only)
  const loadEmployees = async () => {
    try {
      // role admin değilse çekme
      if (role !== 'admin') return;

      // Get JWT token from Supabase session
      const supabase = getSupabaseClient();
      if (!supabase) {
        console.warn('[AdminLeads] Supabase client not configured, skipping loadEmployees');
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      if (!token) {
        console.warn('[AdminLeads] No token yet, skipping loadEmployees');
        return;
      }

      // Use current origin if VITE_API_URL not set
      const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
      const response = await fetch(`${apiUrl}/api/admin/employees`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to load employees' }));
        console.error('[AdminLeads] Error loading employees:', errorData.error || 'Failed to load employees');
        return;
      }

      const result = await response.json();
      if (result.ok && result.employees) {
        setEmployees(result.employees);
      }
    } catch (e) {
      // sessiz geç
    }
  };

  // Assign lead to employee (automatic on select change)
  const handleAssignChange = async (leadId: string, employeeId: string) => {
    // UI hemen güncellensin
    setSelectedEmployeeByLead((prev) => ({ ...prev, [leadId]: employeeId }));

    setAssigningLeadId(leadId);
    try {
      // sadece assigned_to gönder
      await updateLead(leadId, { assigned_to: employeeId || undefined });

      // istersen local state update edebilirsin; en garanti: yeniden çek
      await loadLeads();
    } catch (e: any) {
      console.error("[Assign] failed", e);
      alert(e?.message || "Assign failed");
    } finally {
      setAssigningLeadId(null);
    }
  };

  // Update lead with optimistic UI
  const updateLead = async (leadId: string, updates: { status?: string; notes?: string; assigned_to?: string; follow_up_at?: string | null }) => {
    if (!isAuthenticated || !user) return;

    // Optimistic update: Update UI immediately
    const leadIndex = leads.findIndex((l: Lead) => l.id === leadId);
    if (leadIndex !== -1) {
      const updatedLeads = [...leads];
      updatedLeads[leadIndex] = { ...updatedLeads[leadIndex], ...updates };
      setLeads(updatedLeads);
    }

    try {
      // Get JWT token from Supabase session
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase client not configured.');
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        setError('Session expired. Please login again.');
        toast.error('Session expired. Please login again.');
        setIsLoading(false);
        return;
      }

      // Use API endpoint with JWT token
      const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;

      const response = await fetch(`${apiUrl}/api/leads`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: leadId,
          ...updates,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update lead' }));
        throw new Error(errorData.error || 'Failed to update lead');
      }

      const result = await response.json();
      
      // Update with server response
      if (result.lead && leadIndex !== -1) {
        const updatedLeads = [...leads];
        updatedLeads[leadIndex] = result.lead;
        setLeads(updatedLeads);
        
        // B6.4: Auto-add timeline event when status changes
        if (updates.status) {
          const oldStatus = leads[leadIndex]?.status;
          const newStatus = result.lead.status;
          if (oldStatus !== newStatus) {
            try {
              await addTimelineEventForStatus(leadId, newStatus, token, `Status changed from ${oldStatus || 'new'} to ${newStatus}`);
            } catch (err) {
              // Silent fail - timeline event is optional
              console.warn('[Update Lead] Failed to add timeline event:', err);
            }
          }
        }
      }

      setError(null);
      setEditingLead(null);
    } catch (err) {
      // Revert optimistic update on error
      await loadLeads();
      const errorMessage = err instanceof Error ? err.message : 'Failed to update lead';
      setError(errorMessage);
      console.error('[AdminLeads] Error updating lead:', err);
    }
  };

  // Handle edit start
  const handleEditStart = (lead: Lead) => {
    setEditingLead(lead);
    // Normalize status to lowercase, validate against LEAD_STATUS (default to 'new' - DB canonical)
    const currentStatus = (lead.status || 'new').toLowerCase();
    const validStatus = LEAD_STATUS.includes(currentStatus as any) ? currentStatus : 'new';
    setEditStatus(validStatus);
    setEditNotes(lead.notes || '');
    // Format follow_up_at for datetime-local input (YYYY-MM-DDTHH:mm)
    if (lead.follow_up_at) {
      const date = new Date(lead.follow_up_at);
      const localDateTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setEditFollowUpAt(localDateTime);
    } else {
      setEditFollowUpAt('');
    }
  };

  // Handle edit save
  const handleEditSave = () => {
    if (!editingLead) return;

    const updates: any = {};
    // Normalize status: trim, lowercase, default to 'new' if empty (DB canonical)
    const normalizedEditStatus = (editStatus || 'new').trim().toLowerCase() || 'new';
    const normalizedCurrentStatus = (editingLead.status || 'new').toLowerCase();
    
    // Validate against LEAD_STATUS (DB constraint values, fallback to 'new' if invalid)
    const validStatus = LEAD_STATUS.includes(normalizedEditStatus as any) 
      ? normalizedEditStatus 
      : 'new';
    
    // Always send lowercase canonical value (DB constraint compatible)
    if (validStatus !== normalizedCurrentStatus) {
      updates.status = validStatus; // Always lowercase, always valid LEAD_STATUS value (DB canonical)
    }
    if (editNotes !== (editingLead.notes || '')) updates.notes = editNotes;
    
    // Handle follow_up_at: convert datetime-local to ISO string
    const currentFollowUpAt = editingLead.follow_up_at 
      ? new Date(editingLead.follow_up_at).toISOString()
      : null;
    const newFollowUpAt = editFollowUpAt 
      ? new Date(editFollowUpAt).toISOString()
      : null;
    
    if (newFollowUpAt !== currentFollowUpAt) {
      updates.follow_up_at = newFollowUpAt || null;
    }

    if (Object.keys(updates).length > 0) {
      updateLead(editingLead.id, updates);
    } else {
      setEditingLead(null);
    }
  };

  // Notes are now handled by LeadNotesModal component

  // Load timeline events
  const loadTimeline = async (leadId: string) => {
    if (!isAuthenticated || !user) return;

    setIsLoadingTimeline(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
      const adminToken = import.meta.env.VITE_ADMIN_TOKEN || '';

      const response = await fetch(`${apiUrl}/api/leads-timeline?lead_id=${encodeURIComponent(leadId)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to load timeline' }));
        throw new Error(errorData.error || 'Failed to load timeline');
      }

      const result = await response.json();
      setTimeline(result.timeline || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load timeline';
      console.error('[AdminLeads] Error loading timeline:', err);
      // Don't set error state for timeline, just log
      setTimeline([]);
    } finally {
      setIsLoadingTimeline(false);
    }
  };

  // Load AI analysis for current lead
  const loadAIAnalysis = (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (lead) {
      setAiRiskScore(lead.ai_risk_score ?? null);
      setAiSummary(lead.ai_summary ?? null);
      setLastContactedAt(lead.last_contacted_at ?? null);
    } else {
      setAiRiskScore(null);
      setAiSummary(null);
      setLastContactedAt(null);
    }
  };

  // Load contact events for a lead
  const loadContactEvents = async (leadId: string) => {
    if (!leadId) return;

    setIsLoadingContactEvents(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
      const adminToken = import.meta.env.VITE_ADMIN_TOKEN || '';

      const response = await fetch(`${apiUrl}/api/leads-contact-events?lead_id=${leadId}&limit=5`, {
        headers: {
          'x-admin-token': adminToken,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load contact events');
      }

      const result = await response.json();
      setContactEvents(result.events || []);
    } catch (err) {
      console.error('[AdminLeads] Error loading contact events:', err);
      setContactEvents([]);
    } finally {
      setIsLoadingContactEvents(false);
    }
  };

  // Add new contact event (quick add)
  const addContactEvent = async (leadId: string) => {
    if (!leadId || !newContactChannel) return;

    setIsAddingContact(true);
    setError(null);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
      const adminToken = import.meta.env.VITE_ADMIN_TOKEN || '';

      const response = await fetch(`${apiUrl}/api/leads-contact-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
        },
        body: JSON.stringify({
          lead_id: leadId,
          channel: newContactChannel,
          note: newContactNote.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to add contact event' }));
        throw new Error(errorData.error || 'Failed to add contact event');
      }

      const result = await response.json();
      
      // Add to local state (prepend to list)
      setContactEvents((prev) => [result.event, ...prev].slice(0, 5));
      
      // Update last_contacted_at
      setLastContactedAt(result.event.created_at);

      // Update lead in leads array
      setLeads((prevLeads) =>
        prevLeads.map((lead) =>
          lead.id === leadId
            ? {
                ...lead,
                last_contacted_at: result.event.created_at,
              }
            : lead
        )
      );

      // Reset form
      setNewContactChannel('phone');
      setNewContactNote('');

      toast.success('Attempt logged');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to log attempt';
      setError(errorMessage);
      toast.error('Failed to log attempt', { description: errorMessage });
    } finally {
      setIsAddingContact(false);
    }
  };

  // Mark lead as contacted
  const markContacted = async (leadId: string) => {
    if (!leadId) return;

    setIsMarkingContacted(true);
    setError(null);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
      const adminToken = import.meta.env.VITE_ADMIN_TOKEN || '';

      const response = await fetch(`${apiUrl}/api/leads-mark-contacted`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
        },
        body: JSON.stringify({ 
          lead_id: leadId,
          channel: 'phone', // Default channel
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to mark as contacted' }));
        throw new Error(errorData.error || 'Failed to mark as contacted');
      }

      const result = await response.json();
      
      // Update local state
      setLastContactedAt(result.last_contacted_at);

      // Add contact event to local state if returned
      if (result.contact_event) {
        setContactEvents((prev) => [result.contact_event, ...prev].slice(0, 5));
      } else {
        // Reload contact events to get the new one
        await loadContactEvents(leadId);
      }

      // Update lead in leads array
      setLeads((prevLeads) =>
        prevLeads.map((lead) =>
          lead.id === leadId
            ? {
                ...lead,
                last_contacted_at: result.last_contacted_at,
                status: 'contacted', // Ensure status is set to contacted
              }
            : lead
        )
      );

      // B6.4: Auto-add timeline event when marked as contacted
      try {
        const supabase = getSupabaseClient();
        if (supabase) {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData?.session?.access_token;
          if (token) {
            await addTimelineEventForStatus(leadId, 'contacted', token, 'Marked as contacted');
          }
        }
      } catch (err) {
        // Silent fail - timeline event is optional
        console.warn('[Mark Contacted] Failed to add timeline event:', err);
      }

      toast.success('Marked as contacted');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark contacted';
      setError(errorMessage);
      toast.error('Failed to mark contacted', { description: errorMessage });
    } finally {
      setIsMarkingContacted(false);
    }
  };

  // B2: Generate AI Brief
  const handleGenerateBrief = async (leadId: string) => {
    if (!leadId) return;

    setIsLoadingBrief(true);
    setError(null);

    const toastId = toast.loading('Generating snapshot...');

    try {
      // Dynamic import: briefLead only loaded when button is clicked (reduces admin chunk size)
      const { briefLead } = await import('@/lib/ai/briefLead');
      const result = await briefLead(leadId);
      
      if (!result.ok) {
        throw new Error(result.error || 'Failed to generate snapshot');
      }

      setBriefData(result);

      // Smooth scroll to snapshot section after a brief delay
      setTimeout(() => {
        const snapshotEl = document.querySelector('[data-snapshot-section]');
        if (snapshotEl) {
          snapshotEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Brief highlight animation
          snapshotEl.classList.add('animate-pulse');
          setTimeout(() => {
            snapshotEl.classList.remove('animate-pulse');
          }, 1000);
        }
      }, 300);

      if (result.hasOpenAI) {
        toast.success('Snapshot generated', { id: toastId });
      } else {
        toast.info('Preview mode active', { id: toastId });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate snapshot';
      setError(errorMessage);
      toast.error('Unable to generate snapshot', { id: toastId, description: errorMessage });
    } finally {
      setIsLoadingBrief(false);
    }
  };

  // Run AI analysis (delegates to action)
  const runAIAnalysis = async (leadId: string) => {
    if (!leadId || !supabase) return;

    setIsLoadingAI(true);
    setError(null);
    const toastId = toast.loading('Generating AI brief…');

    try {
      await runLeadAIAnalysis({
        supabase,
        apiUrl,
        leadId,
        onSuccess: (result) => {
          // Update local state
          setAiRiskScore(result.ai_risk_score ?? null);
          setAiSummary(result.ai_summary ?? null);

          // Update lead in leads array
          setLeads((prevLeads) =>
            prevLeads.map((lead) =>
              lead.id === leadId
                ? {
                    ...lead,
                    ai_risk_score: result.ai_risk_score ?? null,
                    ai_summary: result.ai_summary ?? null,
                    ai_last_analyzed_at: new Date().toISOString(),
                  }
                : lead
            )
          );

          toast.success('AI brief generated', { id: toastId });
        },
        onError: (err) => {
          const errorMessage = err instanceof Error ? err.message : 'Failed to generate AI brief';
          setError(errorMessage);
          toast.error('Failed to generate AI brief', { id: toastId, description: errorMessage });
        },
      });
    } finally {
      setIsLoadingAI(false);
    }
  };


  // Normalize notes via AI (delegates to action)
  const handleNormalizeNotes = async (leadId: string) => {
    if (!leadId || !supabase) return;

    setIsNormalizing(true);
    setError(null);
    const toastId = toast.loading('Normalizing notes…');

    try {
      const lead = leads.find((l) => l.id === leadId);
      if (!lead) throw new Error('Lead not found');

      // Fetch notes for normalization
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Session expired');

      const notesResponse = await fetch(`${apiUrl}/api/lead-notes?lead_id=${encodeURIComponent(leadId)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!notesResponse.ok) {
        throw new Error('Failed to load notes for normalization');
      }

      const notesResult = await notesResponse.json();
      const allNotes = notesResult.notes || [];

      // Helper to create note (used by normalize action)
      const createNoteHelper = async (noteLeadId: string, content: string) => {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) throw new Error('Session expired');

        const response = await fetch(`${apiUrl}/api/lead-notes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            lead_id: noteLeadId,
            note: content.trim(),
            content: content.trim(),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to create note' }));
          throw new Error(errorData.error || 'Failed to create note');
        }
      };

      await normalizeLeadIfNeeded({
        supabase,
        apiUrl,
        leadId,
        lead: {
          id: lead.id,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          source: lead.source,
          created_at: lead.created_at,
          treatment: lead.treatment,
          status: lead.status,
        },
        notes: allNotes,
        timeline,
        contactEvents,
        lastContactedAt,
        prevCanonical: canonicalCacheRef.current.get(leadId) || null,
        createNote: createNoteHelper,
        onSuccess: (canonicalV11) => {
          // Update local state
          setCanonicalNote(canonicalV11);
          setCanonical(leadId, canonicalV11);
          refreshAiHealth(leadId);
          toast.success('AI snapshot updated', { id: toastId });
        },
        onError: (err) => {
          const errorMessage = err instanceof Error ? err.message : 'Failed to normalize notes';
          setError(errorMessage);
          toast.error('Failed to normalize notes', { id: toastId, description: errorMessage });
        },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to normalize notes';
      setError(errorMessage);
      toast.error('Failed to normalize notes', { id: toastId, description: errorMessage });
    } finally {
      setIsNormalizing(false);
    }
  };

  // Open notes modal
  const handleOpenNotes = async (leadId: string) => {
    setNotesLeadId(leadId);
    setTimeline([]);
    setContactEvents([]);
    setCanonicalNote(null);
    
    // Smart default: Set contact channel based on lead's contact info
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      if (lead.phone) {
        setNewContactChannel('phone');
      } else if (lead.email) {
        setNewContactChannel('email');
      } else {
        setNewContactChannel('phone'); // fallback
      }
    } else {
      setNewContactChannel('phone');
    }
    
    setNewContactNote('');
    loadAIAnalysis(leadId);
    await Promise.all([loadTimeline(leadId), loadContactEvents(leadId)]);
  };

  // Close notes modal
  const handleCloseNotes = () => {
    setNotesLeadId(null);
    setAiRiskScore(null);
    setAiSummary(null);
    setLastContactedAt(null);
    setContactEvents([]);
    setNewContactChannel('phone');
    setNewContactNote('');
  };

  // Handle logout
  const handleLogout = async () => {
    await logout();
    setLeads([]);
    setError(null);
    // Redirect to login (soft redirect)
    window.location.assign('/login');
  };

  // Load patient intakes (admin only)
  const loadIntakes = async () => {
    if (!isAdmin || !isAuthenticated || !user) {
      setIntakes([]);
      return;
    }

    setIsLoadingIntakes(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        console.warn('[AdminLeads] Supabase client not configured, skipping intakes load');
        setIntakes([]);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        console.warn('[AdminLeads] No session token, skipping intakes load');
        setIntakes([]);
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
      const response = await fetch(`${apiUrl}/api/patient-intake?status=pending&limit=20`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Failed to load intakes: ${response.status} ${errorText}`);
      }
      
      const result = await response.json().catch(() => ({ intakes: [] }));
      setIntakes(Array.isArray(result.intakes) ? result.intakes : []);
    } catch (err) {
      console.error('[AdminLeads] Error loading intakes:', err);
      // Set empty array on error to prevent crashes
      setIntakes([]);
    } finally {
      setIsLoadingIntakes(false);
    }
  };

  // Convert intake to lead (admin only)
  const convertIntakeToLead = async (intakeId: string) => {
    if (!isAdmin || !isAuthenticated || !user) return;

    setConvertingIntakeId(intakeId);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not configured.');

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('No session token');

      // Call the RPC function via Supabase client
      const { data, error } = await supabase.rpc('convert_intake_to_lead', {
        intake_id: intakeId,
      });

      if (error) throw error;

      // Reload intakes and leads
      await Promise.all([loadIntakes(), loadLeads()]);
      
      alert(`Intake converted to lead successfully! Lead ID: ${data}`);
    } catch (err) {
      console.error('[AdminLeads] Error converting intake:', err);
      alert(err instanceof Error ? err.message : 'Failed to convert intake');
    } finally {
      setConvertingIntakeId(null);
    }
  };

  // Auto-load when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      loadLeads();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  useEffect(() => {
    if (isAdmin && isAuthenticated) {
      loadIntakes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, isAuthenticated, tableRows]);

  // Set activeLeadId to first lead when leads load or tab changes
  useEffect(() => {
    if (tableRows.length > 0) {
      const currentActiveExists = tableRows.some(row => row.id === activeLeadId);
      if (!currentActiveExists) {
        setActiveLeadId(tableRows[0].id);
      }
    } else {
      setActiveLeadId(null);
    }
  }, [leads, tab]);

  // Compute rows for LeadsTable (using hook)
  const tableRows = useLeadTableRows({
    leads,
    tab,
    searchQuery,
    timeline,
    contactEvents,
    aiHealthMap,
    canonicalCacheRef,
    isAdmin,
    userId: user?.id ?? null,
  });

  // Keyboard navigation (via hook)
  const [isComposing, setIsComposing] = useState(false); // For IME composition detection
  
  useLeadKeyboardNav({
    enabled: true,
    isComposing,
    notesLeadId,
    activeLeadId,
    rows: tableRows,
    onSetActiveLeadId: setActiveLeadId,
    onFocusRow: (id) => {
      leadRowRefs.current[id]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    },
    onOpenNotes: handleOpenNotes,
    onMarkContacted: markContacted,
    onRunAIAnalysis: runAIAnalysis,
    onCopyContact: (leadId) => {
      const row = tableRows.find((r) => r.id === leadId);
      if (row) {
        const contact = row.phone || row.email;
        if (contact) {
          copyText(contact);
          toast.success(`Copied ${row.phone ? 'phone' : 'email'}`);
        } else {
          toast.error('No contact info available');
        }
      }
    },
    searchRef,
  });

  // Handler for Next Action button (delegates to actions layer)
  const handleNextAction = async (row: LeadRowVM, action: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;

    await handleNextActionImpl({
      row,
      action,
      supabase,
      apiUrl,
      openNotes: handleOpenNotes,
      runAIAnalysis,
      copyText,
      toast,
    });
  };

  // Show nothing while checking auth or redirecting
  if (!isAuthenticated) {
    return null;
  }

  // Authenticated - show leads table
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header + Filters */}
        <LeadsFilters
          tab={tab}
          onTabChange={(newTab) => setTab(newTab)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          leadsCount={tableRows.length}
          isAdmin={isAdmin}
          userId={user?.id}
          isLoading={isLoading}
          onRefresh={loadLeads}
          onLogout={handleLogout}
          searchRef={searchRef}
        />

        {/* Patient Intakes Section (Admin Only) */}
        {isAdmin && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Patient Intakes</h2>
                <p className="text-gray-600 text-sm mt-1">
                  {isLoadingIntakes ? 'Loading...' : `${intakes?.length || 0} pending intakes`}
                </p>
              </div>
              <button
                onClick={loadIntakes}
                disabled={isLoadingIntakes}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingIntakes ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {!intakes || intakes.length === 0 ? (
              <p className="text-gray-500 text-sm">No pending intakes.</p>
            ) : (
              <div className="space-y-3">
                {intakes.map((intake) => (
                  <div
                    key={intake.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">{intake.full_name}</h3>
                          <span className="text-xs text-gray-500">
                            {new Date(intake.created_at).toLocaleString()}
                          </span>
                          {intake.lead_id && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                              Converted
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                          {intake.phone && (
                            <div>
                              <span className="font-medium">Phone:</span> {intake.phone}
                            </div>
                          )}
                          {intake.email && (
                            <div>
                              <span className="font-medium">Email:</span> {intake.email}
                            </div>
                          )}
                          {intake.country && (
                            <div>
                              <span className="font-medium">Country:</span> {intake.country}
                            </div>
                          )}
                          {intake.treatment_type && (
                            <div>
                              <span className="font-medium">Treatment:</span> {intake.treatment_type}
                            </div>
                          )}
                        </div>
                        {intake.notes && (
                          <p className="text-sm text-gray-600 mt-2">{intake.notes}</p>
                        )}
                      </div>
                      {!intake.lead_id && (
                        <button
                          onClick={() => convertIntakeToLead(intake.id)}
                          disabled={convertingIntakeId === intake.id}
                          className="ml-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm flex items-center gap-2"
                        >
                          {convertingIntakeId === intake.id ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Converting...
                            </>
                          ) : (
                            'Convert to Lead'
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Leads Table */}
        <LeadsTable
          rows={tableRows}
          isLoading={isLoading}
          searchQuery={searchQuery}
          activeLeadId={activeLeadId}
          editingLeadId={editingLead?.id ?? null}
          editStatus={editStatus}
          editFollowUpAt={editFollowUpAt}
          editNotes={editNotes}
          role={role}
          employees={employees}
          selectedEmployeeByLead={selectedEmployeeByLead}
          assigningLeadId={assigningLeadId}
          leadRowRefs={leadRowRefs}
          leadStatusOptions={LEAD_STATUSES}
          leadStatusLabels={LEAD_STATUS_LABEL}
          onRowClick={(leadId) => navigate(`/admin/lead/${leadId}`)}
          onOpenNotes={handleOpenNotes}
          onEditStart={(leadId) => {
            const lead = leads.find(l => l.id === leadId);
            if (lead) handleEditStart(lead);
          }}
          onEditSave={handleEditSave}
          onEditCancel={() => setEditingLead(null)}
          onStatusChange={setEditStatus}
          onFollowUpChange={setEditFollowUpAt}
          onNotesChange={setEditNotes}
          onMarkContacted={markContacted}
          onAssignChange={handleAssignChange}
          onNextAction={handleNextAction}
          onCopyScript={(script) => {
            const scriptText = script.join('\n');
            copyText(scriptText);
            toast.success('Script copied to clipboard');
          }}
          onCopyContact={(phone, email) => {
            const contact = phone || email;
            if (contact) {
              copyText(contact);
              toast.success(`Copied ${phone ? 'phone' : 'email'}`);
            } else {
              toast.error('No contact info available');
            }
          }}
        />

        {/* Notes Modal - Lazy loaded */}
        {(() => {
          const supabase = getSupabaseClient();
          if (!supabase || !notesLeadId) return null;

          return (
            <Suspense fallback={null}>
              <LeadNotesModal
                isOpen={!!notesLeadId}
                leadId={notesLeadId}
                onClose={handleCloseNotes}
                supabase={supabase}
                onNoteCreated={() => {
                  // Reload leads to refresh any note counts or metadata
                  loadLeads();
                }}
              />
            </Suspense>
          );
        })()}
      </div>
    </div>
  );
}
