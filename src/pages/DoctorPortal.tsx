import { useState, useEffect, useContext } from 'react';
import { useAuthStore } from '@/store/authStore';
import { NavigationContext } from '@/App';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { RefreshCw, LogOut, Phone, Mail, Clock, FileText, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import AdminPatientProfile from './AdminPatientProfile';

interface Lead {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  doctor_id: string | null;
  doctor_review_status: string | null;
  doctor_review_notes: string | null;
  next_action: string | null;
  created_at: string;
  updated_at: string | null;
}

export default function DoctorPortal() {
  const { role, logout, user } = useAuthStore();
  const { navigate } = useContext(NavigationContext);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not doctor
  useEffect(() => {
    if (role && role !== 'doctor') {
      navigate('/');
    }
  }, [role, navigate]);

  // Load leads assigned to this doctor
  const loadLeads = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase client not configured.');
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        console.warn("[DoctorPortal] No token yet, skipping loadLeads");
        setIsLoading(false);
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
      // ✅ Force status=all to avoid any status filter issues
      const response = await fetch(`${apiUrl}/api/leads?status=all`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to load leads' }));
        throw new Error(errorData.error || 'Failed to load leads');
      }

      const result = await response.json();
      if (result.ok && Array.isArray(result.leads)) {
        // Sort: pending/needs_info first, then by created_at desc
        const sorted = [...result.leads].sort((a, b) => {
          const aStatus = a.doctor_review_status || 'pending';
          const bStatus = b.doctor_review_status || 'pending';
          
          const priorityOrder: Record<string, number> = {
            'pending': 0,
            'needs_info': 1,
            'approved_for_booking': 2,
            'rejected': 3,
          };
          
          const aPriority = priorityOrder[aStatus] ?? 99;
          const bPriority = priorityOrder[bStatus] ?? 99;
          
          if (aPriority !== bPriority) {
            return aPriority - bPriority;
          }
          
          // Same priority: newest first
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        
        setLeads(sorted);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load leads';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (role === 'doctor' && user) {
      loadLeads();
    }
  }, [role, user]);

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

  // If lead selected, show profile in doctor mode
  if (selectedLeadId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => setSelectedLeadId(null)}
            className="mb-4 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back to Inbox
          </button>
          <AdminPatientProfile doctorMode={true} />
        </div>
      </div>
    );
  }

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
              onClick={loadLeads}
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No leads assigned</h3>
            <p className="text-gray-600">You don't have any leads assigned to you yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Review Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedLeadId(lead.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {lead.name || 'Unnamed'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">
                        {lead.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {lead.email}
                          </div>
                        )}
                        {lead.phone && (
                          <div className="flex items-center gap-1 mt-1">
                            <Phone className="w-3 h-3" />
                            {lead.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getReviewStatusBadge(lead.doctor_review_status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLeadId(lead.id);
                        }}
                        className="text-sm text-teal-600 hover:text-teal-700 font-medium"
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
