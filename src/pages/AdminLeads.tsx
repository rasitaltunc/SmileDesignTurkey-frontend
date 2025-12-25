import { useState, useEffect } from 'react';
import { RefreshCw, X, Save, LogOut, MessageSquare } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';

// Status options - CRM MVP Pipeline
const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'booked', label: 'Booked' },
  { value: 'paid', label: 'Paid' },
  { value: 'completed', label: 'Completed' },
];

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
  
  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterAssignedTo, setFilterAssignedTo] = useState<string>('');
  
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

  // Employee assignment state
  const [employees, setEmployees] = useState<Array<{ id: string; full_name: string | null }>>([]);
  const [assigningLeadId, setAssigningLeadId] = useState<string | null>(null);
  const [selectedEmployeeByLead, setSelectedEmployeeByLead] = useState<Record<string, string>>({});

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
        window.location.href = '/';
        return;
      }

      // Build query params
      const params = new URLSearchParams();
      if (filterStatus) {
        // Only include status param if filterStatus is not empty (already lowercase)
        params.append('status', filterStatus);
      }
      if (filterAssignedTo && isAdmin) {
        params.append('assigned_to', filterAssignedTo);
      }

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

  // Assign lead to employee
  const assignLead = async (leadId: string) => {
    const employeeId = selectedEmployeeByLead[leadId];
    if (!employeeId) return;

    setAssigningLeadId(leadId);

    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not configured.');

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('No session');

      const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
      const url = `${apiUrl}/api/leads`;

      // Only send assigned_to - server will set assigned_by and assigned_at
      const updates = {
        assigned_to: employeeId,
      };

      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: leadId, updates }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Assign failed');
      }

      // UI refresh
      await loadLeads();
    } catch (e) {
      console.error('Failed to assign lead:', e);
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

  // Handle logout
  const handleLogout = async () => {
    await logout();
    setLeads([]);
    setError(null);
    // Redirect to login
    window.history.pushState({}, '', '/login');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  // Auto-load when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      loadLeads();
    }
  }, [isAuthenticated, filterStatus, filterAssignedTo]);

  useEffect(() => {
    loadEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

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
                <span className="font-medium">{leads.length} leads</span>
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

          {/* Filters */}
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => {
                  const value = e.target.value;
                  // Ensure lowercase canonical value or empty string
                  setFilterStatus(value === '' ? '' : value.toLowerCase());
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            {isAdmin && (
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Assigned To</label>
                <input
                  type="text"
                  value={filterAssignedTo}
                  onChange={(e) => setFilterAssignedTo(e.target.value)}
                  placeholder="Filter by user ID..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            {(filterStatus || filterAssignedTo) && (
              <button
                onClick={() => {
                  setFilterStatus('');
                  setFilterAssignedTo('');
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Leads Table */}
        {leads.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500 text-lg">No leads found.</p>
            <p className="text-gray-400 text-sm mt-2">
              {isLoading ? 'Loading...' : 'Try adjusting your filters or check back later.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] table-fixed">
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ width: '220px' }}>Notes</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky right-0 bg-gray-50 z-10 border-l border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leads.map((lead) => (
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
                        {lead.phone || '-'}
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
                              {STATUS_OPTIONS.map((opt) => (
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
                            {STATUS_OPTIONS.find(s => s.value === lead.status?.toLowerCase())?.label || 
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        {role === 'admin' && (
                          <div className="flex flex-col gap-2">
                            <select
                              className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
                              value={selectedEmployeeByLead[lead.id] || lead.assigned_to || ''}
                              onChange={(e) =>
                                setSelectedEmployeeByLead((prev) => ({ ...prev, [lead.id]: e.target.value }))
                              }
                            >
                              <option value="">Assign to employee…</option>
                              {employees.map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                  {emp.full_name ? emp.full_name : emp.id.slice(0, 8)}
                                </option>
                              ))}
                            </select>

                            <button
                              disabled={!selectedEmployeeByLead[lead.id] || assigningLeadId === lead.id}
                              onClick={() => assignLead(lead.id)}
                              className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {assigningLeadId === lead.id ? 'Assigning…' : 'Assign'}
                            </button>
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
        )}

        {/* Notes Modal */}
        {notesLeadId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Notes</h2>
                <button
                  onClick={handleCloseNotes}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Notes List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {isLoadingNotes ? (
                  <div className="text-center text-gray-500 py-8">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    <p>Loading notes...</p>
                  </div>
                ) : notes.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No notes yet. Add the first note below.</p>
                  </div>
                ) : (
                  notes.map((note) => (
                    <div key={note.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm text-gray-600">
                          {new Date(note.created_at).toLocaleString()}
                        </p>
                        {note.author_id === user?.id && (
                          <span className="text-xs text-blue-600">You</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{note.note}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Note Form */}
              <div className="p-6 border-t border-gray-200 bg-white sticky bottom-0 z-10">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (newNoteContent.trim() && notesLeadId) {
                      createNote(notesLeadId, newNoteContent);
                    }
                  }}
                  className="space-y-3"
                >
                  <textarea
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    placeholder="Add a note..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleCloseNotes}
                      className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      disabled={!newNoteContent.trim() || isSavingNote}
                      className="px-4 py-2 rounded-lg transition-colors flex items-center gap-2 bg-black text-white hover:bg-gray-900 disabled:bg-gray-700 disabled:text-white disabled:opacity-60 disabled:cursor-not-allowed"
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
          </div>
        )}
      </div>
    </div>
  );
}
