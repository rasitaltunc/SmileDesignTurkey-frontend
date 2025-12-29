import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, X, Save, LogOut, MessageSquare, CheckCircle2, RotateCcw, XCircle, Clock, Brain, AlertTriangle, Phone, Mail, MessageCircle, Copy, HelpCircle, FileText } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { normalizeLeadNote, type CanonicalNote, transformV10ToV11 } from '@/lib/ai/normalizeLeadNote';
import { findLatestCanonical, type CanonicalAny } from '@/lib/ai/canonicalNote';
import { diffCanonical, safeMergeCanonical } from '@/lib/ai/canonicalDiff';
import type { CanonicalV11 } from '@/lib/ai/canonicalTypes';

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

// Status options - CRM MVP Pipeline (3C: Appointment → Deposit)
const LEAD_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'appointment_set', label: 'Appointment Set' },
  { value: 'deposit_paid', label: 'Deposit Paid' },
  { value: 'arrived', label: 'Arrived' },
  { value: 'completed', label: 'Completed' },
  { value: 'lost', label: 'Lost' },
] as const;

// Priority Score Helper (0-100)
function computePriority(
  lead: Lead,
  aiRiskScore: number | null,
  lastContactedAt: string | null,
  timeline: any[],
  notes: LeadNote[],
  contactEvents: any[]
): number {
  let score = 0;

  // Booking varsa +40
  const hasBooking = timeline.some(e => e.eventType?.includes('booking'));
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

// Next Best Action Helper
function computeNextAction(
  lead: Lead,
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

// Get days since last activity
function getDaysSinceActivity(lastContactedAt: string | null, createdAt: string): number {
  const date = lastContactedAt ? new Date(lastContactedAt) : new Date(createdAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// Timeline Intelligence Summary
function getTimelineSummary(
  lastContactedAt: string | null,
  contactEvents: any[],
  hasPhone: boolean,
  priorityScore: number,
  daysSinceActivity: number
): string {
  if (!lastContactedAt && contactEvents.length === 0) {
    return "This lead has never been contacted";
  }
  
  if (daysSinceActivity >= 3) {
    return `Last activity was ${daysSinceActivity} day${daysSinceActivity > 1 ? 's' : ''} ago`;
  }
  
  if (priorityScore >= 70 && !hasPhone) {
    return "High priority lead with no phone number";
  }
  
  if (priorityScore >= 70) {
    return "High priority lead - consider contacting within 24h";
  }
  
  return "Lead journey summary";
}

// Action Reasoning Helper
function getActionReasoning(
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

// WhatsApp helper functions
function normalizePhoneToWhatsApp(phone?: string) {
  if (!phone) return null;
  let p = String(phone).trim().replace(/[^\d+]/g, "");

  // if starts with 0 and looks TR, convert to +90
  if (p.startsWith("0")) p = "+90" + p.slice(1);

  // if starts without + and length seems like TR mobile, assume +90
  if (!p.startsWith("+") && p.length === 10) p = "+90" + p;

  // if still no +, add +
  if (!p.startsWith("+")) p = "+" + p;

  const digits = p.replace(/\+/g, ""); // wa.me wants digits only (remove all + signs)

  // ✅ minimum uzunluk kontrolü (wa.me digits only)
  if (p.replace(/\D/g, "").length < 11) return null;

  return digits;
}

function waMessageEN(lead: any) {
  return (
    `Hi ${lead?.name || ""}! 👋\n` +
    `This is Smile Design Turkey.\n\n` +
    `I'm reaching out about your request:\n` +
    `• Treatment: ${lead?.treatment || "-"}\n` +
    `• Timeline: ${lead?.timeline || "-"}\n\n` +
    `To prepare your plan, could you send:\n` +
    `1) A clear smile photo\n` +
    `2) A short video (front + side)\n` +
    `3) Any x-ray if available 😊`
  );
}

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
  const isAdmin = role === 'admin';
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Quick filter tabs
  type LeadTab = 'all' | 'unassigned' | 'due_today' | 'appointment_set' | 'deposit_paid';
  const [tab, setTab] = useState<LeadTab>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  function isDueTodayISO(dt?: string | null) {
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

  function applyTabFilter(allLeads: Lead[]) {
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
      const myLeads = filtered.filter(l => l.assigned_to === user?.id);
      switch (tab) {
        case 'due_today':
          return myLeads.filter(l => isDueTodayISO(l.follow_up_at));
        case 'appointment_set':
          return myLeads.filter(l => l.status === 'appointment_set');
        case 'deposit_paid':
          return myLeads.filter(l => l.status === 'deposit_paid');
        case 'all':
        case 'unassigned': // Employee doesn't see unassigned, treat as 'all'
        default:
          return myLeads;
      }
    }
  }
  
  // Edit state
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editStatus, setEditStatus] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editFollowUpAt, setEditFollowUpAt] = useState<string>('');

  // Notes modal state
  const [notesLeadId, setNotesLeadId] = useState<string | null>(null);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [newNoteContent, setNewNoteContent] = useState<string>('');
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [canonicalNote, setCanonicalNote] = useState<CanonicalAny | null>(null);
  const modalScrollRef = useRef<HTMLDivElement | null>(null);
  const [notesScroll, setNotesScroll] = useState({ atTop: true, atBottom: false });
  const lastActiveElRef = useRef<HTMLElement | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const firstFocusableRef = useRef<HTMLElement | null>(null);

  // Keyboard navigation state
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const leadRowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [showCheatSheet, setShowCheatSheet] = useState(false);

  // Canonical note cache (for active/visible leads)
  const canonicalCacheRef = useRef<Map<string, CanonicalAny>>(new Map());

  // Lock body scroll when modal is open (position: fixed + overflow hidden - Safari-proof)
  useEffect(() => {
    if (!notesLeadId) return;

    const scrollY = window.scrollY;
    const body = document.body;
    const html = document.documentElement;

    // position: fixed yöntemi (Safari-proof, modal scroll'a dokunmaz)
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";

    // Overflow hidden (Safari fix - arka plan scroll'unu tam kilitle)
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    return () => {
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [notesLeadId]);

  // Inert background + pointer blocking when modal is open
  useEffect(() => {
    if (!notesLeadId) return;

    const root = document.getElementById("root");
    if (!root) return;

    // Set inert (if supported)
    try {
      (root as any).inert = true;
    } catch (e) {
      // Fallback if inert not supported
    }

    // Set aria-hidden and pointer-events-none
    root.setAttribute("aria-hidden", "true");
    root.classList.add("pointer-events-none");

    return () => {
      try {
        (root as any).inert = false;
      } catch (e) {
        // Fallback
      }
      root.removeAttribute("aria-hidden");
      root.classList.remove("pointer-events-none");
    };
  }, [notesLeadId]);

  // Modal açılınca focus trap + restore focus on close (hardened)
  useEffect(() => {
    if (!notesLeadId) return;

    // Modal açılmadan önce active element'i sakla
    lastActiveElRef.current = document.activeElement as HTMLElement;

    // Find first focusable element in modal header (Mark Contacted button or fallback to scroll container)
    const getFirstFocusable = (): HTMLElement | null => {
      const modal = document.querySelector('[data-modal-root="true"]');
      if (!modal) return null;
      
      const focusableElements = modal.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      return (focusableElements[0] as HTMLElement) || modalScrollRef.current;
    };

    // Focus first focusable element
    requestAnimationFrame(() => {
      const firstFocusable = getFirstFocusable();
      firstFocusableRef.current = firstFocusable;
      firstFocusable?.focus();
      handleNotesScroll();
    });

    // Focus trap: Tab dışarı kaçmasın
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const modal = document.querySelector('[data-modal-root="true"]');
      if (!modal) return;
      
      const focusableElements = Array.from(modal.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )) as HTMLElement[];
      
      if (focusableElements.length === 0) return;
      
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    // Document-level focusin listener: prevent focus leaving modal
    const handleFocusIn = (e: FocusEvent) => {
      const modal = document.querySelector('[data-modal-root="true"]');
      if (!modal) return;
      
      const target = e.target as HTMLElement;
      if (!modal.contains(target)) {
        e.preventDefault();
        e.stopPropagation();
        const firstFocusable = getFirstFocusable();
        firstFocusable?.focus();
      }
    };

    document.addEventListener("keydown", handleTab);
    document.addEventListener("focusin", handleFocusIn, true);
    
    return () => {
      document.removeEventListener("keydown", handleTab);
      document.removeEventListener("focusin", handleFocusIn, true);
      
      // Modal kapanınca eski elemana geri focus ver (guard if element removed)
      requestAnimationFrame(() => {
        if (lastActiveElRef.current && document.body.contains(lastActiveElRef.current)) {
          lastActiveElRef.current.focus?.();
        }
      });
    };
  }, [notesLeadId]);

  // ESC safety: prevent closing while typing/composing
  useEffect(() => {
    if (!notesLeadId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      
      const target = e.target as HTMLElement;
      const isTyping = target?.tagName === "TEXTAREA" || 
                       target?.tagName === "INPUT" || 
                       target?.isContentEditable;
      
      if (isTyping || isComposing) return;
      
      handleCloseNotes();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [notesLeadId, isComposing]);

  // Scroll handler for shadow/fade effects
  const handleNotesScroll = () => {
    const el = modalScrollRef.current;
    if (!el) return;
    const atTop = el.scrollTop <= 1;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
    setNotesScroll({ atTop, atBottom });
  };

  // Modal açılınca ilk ölçüm
  useEffect(() => {
    if (!notesLeadId) return;
    requestAnimationFrame(() => handleNotesScroll());
  }, [notesLeadId]);

  // ESC ile kapat
  useEffect(() => {
    if (!notesLeadId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCloseNotes();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [notesLeadId]);


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
  const [employees, setEmployees] = useState<Array<{ id: string; full_name: string | null }>>([]);
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

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      window.history.pushState({}, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
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
      setLeads(result.leads || []);

      // ✅ Hydrate dropdown selections from DB values
      const initialSelections: Record<string, string> = {};
      for (const l of (result.leads || [])) {
        if (l.assigned_to) initialSelections[l.id] = l.assigned_to;
      }
      setSelectedEmployeeByLead(prev => ({ ...prev, ...initialSelections }));
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

      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not configured.');

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;

      const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
      const url = `${apiUrl}/api/employees`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) return;
      const json = await res.json();
      setEmployees(json.employees || []);
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
        window.location.href = '/';
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
    // Normalize status to lowercase (handle any case variations from DB)
    setEditStatus((lead.status || 'new').toLowerCase());
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
    // Normalize status: trim, lowercase, default to 'new' if empty
    const normalizedEditStatus = (editStatus || 'new').trim().toLowerCase() || 'new';
    const normalizedCurrentStatus = (editingLead.status || 'new').toLowerCase();
    
    // Always send lowercase canonical value
    if (normalizedEditStatus !== normalizedCurrentStatus) {
      updates.status = normalizedEditStatus; // Always lowercase, never empty
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

  // Load notes for a lead
  const loadNotes = async (leadId: string) => {
    if (!isAuthenticated || !user) return;

    setIsLoadingNotes(true);
    try {
      // Get JWT token from Supabase session
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase client not configured.');
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        window.location.href = '/';
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;

      const response = await fetch(`${apiUrl}/api/lead-notes?lead_id=${encodeURIComponent(leadId)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to load notes' }));
        throw new Error(errorData.error || 'Failed to load notes');
      }

      const result = await response.json();
      setNotes(result.notes || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load notes';
      setError(errorMessage);
      console.error('[AdminLeads] Error loading notes:', err);
    } finally {
      setIsLoadingNotes(false);
    }
  };

  // Create new note
  const createNote = async (leadId: string, content: string) => {
    if (!isAuthenticated || !user || !content.trim()) return;

    setIsSavingNote(true);
    try {
      // Get JWT token from Supabase session
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase client not configured.');
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        window.location.href = '/';
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;

      const response = await fetch(`${apiUrl}/api/lead-notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          lead_id: leadId,
          note: content.trim(),
          content: content.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create note' }));
        throw new Error(errorData.error || 'Failed to create note');
      }

      // Reload notes
      await loadNotes(leadId);
      setNewNoteContent('');
      toast.success('Note saved');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save note';
      setError(errorMessage);
      toast.error('Failed to save note', { description: errorMessage });
    } finally {
      setIsSavingNote(false);
    }
  };

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
              }
            : lead
        )
      );

      toast.success('Marked as contacted');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark contacted';
      setError(errorMessage);
      toast.error('Failed to mark contacted', { description: errorMessage });
    } finally {
      setIsMarkingContacted(false);
    }
  };

  // Run AI analysis
  const runAIAnalysis = async (leadId: string) => {
    if (!leadId) return;

    setIsLoadingAI(true);
    setError(null);

    const toastId = toast.loading('Generating AI brief…');

    try {
      const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
      const adminToken = import.meta.env.VITE_ADMIN_TOKEN || '';

      const response = await fetch(`${apiUrl}/api/leads-ai-analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
        },
        body: JSON.stringify({ lead_id: leadId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to analyze lead' }));
        throw new Error(errorData.error || 'Failed to analyze lead');
      }

      const result = await response.json();
      
      // Update local state (with null safety)
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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate AI brief';
      setError(errorMessage);
      toast.error('Failed to generate AI brief', { id: toastId, description: errorMessage });
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Parse existing canonical note from notes array
  const parseCanonicalNote = (notesList: LeadNote[]): CanonicalNote | null => {
    // Find latest note that starts with [AI_CANONICAL_NOTE v1.0]
    const canonicalNoteEntry = notesList
      .slice()
      .reverse()
      .find(n => {
        const content = n.note || '';
        return content.startsWith('[AI_CANONICAL_NOTE v1.0]');
      });

    if (!canonicalNoteEntry) return null;

    try {
      const content = canonicalNoteEntry.note || '';
      // Extract JSON after header line
      const lines = content.split('\n');
      const jsonStart = lines.findIndex(l => l.trim().startsWith('{'));
      if (jsonStart === -1) return null;
      
      const jsonText = lines.slice(jsonStart).join('\n');
      const parsed = JSON.parse(jsonText);
      return parsed as CanonicalNote;
    } catch (err) {
      console.error('[AdminLeads] Failed to parse canonical note:', err);
      return null;
    }
  };

  // Normalize notes via AI
  const handleNormalizeNotes = async (leadId: string) => {
    if (!leadId) return;

    setIsNormalizing(true);
    setError(null);

    const toastId = toast.loading('Normalizing notes…');

    try {
      const lead = leads.find(l => l.id === leadId);
      if (!lead) throw new Error('Lead not found');

      // Filter out existing canonical notes
      const humanNotes = notes.filter(n => {
        const content = n.note || '';
        return !content.startsWith('[AI_CANONICAL_NOTE');
      });

      const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
      const adminToken = import.meta.env.VITE_ADMIN_TOKEN || '';

      // Get previous canonical from cache
      const prevCanonical = canonicalCacheRef.current.get(leadId) || null;

      // Calculate incremental notes/events since last canonical
      const lastNoteAt = prevCanonical?.sources?.last_note_at;
      const newNotesSincePrev = lastNoteAt
        ? humanNotes.filter(n => new Date(n.created_at) > new Date(lastNoteAt))
        : humanNotes;
      
      const newTimelineSincePrev = lastNoteAt
        ? timeline.filter(t => new Date(t.receivedAt) > new Date(lastNoteAt))
        : timeline;

      // Call normalize function with memory prompting (returns with firewallReport and runHash)
      const normalizeResult = await normalizeLeadNote(
        {
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
          lastContactedAt: lastContactedAt,
          contactEvents: contactEvents,
          timeline: timeline,
          notes: humanNotes.slice(0, 10), // Last 10, excluding canonical
          prevCanonical: prevCanonical as CanonicalV11 | null,
          newNotesSincePrev: newNotesSincePrev.slice(0, 10),
          newTimelineSincePrev: newTimelineSincePrev,
        },
        apiUrl,
        adminToken
      );

      const firewallReport = normalizeResult.firewallReport;
      const runHash = normalizeResult.runHash;

      // Transform to v1.1 if needed
      let canonicalV11: CanonicalV11;
      if (normalizeResult.version === '1.1') {
        canonicalV11 = normalizeResult as CanonicalV11;
      } else {
        // Transform v1.0 to v1.1
        canonicalV11 = transformV10ToV11(normalizeResult as CanonicalNote, lead.id);
      }

      // Apply safe merge (lead ground truth > AI)
      canonicalV11 = safeMergeCanonical(canonicalV11, {
        phone: lead.phone,
        email: lead.email,
        source: lead.source,
        status: lead.status,
      });

      // Compute changelog via diff
      const changelog = diffCanonical(prevCanonical, canonicalV11, {
        phone: lead.phone,
        email: lead.email,
        source: lead.source,
        status: lead.status,
      });

      // Add changelog and sources to canonical
      canonicalV11.changelog = changelog;
      canonicalV11.updated_at = new Date().toISOString();
      canonicalV11.sources = {
        notes_used_count: humanNotes.length,
        timeline_used_count: timeline.length,
        last_note_at: humanNotes.length > 0 ? humanNotes[0].created_at : undefined,
      };

      // Inject firewall security meta into canonical
      if (firewallReport && runHash) {
        canonicalV11.security = canonicalV11.security || {};
        canonicalV11.security.firewall = {
          redaction_counts: firewallReport.redaction.counts,
          redaction_samples_masked: firewallReport.redaction.samples_masked,
          injection_detected: firewallReport.injection.detected,
          injection_signals: firewallReport.injection.signals.map(s => ({ pattern: s.pattern, match: s.match })),
          detected_contacts_masked: {
            emails: firewallReport.detected_contacts.emails_masked,
            phones: firewallReport.detected_contacts.phones_masked,
          },
          applied_at: new Date().toISOString(),
          run_hash: runHash,
        };
      }

      // Review gating logic (strengthened with firewall)
      const reviewReasons: string[] = [];
      if (canonicalV11.confidence !== null && canonicalV11.confidence < 55) {
        reviewReasons.push('Low confidence');
      }
      if (changelog.conflicts.length > 0) {
        reviewReasons.push('Conflicts detected');
      }
      if (canonicalV11.missing_fields.length >= 3 && (!canonicalV11.next_best_action.script || canonicalV11.next_best_action.script.length === 0)) {
        reviewReasons.push('Insufficient info for script');
      }
      
      // Firewall-based review gating
      if (firewallReport) {
        if (firewallReport.injection.detected) {
          reviewReasons.push('Prompt-injection signals detected');
        }
        if (firewallReport.detected_contacts.emails_masked.length > 0 && !lead.email) {
          reviewReasons.push('Potential contact data detected in notes');
        }
        if (firewallReport.detected_contacts.phones_masked.length > 0 && !lead.phone) {
          reviewReasons.push('Potential contact data detected in notes');
        }
      }
      
      canonicalV11.review_required = reviewReasons.length > 0;
      canonicalV11.review_reasons = reviewReasons;

      // Save as system note (v1.1)
      const canonicalNoteContent = `[AI_CANONICAL_NOTE v1.1]\n${JSON.stringify(canonicalV11, null, 2)}`;
      
      // Use existing createNote function
      await createNote(leadId, canonicalNoteContent);

      // Update local state
      setCanonicalNote(canonicalV11);
      
      // Update cache immediately
      canonicalCacheRef.current.set(leadId, canonicalV11);
      
      // Reload notes to get the new canonical note
      await loadNotes(leadId);

      toast.success('AI snapshot updated', { id: toastId });
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
    setNotes([]);
    setNewNoteContent('');
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
    await Promise.all([loadNotes(leadId), loadTimeline(leadId), loadContactEvents(leadId)]);
  };

  // Parse canonical note when notes load
  useEffect(() => {
    if (notes.length > 0 && notesLeadId) {
      const canonical = findLatestCanonical(notes);
      if (canonical) {
        setCanonicalNote(canonical);
        // Update cache
        canonicalCacheRef.current.set(notesLeadId, canonical);
      } else {
        setCanonicalNote(null);
        // Remove from cache if no canonical found
        canonicalCacheRef.current.delete(notesLeadId);
      }
    } else {
      setCanonicalNote(null);
    }
  }, [notes, notesLeadId]);

  // Update cache when activeLeadId changes (if we have notes for that lead)
  useEffect(() => {
    if (activeLeadId && notesLeadId === activeLeadId && notes.length > 0) {
      const canonical = findLatestCanonical(notes);
      if (canonical) {
        canonicalCacheRef.current.set(activeLeadId, canonical);
      } else {
        canonicalCacheRef.current.delete(activeLeadId);
      }
    }
  }, [activeLeadId, notesLeadId, notes]);

  // Close notes modal with animation
  const handleCloseNotes = () => {
    if (isClosing) return;
    setIsClosing(true);
    requestAnimationFrame(() => {
      setTimeout(() => {
        setIsClosing(false);
        setNotesLeadId(null);
        setNotes([]);
        setNewNoteContent('');
        setAiRiskScore(null);
        setAiSummary(null);
        setLastContactedAt(null);
        setContactEvents([]);
        setNewContactChannel('phone');
        setNewContactNote('');
      }, 180);
    });
  };

  // Handle add note form submission
  const handleAddNote = (e: any) => {
    e.preventDefault();
    if (isSavingNote || !newNoteContent.trim() || !notesLeadId) return;
    createNote(notesLeadId, newNoteContent);
  };

  // Handle logout
  const handleLogout = async () => {
    await logout();
    setLeads([]);
    setError(null);
    // Redirect to login
    window.history.pushState({}, '', '/login');
    window.dispatchEvent(new PopStateEvent('popstate'));
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
  }, [isAdmin, isAuthenticated]);

  // Set activeLeadId to first lead when leads load or tab changes
  useEffect(() => {
    const filtered = applyTabFilter(leads);
    if (filtered.length > 0) {
      const currentActiveExists = filtered.some(l => l.id === activeLeadId);
      if (!currentActiveExists) {
        setActiveLeadId(filtered[0].id);
      }
    } else {
      setActiveLeadId(null);
    }
  }, [leads, tab]);

  // Keyboard navigation handler (only when modal closed and not typing)
  useEffect(() => {
    const isModalOpen = notesLeadId !== null || isClosing;
    if (isModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in input/textarea/contentEditable
      const target = e.target as HTMLElement;
      const isTyping = target?.tagName === "INPUT" || 
                       target?.tagName === "TEXTAREA" || 
                       target?.isContentEditable ||
                       isComposing;
      
      if (isTyping) {
        // Handle / for search focus even when typing
        if (e.key === "/" && target?.tagName !== "INPUT") {
          e.preventDefault();
          searchRef.current?.focus();
        }
        // Handle ESC to blur search if empty
        if (e.key === "Escape" && target?.tagName === "INPUT" && (target as HTMLInputElement).value === "") {
          target.blur();
        }
        return;
      }

      const filteredLeads = applyTabFilter(leads);
      if (filteredLeads.length === 0) return;

      const currentIndex = filteredLeads.findIndex(l => l.id === activeLeadId);
      
      // J = next lead
      if (e.key === "j" || e.key === "J") {
        e.preventDefault();
        const nextIndex = currentIndex < filteredLeads.length - 1 ? currentIndex + 1 : 0;
        const nextLead = filteredLeads[nextIndex];
        setActiveLeadId(nextLead.id);
        leadRowRefs.current[nextLead.id]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
      
      // K = previous lead
      if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : filteredLeads.length - 1;
        const prevLead = filteredLeads[prevIndex];
        setActiveLeadId(prevLead.id);
        leadRowRefs.current[prevLead.id]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
      
      // G = first lead
      if (e.key === "g" || e.key === "G") {
        if (!e.shiftKey) {
          e.preventDefault();
          const firstLead = filteredLeads[0];
          setActiveLeadId(firstLead.id);
          leadRowRefs.current[firstLead.id]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
      }
      
      // Shift+G = last lead
      if (e.key === "G" && e.shiftKey) {
        e.preventDefault();
        const lastLead = filteredLeads[filteredLeads.length - 1];
        setActiveLeadId(lastLead.id);
        leadRowRefs.current[lastLead.id]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
      
      // Enter = open Notes modal
      if (e.key === "Enter" && activeLeadId) {
        e.preventDefault();
        handleOpenNotes(activeLeadId);
      }
      
      // / = focus search
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      
      // Quick actions 1-4
      if (activeLeadId && ["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        const lead = filteredLeads.find(l => l.id === activeLeadId);
        if (!lead) return;
        
        if (e.key === "1") {
          markContacted(activeLeadId);
        } else if (e.key === "2") {
          runAIAnalysis(activeLeadId);
        } else if (e.key === "3") {
          handleOpenNotes(activeLeadId);
        } else if (e.key === "4") {
          // Copy best contact (prefer phone, else email)
          const contact = lead.phone || lead.email;
          if (contact) {
            copyText(contact);
            toast.success(`Copied ${lead.phone ? 'phone' : 'email'}`);
          } else {
            toast.error('No contact info available');
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [notesLeadId, isClosing, activeLeadId, leads, isComposing]);

  // Show nothing while checking auth or redirecting
  if (!isAuthenticated) {
    return null;
  }

  // Authenticated - show leads table
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Leads Management</h1>
              <p className="text-gray-600 mt-1">
                <span className="font-medium">{applyTabFilter(leads).length} leads</span>
                <span className="ml-3 text-xs text-gray-500">Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">/</kbd> to search</span>
                {!isAdmin && user?.id && (
                  <span className="ml-2 text-blue-600">• Assigned to: {user.id}</span>
                )}
                {isAdmin && <span className="ml-2 text-green-600">• Admin Mode</span>}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={loadLeads}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="mb-4">
            <input
              ref={searchRef}
              type="text"
              placeholder="Search leads... (Press / to focus)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {(isAdmin ? [
              ['all', 'All'],
              ['unassigned', 'Unassigned'],
              ['due_today', 'Due Today'],
              ['appointment_set', 'Appointment'],
              ['deposit_paid', 'Deposit Paid'],
            ] : [
              ['all', 'All'],
              ['due_today', 'Due Today'],
              ['appointment_set', 'Appointment'],
              ['deposit_paid', 'Deposit Paid'],
            ]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key as LeadTab)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  tab === key ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

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
        {(() => {
          const filteredLeads = applyTabFilter(leads);
          
          return filteredLeads.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <p className="text-gray-500 text-lg">
                {searchQuery.trim() ? 'No leads match your search.' : 'No leads found.'}
              </p>
              <p className="text-gray-400 text-sm mt-2">
                {isLoading ? 'Loading...' : searchQuery.trim() ? 'Try a different search term.' : 'Try adjusting your filters or check back later.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-[1100px] w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Treatment</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Follow-up</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[180px]">Assigned To</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ width: '220px' }}>Notes</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky right-0 bg-gray-50 z-10 border-l border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredLeads.map((lead) => {
                      // Get canonical note from cache (if available)
                      const canonical = canonicalCacheRef.current.get(lead.id);
                      
                      // Compute priority and next action for this lead
                      const leadNotes = notes.filter(n => n.lead_id === lead.id);
                      const leadTimeline = timeline.filter(t => t.leadId === lead.id);
                      const leadContactEvents = contactEvents.filter(e => e.lead_id === lead.id);
                      const priorityScore = computePriority(
                        lead,
                        lead.ai_risk_score ?? null,
                        lead.last_contacted_at ?? null,
                        leadTimeline,
                        leadNotes,
                        leadContactEvents
                      );
                      const hasBrief = !!(lead.ai_summary);
                      const hasNotes = leadNotes.length > 0;
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
                      const canonicalRisk = canonical?.risk_score;
                      const canonicalNBA = canonical?.next_best_action;
                      const canonicalMissing = canonical?.missing_fields || [];
                      
                      const priorityBadge = canonicalPriority === 'hot' ? { emoji: '🔴', label: 'Hot', color: 'bg-red-100 text-red-800' } :
                                           canonicalPriority === 'warm' ? { emoji: '🟠', label: 'Warm', color: 'bg-orange-100 text-orange-800' } :
                                           canonicalPriority === 'cool' ? { emoji: '🟢', label: 'Cool', color: 'bg-green-100 text-green-800' } :
                                           priorityScore >= 70 ? { emoji: '🔴', label: 'Hot', color: 'bg-red-100 text-red-800' } :
                                           priorityScore >= 40 ? { emoji: '🟠', label: 'Warm', color: 'bg-orange-100 text-orange-800' } :
                                           { emoji: '🟢', label: 'Cool', color: 'bg-green-100 text-green-800' };

                      return (
                        <>
                          <tr 
                            key={lead.id} 
                            ref={(el) => { leadRowRefs.current[lead.id] = el; }}
                            onClick={() => setActiveLeadId(lead.id)}
                            className={`hover:bg-gray-50 group cursor-pointer transition-colors ${
                              activeLeadId === lead.id 
                                ? "bg-blue-50/40 border-blue-300 ring-2 ring-blue-200" 
                                : ""
                            }`}
                          >
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-gray-500">{new Date(lead.created_at).toLocaleString()}</span>
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${priorityBadge.color}`}>
                                  {priorityBadge.emoji} {priorityBadge.label}
                                </span>
                                {canonicalRisk !== undefined && (
                                  <span className="text-xs text-gray-600">
                                    Risk {canonicalRisk}
                                  </span>
                                )}
                                {isStale && (
                                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                                    ⏳ {daysSinceActivity}d no activity
                                  </span>
                                )}
                              </div>
                              {canonicalNBA && (
                                <div className="text-xs text-gray-700 font-medium truncate max-w-[300px]" title={canonicalNBA.label}>
                                  Next: {canonicalNBA.label}
                                </div>
                              )}
                              {canonicalMissing.length > 0 && (
                                <div className="flex flex-wrap gap-1 max-w-[300px]">
                                  {canonicalMissing.slice(0, 3).map((field, idx) => (
                                    <span key={idx} className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">
                                      {field}
                                    </span>
                                  ))}
                                  {canonicalMissing.length > 3 && (
                                    <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                      +{canonicalMissing.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}
                              {!canonical && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenNotes(lead.id);
                                  }}
                                  className="text-xs text-purple-600 hover:text-purple-700 underline"
                                >
                                  Open Notes to generate snapshot
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {lead.name || '-'}
                          </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lead.email || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <span>{lead.phone || '-'}</span>
                          {(() => {
                            const wa = normalizePhoneToWhatsApp(lead.phone);
                            return wa ? (
                              <button
                                className="text-xs px-2 py-1 rounded bg-teal-600 text-white hover:bg-teal-700 transition-colors"
                                onClick={() => {
                                  const url = `https://wa.me/${wa}?text=${encodeURIComponent(waMessageEN(lead))}`;
                                  window.open(url, "_blank", "noopener,noreferrer");
                                }}
                              >
                                WhatsApp
                              </button>
                            ) : null;
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          lead.source === 'onboarding' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {lead.source}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {lead.treatment || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingLead?.id === lead.id ? (
                          <div className="flex flex-col gap-2">
                            <select
                              value={editStatus}
                              onChange={(e) => setEditStatus(e.target.value)}
                              className="text-sm border border-gray-300 rounded px-2 py-1"
                            >
                              {LEAD_STATUSES.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                            <div className="flex gap-2">
                              <button
                                onClick={handleEditSave}
                                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                              >
                                <Save className="w-3 h-3" />
                                Save
                              </button>
                              <button
                                onClick={() => setEditingLead(null)}
                                className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center gap-1"
                              >
                                <X className="w-3 h-3" />
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            (lead.status?.toLowerCase() || 'new') === 'new' ? 'bg-yellow-100 text-yellow-800' :
                            lead.status?.toLowerCase() === 'contacted' ? 'bg-blue-100 text-blue-800' :
                            lead.status?.toLowerCase() === 'booked' ? 'bg-purple-100 text-purple-800' :
                            lead.status?.toLowerCase() === 'paid' ? 'bg-green-100 text-green-800' :
                            lead.status?.toLowerCase() === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {LEAD_STATUSES.find(s => s.value === lead.status?.toLowerCase())?.label || 
                             (lead.status ? lead.status.charAt(0).toUpperCase() + lead.status.slice(1).toLowerCase() : 'New')}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingLead?.id === lead.id ? (
                          <div className="flex flex-col gap-2">
                            <input
                              type="datetime-local"
                              value={editFollowUpAt}
                              onChange={(e) => setEditFollowUpAt(e.target.value)}
                              className="text-sm border border-gray-300 rounded px-2 py-1"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={handleEditSave}
                                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                              >
                                <Save className="w-3 h-3" />
                                Save
                              </button>
                              <button
                                onClick={() => setEditingLead(null)}
                                className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center gap-1"
                              >
                                <X className="w-3 h-3" />
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-600">
                            {lead.follow_up_at 
                              ? new Date(lead.follow_up_at).toLocaleString()
                              : '-'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 min-w-[180px]">
                        {role === 'admin' && (
                          <div className="min-w-[240px] flex items-center gap-2">
                            <select
                              className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm bg-white"
                              value={selectedEmployeeByLead[lead.id] ?? lead.assigned_to ?? ""}
                              onChange={(e) => handleAssignChange(lead.id, e.target.value)}
                            >
                              <option value="">Unassigned</option>
                              {employees.map((emp: any) => (
                                <option key={emp.id} value={emp.id}>
                                  {emp.full_name || emp.email || emp.id}
                                </option>
                              ))}
                            </select>

                            {assigningLeadId === lead.id && (
                              <span className="text-xs text-gray-500 whitespace-nowrap">Saving…</span>
                            )}
                          </div>
                        )}
                        {role !== 'admin' && (
                          <span className="text-sm text-gray-600">
                            {lead.assigned_to ? lead.assigned_to : 'Unassigned'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 overflow-hidden" style={{ width: '220px', maxWidth: '220px' }}>
                        {editingLead?.id === lead.id ? (
                          <div className="flex flex-col gap-2">
                            <input
                              type="text"
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              placeholder="Add notes..."
                              className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={handleEditSave}
                                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                              >
                                <Save className="w-3 h-3" />
                                Save
                              </button>
                              <button
                                onClick={() => setEditingLead(null)}
                                className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center gap-1"
                              >
                                <X className="w-3 h-3" />
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="block truncate" title={lead.notes || undefined}>
                            {lead.notes || '-'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm sticky right-0 bg-white group-hover:bg-gray-50 z-10 border-l border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
                        {editingLead?.id === lead.id ? (
                          <div className="flex gap-2">
                            <button
                              onClick={handleEditSave}
                              className="text-green-600 hover:text-green-700"
                              title="Save"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingLead(null)}
                              className="text-gray-600 hover:text-gray-700"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {activeLeadId === lead.id && (
                              <div className="flex items-center gap-1 mr-2">
                                {/* Copy NBA script (if canonical exists) */}
                                {canonicalNBA?.script && canonicalNBA.script.length > 0 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const scriptText = canonicalNBA.script.join('\n');
                                      copyText(scriptText);
                                      toast.success('Script copied to clipboard');
                                    }}
                                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                    title="Copy NBA script"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markContacted(lead.id);
                                  }}
                                  className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                                  title="Mark as contacted"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                                {hasPhone && (
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (lead.phone) {
                                          window.location.href = `tel:${lead.phone}`;
                                        }
                                      }}
                                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                      title="Call"
                                    >
                                      <Phone className="w-4 h-4" />
                                    </button>
                                    {normalizePhoneToWhatsApp(lead.phone) && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const wa = normalizePhoneToWhatsApp(lead.phone);
                                          if (wa) {
                                            const url = `https://wa.me/${wa}?text=${encodeURIComponent(waMessageEN(lead))}`;
                                            window.open(url, "_blank", "noopener,noreferrer");
                                          }
                                        }}
                                        className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                                        title="WhatsApp"
                                      >
                                        <MessageCircle className="w-4 h-4" />
                                      </button>
                                    )}
                                  </>
                                )}
                                {hasEmail && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (lead.email) {
                                        window.location.href = `mailto:${lead.email}`;
                                      }
                                    }}
                                    className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                    title="Email"
                                  >
                                    <Mail className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const contact = lead.phone || lead.email;
                                    if (contact) {
                                      copyText(contact);
                                      toast.success(`Copied ${lead.phone ? 'phone' : 'email'}`);
                                    } else {
                                      toast.error('No contact info available');
                                    }
                                  }}
                                  className="p-1.5 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                                  title="Copy contact"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenNotes(lead.id);
                                  }}
                                  className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                  title="Open Notes"
                                >
                                  <MessageSquare className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                            <button
                              onClick={() => handleEditStart(lead)}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleOpenNotes(lead.id)}
                              className="text-purple-600 hover:text-purple-700"
                              title="View Notes"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                    {/* Next Best Action Row */}
                    <tr 
                      key={`${lead.id}-action`}
                      className={`${activeLeadId === lead.id ? "bg-blue-50/20" : "bg-gray-50/50"} border-t border-gray-100`}
                    >
                      <td colSpan={11} className="px-6 py-2">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <span className="font-medium">Next:</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (nextAction.action === 'call' && lead.phone) {
                                  window.location.href = `tel:${lead.phone}`;
                                } else if (nextAction.action === 'whatsapp' && lead.phone) {
                                  const wa = normalizePhoneToWhatsApp(lead.phone);
                                  if (wa) {
                                    const url = `https://wa.me/${wa}?text=${encodeURIComponent(waMessageEN(lead))}`;
                                    window.open(url, "_blank", "noopener,noreferrer");
                                  }
                                } else if (nextAction.action === 'email' && lead.email) {
                                  window.location.href = `mailto:${lead.email}`;
                                } else if (nextAction.action === 'brief') {
                                  handleOpenNotes(lead.id);
                                  setTimeout(() => {
                                    if (lead.id) runAIAnalysis(lead.id);
                                  }, 500);
                                } else if (nextAction.action === 'note') {
                                  handleOpenNotes(lead.id);
                                }
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                            >
                              <span>{nextAction.icon}</span>
                              <span>{nextAction.label}</span>
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 italic ml-12">
                            {getActionReasoning(
                              nextAction.action,
                              hasPhone,
                              hasEmail,
                              hasBrief,
                              hasNotes,
                              lead.last_contacted_at ?? null,
                              priorityScore
                            )}
                          </p>
                        </div>
                      </td>
                    </tr>
                        </>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
          );
        })()}

        {/* Notes Modal (PORTAL - single-scroll architecture) */}
        {(notesLeadId || isClosing) && createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="notes-modal-title"
            aria-describedby="notes-modal-desc"
            className={`fixed inset-0 bg-black/40 flex items-center justify-center p-4 transition-opacity duration-200 motion-reduce:transition-none ${
              isClosing ? "opacity-0" : "opacity-100"
            }`}
            style={{ zIndex: 2147483647 }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) handleCloseNotes();
            }}
          >
            <div
              data-modal-root="true"
              className={`relative bg-white rounded-2xl shadow-2xl border border-gray-200 ring-1 ring-black/5 overflow-hidden transition-all duration-200 will-change-transform motion-reduce:transition-none motion-reduce:transform-none ${
                isClosing ? "opacity-0 scale-[0.98]" : "opacity-100 scale-100"
              }`}
              style={{
                width: "min(92vw, 720px)",
                height: "min(80vh, 720px)",
                display: "grid",
                gridTemplateRows: "auto minmax(0, 1fr) auto",
                transform: "translateZ(0)",
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
                {/* HEADER */}
                <div className={`shrink-0 border-b border-gray-200 px-5 py-3 bg-white ${notesScroll.atTop ? "" : "shadow-sm"}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <h3 id="notes-modal-title" className="text-base font-semibold text-gray-900">Notes</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Lead actions & call prep</p>
                    {notesLeadId && (() => {
                      const currentLead = leads.find(l => l.id === notesLeadId);
                      const leadPriority = currentLead ? computePriority(
                        currentLead,
                        currentLead.ai_risk_score ?? null,
                        currentLead.last_contacted_at ?? null,
                        timeline,
                        notes,
                        contactEvents
                      ) : 0;
                      if (leadPriority >= 70) {
                        return (
                          <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            High-priority lead – consider contacting within 24h
                          </p>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => notesLeadId && markContacted(notesLeadId)}
                          disabled={isMarkingContacted || !notesLeadId}
                          className={[
                            "inline-flex items-center justify-center gap-2 h-10",
                            "px-3 rounded-md text-sm font-semibold",
                            "border transition-all duration-200 min-w-[140px]",
                            "active:scale-[0.99] motion-reduce:active:scale-100",
                            isMarkingContacted || !notesLeadId
                              ? "bg-gray-100 !text-gray-700 border-gray-200 opacity-70 cursor-not-allowed"
                              : "bg-green-600 !text-white border-green-600 hover:bg-green-700 hover:border-green-700 shadow-sm hover:shadow"
                          ].join(" ")}
                          title={!notesLeadId ? "Select a lead first" : "Mark as contacted (Call/WhatsApp/Email)"}
                        >
                          {isMarkingContacted ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Marking...</span>
                            </>
                          ) : (
                            <>
                              <Phone className="w-4 h-4" />
                              <span>Mark Contacted</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => notesLeadId && runAIAnalysis(notesLeadId)}
                          disabled={isLoadingAI || !notesLeadId}
                          className={[
                            "inline-flex items-center justify-center gap-2 h-10",
                            "px-4 rounded-lg text-sm font-semibold",
                            "border transition-all duration-200 min-w-[180px]",
                            "focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2",
                            "active:scale-[0.99] motion-reduce:active:scale-100",
                            isLoadingAI || !notesLeadId
                              ? "bg-gray-100 !text-gray-700 border-gray-200 opacity-70 cursor-not-allowed"
                              : "bg-gradient-to-r from-blue-600 to-purple-600 !text-white border-transparent hover:from-blue-700 hover:to-purple-700 shadow-sm hover:shadow-md"
                          ].join(" ")}
                          title={!notesLeadId ? "Select a lead first" : aiSummary ? "Update AI-powered call briefing" : "Generate AI-powered call briefing"}
                        >
                          {isLoadingAI ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Generating...</span>
                            </>
                          ) : (
                            <>
                              <span>✨</span>
                              <span>{aiSummary ? "Update Brief" : "Generate AI Brief"}</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => notesLeadId && handleNormalizeNotes(notesLeadId)}
                          disabled={isNormalizing || !notesLeadId}
                          className={[
                            "inline-flex items-center justify-center gap-2 h-10",
                            "px-4 rounded-lg text-sm font-semibold",
                            "border transition-all duration-200 min-w-[160px]",
                            "focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2",
                            "active:scale-[0.99] motion-reduce:active:scale-100",
                            isNormalizing || !notesLeadId
                              ? "bg-gray-100 !text-gray-700 border-gray-200 opacity-70 cursor-not-allowed"
                              : "bg-gradient-to-r from-purple-600 to-indigo-600 !text-white border-transparent hover:from-purple-700 hover:to-indigo-700 shadow-sm hover:shadow-md"
                          ].join(" ")}
                          title={!notesLeadId ? "Select a lead first" : "Normalize notes into canonical JSON snapshot"}
                        >
                          {isNormalizing ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Normalizing...</span>
                            </>
                          ) : (
                            <>
                              <FileText className="w-4 h-4" />
                              <span>Normalize Notes</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={handleCloseNotes}
                          className="ml-2 h-10 w-10 text-gray-500 hover:text-gray-700 text-xl leading-none rounded hover:bg-gray-100 transition-colors active:scale-[0.99] motion-reduce:active:scale-100 flex items-center justify-center"
                          aria-label="Close"
                        >
                          ×
                        </button>
                  </div>
                </div>
              </div>

                {/* BODY - TEK SCROLL ALANI */}
                <div
                  ref={modalScrollRef}
                  tabIndex={0}
                  role="region"
                  id="notes-modal-desc"
                  aria-label="Notes content"
                  className="relative px-5 py-4 pr-3 focus:outline-none overscroll-contain touch-pan-y"
                  style={{
                    overflowY: "auto",
                    minHeight: 0,
                    WebkitOverflowScrolling: "touch",
                    scrollbarGutter: "stable",
                  }}
                  onScroll={handleNotesScroll}
                  onKeyDown={(e) => {
                    const el = modalScrollRef.current;
                    if (!el) return;

                    const line = 48; // key scroll step
                    const page = Math.max(200, el.clientHeight * 0.9);

                    if (e.key === "ArrowDown") { el.scrollTop += line; e.preventDefault(); }
                    if (e.key === "ArrowUp")   { el.scrollTop -= line; e.preventDefault(); }
                    if (e.key === "PageDown")  { el.scrollTop += page; e.preventDefault(); }
                    if (e.key === "PageUp")    { el.scrollTop -= page; e.preventDefault(); }
                    if (e.key === "Home")      { el.scrollTop = 0; e.preventDefault(); }
                    if (e.key === "End")       { el.scrollTop = el.scrollHeight; e.preventDefault(); }
                    if (e.key === " ")         { // space
                      el.scrollTop += (e.shiftKey ? -page : page);
                      e.preventDefault();
                    }
                  }}
                >
                  {/* FADE TOP */}
                  <div
                    className={`pointer-events-none sticky top-0 h-6 -mt-4 bg-gradient-to-b from-white to-transparent z-10 transition-opacity ${
                      notesScroll.atTop ? "opacity-0" : "opacity-100"
                    }`}
                  />
                  <div className="space-y-6">
                    {/* AI Snapshot Section */}
                    {canonicalNote ? (
                      <div className="border border-gray-200 rounded-lg p-4 bg-gradient-to-br from-white to-purple-50/20">
                        <div className="mb-3">
                          <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-1">
                            <FileText className="w-4 h-4 text-purple-600" />
                            AI Snapshot
                          </h4>
                          <p className="text-xs text-gray-500">Canonical structured view of lead data</p>
                        </div>
                        
                        <div className="space-y-3">
                          {/* Summary (v1.0 only) */}
                          {(canonicalNote as any).summary_1line && (
                            <div>
                              <p className="text-sm font-medium text-gray-900 mb-1">{(canonicalNote as any).summary_1line}</p>
                              {((canonicalNote as any).summary_bullets || []).length > 0 && (
                                <ul className="text-xs text-gray-600 space-y-0.5 ml-4 list-disc">
                                  {((canonicalNote as any).summary_bullets || []).map((bullet: string, idx: number) => (
                                    <li key={idx}>{bullet}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}

                          {/* Priority & Risk */}
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              (canonicalNote as any).priority === 'hot' ? 'bg-red-100 text-red-800' :
                              (canonicalNote as any).priority === 'warm' ? 'bg-orange-100 text-orange-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {(canonicalNote as any).priority === 'hot' ? '🔴' : (canonicalNote as any).priority === 'warm' ? '🟠' : '🟢'} {((canonicalNote as any).priority || 'cool').toUpperCase()}
                            </span>
                            {(canonicalNote as any).risk_score !== null && (canonicalNote as any).risk_score !== undefined && (
                              <span className="text-xs text-gray-600">
                                Risk: <span className="font-semibold">{(canonicalNote as any).risk_score}/100</span>
                              </span>
                            )}
                            {(canonicalNote as any).confidence !== null && (canonicalNote as any).confidence !== undefined && (
                              <span className="text-xs text-gray-600">
                                Confidence: <span className="font-semibold">{(canonicalNote as any).confidence}/100</span>
                              </span>
                            )}
                          </div>

                          {/* Next Best Action */}
                          {canonicalNote.next_best_action && (
                            <div className="border-t border-gray-200 pt-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-gray-700">Next Best Action:</span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const scriptText = canonicalNote.next_best_action.script.join('\n');
                                      copyText(scriptText);
                                      toast.success('Script copied to clipboard');
                                    }}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-purple-50 text-purple-700 hover:bg-purple-100 rounded transition-colors"
                                  >
                                    <Copy className="w-3 h-3" />
                                    Copy script
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!notesLeadId) return;
                                      const lead = leads.find(l => l.id === notesLeadId);
                                      if (!lead) return;

                                      const nba = canonicalNote.next_best_action;
                                      const channel = (nba as any).channel || 'unknown';
                                      const label = nba.label.toLowerCase();

                                      // Apply NBA action
                                      if (channel === 'whatsapp' && lead.phone) {
                                        const wa = normalizePhoneToWhatsApp(lead.phone);
                                        if (wa) {
                                          const url = `https://wa.me/${wa}?text=${encodeURIComponent(waMessageEN(lead))}`;
                                          window.open(url, "_blank", "noopener,noreferrer");
                                          toast.success('WhatsApp opened');
                                        }
                                      } else if (channel === 'email' && lead.email) {
                                        window.location.href = `mailto:${lead.email}`;
                                        toast.success('Email client opened');
                                      } else if (channel === 'phone' && lead.phone) {
                                        window.location.href = `tel:${lead.phone}`;
                                        toast.success('Phone dialer opened');
                                      } else if (label.includes('mark contacted') || label.includes('mark as contacted')) {
                                        markContacted(notesLeadId);
                                      } else {
                                        // Fallback: copy script
                                        const scriptText = nba.script.join('\n');
                                        copyText(scriptText);
                                        toast.success('Script copied to clipboard');
                                      }
                                    }}
                                    disabled={(canonicalNote as any).version === '1.1' && (canonicalNote as CanonicalV11).review_required}
                                    className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                                      (canonicalNote as any).version === '1.1' && (canonicalNote as CanonicalV11).review_required
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-green-50 text-green-700 hover:bg-green-100'
                                    }`}
                                    title={(canonicalNote as any).version === '1.1' && (canonicalNote as CanonicalV11).review_required ? 'Review required before applying' : 'Apply this action'}
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                    Apply
                                  </button>
                                </div>
                              </div>
                              <p className="text-xs text-gray-900 font-medium mb-1">{canonicalNote.next_best_action.label}</p>
                              <p className="text-xs text-gray-500 mb-2">
                                Due in {canonicalNote.next_best_action.due_hours} hours
                                {(canonicalNote as any).version === '1.1' && (canonicalNote.next_best_action as any).channel && (
                                  <span className="ml-2 text-gray-400">• {(canonicalNote.next_best_action as any).channel}</span>
                                )}
                              </p>
                              {canonicalNote.next_best_action.script.length > 0 && (
                                <div className="bg-gray-50 rounded p-2 text-xs text-gray-700 font-mono whitespace-pre-wrap">
                                  {canonicalNote.next_best_action.script.join('\n')}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Missing Fields */}
                          {canonicalNote.missing_fields.length > 0 && (
                            <div className="border-t border-gray-200 pt-3">
                              <p className="text-xs font-semibold text-gray-700 mb-2">Missing Fields:</p>
                              <div className="flex flex-wrap gap-1.5">
                                {canonicalNote.missing_fields.map((field, idx) => (
                                  <span key={idx} className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">
                                    {field}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Changelog (v1.1) */}
                          {(canonicalNote as any).version === '1.1' && (canonicalNote as CanonicalV11).changelog && (
                            <div className="border-t border-gray-200 pt-3">
                              <p className="text-xs font-semibold text-gray-700 mb-2">Changelog:</p>
                              {(canonicalNote as CanonicalV11).changelog.added.length > 0 && (
                                <div className="mb-2">
                                  <p className="text-xs font-medium text-green-700 mb-1">Added:</p>
                                  <ul className="text-xs text-gray-600 space-y-0.5 ml-4 list-disc">
                                    {(canonicalNote as CanonicalV11).changelog.added.map((item, idx) => (
                                      <li key={idx}>{item}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {(canonicalNote as CanonicalV11).changelog.updated.length > 0 && (
                                <div className="mb-2">
                                  <p className="text-xs font-medium text-blue-700 mb-1">Updated:</p>
                                  <ul className="text-xs text-gray-600 space-y-0.5 ml-4 list-disc">
                                    {(canonicalNote as CanonicalV11).changelog.updated.map((item, idx) => (
                                      <li key={idx}>{item}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {(canonicalNote as CanonicalV11).changelog.removed.length > 0 && (
                                <div className="mb-2">
                                  <p className="text-xs font-medium text-gray-700 mb-1">Removed:</p>
                                  <ul className="text-xs text-gray-600 space-y-0.5 ml-4 list-disc">
                                    {(canonicalNote as CanonicalV11).changelog.removed.map((item, idx) => (
                                      <li key={idx}>{item}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {(canonicalNote as CanonicalV11).changelog.conflicts.length > 0 && (
                                <div className="mb-2">
                                  <p className="text-xs font-medium text-red-700 mb-1">Conflicts:</p>
                                  <ul className="text-xs text-red-600 space-y-0.5 ml-4 list-disc">
                                    {(canonicalNote as CanonicalV11).changelog.conflicts.map((item, idx) => (
                                      <li key={idx}>{item}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}

                          {/* What Changed (v1.0 backward compatibility) */}
                          {(canonicalNote as any).what_changed && ((canonicalNote as any).what_changed || []).length > 0 && (
                            <div className="border-t border-gray-200 pt-3">
                              <p className="text-xs font-semibold text-gray-700 mb-2">What Changed:</p>
                              <ul className="text-xs text-gray-600 space-y-0.5 ml-4 list-disc">
                                {((canonicalNote as any).what_changed || []).map((change: string, idx: number) => (
                                  <li key={idx}>{change}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Sources (v1.1) */}
                          {(canonicalNote as any).version === '1.1' && (canonicalNote as CanonicalV11).sources && (
                            <div className="border-t border-gray-200 pt-3">
                              <p className="text-xs font-semibold text-gray-700 mb-1">Sources:</p>
                              <div className="text-xs text-gray-600 space-y-0.5">
                                <p>Notes used: {(canonicalNote as CanonicalV11).sources.notes_used_count}</p>
                                <p>Timeline events: {(canonicalNote as CanonicalV11).sources.timeline_used_count}</p>
                                {(canonicalNote as CanonicalV11).sources.last_note_at && (
                                  <p>Last note: {new Date((canonicalNote as CanonicalV11).sources.last_note_at).toLocaleString()}</p>
                                )}
                                {(canonicalNote as CanonicalV11).updated_at && (
                                  <p>Updated: {new Date((canonicalNote as CanonicalV11).updated_at).toLocaleString()}</p>
                                )}
                                {(canonicalNote as CanonicalV11).security?.firewall && (
                                  <>
                                    <p className="mt-1 font-medium">Firewall applied: {new Date((canonicalNote as CanonicalV11).security.firewall.applied_at || '').toLocaleString()}</p>
                                    {(canonicalNote as CanonicalV11).security.firewall.run_hash && (
                                      <p className="text-gray-500 font-mono">Hash: {(canonicalNote as CanonicalV11).security.firewall.run_hash}</p>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="mb-2">
                          <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-1">
                            <FileText className="w-4 h-4 text-purple-600" />
                            AI Snapshot
                          </h4>
                        </div>
                        <p className="text-xs text-gray-500">No AI snapshot yet. Click "Normalize Notes" to generate.</p>
                      </div>
                    )}

                    {/* AI Analysis Section */}
                    <div>
                      <div className="mb-3">
                        <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-1">
                          <Brain className="w-4 h-4 text-purple-600" />
                          AI Call Brief
                        </h4>
                        <p className="text-xs text-gray-500">AI-powered insights for your call preparation</p>
                      </div>

                      {isLoadingAI ? (
                        <div className="space-y-3">
                          <div className="text-gray-500 text-sm flex items-center gap-2 mb-3">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Generating call briefing...
                          </div>
                          {/* Skeleton */}
                          <div className="border border-gray-200 rounded-lg p-3 bg-gradient-to-r from-gray-50 to-white animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                          </div>
                          <div className="border border-gray-200 rounded-lg p-4 bg-gradient-to-br from-white to-blue-50/30 animate-pulse">
                            <div className="h-3 bg-gray-200 rounded w-1/2 mb-3"></div>
                            <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-4/5 mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                          </div>
                        </div>
                      ) : aiRiskScore !== null || aiSummary ? (
                        <div className="space-y-3">
                          {aiRiskScore !== null && (
                            <div className="border border-gray-200 rounded-lg p-3 bg-gradient-to-r from-gray-50 to-white">
                              <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className={`w-4 h-4 ${
                                  aiRiskScore >= 70 ? 'text-red-600' :
                                  aiRiskScore >= 40 ? 'text-orange-600' :
                                  aiRiskScore >= 20 ? 'text-yellow-600' :
                                  'text-green-600'
                                }`} />
                                <span className="text-sm font-semibold text-gray-900">
                                  Risk Score: {aiRiskScore}/100
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                                  aiRiskScore >= 70 ? 'bg-red-100 text-red-800' :
                                  aiRiskScore >= 40 ? 'bg-orange-100 text-orange-800' :
                                  aiRiskScore >= 20 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {aiRiskScore >= 70 ? '🔴 High Risk' :
                                   aiRiskScore >= 40 ? '🟠 Medium Risk' :
                                   aiRiskScore >= 20 ? '🟡 Low Risk' :
                                   '🟢 Very Low Risk'}
                                </span>
                                {aiRiskScore >= 70 && (
                                  <span className="text-xs text-red-600 font-medium ml-auto">
                                    ⚠️ Immediate action recommended
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {aiSummary && (
                            <div className="border border-gray-200 rounded-lg p-4 bg-gradient-to-br from-white to-blue-50/30">
                              <FormattedAIBrief content={aiSummary} />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-gray-500 text-sm border border-gray-200 rounded-lg p-3 bg-gray-50">
                          <p className="mb-1">No call brief yet.</p>
                          <p className="text-xs">Click "Generate Brief" to see risk assessment, talking points, and call preparation guidance.</p>
                        </div>
                      )}
                    </div>

                    {/* Timeline Section */}
                    <div>
                      <div className="mb-3">
                        <h4 className="text-sm font-semibold text-gray-700 mb-1">Timeline</h4>
                        {!isLoadingTimeline && notesLeadId && (() => {
                          const currentLead = leads.find(l => l.id === notesLeadId);
                          if (!currentLead) return null;
                          return (
                            <p className="text-xs text-gray-500 italic">
                              {getTimelineSummary(
                                lastContactedAt,
                                contactEvents,
                                !!currentLead.phone,
                                aiRiskScore ?? 0,
                                lastContactedAt ? getDaysSinceActivity(lastContactedAt, currentLead.created_at) : getDaysSinceActivity(null, currentLead.created_at)
                              )}
                            </p>
                          );
                        })()}
                      </div>
                      {isLoadingTimeline ? (
                        <div className="text-gray-500 text-sm">Loading timeline…</div>
                      ) : timeline.length === 0 ? (
                        <div className="text-gray-500 text-sm border border-gray-200 rounded-lg p-3 bg-gray-50">
                          <p>No timeline events yet.</p>
                          <p className="text-xs mt-1 text-gray-400">Booking events will appear here.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {timeline.map((event) => {
                            const date = new Date(event.receivedAt);
                            const formattedDate = date.toLocaleString('tr-TR', {
                              timeZone: 'Europe/Istanbul',
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            });

                            const getEventIcon = () => {
                              if (event.eventType === 'booking.created') {
                                return <CheckCircle2 className="w-4 h-4 text-green-600" />;
                              } else if (event.eventType === 'booking.rescheduled') {
                                return <RotateCcw className="w-4 h-4 text-blue-600" />;
                              } else if (event.eventType === 'booking.cancelled') {
                                return <XCircle className="w-4 h-4 text-red-600" />;
                              }
                              return <Clock className="w-4 h-4 text-gray-600" />;
                            };

                            const getEventLabel = () => {
                              if (event.eventType === 'booking.created') return 'Booked';
                              if (event.eventType === 'booking.rescheduled') return 'Rescheduled';
                              if (event.eventType === 'booking.cancelled') return 'Cancelled';
                              return event.eventType;
                            };

                            const formatTime = (timeStr: string | null) => {
                              if (!timeStr) return null;
                              try {
                                const time = new Date(timeStr);
                                return time.toLocaleTimeString('tr-TR', {
                                  timeZone: 'Europe/Istanbul',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                });
                              } catch {
                                return timeStr;
                              }
                            };

                            const startTimeFormatted = formatTime(event.startTime);
                            const endTimeFormatted = formatTime(event.endTime);
                            const previousStartFormatted = formatTime(event.previousMeetingStart);
                            const previousEndFormatted = formatTime(event.previousMeetingEnd);
                            
                            // For rescheduled events, show "from -> to" format
                            let timeRange: string | null = null;
                            if (event.eventType === 'booking.rescheduled' && previousStartFormatted && startTimeFormatted) {
                              // Show "from -> to" for rescheduled
                              const fromTime = previousStartFormatted + (previousEndFormatted ? ` → ${previousEndFormatted}` : '');
                              const toTime = startTimeFormatted + (endTimeFormatted ? ` → ${endTimeFormatted}` : '');
                              timeRange = `${fromTime} → ${toTime}`;
                            } else if (startTimeFormatted && endTimeFormatted) {
                              // Regular time range
                              timeRange = `${startTimeFormatted} → ${endTimeFormatted}`;
                            } else {
                              timeRange = startTimeFormatted || endTimeFormatted || null;
                            }

                            return (
                              <div
                                key={event.eventId}
                                className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors group"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="mt-0.5">{getEventIcon()}</div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-medium text-sm text-gray-900">
                                        {getEventLabel()}
                                      </span>
                                      <span className="text-xs text-gray-500">—</span>
                                      <span className="text-xs text-gray-500">{formattedDate}</span>
                                      {timeRange && (
                                        <>
                                          <span className="text-xs text-gray-500">—</span>
                                          <span className="text-xs text-gray-600">{timeRange}</span>
                                        </>
                                      )}
                                    </div>
                                    {(event.title || event.additionalNotes) && (
                                      <div className="mt-2 text-xs text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {event.title && (
                                          <div className="font-medium mb-1">{event.title}</div>
                                        )}
                                        {event.additionalNotes && (
                                          <div className="whitespace-pre-wrap break-words">
                                            {event.additionalNotes}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Contact Events Section */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Contact Attempts
                      </h4>
                      
                      {/* Quick Add Form */}
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (isAddingContact || !notesLeadId || !newContactChannel) return;
                            addContactEvent(notesLeadId);
                          }}
                          className="space-y-2"
                        >
                          <div className="flex gap-2">
                            <select
                              value={newContactChannel}
                              onChange={(e) => setNewContactChannel(e.target.value)}
                              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              disabled={isAddingContact}
                            >
                              <option value="phone">Phone</option>
                              <option value="whatsapp">WhatsApp</option>
                              <option value="email">Email</option>
                              <option value="sms">SMS</option>
                              <option value="other">Other</option>
                            </select>
                            <input
                              type="text"
                              value={newContactNote}
                              onChange={(e) => setNewContactNote(e.target.value)}
                              onCompositionStart={() => setIsComposing(true)}
                              onCompositionEnd={() => setIsComposing(false)}
                              placeholder="Quick note (optional)..."
                              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              disabled={isAddingContact}
                            />
                            <button
                              type="submit"
                              disabled={isAddingContact || !newContactChannel || !newContactNote.trim()}
                              className={[
                                "inline-flex items-center justify-center gap-2",
                                "px-3 py-2 rounded-md text-sm font-semibold",
                                "border transition-all duration-200 min-w-[100px]",
                                isAddingContact || !newContactChannel || !newContactNote.trim()
                                  ? "bg-gray-100 !text-gray-700 border-gray-200 opacity-70 cursor-not-allowed"
                                  : "bg-blue-600 !text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700 shadow-sm hover:shadow"
                              ].join(" ")}
                              title={
                                isAddingContact 
                                  ? "Adding contact attempt..." 
                                  : !newContactNote.trim() 
                                    ? "Type a note to enable" 
                                    : "Add contact attempt"
                              }
                            >
                              {isAddingContact ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                  <span>Adding...</span>
                                </>
                              ) : (
                                <>
                                  <Phone className="w-4 h-4" />
                                  <span>Add</span>
                                </>
                              )}
                            </button>
                          </div>
                        </form>
                      </div>

                      {/* Contact Events List */}
                      {isLoadingContactEvents ? (
                        <div className="text-gray-500 text-sm">Loading contact events…</div>
                      ) : contactEvents.length === 0 ? (
                        <div className="text-gray-500 text-sm border border-gray-200 rounded-lg p-3 bg-gray-50">
                          <p>Log first attempt...</p>
                          <p className="text-xs mt-1 text-gray-400">Use the form above to log a call, WhatsApp, or email.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {contactEvents.map((event) => {
                            const date = new Date(event.created_at);
                            const formattedDate = date.toLocaleString('tr-TR', {
                              timeZone: 'Europe/Istanbul',
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            });

                            const getChannelIcon = () => {
                              switch (event.channel) {
                                case 'phone':
                                  return <Phone className="w-4 h-4 text-blue-600" />;
                                case 'whatsapp':
                                  return <MessageCircle className="w-4 h-4 text-green-600" />;
                                case 'email':
                                  return <Mail className="w-4 h-4 text-purple-600" />;
                                case 'sms':
                                  return <MessageSquare className="w-4 h-4 text-orange-600" />;
                                default:
                                  return <Phone className="w-4 h-4 text-gray-600" />;
                              }
                            };

                            const getChannelLabel = () => {
                              switch (event.channel) {
                                case 'phone':
                                  return 'Phone';
                                case 'whatsapp':
                                  return 'WhatsApp';
                                case 'email':
                                  return 'Email';
                                case 'sms':
                                  return 'SMS';
                                default:
                                  return event.channel.charAt(0).toUpperCase() + event.channel.slice(1);
                              }
                            };

                            return (
                              <div
                                key={event.id}
                                className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="mt-0.5">{getChannelIcon()}</div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-medium text-sm text-gray-900">
                                        {getChannelLabel()}
                                      </span>
                                      <span className="text-xs text-gray-500">—</span>
                                      <span className="text-xs text-gray-500">{formattedDate}</span>
                                    </div>
                                    {event.note && (
                                      <div className="mt-2 text-xs text-gray-600 whitespace-pre-wrap break-words">
                                        {event.note}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Notes Section */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Notes</h4>
                      <div className="space-y-3">
                        {isLoadingNotes ? (
                          <div className="text-gray-500 text-sm">Loading notes…</div>
                        ) : notes.length === 0 ? (
                          <div className="text-gray-500 text-sm border border-gray-200 rounded-lg p-3 bg-gray-50">
                            <p>Add first note...</p>
                            <p className="text-xs mt-1 text-gray-400">Use the form below to add your first note about this lead.</p>
                          </div>
                        ) : (
                          notes.map((n: any) => (
                            <div key={n.id} className="border border-gray-200 rounded-lg p-3 max-w-full overflow-hidden">
                              <div className="text-xs text-gray-500 mb-1">
                                {new Date(n.created_at).toLocaleString()}
                              </div>

                              {/* CRITICAL: prevent "single endless line" */}
                              <div
                                className="text-sm text-gray-900 whitespace-pre-wrap break-all"
                                style={{ overflowWrap: "anywhere" }}
                              >
                                {n.content ?? n.note ?? ""}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                  {/* FADE BOTTOM */}
                  <div
                    className={`pointer-events-none sticky bottom-0 h-6 -mb-4 bg-gradient-to-t from-gray-50 to-transparent z-10 transition-opacity ${
                      notesScroll.atBottom ? "opacity-0" : "opacity-100"
                    }`}
                  />
                </div>

                {/* FOOTER */}
                <div className={`shrink-0 border-t border-gray-200 px-5 py-3 bg-gray-50 ${notesScroll.atBottom ? "" : "shadow-[0_-8px_20px_rgba(0,0,0,0.06)]"}`}>
                  <form onSubmit={handleAddNote} className="space-y-3">
                    <textarea
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      onCompositionStart={() => setIsComposing(true)}
                      onCompositionEnd={() => setIsComposing(false)}
                      onKeyDown={(e) => {
                        if (isSavingNote) return;
                        if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && newNoteContent.trim()) {
                          e.preventDefault();
                          handleAddNote(e as any);
                        }
                      }}
                      readOnly={isSavingNote}
                      placeholder={(() => {
                        const currentLead = notesLeadId ? leads.find(l => l.id === notesLeadId) : null;
                        if (currentLead && !currentLead.last_contacted_at) {
                          return "Called but no answer... (Cmd/Ctrl+Enter to submit)";
                        }
                        return "Add a note... (Cmd/Ctrl+Enter to submit)";
                      })()}
                      rows={3}
                      className={`w-full rounded-lg border p-3 resize-none max-h-28 overflow-y-auto bg-white leading-relaxed placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        isSavingNote ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                    />
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs text-gray-500 flex items-center gap-3">
                        <span>ESC to close</span>
                        <span>•</span>
                        <span>Cmd/Ctrl+Enter to add note</span>
                        <button
                          type="button"
                          onClick={() => setShowCheatSheet(!showCheatSheet)}
                          className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Keyboard shortcuts"
                        >
                          <HelpCircle className="w-4 h-4" />
                        </button>
                      </div>
                      {showCheatSheet && (
                        <div className="absolute right-5 bottom-14 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 min-w-[280px]">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-gray-900">Keyboard Shortcuts</h4>
                            <button
                              type="button"
                              onClick={() => setShowCheatSheet(false)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="space-y-2 text-xs">
                            <div className="font-medium text-gray-700 mb-1">In Modal:</div>
                            <div className="flex items-center justify-between py-1">
                              <span className="text-gray-600">ESC</span>
                              <span className="text-gray-900">Close modal</span>
                            </div>
                            <div className="flex items-center justify-between py-1">
                              <span className="text-gray-600">Tab</span>
                              <span className="text-gray-900">Cycle focus</span>
                            </div>
                            <div className="flex items-center justify-between py-1">
                              <span className="text-gray-600">Cmd/Ctrl+Enter</span>
                              <span className="text-gray-900">Add note</span>
                            </div>
                            <div className="border-t border-gray-200 my-2"></div>
                            <div className="font-medium text-gray-700 mb-1">In List:</div>
                            <div className="flex items-center justify-between py-1">
                              <span className="text-gray-600">J / K</span>
                              <span className="text-gray-900">Next / Previous lead</span>
                            </div>
                            <div className="flex items-center justify-between py-1">
                              <span className="text-gray-600">G / Shift+G</span>
                              <span className="text-gray-900">First / Last lead</span>
                            </div>
                            <div className="flex items-center justify-between py-1">
                              <span className="text-gray-600">Enter</span>
                              <span className="text-gray-900">Open notes</span>
                            </div>
                            <div className="flex items-center justify-between py-1">
                              <span className="text-gray-600">/</span>
                              <span className="text-gray-900">Focus search</span>
                            </div>
                            <div className="flex items-center justify-between py-1">
                              <span className="text-gray-600">1-4</span>
                              <span className="text-gray-900">Quick actions</span>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleCloseNotes}
                          className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-50 transition-colors"
                        >
                          Close
                        </button>

                        <button
                          type="submit"
                          disabled={!newNoteContent.trim() || isSavingNote}
                          className={[
                            "inline-flex items-center justify-center gap-2",
                            "px-4 py-2 rounded-md text-sm font-semibold",
                            "border transition-all duration-200 min-w-[120px]",
                            !newNoteContent.trim() || isSavingNote
                              ? "bg-gray-100 !text-gray-700 border-gray-200 opacity-70 cursor-not-allowed"
                              : "bg-blue-600 !text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700 shadow-sm hover:shadow"
                          ].join(" ")}
                          title={
                            isSavingNote 
                              ? "Saving note..." 
                              : !newNoteContent.trim() 
                                ? "Type a note to enable" 
                                : "Add note to lead"
                          }
                        >
                          {isSavingNote ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <MessageSquare className="w-4 h-4" />
                              <span>Add Note</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
