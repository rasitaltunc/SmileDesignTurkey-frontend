import { useState, useEffect, useContext } from 'react';
import { useAuthStore } from '@/store/authStore';
import { NavigationContext } from '@/App';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { RefreshCw, LogOut, Clock, FileText, CheckCircle2, XCircle, AlertCircle, Settings } from 'lucide-react';
import AdminPatientProfile from './AdminPatientProfile';
import { apiJsonAuth, apiFetchAuth } from '@/lib/api';

interface Lead {
  ref?: string | null; // ✅ Privacy-safe reference (prefer lead_uuid UUID, fallback to id TEXT)
  case_code?: string | null;
  name: string | null;
  treatment?: string | null;
  timeline?: string | null;
  message?: string | null;
  snapshot?: string | null;
  doctor_review_status: string | null;
  doctor_assigned_at?: string | null;
  updated_at?: string | null;
}

export default function DoctorPortal() {
  const { role, logout, user } = useAuthStore();
  const { navigate } = useContext(NavigationContext);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'unread' | 'reviewed'>('unread');

  // Redirect if not doctor
  useEffect(() => {
    if (role && role !== 'doctor') {
      navigate('/');
    }
  }, [role, navigate]);

  // Load leads assigned to this doctor via privacy-safe endpoint
  const loadLeads = async (bucket: 'unread' | 'reviewed' = 'unread') => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      // ✅ Use apiFetchAuth to ensure Authorization header is always present
      // Use apiFetchAuth directly to handle ok:false responses gracefully
      const response = await apiFetchAuth(`/api/doctor/leads?bucket=${bucket}`);
      const result = await response.json().catch(() => ({ ok: false, error: 'Invalid JSON response' }));

      // ✅ Handle ok:false response gracefully with requestId/buildSha
      if (!result.ok) {
        const errorMsg = result.error || 'Failed to load leads';
        const requestId = result.requestId || 'N/A';
        const buildSha = result.buildSha || 'N/A';
        const fullErrorMsg = `${errorMsg} (requestId: ${requestId}${buildSha !== 'N/A' ? ` / build: ${buildSha}` : ''})`;
        setError(fullErrorMsg);
        toast.error(fullErrorMsg);
        setLeads([]);
        return;
      }

      if (result.ok && Array.isArray(result.leads)) {
        // Sort by assigned date (newest first) or updated_at
        const sorted = [...result.leads].sort((a, b) => {
          const aDate = a.doctor_assigned_at || a.updated_at;
          const bDate = b.doctor_assigned_at || b.updated_at;
          if (!aDate && !bDate) return 0;
          if (!aDate) return 1;
          if (!bDate) return -1;
          return new Date(bDate).getTime() - new Date(aDate).getTime();
        });
        
        setLeads(sorted);
      } else {
        setLeads([]);
      }
    } catch (err: any) {
      // ✅ Catch network/parsing errors and show gracefully
      const errorMessage = err instanceof Error ? err.message : 'Failed to load leads';
      const fullErrorMsg = `${errorMessage} (requestId: N/A / build: N/A)`;
      setError(fullErrorMsg);
      toast.error(fullErrorMsg);
      setLeads([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (role === 'doctor' && user) {
      loadLeads(activeTab);
    }
  }, [role, user, activeTab]);

  const openLead = (lead: any) => {
    // ✅ Build ref from all possible sources
    const ref = (lead as any)?.ref || lead?.lead_uuid || lead?.id || (lead as any)?.case_code;
    if (!ref) {
      toast.error("Lead reference missing");
      console.error("[DoctorPortal] Missing lead ref", lead);
      return;
    }
    
    // ✅ Normalize: strip CASE- prefix
    const safeRef = String(ref).replace(/^CASE-/, "").trim();
    // ✅ Navigate to clean DoctorLeadView route (not AdminPatientProfile)
    navigate(`/doctor/lead/${encodeURIComponent(safeRef)}`);
  };

  const getReviewStatusBadge = (status: string | null) => {
    if (!status || status === 'pending') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200">
          <Clock className="w-3 h-3" />
          Pending
        </span>
      );
    }
    if (status === 'needs_info') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-800 ring-1 ring-orange-200">
          <AlertCircle className="w-3 h-3" />
          Needs Info
        </span>
      );
    }
    if (status === 'approved_for_booking') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 ring-1 ring-green-200">
          <CheckCircle2 className="w-3 h-3" />
          Approved
        </span>
      );
    }
    if (status === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 ring-1 ring-red-200">
          <XCircle className="w-3 h-3" />
          Rejected
        </span>
      );
    }
    return null;
  };

  // ✅ Removed: No longer use state-based selection, use URL routing instead
  // Leads are now opened via /doctor/leads/:ref route

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* DEV ONLY: Doctor Debug Panel */}
        {import.meta.env.DEV && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-sm font-semibold text-yellow-900 mb-2">🔧 Doctor Debug Panel (DEV ONLY)</h3>
            <div className="text-xs text-yellow-800 space-y-1">
              <div><strong>User ID:</strong> {user?.id || 'N/A'}</div>
              <div><strong>Role:</strong> {role || 'N/A'}</div>
              <div><strong>Fetched Leads:</strong> {leads.length}</div>
              {leads.length > 0 && (
                <div className="mt-2 pt-2 border-t border-yellow-300">
                  <div><strong>First Lead:</strong></div>
                  <div className="ml-2 space-y-0.5">
                    <div><strong>ID:</strong> {leads[0].id}</div>
                    <div><strong>doctor_id:</strong> {leads[0].doctor_id || 'null'}</div>
                    <div><strong>doctor_review_status:</strong> {leads[0].doctor_review_status || 'null'}</div>
                    <div><strong>next_action:</strong> {(leads[0] as any).next_action || 'null'}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Doctor Inbox</h1>
            <p className="mt-1 text-sm text-gray-600">
              Review leads assigned to you
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => loadLeads(activeTab)}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex items-center justify-between border-b border-gray-200">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setActiveTab('unread');
                loadLeads('unread');
              }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'unread'
                  ? 'border-teal-600 text-teal-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Unread ({leads.filter(l => (l.doctor_review_status || 'pending') !== 'reviewed').length})
            </button>
            <button
              onClick={() => {
                setActiveTab('reviewed');
                loadLeads('reviewed');
              }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'reviewed'
                  ? 'border-teal-600 text-teal-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Reviewed ({leads.filter(l => l.doctor_review_status === 'reviewed').length})
            </button>
          </div>
          <button
            onClick={() => navigate('/doctor/settings')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Doctor Profile
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {/* Leads List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-3 text-gray-600">Loading leads...</span>
          </div>
        ) : leads.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {activeTab === 'unread' ? 'No unread leads' : 'No reviewed leads'}
            </h3>
            <p className="text-gray-600">
              {activeTab === 'unread' 
                ? 'You don\'t have any unread leads assigned to you.'
                : 'You haven\'t reviewed any leads yet.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-64">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                    Treatment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    Assigned
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leads.map((lead) => (
                  <tr
                    key={lead.ref || lead.case_code || `lead-${lead.name}`}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="text-xs font-mono text-gray-500 mb-1">
                        Case: {lead.case_code || 'CASE-UNKNOWN'}
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {lead.name || 'Unnamed'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {lead.treatment || 'General'}
                      </div>
                      {lead.timeline && (
                        <div className="text-xs text-gray-500 mt-1">
                          {lead.timeline}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getReviewStatusBadge(lead.doctor_review_status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {lead.doctor_assigned_at 
                        ? new Date(lead.doctor_assigned_at).toLocaleDateString()
                        : lead.updated_at
                        ? new Date(lead.updated_at).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        type="button"
                        className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                          onClick={(e) => {
                            e.stopPropagation();
                            // ✅ Build ref from all possible sources
                            const ref = (lead as any)?.ref || lead?.lead_uuid || lead?.id || (lead as any)?.case_code;
                            if (!ref) {
                              toast.error("Missing lead ref");
                              console.error("[DoctorPortal] Missing lead ref", lead);
                              return;
                            }
                            
                            // ✅ Normalize: strip CASE- prefix
                            const safeRef = String(ref).replace(/^CASE-/, "").trim();
                            // ✅ Navigate to clean DoctorLeadView route (not AdminPatientProfile)
                            navigate(`/doctor/lead/${encodeURIComponent(safeRef)}`);
                          }}
                      >
                        Review →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
