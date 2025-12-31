import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Brain, RefreshCw, FileText, AlertTriangle, CheckCircle2, Circle, ListTodo } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { briefLead, type BriefResponse } from '@/lib/ai/briefLead';

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
}

interface LeadNote {
  id: string;
  lead_id: string;
  note: string | null;
  content: string | null;
  created_at: string;
  created_by: string | null;
}

export default function AdminPatientProfile() {
  const { isAuthenticated, user } = useAuthStore();
  const params = useParams();
  const leadId = params.id || null; // Route: /admin/patient/:id
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

  // Extract leadId from URL
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/\/admin\/patient\/([^/]+)/);
    if (match && match[1]) {
      setLeadId(match[1]);
    } else {
      setError('Invalid patient ID');
      setIsLoadingLead(false);
    }
  }, []);

  // Fetch lead data via API endpoint
  useEffect(() => {
    if (!leadId || !isAuthenticated) return;

    const fetchLead = async () => {
      setIsLoadingLead(true);
      setError(null);

      try {
        const supabase = getSupabaseClient();
        if (!supabase) {
          throw new Error('Supabase client not configured');
        }

        // Get JWT token from Supabase session
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) {
          throw new Error('Session expired');
        }

        const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
        const response = await fetch(`${apiUrl}/api/admin/lead/${encodeURIComponent(leadId)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to load patient' }));
          if (errorData.error === 'NOT_FOUND') {
            throw new Error('Patient not found');
          }
          throw new Error(errorData.error || 'Failed to load patient');
        }

        const result = await response.json();
        if (!result.ok || !result.lead) {
          throw new Error('Patient not found');
        }

        setLead(result.lead as Lead);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load patient';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoadingLead(false);
      }
    };

    fetchLead();
  }, [leadId, isAuthenticated]);

  // Fetch notes
  useEffect(() => {
    if (!leadId || !isAuthenticated) return;

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
        console.error('[AdminPatientProfile] Error loading notes:', err);
      } finally {
        setIsLoadingNotes(false);
      }
    };

    loadNotes();
  }, [leadId, isAuthenticated]);

  // B4: Fetch AI memory on page load
  useEffect(() => {
    if (!leadId || !isAuthenticated) return;

    const fetchAIMemory = async () => {
      setIsLoadingMemory(true);
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

        const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
        const response = await fetch(`${apiUrl}/api/admin/lead-ai/${encodeURIComponent(leadId)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to load AI memory' }));
          // Don't show error if table doesn't exist (graceful degradation)
          if (errorData.warning === 'Table not found') {
            console.warn('[AdminPatientProfile] AI memory table not found');
            return;
          }
          throw new Error(errorData.error || 'Failed to load AI memory');
        }

        const result = await response.json();
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
          // Set memory vault data
          if (result.data.memory) {
            setMemoryData(result.data.memory);
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
  }, [leadId, isAuthenticated]);

  // B5: Fetch AI tasks on page load
  useEffect(() => {
    if (!leadId || !isAuthenticated) return;

    const fetchTasks = async () => {
      setIsLoadingTasks(true);
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

        const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
        const response = await fetch(`${apiUrl}/api/admin/lead-tasks/${encodeURIComponent(leadId)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to load tasks' }));
          // Don't show error if table doesn't exist (graceful degradation)
          if (errorData.warning === 'Table not found') {
            console.warn('[AdminPatientProfile] AI tasks table not found');
            return;
          }
          throw new Error(errorData.error || 'Failed to load tasks');
        }

        const result = await response.json();
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
  }, [leadId, isAuthenticated]);

  // B5: Mark task as done
  const handleMarkTaskDone = async (taskId: string) => {
    if (!leadId || !isAuthenticated) return;

    try {
      const token = await getAccessToken();
      const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
      const response = await fetch(`${apiUrl}/api/admin/lead-tasks/${encodeURIComponent(leadId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'mark_done',
          taskId: taskId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to mark task done' }));
        throw new Error(errorData.error || 'Failed to mark task done');
      }

      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.error || 'Failed to mark task done');
      }

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

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        throw new Error('Session expired');
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
          note: newNoteContent.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to save note' }));
        throw new Error(errorData.error || 'Failed to save note');
      }

      const result = await response.json();
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
    if (!leadId) return;

    setIsLoadingBrief(true);
    setError(null);

    const toastId = toast.loading('Generating snapshot...');

    try {
      const result = await briefLead(leadId);
      
      if (!result.ok) {
        throw new Error(result.error || 'Failed to generate snapshot');
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
      toast.error('Unable to generate snapshot', { id: toastId, description: errorMessage });
    } finally {
      setIsLoadingBrief(false);
    }
  };

  // B3: Normalize Notes
  const handleNormalizeNotes = async () => {
    if (!leadId || !isAuthenticated) return;

    setIsLoadingNormalize(true);
    setError(null);

    const toastId = toast.loading('Normalizing notes...');

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

      const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
      const response = await fetch(`${apiUrl}/api/ai/normalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ leadId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to normalize notes' }));
        throw new Error(errorData.error || 'Failed to normalize notes');
      }

      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.error || 'Normalization failed');
      }

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
        toast.success('Notes normalized successfully', { id: toastId });
      } else {
        throw new Error('Invalid normalization response');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to normalize notes';
      setError(errorMessage);
      toast.error('Normalization failed', { id: toastId, description: errorMessage });
    } finally {
      setIsLoadingNormalize(false);
    }
  };

  // B4: Sync Memory Vault
  const handleSyncMemory = async () => {
    if (!leadId || !isAuthenticated || !briefData) return;

    setIsSyncingMemory(true);
    const toastId = toast.loading('Syncing memory vault...');

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

      const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
      const response = await fetch(`${apiUrl}/api/admin/lead-ai/${encodeURIComponent(leadId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          snapshot: briefData.brief?.snapshot || null,
          callBrief: briefData.brief?.callBrief || null,
          risk: briefData.brief?.risk || null,
          memory: normalizeData?.memory || memoryData || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to sync memory' }));
        if (errorData.error === 'TABLE_NOT_FOUND') {
          throw new Error('AI memory table not found. Please run migration.');
        }
        throw new Error(errorData.error || 'Failed to sync memory');
      }

      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.error || 'Sync failed');
      }

      if (result.data?.memory) {
        setMemoryData(result.data.memory);
      }

      toast.success('Memory vault synced', { id: toastId });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync memory';
      setError(errorMessage);
      toast.error('Sync failed', { id: toastId, description: errorMessage });
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
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Patient not found</h2>
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

  const leadName = lead.name || lead.full_name || 'Unknown Patient';
  const leadCountry = lead.country || 'Unknown';
  const leadStatus = lead.status || 'new';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 min-w-0 flex-1">
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI Snapshot Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-teal-600" />
                  AI Snapshot
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleNormalizeNotes}
                    disabled={isLoadingNormalize || isLoadingBrief || !leadId}
                    className={[
                      "inline-flex items-center justify-center gap-2 h-9",
                      "px-4 rounded-lg text-sm font-semibold",
                      "border transition-all duration-200",
                      "focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2",
                      isLoadingNormalize || isLoadingBrief || !leadId
                        ? "bg-gray-100 text-gray-700 border-gray-200 opacity-70 cursor-not-allowed"
                        : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-transparent hover:from-purple-700 hover:to-indigo-700 shadow-sm hover:shadow-md"
                    ].join(" ")}
                  >
                    {isLoadingNormalize ? (
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
                    onClick={handleGenerateBrief}
                    disabled={isLoadingBrief || isLoadingNormalize || !leadId}
                    className={[
                      "inline-flex items-center justify-center gap-2 h-9",
                      "px-4 rounded-lg text-sm font-semibold",
                      "border transition-all duration-200",
                      "focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2",
                      isLoadingBrief || isLoadingNormalize || !leadId
                        ? "bg-gray-100 text-gray-700 border-gray-200 opacity-70 cursor-not-allowed"
                        : "bg-gradient-to-r from-teal-600 to-cyan-600 text-white border-transparent hover:from-teal-700 hover:to-cyan-700 shadow-sm hover:shadow-md"
                    ].join(" ")}
                  >
                    {isLoadingBrief ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Generating snapshot...</span>
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4" />
                        <span>Generate Snapshot</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {briefData ? (
                <div 
                  data-snapshot-section
                  className="border border-gray-200 rounded-lg bg-gradient-to-br from-white to-teal-50/20 transition-all max-w-full overflow-hidden"
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

            {/* Notes Section */}
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
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
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

            {/* Memory Vault Placeholder */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Brain className="w-4 h-4 text-gray-600" />
                Memory Vault
              </h3>
              <p className="text-xs text-gray-600 break-words whitespace-normal">
                Not synced yet. Sync Memory will be available after normalization.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

