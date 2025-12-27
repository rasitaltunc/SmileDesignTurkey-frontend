import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, X, Save, LogOut, MessageSquare } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';

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
    if (isAdmin) {
      // Admin filters apply to all leads
      switch (tab) {
        case 'unassigned':
          return allLeads.filter(l => !l.assigned_to);
        case 'due_today':
          return allLeads.filter(l => isDueTodayISO(l.follow_up_at));
        case 'appointment_set':
          return allLeads.filter(l => l.status === 'appointment_set');
        case 'deposit_paid':
          return allLeads.filter(l => l.status === 'deposit_paid');
        case 'all':
        default:
          return allLeads;
      }
    } else {
      // Employee filters apply only to assigned leads
      const myLeads = allLeads.filter(l => l.assigned_to === user?.id);
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

  // Body scroll lock when notes modal is open
  useEffect(() => {
    if (!notesLeadId) return;

    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;

    // Scrollbar width to prevent layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [notesLeadId]);

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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create note';
      setError(errorMessage);
      console.error('[AdminLeads] Error creating note:', err);
    } finally {
      setIsSavingNote(false);
    }
  };

  // Open notes modal
  const handleOpenNotes = async (leadId: string) => {
    setNotesLeadId(leadId);
    setNotes([]);
    setNewNoteContent('');
    await loadNotes(leadId);
  };

  // Close notes modal
  const handleCloseNotes = () => {
    setNotesLeadId(null);
    setNotes([]);
    setNewNoteContent('');
  };

  // Handle add note form submission
  const handleAddNote = (e: any) => {
    e.preventDefault();
    if (newNoteContent.trim() && notesLeadId) {
      createNote(notesLeadId, newNoteContent);
    }
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
    if (!isAdmin || !isAuthenticated || !user) return;

    setIsLoadingIntakes(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not configured.');

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) return;

      const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
      const response = await fetch(`${apiUrl}/api/patient-intake?status=pending&limit=20`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to load intakes');
      const result = await response.json();
      setIntakes(result.intakes || []);
    } catch (err) {
      console.error('[AdminLeads] Error loading intakes:', err);
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
                  {isLoadingIntakes ? 'Loading...' : `${intakes.length} pending intakes`}
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

            {intakes.length === 0 ? (
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
              <p className="text-gray-500 text-lg">No leads found.</p>
              <p className="text-gray-400 text-sm mt-2">
                {isLoading ? 'Loading...' : 'Try adjusting your filters or check back later.'}
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
                    {filteredLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-gray-50 group">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(lead.created_at).toLocaleString()}
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
                          <div className="flex gap-2">
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          );
        })()}

        {/* Notes Modal (PORTAL - hard-sticky footer + safe scroll) */}
        {notesLeadId &&
          createPortal(
            <div
              className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center overflow-hidden"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) handleCloseNotes();
              }}
            >
              {/* MODAL ROOT: medium-wide (blue lines target), fixed height */}
              <div
                className="
                  bg-white
                  w-[clamp(860px,82vw,1120px)]
                  max-w-[96vw]
                  h-[72dvh]
                  max-h-[calc(100dvh-2rem)]
                  rounded-xl shadow-xl
                  flex flex-col
                  overflow-hidden
                "
              >
                {/* HEADER */}
                <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
                  <h3 className="text-lg font-semibold">Notes</h3>
                  <button
                    type="button"
                    onClick={handleCloseNotes}
                    className="text-gray-500 hover:text-gray-700 text-xl leading-none"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                {/* BODY: only this area scrolls */}
                <div
                  className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-4"
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
                  <div className="space-y-3">
                    {isLoadingNotes ? (
                      <div className="text-gray-500 text-sm">Loading notes…</div>
                    ) : notes.length === 0 ? (
                      <div className="text-gray-500 text-sm">No notes yet.</div>
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

                  {/* give body bottom padding so last note never hides behind sticky footer */}
                  <div className="h-28" />
                </div>

                {/* FOOTER: STICKY + always visible */}
                <div className="border-t bg-white px-6 py-4 shrink-0 sticky bottom-0">
                  <form onSubmit={handleAddNote} className="space-y-3">
                    <textarea
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      placeholder="Add a note..."
                      rows={3}
                      className="w-full rounded-lg border p-3 resize-none max-h-28 overflow-y-auto focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="flex justify-between gap-2">
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
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                      >
                        {isSavingNote ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <MessageSquare className="w-4 h-4" />
                            Add Note
                          </>
                        )}
                      </button>
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
