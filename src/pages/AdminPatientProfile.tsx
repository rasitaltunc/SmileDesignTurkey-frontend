import { useState, useEffect, useContext } from 'react';
import { ArrowLeft, Brain, RefreshCw, FileText, AlertTriangle, CheckCircle2, Circle, ListTodo, Clock, User, Phone, Mail, MessageCircle, FolderOpen, Image, FileText as FileTextIcon, FileCheck, File, Calendar } from 'lucide-react';
import { useLocation, useParams } from 'react-router-dom';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { briefLead, type BriefResponse } from '@/lib/ai/briefLead';
import { NavigationContext } from '@/App';
import { getWhatsAppUrl } from '@/lib/whatsapp';
import { BRAND } from '@/config';
import CalEmbed from '../components/CalEmbed';
import { authedFetch } from '@/lib/authedFetch';
import { apiJsonAuth } from '@/lib/api';
import DoctorNotePanel from '@/components/doctor/DoctorNotePanel';
import { isUuid } from '@/lib/isUuid';
import DebugHud from '@/components/DebugHud';

// Import single source of truth from AdminLeads
// Note: In a real refactor, this would be in a shared constants file
// For now, we keep it in sync with AdminLeads.tsx
// DB constraint: CHECK (status IN ('new', 'contacted', 'deposit_paid', 'appointment_set', 'arrived', 'completed', 'lost'))
// Label güzel, value canonical (DB'nin istediği değer)
const TIMELINE_STAGES = [
  "new",
  "contacted",
  "deposit_paid",
  "appointment_set",
  "arrived",
  "completed",
  "lost",
] as const;

// LEAD_STATUS for validation (matches TIMELINE_STAGES - DB canonical values)
const LEAD_STATUS = TIMELINE_STAGES;

const TIMELINE_STAGE_LABEL: Record<string, string> = {
  new: "New Lead",
  contacted: "Contacted",
  deposit_paid: "Deposit Paid",
  appointment_set: "Appointment Set",
  arrived: "Arrived",
  completed: "Completed",
  lost: "Lost",
};

interface Lead {
  id: string;
  name: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  status: string | null;
  created_at: string;
  treatment: string | null;
  source: string | null;
  message?: string | null;
  notes?: string | null;
  meta?: any;
  next_action?: string | null;
  cal_booking_id?: string | null;
  cal_booking_uid?: string | null;
  meeting_start?: string | null;
  meeting_end?: string | null;
}

interface LeadNote {
  id: string;
  lead_id: string;
  note: string | null;
  content: string | null;
  created_at: string;
  created_by: string | null;
}

interface AdminPatientProfileProps {
  doctorMode?: boolean;
  leadId?: string | null;
  leadUuid?: string | null; // ✅ Doctor mode: route param is always UUID (lead_uuid)
}

export default function AdminPatientProfile({ doctorMode = false, leadId: propLeadId = null, leadUuid: propLeadUuid = null }: AdminPatientProfileProps = {}) {
  const { isAuthenticated, user, role } = useAuthStore();
  const { currentPath } = useContext(NavigationContext);
  const location = useLocation();
  const params = useParams() as Record<string, string | undefined>;
  
  // ✅ Doctor mode'u path ile kilitle
  const isDoctorPath = location.pathname.startsWith("/doctor/");
  const finalIsDoctorMode = isDoctorPath; // ✅ doktor path = doktor mode (kesin)
  
  // ✅ leadRef çözümü: param adı farklı / query var / yok / refresh gibi her şeyi çözer. Son segmenti bile alır.
  const leadRef = (() => {
    const qs = new URLSearchParams(location.search);

    const raw =
      params.ref ||
      params.leadRef ||
      params.leadId ||
      params.id ||
      params.case_code ||
      qs.get("ref") ||
      qs.get("lead_id") ||
      qs.get("id") ||
      // son çare: path'in son parçası
      location.pathname.split("/").filter(Boolean).pop() ||
      null;

    return raw ? decodeURIComponent(String(raw)).replace(/^CASE-/, "").trim() : null;
  })();
  
  // Extract leadId from URL (App.tsx uses custom routing, not React Router)
  // Route: /admin/lead/:id OR from prop (admin/employee mode)
  const leadIdMatch = currentPath.match(/\/admin\/lead\/([^/]+)/);
  const urlLeadId = leadIdMatch ? leadIdMatch[1] : null;
  
  console.log("[DEBUG] doctorLead", {
    path: currentPath,
    search: typeof window !== 'undefined' ? window.location.search : '',
    params,
    leadRef,
    isDoctorPath,
    finalIsDoctorMode,
  });
  
  const leadId = propLeadId || urlLeadId;
  
  // Debug log
  useEffect(() => {
    console.log('ROUTE PARAMS', { currentPath, leadId });
  }, [currentPath, leadId]);

  // Helper: Convert ISO timestamp to datetime-local format
  const toDatetimeLocal = (ts?: string | null): string => {
    if (!ts) return "";
    const d = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [lead, setLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isLoadingLead, setIsLoadingLead] = useState(true);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // B2: AI Brief state
  const [briefData, setBriefData] = useState<BriefResponse | null>(null);
  const [isLoadingBrief, setIsLoadingBrief] = useState(false);
  
  // ✅ Doctor mode: Doctor AI Brief state
  const [doctorBrief, setDoctorBrief] = useState<string | null>(null);
  const [isLoadingDoctorBrief, setIsLoadingDoctorBrief] = useState(false);
  
  // B3: Normalize Notes state
  const [normalizeData, setNormalizeData] = useState<any | null>(null);
  const [isLoadingNormalize, setIsLoadingNormalize] = useState(false);

  // B4: Memory Vault state
  const [memoryData, setMemoryData] = useState<any | null>(null);
  const [isLoadingMemory, setIsLoadingMemory] = useState(false);
  const [isSyncingMemory, setIsSyncingMemory] = useState(false);

  // B5: AI Tasks state
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  
  // AI Health state (from lead_ai_health view)
  const [aiHealth, setAiHealth] = useState<{ needs_normalize: boolean; last_normalized_at: string | null; review_required: boolean } | null>(null);
  
  // B6: Timeline Events state
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);
  const [newTimelineStage, setNewTimelineStage] = useState<string>('');
  const [newTimelineNote, setNewTimelineNote] = useState<string>('');
  const [isAddingTimelineEvent, setIsAddingTimelineEvent] = useState(false);

  // Next Action & Follow-up state
  const [nextAction, setNextAction] = useState<string>('');
  const [followUpAt, setFollowUpAt] = useState<string>('');
  const [isUpdatingAction, setIsUpdatingAction] = useState(false);

  // Contact Events state
  const [contactEvents, setContactEvents] = useState<any[]>([]);
  const [isLoadingContactEvents, setIsLoadingContactEvents] = useState(false);

  // Cal.com Booking state
  const [readyForBooking, setReadyForBooking] = useState<boolean>(false);
  const [isCalModalOpen, setIsCalModalOpen] = useState(false);
  const [isUpdatingBookingFlag, setIsUpdatingBookingFlag] = useState(false);

  // Doctor assignment state
  const [doctors, setDoctors] = useState<Array<{ id: string; full_name: string | null; role: string; created_at: string }>>([]);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [isUpdatingDoctor, setIsUpdatingDoctor] = useState(false);

  // Doctor preferences state (for read-only display)
  const [doctorPreferences, setDoctorPreferences] = useState<any>(null);
  const [isLoadingDoctorPrefs, setIsLoadingDoctorPrefs] = useState(false);

  // Doctor review state
  const [doctorReviewStatus, setDoctorReviewStatus] = useState<string>('');
  const [doctorReviewNotes, setDoctorReviewNotes] = useState<string>('');
  const [isUpdatingReview, setIsUpdatingReview] = useState(false);

  // Helper: Get access token
  const getAccessToken = async () => {
    if (!supabase) {
      throw new Error('Supabase client not configured');
    }
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;

    const token = data.session?.access_token;
    if (!token) throw new Error("Session missing. Please login again.");
    return token;
  };

  // Helper: Normalize phone to WhatsApp format
  const normalizePhoneToWhatsApp = (phone?: string | null) => {
    if (!phone) return null;
    let p = String(phone).trim().replace(/[^\d+]/g, "");
    if (p.startsWith("0")) p = "+90" + p.slice(1);
    if (!p.startsWith("+") && p.length === 10) p = "+90" + p;
    if (!p.startsWith("+")) p = "+" + p;
    const digits = p.replace(/\+/g, "");
    if (p.replace(/\D/g, "").length < 11) return null;
    return digits;
  };

  // Helper: WhatsApp message for lead
  const waMessageEN = (lead: Lead) => {
    return (
      `Hi ${lead?.name || lead?.full_name || ""}! 👋\n` +
      `This is Smile Design Turkey.\n\n` +
      `I'm reaching out about your request:\n` +
      `• Treatment: ${lead?.treatment || "-"}\n` +
      `• Timeline: ${lead?.timeline || "-"}\n\n` +
      `To prepare your plan, could you send:\n` +
      `1) A clear smile photo\n` +
      `2) A short video (front + side)\n` +
      `3) Any x-ray if available 😊`
    );
  };

  // ✅ Resolved UUID state (for child endpoints that require UUID)
  // ✅ Resolved lead ID (TEXT) for child table queries
  // ✅ Doktor modunda tek gerçek kaynak: URL leadRef
  const resolvedLeadIdText = finalIsDoctorMode ? leadRef : (lead?.id ?? null);

  // ✅ Doctor-friendly lead fetch function - auto-detect UUID vs TEXT id
  const isUuid = (v: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

  const fetchLeadForDoctor = async (leadRef: string): Promise<Lead> => {
    // ✅ Auto-detect: UUID ise lead_uuid param, TEXT ise id param
    const qs = isUuid(leadRef)
      ? `lead_uuid=${encodeURIComponent(leadRef)}`
      : `id=${encodeURIComponent(leadRef)}`; // ✅ TEXT id desteği

    const fetchUrl = `/api/leads?${qs}&limit=1`;
    
    if (import.meta.env.DEV) {
      console.log("[AdminPatientProfile] DoctorMode fetch:", { leadRef, isUuid: isUuid(leadRef), fetchUrl });
    }

    // ✅ Use apiJsonAuth for automatic token handling and error handling
    const j = await apiJsonAuth<{ ok: true; lead?: Lead | null; leads?: Lead[] }>(fetchUrl);

    // ✅ Backend returns { ok: true, lead, leads }
    const loadedLead = (j as any).lead || ((j as any).leads?.[0] ?? null);
    if (!loadedLead) {
      throw new Error('Lead not found');
    }

    return loadedLead;
  };

  // leadId validation
  useEffect(() => {
    if (!leadId) {
      setError('Lead not found / Invalid lead ID');
      setIsLoadingLead(false);
    }
  }, [leadId]);

  // Fetch lead data via API endpoint
  useEffect(() => {
    // ✅ Auth yoksa hiç deneme
    if (!isAuthenticated) return;

    // ✅ Doctor mode: ref gerekli (from prop OR route - can be UUID or TEXT id)
    const finalRef = finalIsDoctorMode ? (leadRef || (isDoctorPath ? urlLeadId : null)) : null;
    const finalLeadId = finalIsDoctorMode ? null : (leadId || urlLeadId);
    
    if (finalIsDoctorMode) {
      if (!finalRef) return;
    } else {
      // ✅ Admin/Employee mode: leadId gerekli
      if (!finalLeadId) return;
    }

    const fetchLead = async () => {
      setIsLoadingLead(true);
      setError(null);

      try {
        let loadedLead: Lead;

        // ✅ Doctor mode: Use privacy-safe doctor endpoint
        if (finalIsDoctorMode && finalRef) {
          // ✅ Normalize ref: strip CASE- prefix if present
          const raw = String(finalRef || "").trim();
          const normalized = raw.startsWith("CASE-") ? raw.slice(5) : raw;
          const debug = import.meta.env.DEV ? "&debug=1" : "";
          
          // ✅ Use /api/doctor/lead?ref=... for privacy-filtered data (ref can be UUID or TEXT id)
          const result = await apiJsonAuth<{ ok: true; lead: any; documents?: any[] }>(
            `/api/doctor/lead?ref=${encodeURIComponent(normalized)}${debug}`
          );
          if (!result.ok || !result.lead) {
            throw new Error("Lead not found or not assigned to you");
          }
          loadedLead = result.lead as Lead;
        } else {
          // ✅ Admin/Employee mode
          const result = await apiJsonAuth<{ ok: true; lead: Lead }>(
            `/api/admin/lead/${encodeURIComponent(finalLeadId!)}`
          );
          if (!result.ok || !result.lead) throw new Error("Lead not found");
          loadedLead = result.lead as Lead;
        }

        setLead(loadedLead);
        
        // ✅ Lead loaded - resolvedLeadIdText will be set via lead.id
        // ✅ doctor lead page: treat opened lead as selected lead (for AI buttons)
        
        // Initialize Next Action & Follow-up from loaded lead
        setNextAction(loadedLead.next_action || '');
        setFollowUpAt(toDatetimeLocal(loadedLead.follow_up_at));
        
        // Initialize Doctor assignment from loaded lead
        setSelectedDoctorId((loadedLead as any).doctor_id || '');
        
        // Initialize Doctor review from loaded lead
        setDoctorReviewStatus((loadedLead as any).doctor_review_status || '');
        setDoctorReviewNotes((loadedLead as any).doctor_review_notes || '');
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load lead";
        setError(errorMessage);
        toast.error(errorMessage);
        console.error("[AdminPatientProfile] fetchLead error:", err);
      } finally {
        setIsLoadingLead(false);
      }
    };

    fetchLead();
  }, [leadId, leadRef, isAuthenticated, finalIsDoctorMode, urlLeadId, isDoctorPath]);

  // Fetch notes
  useEffect(() => {
    if (!leadId || !isAuthenticated) return;
    
    // ✅ Doctor mode: notes are admin/employee only (disable for doctor)
    if (finalIsDoctorMode) {
      setIsLoadingNotes(false);
      return;
    }

    const loadNotes = async () => {
      setIsLoadingNotes(true);
      setError(null);

      try {
        const supabase = getSupabaseClient();
        if (!supabase) {
          throw new Error('Supabase client not configured');
        }

        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) {
          throw new Error('Session expired');
        }

        // ✅ Use lead.id (TEXT) for child table queries
        // ✅ Doktor modunda: leadRef yeterli, lead objesi gerekmez
        if (!resolvedLeadIdText) {
          if (finalIsDoctorMode) {
            toast.error("Lead reference missing in URL. Go back to Doctor Inbox and open the lead again.");
          } else {
            console.warn('[AdminPatientProfile] Cannot load notes: lead not loaded');
          }
          setNotes([]);
          return;
        }
        
        const result = await apiJsonAuth<{ notes: any[] }>(`/api/lead-notes?lead_id=${encodeURIComponent(resolvedLeadIdText)}`);
        setNotes(result.notes || []);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load notes';
        setError(errorMessage);
        console.error('[AdminPatientProfile] Error loading notes:', err);
      } finally {
        setIsLoadingNotes(false);
      }
    };

    loadNotes();
  }, [leadId, isAuthenticated, finalIsDoctorMode, resolvedLeadIdText, lead?.id]);

  // B4: Fetch AI memory on page load
  useEffect(() => {
    if (!leadId || !isAuthenticated) return;
    
    // ✅ Doctor mode: AI memory is admin/employee only (disable for doctor)
    if (finalIsDoctorMode) {
      setIsLoadingMemory(false);
      return;
    }

    const fetchAIMemory = async () => {
      setIsLoadingMemory(true);
      try {
        // ✅ Use lead.id (TEXT) for admin endpoints (they accept lead_id)
        if (!resolvedLeadIdText) {
          if (finalIsDoctorMode) {
            toast.error("Lead reference missing in URL. Go back to Doctor Inbox and open the lead again.");
          } else {
          console.warn('[AdminPatientProfile] Cannot load AI memory: lead not loaded');
          }
          return;
        }
        
        const result = await apiJsonAuth<{ ok: true; data: any }>(`/api/admin/lead-ai/${encodeURIComponent(resolvedLeadIdText)}`);
        if (result.ok && result.data) {
          // Hydrate briefData from persisted memory
          if (result.data.snapshot || result.data.callBrief || result.data.risk) {
            setBriefData({
              ok: true,
              hasOpenAI: true,
              brief: {
                snapshot: result.data.snapshot,
                callBrief: result.data.callBrief,
                risk: result.data.risk,
              },
            });
          }
          // Set memory vault data (result.data is the full memory row, including synced_at)
          if (result.data) {
            setMemoryData(result.data);
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load AI memory';
        console.error('[AdminPatientProfile] Error loading AI memory:', err);
        // Don't show toast for missing table (graceful degradation)
        if (!errorMessage.includes('Table not found')) {
          toast.error('Failed to load AI memory', { description: errorMessage });
        }
      } finally {
        setIsLoadingMemory(false);
      }
    };

    fetchAIMemory();
  }, [leadId, isAuthenticated, finalIsDoctorMode, resolvedLeadIdText, lead?.id]);

  // B5: Fetch AI tasks on page load
  useEffect(() => {
    if (!leadId || !isAuthenticated) return;
    
    // ✅ Doctor mode: AI tasks is admin/employee only (disable for doctor)
    if (finalIsDoctorMode) {
      setIsLoadingTasks(false);
      return;
    }

    const fetchTasks = async () => {
      setIsLoadingTasks(true);
      try {
        // ✅ Use lead.id (TEXT) for admin endpoints
        if (!resolvedLeadIdText) {
          if (finalIsDoctorMode) {
            toast.error("Lead reference missing in URL. Go back to Doctor Inbox and open the lead again.");
          } else {
          console.warn('[AdminPatientProfile] Cannot load AI tasks: lead not loaded');
          }
          return;
        }
        const result = await apiJsonAuth<{ ok: true; tasks: any[] }>(`/api/admin/lead-tasks/${encodeURIComponent(resolvedLeadIdText)}`).catch((err) => {
          // Don't show error if table doesn't exist (graceful degradation)
          if (err.message?.includes('Table not found')) {
            console.warn('[AdminPatientProfile] AI tasks table not found');
            return { ok: true, tasks: [] };
          }
          throw err;
        });
        if (result.ok && Array.isArray(result.tasks)) {
          setTasks(result.tasks);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load tasks';
        console.error('[AdminPatientProfile] Error loading tasks:', err);
        // Don't show toast for missing table (graceful degradation)
        if (!errorMessage.includes('Table not found')) {
          toast.error('Failed to load tasks', { description: errorMessage });
        }
      } finally {
        setIsLoadingTasks(false);
      }
    };

    fetchTasks();
  }, [leadId, isAuthenticated, finalIsDoctorMode, resolvedLeadIdText, lead?.id]);
  
  // B6: Fetch timeline events on page load
  useEffect(() => {
    if (!leadId || !isAuthenticated) return;
    
    const fetchTimeline = async () => {
      setIsLoadingTimeline(true);
      try {
        // ✅ Use lead.id (TEXT) for timeline endpoint
        if (!resolvedLeadIdText) {
          if (finalIsDoctorMode) {
            toast.error("Lead reference missing in URL. Go back to Doctor Inbox and open the lead again.");
          } else {
          console.warn('[AdminPatientProfile] Skipping timeline: lead not loaded');
          }
          return;
        }
        
        const result = await apiJsonAuth<{ ok: true; data: any[] }>(`/api/admin/lead-timeline/${encodeURIComponent(resolvedLeadIdText)}?leadId=${encodeURIComponent(resolvedLeadIdText)}`);
        if (result.ok && Array.isArray(result.data)) {
          setTimelineEvents(result.data);
        }
      } catch (err) {
        console.warn('[AdminPatientProfile] Error loading timeline:', err);
        // Silent fail - don't break the UI
      } finally {
        setIsLoadingTimeline(false);
      }
    };
    
    fetchTimeline();
  }, [leadId, isAuthenticated, finalIsDoctorMode, resolvedLeadIdText, lead?.id]);

  // Doctors: Fetch on page load (admin/employee only, skip in doctorMode)
  useEffect(() => {
    if (!isAuthenticated) return;
    if (finalIsDoctorMode) return; // ✅ doctor mode admin endpoint çağırmaz

    const fetchDoctors = async () => {
      setIsLoadingDoctors(true);
      try {
        const result = await apiJsonAuth<{ ok: true; doctors: any[] }>(`/api/admin/doctors`).catch((err) => {
          console.warn('[AdminPatientProfile] Failed to fetch doctors:', err);
          return { ok: false, doctors: [] };
        });

        if (result.ok && result.doctors) {
          setDoctors(result.doctors);
        }
      } catch (err) {
        console.error('[AdminPatientProfile] Error fetching doctors:', err);
      } finally {
        setIsLoadingDoctors(false);
      }
    };

    fetchDoctors();
  }, [isAuthenticated, finalIsDoctorMode]);

  // Load doctor preferences when doctor is assigned (admin/employee only, read-only)
  useEffect(() => {
    if (!isAuthenticated) return;
    if (finalIsDoctorMode) return; // Skip in doctor mode
    if (!lead?.doctor_id) {
      setDoctorPreferences(null);
      return;
    }

    const fetchDoctorPrefs = async () => {
      setIsLoadingDoctorPrefs(true);
      try {
        const result = await apiJsonAuth<{ ok: true; preferences: any }>(
          `/api/doctor/preferences?doctor_id=${encodeURIComponent(lead.doctor_id)}`
        ).catch((err) => {
          console.warn('[AdminPatientProfile] Failed to fetch doctor preferences:', err);
          return { ok: false, preferences: null };
        });

        if (result.ok && result.preferences) {
          setDoctorPreferences(result.preferences);
        } else {
          setDoctorPreferences(null);
        }
      } catch (err) {
        console.error('[AdminPatientProfile] Error fetching doctor preferences:', err);
        setDoctorPreferences(null);
      } finally {
        setIsLoadingDoctorPrefs(false);
      }
    };

    fetchDoctorPrefs();
  }, [lead?.doctor_id, isAuthenticated, finalIsDoctorMode]);

  // Contact Events: Fetch on page load (admin/employee only)
  useEffect(() => {
    if (!leadId || !isAuthenticated) return;
    
    // ✅ Doctor mode: contact events are admin/employee only (disable for doctor)
    if (finalIsDoctorMode) {
      setIsLoadingContactEvents(false);
      return;
    }
    
    const fetchContactEvents = async () => {
      setIsLoadingContactEvents(true);
      try {
        // ✅ Use lead.id (TEXT) for contact events endpoint
        if (!resolvedLeadIdText) {
          if (finalIsDoctorMode) {
            toast.error("Lead reference missing in URL. Go back to Doctor Inbox and open the lead again.");
          } else {
          console.warn('[AdminPatientProfile] Skipping contact events: lead not loaded');
          }
          return;
        }
        
        const result = await apiJsonAuth<{ ok: true; events: any[] }>(`/api/leads-contact-events?lead_id=${encodeURIComponent(resolvedLeadIdText)}&limit=10`);
        if (result.ok && Array.isArray(result.events)) {
          setContactEvents(result.events);
        }
      } catch (err) {
        console.warn('[AdminPatientProfile] Error loading contact events:', err);
        // Silent fail - don't break the UI
      } finally {
        setIsLoadingContactEvents(false);
      }
    };
    
    fetchContactEvents();
  }, [leadId, isAuthenticated, finalIsDoctorMode, resolvedLeadIdText, lead?.id]);

  // Helper: Log contact event
  const logContactEvent = async (channel: 'whatsapp' | 'phone' | 'email', note?: string) => {
    if (!leadId) return;
    
    try {
      // ✅ IMPORTANT: Use resolved UUID (MUST be UUID for contact events endpoint)
      // ✅ Use lead.id (TEXT) for contact events endpoint
      if (!resolvedLeadIdText) {
        if (finalIsDoctorMode) {
          toast.error("Lead reference missing in URL. Go back to Doctor Inbox and open the lead again.");
        } else {
        console.warn('[AdminPatientProfile] Cannot log contact event: lead not loaded');
        }
        return;
      }
      
      const result = await apiJsonAuth<{ ok: true; event: any; lead?: any }>(`/api/leads-contact-events`, {
        method: 'POST',
        body: JSON.stringify({
          lead_id: resolvedLeadIdText,
          channel: channel,
          note: note || null,
          update_status: true, // Auto-update status to "contacted" if new
        }),
      });

      if (result.ok && result.event) {
        // Add to local state
        setContactEvents((prev) => [result.event, ...prev].slice(0, 10));
        
        // Update lead state if returned
        if (result.lead) {
          setLead((prev) => prev ? { ...prev, last_contacted_at: result.lead.last_contacted_at, status: result.lead.status || prev.status } : null);
        }
      }
    } catch (err) {
      console.warn('[AdminPatientProfile] Error logging contact event:', err);
    }
  };
  
  // B6: Add timeline event
  const handleAddTimelineEvent = async () => {
    // ✅ Doctor mode: Timeline edit is READ-ONLY
    if (isDoctorPath || finalIsDoctorMode) {
      toast.error("Timeline editing is not available in doctor mode");
      return;
    }
    
    if (!leadId || !isAuthenticated || !newTimelineStage.trim() || isAddingTimelineEvent) return;
    
    // ✅ Check if lead is loaded before proceeding
    // ✅ Doktor modunda: leadRef yeterli, lead objesi gerekmez
    if (!resolvedLeadIdText) {
      toast.error(finalIsDoctorMode 
        ? "Lead reference missing in URL. Go back to Doctor Inbox and open the lead again."
        : "Lead not ready yet. Please wait 1–2 seconds and try again.");
      return;
    }
    if (!finalIsDoctorMode && !lead) {
      toast.error("Lead not ready yet. Please wait 1–2 seconds and try again.");
      return;
    }
    
    setIsAddingTimelineEvent(true);
    const toastId = toast.loading('Adding timeline event...');
    
    try {
      // ✅ Use lead.id (TEXT) for timeline endpoint
      
      const result = await apiJsonAuth<{ ok: true; data: any }>(`/api/admin/lead-timeline/${encodeURIComponent(resolvedLeadIdText)}?leadId=${encodeURIComponent(resolvedLeadIdText)}`, {
        method: 'POST',
        body: JSON.stringify({
          stage: newTimelineStage,
          // Auto-generate note if empty: "Status updated to {label}"
          note: newTimelineNote.trim() || `Status updated to ${TIMELINE_STAGE_LABEL[newTimelineStage] || newTimelineStage}`,
          payload: {},
        }),
      });
      if (!result.ok) {
        const requestId = result.requestId || 'unknown';
        throw new Error(`${result.error || 'Failed to add timeline event'} (id: ${requestId})`);
      }
      
      // PRO LEVEL: Update local lead state from API response (single source of truth)
      // API already updated lead.status, so we sync UI state from response
      if (result.data?.lead) {
        setLead((prev) => prev ? { ...prev, status: result.data.lead.status, updated_at: result.data.lead.updated_at } : null);
      } else if (newTimelineStage && LEAD_STATUS.includes(newTimelineStage as any)) {
        // Fallback: If API didn't return lead, update optimistically
        setLead((prev) => prev ? { ...prev, status: newTimelineStage } : null);
      }
      
      // Show warning if lead status update failed
      if (result.warning === 'LEAD_STATUS_UPDATE_FAILED') {
        console.warn('[Timeline] Lead status update failed (timeline event created successfully)', result.requestId);
      }
      
      // Clear form
      setNewTimelineStage('');
      setNewTimelineNote('');
      
      // ✅ Refetch timeline events
      if (resolvedLeadIdText) {
        try {
          const refetchResult = await apiJsonAuth<{ ok: true; data: any[] }>(`/api/admin/lead-timeline/${encodeURIComponent(resolvedLeadIdText)}?leadId=${encodeURIComponent(resolvedLeadIdText)}`);
          if (refetchResult.ok && Array.isArray(refetchResult.data)) {
            setTimelineEvents(refetchResult.data);
          }
        } catch (err) {
          console.warn('[AdminPatientProfile] Failed to refetch timeline:', err);
        }
      }
      
      toast.success('Timeline event added', { id: toastId });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add timeline event';
      console.error('[Add Timeline Event] Error:', err);
      // Extract requestId from error message if present
      const requestIdMatch = errorMessage.match(/\(id: ([^)]+)\)/);
      const requestId = requestIdMatch ? requestIdMatch[1] : null;
      toast.error(requestId ? `Something went wrong. Check logs. (id: ${requestId})` : 'Something went wrong. Check logs.', { id: toastId });
    } finally {
      setIsAddingTimelineEvent(false);
    }
  };

  // B5: Mark task as done
  const handleMarkTaskDone = async (taskId: string) => {
    if (!leadId || !isAuthenticated) return;
    
    // ✅ Doctor mode: AI tasks is admin/employee only (disable for doctor)
    if (isDoctorPath || finalIsDoctorMode) {
      toast.error('Task management is not available for doctors');
      return;
    }

    try {
      // ✅ Use lead.id (TEXT) for admin endpoints
      // ✅ Doktor modunda: leadRef yeterli, lead objesi gerekmez
      if (!resolvedLeadIdText) {
        toast.error(finalIsDoctorMode 
          ? "Lead reference missing in URL. Go back to Doctor Inbox and open the lead again."
          : "Lead not ready yet. Please wait 1–2 seconds and try again.");
        return;
      }
      if (!finalIsDoctorMode && !lead) {
        toast.error("Lead not ready yet. Please wait 1–2 seconds and try again.");
        return;
      }
      await apiJsonAuth(`/api/admin/lead-tasks/${encodeURIComponent(resolvedLeadIdText)}`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'mark_done',
          taskId: taskId,
        }),
      });

      // Update local state
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: 'done', completed_at: new Date().toISOString() } : t))
      );
      toast.success('Task marked as done');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark task done';
      toast.error('Failed to mark task done', { description: errorMessage });
    }
  };

  // Create new note
  const createNote = async () => {
    if (!leadId || !isAuthenticated || !user || !newNoteContent.trim()) return;

    setIsSavingNote(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase client not configured');
      }

      // ✅ Use lead.id (TEXT) for notes endpoint
      // ✅ Doktor modunda: leadRef yeterli, lead objesi gerekmez
      if (!resolvedLeadIdText) {
        toast.error(finalIsDoctorMode 
          ? "Lead reference missing in URL. Go back to Doctor Inbox and open the lead again."
          : "Lead not ready yet. Please wait 1–2 seconds and try again.");
        return;
      }
      if (!finalIsDoctorMode && !lead) {
        toast.error("Lead not ready yet. Please wait 1–2 seconds and try again.");
        return;
      }
      
      const result = await apiJsonAuth<{ ok: true; note: any }>(`/api/lead-notes`, {
        method: 'POST',
        body: JSON.stringify({
          lead_id: resolvedLeadIdText,
          note: newNoteContent.trim(),
        }),
      });
      setNotes((prev) => [result.note, ...prev]);
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

  // B2: Generate AI Brief
  const handleGenerateBrief = async () => {
    // ✅ Use lead.id (TEXT) instead of leadId prop
    const activeLeadId = lead?.id ?? null;
    if (!activeLeadId) {
      toast.error("Lead ID missing (API /api/leads must return id)");
      return;
    }

    setIsLoadingBrief(true);
    setError(null);

    const toastId = toast.loading('Generating snapshot...');

    try {
      const result = await briefLead(activeLeadId);
      
      if (!result.ok) {
        const requestId = result.requestId || 'unknown';
        throw new Error(`${result.error || 'Failed to generate snapshot'} (id: ${requestId})`);
      }

      setBriefData(result);

      // Smooth scroll to snapshot section
      setTimeout(() => {
        const snapshotEl = document.querySelector('[data-snapshot-section]');
        if (snapshotEl) {
          snapshotEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      console.error('[Generate Snapshot] Error:', err);
      // Extract requestId from error message if present
      const requestIdMatch = errorMessage.match(/\(id: ([^)]+)\)/);
      const requestId = requestIdMatch ? requestIdMatch[1] : null;
      toast.error(requestId ? `Something went wrong. Check logs. (id: ${requestId})` : 'Something went wrong. Check logs.', { id: toastId });
    } finally {
      setIsLoadingBrief(false);
    }
  };

  // B3: Normalize Notes
  const handleNormalizeNotes = async () => {
    // ✅ Use lead.id (TEXT) instead of leadId prop
    const activeLeadId = lead?.id ?? null;
    if (!activeLeadId) {
      toast.error("Lead ID missing (API /api/leads must return id)");
      return;
    }
    if (!isAuthenticated) return;
    
    // ✅ Doctor mode: Normalize is admin/employee only (disable for doctor)
    if (finalIsDoctorMode) {
      toast.error('Note normalization is not available for doctors');
      return;
    }

    setIsLoadingNormalize(true);
    setError(null);

    const toastId = toast.loading('Normalizing notes...');

    try {
      const result = await apiJsonAuth<{ ok: true; normalized: boolean; data: any; requestId?: string }>(`/api/ai/normalize`, {
        method: 'POST',
        body: JSON.stringify({ lead_id: activeLeadId }),
      });

      if (result.normalized && result.data) {
        setNormalizeData(result.data);
        // Update briefData with normalized data if structure matches
        if (result.data.snapshot && result.data.callBrief && result.data.risk) {
          setBriefData({
            ok: true,
            hasOpenAI: true,
            brief: {
              snapshot: result.data.snapshot,
              callBrief: result.data.callBrief,
              risk: result.data.risk,
            },
          });
        }
        toast.success('Notes normalized', { id: toastId });
      } else {
        throw new Error('Invalid normalization response');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to normalize notes';
      setError(errorMessage);
      console.error('[Normalize] Error:', err);
      // Extract requestId from error message if present
      const requestIdMatch = errorMessage.match(/\(id: ([^)]+)\)/);
      const requestId = requestIdMatch ? requestIdMatch[1] : null;
      toast.error(requestId ? `Something went wrong. Check logs. (id: ${requestId})` : 'Something went wrong. Check logs.', { id: toastId });
    } finally {
      setIsLoadingNormalize(false);
    }
  };

  // B4: Sync Memory Vault
  const handleSyncMemory = async () => {
    if (!leadId || !isAuthenticated || !briefData) return;
    
    // ✅ Doctor mode: AI memory sync is admin/employee only (disable for doctor)
    if (finalIsDoctorMode) {
      toast.error('Memory sync is not available for doctors');
      return;
    }

    setIsSyncingMemory(true);
    const toastId = toast.loading('Syncing memory vault...');

    try {
      // ✅ Use lead.id (TEXT) for admin endpoints
      if (!resolvedLeadIdText) {
        toast.error(finalIsDoctorMode 
          ? "Lead reference missing in URL. Go back to Doctor Inbox and open the lead again."
          : "Cannot sync AI memory: lead not loaded");
        return;
      }
      const result = await apiJsonAuth<{ ok: true; data?: { memory?: any }; requestId?: string; error?: string }>(
        `/api/admin/lead-ai/${encodeURIComponent(resolvedLeadIdText)}`,
        {
          method: 'POST',
          body: JSON.stringify({
            snapshot: briefData.brief?.snapshot || null,
            callBrief: briefData.brief?.callBrief || null,
            risk: briefData.brief?.risk || null,
            memory: normalizeData?.memory || memoryData || null,
          }),
        }
      );
      
      if (!result.ok) {
        const requestId = result.requestId || 'unknown';
        throw new Error(`${result.error || 'Sync failed'} (id: ${requestId})`);
      }

      if (result.data?.memory) {
        setMemoryData(result.data.memory);
      }

      toast.success('Memory synced', { id: toastId });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync memory';
      setError(errorMessage);
      console.error('[Sync Memory] Error:', err);
      // Extract requestId from error message if present
      const requestIdMatch = errorMessage.match(/\(id: ([^)]+)\)/);
      const requestId = requestIdMatch ? requestIdMatch[1] : null;
      toast.error(requestId ? `Something went wrong. Check logs. (id: ${requestId})` : 'Something went wrong. Check logs.', { id: toastId });
    } finally {
      setIsSyncingMemory(false);
    }
  };

  // Loading state
  if (isLoadingLead) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading patient...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !lead) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Lead not found</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            className="px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors"
            onClick={() => {
              window.location.href = '/admin/leads';
            }}
          >
            Back to Leads
          </button>
        </div>
      </div>
    );
  }

  if (!lead) return null;

  const leadName = lead.name || lead.full_name || 'Unknown Lead';
  const leadCountry = lead.country || 'Unknown';
  const leadStatus = lead.status || 'new';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              {/* ✅ "Back to Leads" butonu doktor modunda gizli (doktor /doctor/portal kullanır) */}
              {!finalIsDoctorMode && (
              <button
                type="button"
                onClick={() => {
                  window.location.href = '/admin/leads';
                }}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Back to Leads</span>
              </button>
              )}
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-semibold text-gray-900 break-words">{leadName}</h1>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-sm text-gray-600 break-words">{leadCountry}</span>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                    leadStatus === 'new' ? 'bg-blue-100 text-blue-800' :
                    leadStatus === 'contacted' ? 'bg-green-100 text-green-800' :
                    leadStatus === 'appointment_set' ? 'bg-purple-100 text-purple-800' :
                    leadStatus === 'deposit_paid' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {leadStatus}
                  </span>
                  <span className="text-xs text-gray-500">
                    Created: {new Date(lead.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Original Message Card */}
        {(() => {
          const originalMessage = 
            lead.message?.trim() ||
            lead.notes?.trim() ||
            (lead.meta && (lead.meta.message || lead.meta.formMessage)) ||
            "";
          
          if (!originalMessage) return null;
          
          return (
            <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-gray-900 mb-2">Original Message (Patient)</div>
              <div className="mt-2 whitespace-pre-wrap text-sm text-gray-700 break-words">
                {originalMessage}
              </div>
            </div>
          );
        })()}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI Snapshot Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              {/* Header with buttons - OUTSIDE gradient container */}
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-teal-600" />
                  AI Snapshot
                </h2>
                {/* ✅ Doctor mode: AI buttons hidden (privacy-first) */}
                {!finalIsDoctorMode && (
                  <div className="flex items-center gap-2 relative z-20">
                    {(() => {
                      const btnBase =
                        "inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold border shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed";

                      // ✅ Use lead.id (TEXT) for button state, fallback to lead_uuid if id missing
                      const activeLeadId = lead?.id ?? null;
                      const activeLeadUuid = lead?.lead_uuid ?? null;
                      // Button enable: id varsa kesin, id yoksa en azından uuid var mı gör
                      const canUseAi = Boolean(activeLeadId || activeLeadUuid);
                      const normalizeDisabled = isLoadingNormalize || isLoadingBrief || !canUseAi;
                      const snapshotDisabled = isLoadingBrief || isLoadingNormalize || !canUseAi;

                      return (
                        <>
                          <button
                            type="button"
                            onClick={handleNormalizeNotes}
                            disabled={normalizeDisabled}
                            className={[
                              btnBase,
                              "focus:ring-slate-400",
                              normalizeDisabled
                                ? "bg-slate-200 text-slate-400 border-slate-200"
                                : "bg-slate-900 text-white border-slate-900 hover:bg-slate-800",
                            ].join(" ")}
                          >
                            {isLoadingNormalize ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span className="text-gray-700">Normalizing...</span>
                              </>
                            ) : (
                              <>
                                <FileText className="w-4 h-4" />
                                <span className="text-gray-700">{canUseAi ? "Normalize Notes" : "Select a lead first"}</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={handleGenerateBrief}
                            disabled={snapshotDisabled}
                            className={[
                              btnBase,
                              "focus:ring-emerald-400",
                              snapshotDisabled
                                ? "bg-emerald-100 text-emerald-500 border-emerald-200"
                                : "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700",
                            ].join(" ")}
                          >
                            {isLoadingBrief ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span className="text-gray-700">Generating snapshot...</span>
                              </>
                            ) : (
                              <>
                                <Brain className="w-4 h-4" />
                                <span className="text-gray-700">{canUseAi ? "Generate Snapshot" : "Select a lead first"}</span>
                              </>
                            )}
                          </button>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Content - gradient container (buttons are OUTSIDE) */}
              {/* ✅ Doctor mode: Show read-only snapshot + Doctor AI Brief button */}
              {finalIsDoctorMode ? (
                <div className="space-y-4">
                  {/* Patient Snapshot (Read-Only) */}
                  {(lead as any)?.snapshot && (
                    <div className="border border-gray-200 rounded-lg bg-white p-6">
                      <div className="mb-4 pb-4 border-b border-gray-100">
                        <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-teal-600" />
                          <span>Patient Snapshot (Read-Only)</span>
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">Employee/admin summary for review</p>
                      </div>
                      <div className="prose prose-sm max-w-none">
                        <div className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                          {String((lead as any).snapshot || '')}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Doctor AI Brief Section */}
                  <div className="border border-gray-200 rounded-lg bg-white p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                        <Brain className="w-4 h-4 text-teal-600" />
                        <span>Doctor AI Brief</span>
                      </h4>
                      <button
                        type="button"
                        onClick={async () => {
                          // ✅ Doctor mode: use leadRef from URL, don't wait for lead object
                          if (!leadRef) {
                            toast.error("LeadRef missing in URL.");
                            return;
                          }

                          setIsLoadingDoctorBrief(true);
                          try {
                            const result = await apiJsonAuth<{ ok: true; brief: string; requestId?: string }>(
                              `/api/doctor/ai/brief`,
                              {
                                method: 'POST',
                                body: JSON.stringify({ ref: leadRef }),
                              }
                            );

                            if (result.ok && result.brief) {
                              setDoctorBrief(result.brief);
                              toast.success("Doctor brief generated");
                            } else {
                              throw new Error("Failed to generate brief");
                            }
                          } catch (err) {
                            const errorMessage = err instanceof Error ? err.message : 'Failed to generate doctor brief';
                            toast.error(errorMessage);
                            console.error("[Doctor AI Brief] Error:", err);
                          } finally {
                            setIsLoadingDoctorBrief(false);
                          }
                        }}
                        disabled={(function() {
                          const briefDisabled = isLoadingDoctorBrief || !leadRef;
                          console.log("[DEBUG] briefDisabled", { isLoadingDoctorBrief, leadRef, briefDisabled });
                          return briefDisabled;
                        })()}
                        title={(function() {
                          const briefDisabled = isLoadingDoctorBrief || !leadRef;
                          return briefDisabled ? `disabled: loading=${isLoadingDoctorBrief} leadRef=${leadRef}` : "ready";
                        })()}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        {isLoadingDoctorBrief ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Generating...</span>
                          </>
                        ) : (
                          <>
                            <Brain className="w-4 h-4" />
                            <span>Generate Doctor AI Brief</span>
                          </>
                        )}
                      </button>
                      {/* Debug HUD */}
                      <div className="mt-2 text-xs text-gray-400">
                        leadRef: <span className="font-mono">{leadRef ?? "NULL"}</span>
                      </div>
                    </div>
                    
                    {doctorBrief ? (
                      <div className="prose prose-sm max-w-none">
                        <div className="text-sm text-gray-700 whitespace-pre-wrap break-words border-t border-gray-100 pt-4">
                          {doctorBrief}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">Click "Generate Doctor AI Brief" to create a PII-safe clinical review brief.</p>
                    )}
                  </div>
                </div>
              ) : !finalIsDoctorMode && briefData ? (
                <div 
                  data-snapshot-section
                  className="border border-gray-200 rounded-lg bg-gradient-to-br from-white to-teal-50/20 transition-all max-w-full overflow-hidden relative z-0"
                >
                  {/* Header */}
                  <div className="px-4 pt-4 pb-3 border-b border-gray-100 max-w-full">
                    <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                      <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2 break-words min-w-0">
                        <Brain className="w-4 h-4 text-teal-600 shrink-0" />
                        <span className="break-words">AI Snapshot</span>
                      </h4>
                      {!briefData.hasOpenAI && (
                        <span 
                          className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded shrink-0 whitespace-nowrap"
                          title="This is a preview. Real AI activates when OPENAI_API_KEY is enabled."
                        >
                          Preview Mode
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 break-words">Instant lead insight and call preparation.</p>
                  </div>

                  <div className="p-4 space-y-4 max-w-full">
                    {/* Overview */}
                    {briefData.brief.snapshot && (
                      <div className="space-y-3 max-w-full">
                        <div className="border-b border-gray-100 pb-3 max-w-full">
                          <p className="text-sm font-medium text-gray-900 mb-1.5 break-words whitespace-normal">
                            {briefData.brief.snapshot.oneLiner}
                          </p>
                          <p className="text-xs text-gray-600 break-words whitespace-normal">
                            {briefData.brief.snapshot.goal}
                          </p>
                        </div>

                        {/* Key Facts */}
                        {briefData.brief.snapshot.keyFacts && briefData.brief.snapshot.keyFacts.length > 0 && (
                          <div className="border-b border-gray-100 pb-3 max-w-full">
                            <h5 className="text-xs font-semibold text-gray-700 mb-2">Key Facts</h5>
                            <ul className="text-xs text-gray-600 space-y-1.5 max-w-full">
                              {briefData.brief.snapshot.keyFacts.map((fact, idx) => (
                                <li key={idx} className="flex items-start gap-2 max-w-full">
                                  <span className="text-teal-600 mt-0.5 shrink-0">•</span>
                                  <span className="break-words whitespace-normal min-w-0 flex-1">{fact}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Recommended Next Step */}
                        {briefData.brief.snapshot.nextBestAction && (
                          <div className="p-3 bg-teal-50 rounded-lg border border-teal-100 max-w-full">
                            <p className="text-xs font-semibold text-teal-900 mb-1.5 break-words">Recommended Next Step</p>
                            <p className="text-xs text-teal-800 leading-relaxed break-words whitespace-normal">{briefData.brief.snapshot.nextBestAction}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Call Preparation */}
                    {briefData.brief.callBrief && (
                      <div className="border-t border-gray-200 pt-4 space-y-3 max-w-full">
                        <h5 className="text-xs font-semibold text-gray-700 mb-2 break-words">Call Preparation</h5>
                        
                        {briefData.brief.callBrief.openingLine && (
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 max-w-full">
                            <p className="text-xs font-semibold text-blue-900 mb-1.5 break-words">Suggested Opening</p>
                            <p className="text-xs text-blue-800 leading-relaxed break-words whitespace-normal">{briefData.brief.callBrief.openingLine}</p>
                          </div>
                        )}

                        <div className="grid grid-cols-1 gap-3 max-w-full">
                          {briefData.brief.callBrief.mustAsk && briefData.brief.callBrief.mustAsk.length > 0 && (
                            <div className="max-w-full">
                              <p className="text-xs font-semibold text-gray-700 mb-1.5 break-words">Key Questions</p>
                              <ul className="text-xs text-gray-600 space-y-1.5 max-w-full">
                                {briefData.brief.callBrief.mustAsk.map((q, idx) => (
                                  <li key={idx} className="flex items-start gap-2 max-w-full">
                                    <span className="text-blue-600 mt-0.5 shrink-0">✓</span>
                                    <span className="break-words whitespace-normal min-w-0 flex-1">{q}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {briefData.brief.callBrief.avoid && briefData.brief.callBrief.avoid.length > 0 && (
                            <div className="max-w-full">
                              <p className="text-xs font-semibold text-gray-700 mb-1.5 break-words">Avoid Mentioning</p>
                              <ul className="text-xs text-gray-600 space-y-1.5 max-w-full">
                                {briefData.brief.callBrief.avoid.map((a, idx) => (
                                  <li key={idx} className="flex items-start gap-2 max-w-full">
                                    <span className="text-red-600 mt-0.5 shrink-0">✗</span>
                                    <span className="break-words whitespace-normal min-w-0 flex-1">{a}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {briefData.brief.callBrief.tone && (
                          <div className="text-xs text-gray-600 pt-2 border-t border-gray-100 break-words whitespace-normal max-w-full">
                            <span className="font-medium">Tone:</span> {briefData.brief.callBrief.tone}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Lead Risk & Priority */}
                    {briefData.brief.risk && (
                      <div className="border-t border-gray-200 pt-4 max-w-full">
                        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                          <h5 className="text-xs font-semibold text-gray-700 break-words min-w-0">Lead Risk & Priority</h5>
                          <span className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 whitespace-nowrap ${
                            briefData.brief.risk.priority === 'hot' ? 'bg-red-100 text-red-800' :
                            briefData.brief.risk.priority === 'warm' ? 'bg-orange-100 text-orange-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {briefData.brief.risk.priority === 'hot' ? '🔴 Hot' :
                             briefData.brief.risk.priority === 'warm' ? '🟠 Warm' :
                             '🟢 Cool'}
                          </span>
                        </div>
                        {briefData.brief.risk.reasons && briefData.brief.risk.reasons.length > 0 && (
                          <ul className="text-xs text-gray-600 space-y-1.5 mb-2 max-w-full">
                            {briefData.brief.risk.reasons.map((reason, idx) => (
                              <li key={idx} className="flex items-start gap-2 max-w-full">
                                <span className="text-gray-400 mt-0.5 shrink-0">•</span>
                                <span className="break-words whitespace-normal min-w-0 flex-1">{reason}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {briefData.brief.risk.confidence !== null && (
                          <p className="text-xs text-gray-500 break-words">
                            Confidence: {briefData.brief.risk.confidence}%
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg p-6 bg-gradient-to-br from-gray-50 to-white text-center max-w-full">
                  <Brain className="w-8 h-8 text-gray-400 mx-auto mb-3 shrink-0" />
                  <h4 className="text-sm font-semibold text-gray-800 mb-1.5 break-words">No snapshot yet</h4>
                  <p className="text-xs text-gray-600 mb-3 break-words whitespace-normal">
                    Generate a quick AI-powered preview to prepare your conversation.
                  </p>
                  <p className="text-xs text-gray-500 italic break-words">
                    Click 'Generate Snapshot' above
                  </p>
                </div>
              )}
            </div>

            {/* Notes Section - Doctor mode uses DoctorNotePanel, legacy for admin/employee */}
            {/* ✅ Doctor Mode: Debug marker + DoctorNotePanel */}
            {finalIsDoctorMode && (
              <div className="mb-4 p-2 rounded bg-yellow-50 text-yellow-900 text-xs">
                DoctorMode ✅ leadRef: <b>{leadRef || "MISSING"}</b> | build: <b>{typeof __BUILD_SHA__ !== "undefined" ? __BUILD_SHA__.slice(0, 7) : "dev"}</b>
              </div>
            )}

            {/* TEMP: isolate render loop */}
            {finalIsDoctorMode && leadRef && (
              // <DoctorNotePanel lead={lead} leadRef={leadRef} />
              <div className="p-3 rounded bg-yellow-50 text-yellow-900 text-sm">
                DoctorNotePanel temporarily disabled for loop isolation ✅
              </div>
            )}

            {finalIsDoctorMode && !leadRef && (
              <div className="p-3 rounded bg-red-50 text-red-700 text-sm">
                LeadRef missing in URL. Please open this lead from Doctor Inbox again.
              </div>
            )}

            {/* Legacy Notes UI - Hidden in doctor mode */}
            {!finalIsDoctorMode && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-gray-600" />
                Notes
              </h2>

              {/* Add Note */}
              <div className="mb-6">
                <textarea
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Add a note..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none break-words"
                  disabled={isSavingNote}
                />
                <button
                  type="button"
                  onClick={createNote}
                  disabled={isSavingNote || !newNoteContent.trim()}
                  className="mt-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingNote ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
                      Saving...
                    </>
                  ) : (
                    'Add Note'
                  )}
                </button>
              </div>

              {/* Notes List */}
              {isLoadingNotes ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Loading notes...</p>
                </div>
              ) : notes.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No notes yet. Add your first note above.
                </div>
              ) : (
                <div className="space-y-3 max-w-full">
                  {notes.map((note) => (
                    <div key={note.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50 max-w-full">
                      <p className="text-sm text-gray-900 break-words whitespace-normal mb-2">
                        {note.note || note.content || ''}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(note.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Premium Patient Profile Card */}
            {lead && (
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                {/* A) Top Row: Avatar + Name + Country/Language + Status + Quick Actions */}
                <div className="flex items-start justify-between gap-3 mb-4 pb-4 border-b border-gray-100">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-semibold text-lg shrink-0">
                      {lead.name || lead.full_name ? (lead.name || lead.full_name)!.charAt(0).toUpperCase() : <User className="w-6 h-6" />}
                    </div>
                    
                    {/* Name + Country/Language + Status */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{lead.name || lead.full_name || 'Unknown'}</h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {lead.country && (
                          <span className="text-xs text-gray-600">{lead.country}</span>
                        )}
                        {lead.lang && (
                          <span className="text-xs text-gray-500">• {lead.lang.toUpperCase()}</span>
                        )}
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          (lead.status?.toLowerCase() || 'new') === 'new' ? 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-100' :
                          lead.status?.toLowerCase() === 'contacted' ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-100' :
                          lead.status?.toLowerCase() === 'deposit_paid' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100' :
                          lead.status?.toLowerCase() === 'appointment_set' ? 'bg-purple-50 text-purple-700 ring-1 ring-purple-100' :
                          lead.status?.toLowerCase() === 'arrived' ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100' :
                          lead.status?.toLowerCase() === 'completed' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100' :
                          lead.status?.toLowerCase() === 'lost' ? 'bg-gray-50 text-gray-700 ring-1 ring-gray-100' :
                          'bg-gray-50 text-gray-700 ring-1 ring-gray-100'
                        }`}>
                          {TIMELINE_STAGE_LABEL[lead.status?.toLowerCase() || 'new'] || 'New Lead'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {lead.phone && (() => {
                      const waPhone = normalizePhoneToWhatsApp(lead.phone);
                      const waUrl = waPhone ? getWhatsAppUrl({ phoneE164: `+${waPhone}`, text: waMessageEN(lead) }) : null;
                      return (
                        <>
                          {waUrl && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                await logContactEvent('whatsapp', 'WhatsApp message sent');
                                window.open(waUrl, '_blank', 'noopener,noreferrer');
                              }}
                              className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors"
                              title="WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              await logContactEvent('phone', 'Phone call initiated');
                              window.location.href = `tel:${lead.phone}`;
                            }}
                            className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                            title="Call"
                          >
                            <Phone className="w-4 h-4" />
                          </button>
                        </>
                      );
                    })()}
                    {lead.email && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          await logContactEvent('email', 'Email opened');
                          window.location.href = `mailto:${lead.email}`;
                        }}
                        className="p-2 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
                        title="Email"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.info('Files feature coming soon');
                      }}
                      className="p-2 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
                      title="Open Files"
                    >
                      <FolderOpen className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* B) Documents / Files Mini Grid */}
                <div className="mb-4 pb-4 border-b border-gray-100">
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">Documents</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { icon: Image, label: 'Photos', count: 0, color: 'blue' },
                      { icon: FileCheck, label: 'X-rays', count: 0, color: 'purple' },
                      { icon: File, label: 'Passport/ID', count: 0, color: 'green' },
                      { icon: FileTextIcon, label: 'Treatment Plan', count: 0, color: 'teal' },
                    ].map((doc, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          toast.info(`${doc.label} feature coming soon`);
                        }}
                        className="group flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all bg-white hover:bg-gray-50"
                      >
                        <doc.icon className={`w-5 h-5 ${
                          doc.color === 'blue' ? 'text-blue-600' :
                          doc.color === 'purple' ? 'text-purple-600' :
                          doc.color === 'green' ? 'text-green-600' :
                          'text-teal-600'
                        } group-hover:scale-110 transition-transform`} />
                        <span className="text-xs font-medium text-gray-700">{doc.label}</span>
                        {doc.count > 0 && (
                          <span className="text-xs text-gray-500">({doc.count})</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* C) Patient Journey Mini Progress */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 mb-3">Patient Journey</h4>
                  <div className="space-y-2">
                    {[
                      { stage: 'new', label: 'New' },
                      { stage: 'contacted', label: 'Contacted' },
                      { stage: 'deposit_paid', label: 'Deposit' },
                      { stage: 'appointment_set', label: 'Appointment' },
                      { stage: 'completed', label: 'Completed' },
                    ].map((step) => {
                      const currentStatus = lead.status?.toLowerCase() || 'new';
                      const stepIndex = TIMELINE_STAGES.indexOf(step.stage as any);
                      const currentIndex = TIMELINE_STAGES.indexOf(currentStatus as any);
                      const isActive = stepIndex <= currentIndex;
                      const isCurrent = stepIndex === currentIndex;
                      
                      return (
                        <div key={step.stage} className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${
                            isActive ? 'bg-teal-600' : 'bg-gray-300'
                          } ${isCurrent ? 'ring-2 ring-teal-200 ring-offset-1' : ''}`} />
                          <span className={`text-xs flex-1 ${
                            isActive ? 'text-gray-900 font-medium' : 'text-gray-400'
                          }`}>
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* D) Booking Section (Admin/Employee only) */}
                {!finalIsDoctorMode && (() => {
                  // Show booking section if:
                  // 1. next_action === 'ready_for_booking' (doctor review sonrası, booking öncesi)
                  // 2. status === 'appointment_set' (booking olduktan sonra)
                  // 3. cal_booking_id or meeting_start exists (booking details var)
                  const shouldShowBooking = 
                    lead.next_action === 'ready_for_booking' ||
                    lead.status?.toLowerCase() === 'appointment_set' ||
                    !!(lead.cal_booking_id || lead.cal_booking_uid || lead.meeting_start);
                  
                  if (!shouldShowBooking) return null;

                  const hasBooking = !!(lead.cal_booking_id || lead.cal_booking_uid || lead.meeting_start);

                  return (
                    <div className="mb-4 pb-4 border-b border-gray-100">
                      <h4 className="text-xs font-semibold text-gray-700 mb-3">Booking</h4>
                      <div className="space-y-3">
                        {!hasBooking ? (
                          <>
                            {/* Pre-booking: Ready for booking toggle + Book button */}
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={readyForBooking}
                                onChange={async (e) => {
                                  const newValue = e.target.checked;
                                  setReadyForBooking(newValue);
                                  setIsUpdatingBookingFlag(true);
                                  
                                  try {
                                    const result = await apiJsonAuth<{ ok: true; lead: Lead }>(`/api/leads`, {
                                      method: 'PATCH',
                                      body: JSON.stringify({
                                        id: leadId,
                                        next_action: newValue ? 'ready_for_booking' : null,
                                      }),
                                    });
                                    
                                    if (result.lead) {
                                      setLead((prev) => prev ? { ...prev, next_action: result.lead.next_action } : null);
                                    }
                                    
                                    if (newValue) {
                                      toast.success('Ready for booking');
                                    }
                                  } catch (err) {
                                    const errorMessage = err instanceof Error ? err.message : 'Failed to update booking flag';
                                    toast.error(errorMessage);
                                    setReadyForBooking(!newValue); // Revert on error
                                  } finally {
                                    setIsUpdatingBookingFlag(false);
                                  }
                                }}
                                disabled={isUpdatingBookingFlag || !leadId}
                                className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                              />
                              <span className="text-xs text-gray-700">Ready for booking</span>
                            </label>
                            
                            {readyForBooking && (
                              <button
                                onClick={() => setIsCalModalOpen(true)}
                                disabled={!readyForBooking || !leadId}
                                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                              >
                                <Calendar className="w-4 h-4" />
                                Book Consultation
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            {/* Post-booking: Show booking details */}
                            <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-emerald-900">Booked ✅</p>
                                {lead.meeting_start && (
                                  <p className="text-xs text-emerald-700 mt-1">
                                    {new Date(lead.meeting_start).toLocaleString()}
                                  </p>
                                )}
                                {lead.meeting_end && lead.meeting_start && (
                                  <p className="text-xs text-emerald-600 mt-0.5">
                                    Duration: {Math.round((new Date(lead.meeting_end).getTime() - new Date(lead.meeting_start).getTime()) / (1000 * 60))} minutes
                                  </p>
                                )}
                                {lead.cal_booking_id && (
                                  <p className="text-xs text-emerald-600 mt-0.5">
                                    Booking ID: {lead.cal_booking_id}
                                  </p>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* E) Next Action & Follow-up (Admin/Employee only) */}
                {!finalIsDoctorMode && (
                  <div className="mb-4 pb-4 border-b border-gray-100">
                    <h4 className="text-xs font-semibold text-gray-700 mb-3">Next Action</h4>
                  <div className="space-y-3">
                    <select
                      value={nextAction}
                      onChange={(e) => setNextAction(e.target.value)}
                      onBlur={async () => {
                        if (nextAction !== (lead?.next_action || '') && leadId) {
                          setIsUpdatingAction(true);
                          try {
                            const result = await apiJsonAuth<{ ok: true; lead: Lead }>(`/api/leads`, {
                              method: 'PATCH',
                              body: JSON.stringify({
                                id: leadId,
                                next_action: nextAction || null,
                              }),
                            });

                            if (result.lead) {
                              setLead((prev) => prev ? { ...prev, next_action: result.lead.next_action } : null);
                            }
                            toast.success('Next action updated');
                          } catch (err) {
                            const errorMessage = err instanceof Error ? err.message : 'Failed to update next action';
                            toast.error(errorMessage);
                            setNextAction(lead?.next_action || '');
                          } finally {
                            setIsUpdatingAction(false);
                          }
                        }
                      }}
                      disabled={isUpdatingAction || !leadId}
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Select next action...</option>
                      <option value="send_whatsapp">Send WhatsApp</option>
                      <option value="request_photos">Request photos</option>
                      <option value="doctor_review">Doctor review</option>
                      <option value="offer_sent">Offer sent</option>
                      <option value="book_call">Book call</option>
                    </select>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Follow-up Date</label>
                      <input
                        type="datetime-local"
                        value={followUpAt}
                        onChange={(e) => setFollowUpAt(e.target.value)}
                        onBlur={async () => {
                          if (leadId) {
                            setIsUpdatingAction(true);
                            try {
                              // ✅ Convert datetime-local to ISO string
                              const followUpValue = followUpAt ? new Date(followUpAt).toISOString() : null;
                              
                              const result = await apiJsonAuth<{ ok: true; lead: Lead }>(`/api/leads`, {
                                method: 'PATCH',
                                body: JSON.stringify({
                                  id: leadId,
                                  follow_up_at: followUpValue,
                                }),
                              });


                              if (result.lead) {
                                setLead((prev) => prev ? { ...prev, follow_up_at: result.lead.follow_up_at } : null);
                                setFollowUpAt(toDatetimeLocal(result.lead.follow_up_at));
                              }
                              toast.success('Follow-up date updated');
                            } catch (err) {
                              const errorMessage = err instanceof Error ? err.message : 'Failed to update follow-up';
                              toast.error(errorMessage);
                            } finally {
                              setIsUpdatingAction(false);
                            }
                          }
                        }}
                        disabled={isUpdatingAction || !leadId}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
                )}

                {/* F) Assign Doctor (Admin/Employee only) */}
                {!finalIsDoctorMode && (
                  <div className="mb-4 pb-4 border-b border-gray-100">
                    <h4 className="text-xs font-semibold text-gray-700 mb-3">Assign Doctor</h4>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    onBlur={async () => {
                      if (selectedDoctorId !== (lead?.doctor_id || '') && leadId) {
                        setIsUpdatingDoctor(true);
                        try {
                          const result = await apiJsonAuth<{ ok: true; lead: Lead }>(`/api/leads`, {
                            method: 'PATCH',
                            body: JSON.stringify({
                              id: leadId,
                              doctor_id: selectedDoctorId || null,
                            }),
                          });

                          if (result.lead) {
                            setLead((prev) => prev ? { ...prev, doctor_id: result.lead.doctor_id } : null);
                          }
                          toast.success('Doctor assigned');
                          
                          // Refetch timeline to show new event
                          if (resolvedLeadIdText) {
                            try {
                              const timelineResult = await apiJsonAuth<{ ok: true; data: any[] }>(`/api/admin/lead-timeline/${encodeURIComponent(resolvedLeadIdText)}?leadId=${encodeURIComponent(resolvedLeadIdText)}`);
                              if (timelineResult.ok && Array.isArray(timelineResult.data)) {
                                setTimelineEvents(timelineResult.data);
                              }
                            } catch (err) {
                              console.warn('[AdminPatientProfile] Failed to refetch timeline:', err);
                            }
                          }
                        } catch (err) {
                          const errorMessage = err instanceof Error ? err.message : 'Failed to assign doctor';
                          toast.error(errorMessage);
                          setSelectedDoctorId(lead?.doctor_id || '');
                        } finally {
                          setIsUpdatingDoctor(false);
                        }
                      }
                    }}
                    disabled={isUpdatingDoctor || isLoadingDoctors || !leadId}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Select doctor...</option>
                    {doctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        {doctor.full_name || `Doctor ${doctor.id.slice(0, 8)}`}
                      </option>
                    ))}
                  </select>
                  {isLoadingDoctors && (
                    <p className="mt-1 text-xs text-gray-500">Loading doctors...</p>
                  )}
                </div>
                )}

                {/* F2) Doctor Preferences (Admin/Employee only, read-only) */}
                {!finalIsDoctorMode && lead?.doctor_id && (
                  <div className="mb-4 pb-4 border-b border-gray-100">
                    <h4 className="text-xs font-semibold text-gray-700 mb-3">Doctor Preferences</h4>
                    {isLoadingDoctorPrefs ? (
                      <p className="text-xs text-gray-500">Loading preferences...</p>
                    ) : doctorPreferences ? (
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Language:</span>
                          <span className="font-medium text-gray-900">
                            {doctorPreferences.locale === 'en' ? 'English' : 'Türkçe'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Brief Style:</span>
                          <span className="font-medium text-gray-900 capitalize">
                            {doctorPreferences.brief_style || 'bullets'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tone:</span>
                          <span className="font-medium text-gray-900">
                            {doctorPreferences.tone === 'warm_expert' ? 'Warm & Expert' : 'Formal & Clinical'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Risk Tolerance:</span>
                          <span className="font-medium text-gray-900 capitalize">
                            {doctorPreferences.risk_tolerance || 'balanced'}
                          </span>
                        </div>
                        {doctorPreferences.specialties && doctorPreferences.specialties.length > 0 && (
                          <div>
                            <span className="text-gray-600">Specialties:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {doctorPreferences.specialties.map((spec: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="inline-block px-2 py-0.5 bg-teal-50 text-teal-800 rounded text-xs"
                                >
                                  {spec}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {doctorPreferences.clinic_protocol_notes && (
                          <div>
                            <span className="text-gray-600">Protocol Notes:</span>
                            <p className="mt-1 text-gray-700 italic text-xs">
                              {doctorPreferences.clinic_protocol_notes}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">No preferences configured</p>
                  )}
                </div>
                )}

                {/* G) Doctor Review (Doctor mode only) */}
                {finalIsDoctorMode && (
                  <div className="mb-4 pb-4 border-b border-gray-100">
                    <h4 className="text-xs font-semibold text-gray-700 mb-3">Review</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Review Status</label>
                        <select
                          value={doctorReviewStatus}
                          onChange={(e) => setDoctorReviewStatus(e.target.value)}
                          disabled={isUpdatingReview || !leadId || finalIsDoctorMode || isDoctorPath}
                          className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                          onBlur={async () => {
                            // ✅ Doctor mode: status updates only via Submit Review (disabled)
                            if (finalIsDoctorMode || isDoctorPath) {
                              // Revert to original if changed (doctor must use Submit button)
                              setDoctorReviewStatus((lead as any)?.doctor_review_status || '');
                              return;
                            }
                            
                            if (doctorReviewStatus !== ((lead as any)?.doctor_review_status || '') && leadId) {
                              setIsUpdatingReview(true);
                              try {
                                const result = await apiJsonAuth<{ ok: true; lead: Lead }>(`/api/leads`, {
                                  method: 'PATCH',
                                  body: JSON.stringify({
                                    id: leadId,
                                    doctor_review_status: doctorReviewStatus || null,
                                  }),
                                });

                                toast.success('Review status updated');
                                
                                // ✅ Admin/Employee mode: refetch from admin endpoint
                                try {
                                  const leadResult = await apiJsonAuth<{ ok: true; lead: Lead }>(`/api/admin/lead/${encodeURIComponent(leadId)}`);
                                  if (leadResult.ok && leadResult.lead) {
                                    setLead(leadResult.lead as Lead);
                                    setDoctorReviewStatus((leadResult.lead as any).doctor_review_status || '');
                                    setDoctorReviewNotes((leadResult.lead as any).doctor_review_notes || '');
                                  }
                                } catch (refetchErr) {
                                  console.warn('[Review] Failed to refetch lead after update:', refetchErr);
                                }
                                
                                // Refetch timeline to show new event
                                if (resolvedLeadIdText) {
                                  try {
                                    const timelineResult = await apiJsonAuth<{ ok: true; data: any[] }>(`/api/admin/lead-timeline/${encodeURIComponent(resolvedLeadIdText)}?leadId=${encodeURIComponent(resolvedLeadIdText)}`);
                                    if (timelineResult.ok && Array.isArray(timelineResult.data)) {
                                      setTimelineEvents(timelineResult.data);
                                    }
                                  } catch (err) {
                                    console.warn('[AdminPatientProfile] Failed to refetch timeline:', err);
                                  }
                                }
                              } catch (err) {
                                const errorMessage = err instanceof Error ? err.message : 'Failed to update review status';
                                toast.error(errorMessage);
                                setDoctorReviewStatus((lead as any)?.doctor_review_status || '');
                              } finally {
                                setIsUpdatingReview(false);
                              }
                            }
                          }}
                        >
                          <option value="">Select status...</option>
                          <option value="pending">Pending</option>
                          <option value="needs_info">Needs Info</option>
                          <option value="approved_for_booking">Approved for Booking</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Review Notes</label>
                        <textarea
                          value={doctorReviewNotes}
                          onChange={(e) => setDoctorReviewNotes(e.target.value)}
                          onBlur={async () => {
                            // ✅ Doctor mode: don't auto-save, require explicit submit
                            if (finalIsDoctorMode) return;
                            
                            if (doctorReviewNotes !== ((lead as any)?.doctor_review_notes || '') && leadId) {
                              setIsUpdatingReview(true);
                              try {
                                const result = await apiJsonAuth<{ ok: true; lead: Lead }>(`/api/leads`, {
                                  method: 'PATCH',
                                  body: JSON.stringify({
                                    id: leadId,
                                    doctor_review_notes: doctorReviewNotes || null,
                                  }),
                                });

                                toast.success('Review notes updated');
                                
                                // ✅ Admin/Employee mode: refetch from admin endpoint
                                try {
                                  const leadResult = await apiJsonAuth<{ ok: true; lead: Lead }>(`/api/admin/lead/${encodeURIComponent(leadId)}`);
                                  if (leadResult.ok && leadResult.lead) {
                                    setLead(leadResult.lead as Lead);
                                    setDoctorReviewNotes((leadResult.lead as any).doctor_review_notes || '');
                                  }
                                } catch (refetchErr) {
                                  console.warn('[Review] Failed to refetch lead after update:', refetchErr);
                                }
                              } catch (err) {
                                const errorMessage = err instanceof Error ? err.message : 'Failed to update review notes';
                                toast.error(errorMessage);
                                setDoctorReviewNotes((lead as any)?.doctor_review_notes || '');
                              } finally {
                                setIsUpdatingReview(false);
                              }
                            }
                          }}
                          disabled={isUpdatingReview || !leadId}
                          placeholder={finalIsDoctorMode ? "Add your review notes..." : "Add review notes..."}
                          rows={4}
                          className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
                        />
                      </div>
                      
                      {/* ✅ Doctor mode: Submit Review button */}
                      {finalIsDoctorMode && (
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={async () => {
                              // ✅ Use privacy-safe ref field from DTO, fallback to leadRef from route
                              const reviewRef = (lead as any)?.ref || leadRef || null;
                              if (!reviewRef) {
                                toast.error("Lead reference missing");
                                console.error("[AdminPatientProfile] Lead reference missing for review", { lead, leadRef });
                                return;
                              }
                              
                              setIsUpdatingReview(true);
                              try {
                                const result = await apiJsonAuth<{ ok: true; lead: any }>(`/api/doctor/lead/review`, {
                                  method: 'POST',
                                  body: JSON.stringify({
                                    ref: reviewRef,
                                    doctor_review_notes: doctorReviewNotes || null,
                                  }),
                                });

                                if (result.ok && result.lead) {
                                  toast.success('Review submitted');
                                  // ✅ Navigate to reviewed tab
                                  setTimeout(() => {
                                    window.location.href = '/doctor/portal?tab=reviewed';
                                  }, 1000);
                                }
                              } catch (err) {
                                const errorMessage = err instanceof Error ? err.message : 'Failed to submit review';
                                toast.error(errorMessage);
                              } finally {
                                setIsUpdatingReview(false);
                              }
                            }}
                            disabled={isUpdatingReview || !leadRef}
                            className="w-full px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                          >
                            Submit Review & Mark as Reviewed
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Recommended Next Step */}
            {briefData?.brief.snapshot?.nextBestAction && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Recommended Next Step</h3>
                <p className="text-xs text-gray-700 break-words whitespace-normal">
                  {briefData.brief.snapshot.nextBestAction}
                </p>
              </div>
            )}

            {/* Lead Risk & Priority */}
            {briefData?.brief.risk && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Lead Risk & Priority</h3>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                    briefData.brief.risk.priority === 'hot' ? 'bg-red-100 text-red-800' :
                    briefData.brief.risk.priority === 'warm' ? 'bg-orange-100 text-orange-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {briefData.brief.risk.priority === 'hot' ? '🔴 Hot' :
                     briefData.brief.risk.priority === 'warm' ? '🟠 Warm' :
                     '🟢 Cool'}
                  </span>
                  {briefData.brief.risk.confidence !== null && (
                    <span className="text-xs text-gray-500">
                      {briefData.brief.risk.confidence}% confidence
                    </span>
                  )}
                </div>
                {briefData.brief.risk.reasons && briefData.brief.risk.reasons.length > 0 && (
                  <ul className="text-xs text-gray-600 space-y-1 max-w-full">
                    {briefData.brief.risk.reasons.slice(0, 3).map((reason, idx) => (
                      <li key={idx} className="break-words whitespace-normal">
                        • {reason}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Memory Vault */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Brain className="w-4 h-4 text-gray-600" />
                Memory Vault
                {(() => {
                  // Determine if normalization is needed (prefer API health data, fallback to normalizeData check)
                  const needsNormalize = aiHealth?.needs_normalize ?? (!normalizeData || (normalizeData as any)?.review_required === true);
                  return needsNormalize ? (
                    <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                      Outdated • Normalize again
                    </span>
                  ) : null;
                })()}
              </h3>
              {isLoadingMemory ? (
                <div className="flex items-center justify-center py-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-600 text-xs">Loading memory...</span>
                </div>
              ) : memoryData ? (
                <div className="space-y-3">
                  {(() => {
                    // Check if memory is synced by looking at synced_at field
                    const isSynced = !!(memoryData as any)?.synced_at;
                    
                    // Debug: Log memoryData shape once (only if synced_at is missing)
                    if (!isSynced && memoryData) {
                      console.log('[Memory Vault] memoryData shape:', {
                        keys: Object.keys(memoryData),
                        synced_at: (memoryData as any).synced_at,
                        normalized_at: (memoryData as any).normalized_at,
                        has_memory_json: !!(memoryData as any).memory_json,
                        full: memoryData,
                      });
                    }
                    
                    return (
                      <>
                        {isSynced ? (
                          <p className="text-xs text-gray-600 break-words whitespace-normal flex items-center gap-2">
                            <span>Synced • {new Date((memoryData as any).synced_at).toLocaleDateString()}</span>
                            {(() => {
                              // Determine if normalization is needed (prefer API health data, fallback to normalizeData check)
                              const needsNormalize = aiHealth?.needs_normalize ?? (!normalizeData || (normalizeData as any)?.review_required === true);
                              return needsNormalize ? (
                                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                                  Outdated • Normalize again
                                </span>
                              ) : null;
                            })()}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-600 break-words whitespace-normal">
                            Not synced yet. Sync Memory will be available after normalization.
                          </p>
                        )}
                      </>
                    );
                  })()}
                  {(memoryData as any)?.memory_json?.identity?.name && (
                    <p className="text-xs text-gray-700"><span className="font-medium">Name:</span> {(memoryData as any).memory_json.identity.name}</p>
                  )}
                  {(memoryData as any)?.memory_json?.treatment?.type && (
                    <p className="text-xs text-gray-700"><span className="font-medium">Treatment:</span> {(memoryData as any).memory_json.treatment.type}</p>
                  )}
                  {(memoryData as any)?.memory_json?.constraints?.timeline && (
                    <p className="text-xs text-gray-700"><span className="font-medium">Timeline:</span> {(memoryData as any).memory_json.constraints.timeline}</p>
                  )}
                  {(() => {
                    const syncBtnBase =
                      "mt-2 inline-flex items-center justify-center gap-2 h-8 px-3 rounded-lg text-xs font-semibold border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed";

                    // ✅ Use lead.id (TEXT) for sync button state, fallback to lead_uuid if id missing
                    const activeLeadId = lead?.id ?? null;
                    const activeLeadUuid = lead?.lead_uuid ?? null;
                    // Button enable: id varsa kesin, id yoksa en azından uuid var mı gör
                    const canUseAi = Boolean(activeLeadId || activeLeadUuid);
                    const syncDisabled = isSyncingMemory || isLoadingNormalize || !canUseAi || !briefData;

                    const syncBtnClass = [
                      syncBtnBase,
                      "focus:ring-slate-400",
                      syncDisabled
                        ? "bg-slate-200 text-slate-400 border-slate-200"
                        : "bg-slate-900 text-white border-slate-900 hover:bg-slate-800",
                    ].join(" ");

                    return (
                      <button
                        type="button"
                        onClick={handleSyncMemory}
                        disabled={syncDisabled}
                        className={syncBtnClass}
                        title={!briefData ? "Normalize notes first to enable memory sync" : ""}
                      >
                        {isSyncingMemory ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span className="text-gray-700">Syncing...</span>
                          </>
                        ) : (
                          <span className="text-gray-700">Sync Memory</span>
                        )}
                      </button>
                    );
                  })()}
                </div>
              ) : (
                <p className="text-xs text-gray-600 break-words whitespace-normal">
                  Not synced yet. Sync Memory will be available after normalization.
                </p>
              )}
            </div>
            
            {/* Timeline Events */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-600" />
                Timeline
                {timelineEvents.length > 0 && timelineEvents[0]?.stage && (
                  <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-teal-100 text-teal-800">
                    {TIMELINE_STAGE_LABEL[timelineEvents[0].stage] || timelineEvents[0].stage}
                  </span>
                )}
              </h3>
              
              {isLoadingTimeline ? (
                <div className="flex items-center justify-center py-4">
                  <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-600 text-xs">Loading timeline...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Events List */}
                  {timelineEvents.length > 0 ? (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {timelineEvents.slice(0, 10).map((event) => (
                        <div key={event.id} className="border-l-2 border-gray-200 pl-3 py-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="text-xs font-medium text-gray-900 break-words">
                                  {TIMELINE_STAGE_LABEL[event.stage] || event.stage}
                                </span>
                                <span className="text-xs text-gray-500 whitespace-nowrap">
                                  {new Date(event.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              {event.note && (
                                <p className="text-xs text-gray-600 break-words whitespace-normal mt-1">
                                  {event.note}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 text-center py-4">
                      No timeline events yet
                    </p>
                  )}
                  
                  {/* Add Event Controls - Hidden in doctor mode (READ-ONLY) */}
                  {!isDoctorPath && (
                  <div className="border-t border-gray-200 pt-3 space-y-2">
                    <select
                      value={newTimelineStage}
                      onChange={(e) => setNewTimelineStage(e.target.value)}
                      disabled={isAddingTimelineEvent}
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Select stage...</option>
                      {TIMELINE_STAGES.map((s) => (
                        <option key={s} value={s}>
                          {TIMELINE_STAGE_LABEL[s]}
                        </option>
                      ))}
                    </select>
                    <textarea
                      value={newTimelineNote}
                      onChange={(e) => setNewTimelineNote(e.target.value)}
                      disabled={isAddingTimelineEvent}
                      placeholder="Optional note..."
                      rows={2}
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed resize-none break-words"
                    />
                    <button
                      type="button"
                      onClick={handleAddTimelineEvent}
                      disabled={isAddingTimelineEvent || !newTimelineStage.trim()}
                      className={[
                        "w-full inline-flex items-center justify-center gap-2 h-8",
                        "px-3 rounded-lg text-xs font-semibold",
                        "border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
                        "disabled:cursor-not-allowed",
                        isAddingTimelineEvent || !newTimelineStage.trim()
                          ? "bg-gray-100 text-gray-400 border-gray-200"
                          : "bg-teal-600 text-white border-teal-600 hover:bg-teal-700",
                      ].join(" ")}
                    >
                      {isAddingTimelineEvent ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Adding...</span>
                        </>
                      ) : (
                        <span>Add Event</span>
                      )}
                    </button>
                  </div>
                  )}
                </div>
              )}
            </div>

            {/* Contact Events Log (Admin/Employee only) */}
            {!finalIsDoctorMode && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-600" />
                  Contact Log
                </h3>
              {isLoadingContactEvents ? (
                <div className="flex items-center justify-center py-4">
                  <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-600 text-xs">Loading contact events...</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {contactEvents.length > 0 ? (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {contactEvents.map((event) => {
                        const channelLabels: Record<string, string> = {
                          phone: '📞 Phone',
                          whatsapp: '💬 WhatsApp',
                          email: '✉️ Email',
                          sms: '📱 SMS',
                          other: '📝 Other',
                        };
                        const channelLabel = channelLabels[event.channel] || `📝 ${event.channel}`;
                        
                        return (
                          <div key={event.id} className="border-l-2 border-teal-200 pl-3 py-2 bg-teal-50/30 rounded-r">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="text-xs font-medium text-gray-900">
                                    {channelLabel}
                                  </span>
                                  <span className="text-xs text-gray-500 whitespace-nowrap">
                                    {new Date(event.created_at).toLocaleString()}
                                  </span>
                                </div>
                                {event.note && (
                                  <p className="text-xs text-gray-600 break-words whitespace-normal mt-1">
                                    {event.note}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 text-center py-4">
                      No contact events yet. Click WhatsApp, Call, or Email buttons to log contacts.
                    </p>
                  )}
                </div>
              )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cal.com Embed Modal */}
      <CalEmbed
        calLink={process.env.VITE_CAL_LINK || 'smiledesignturkey/consultation'}
        isOpen={isCalModalOpen}
        onClose={() => setIsCalModalOpen(false)}
        leadName={lead?.name || lead?.full_name || undefined}
        leadEmail={lead?.email || undefined}
        leadPhone={lead?.phone || undefined}
      />
      
      {/* Debug HUD - Always visible in doctor path */}
      {isDoctorPath && (
        <DebugHud
          leadRef={leadRef}
          isDoctorPath={isDoctorPath}
          finalIsDoctorMode={finalIsDoctorMode}
          isLoadingDoctorBrief={isLoadingDoctorBrief}
          pathname={currentPath}
          search={typeof window !== 'undefined' ? window.location.search : ''}
          params={params}
        />
      )}
    </div>
  );
}

