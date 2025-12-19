import { useState, useEffect } from 'react';
import { Download, Shield, RefreshCw, Filter, X, Save, LogOut, User, Lock } from 'lucide-react';

// Team members list
const TEAM = [
  { id: 'f4cb96d2-0923-42f6-b867-472001453bb4', label: 'Office (Admin)' },
  { id: 'c6ac94be-6c37-40e4-9f2d-72efb53b15c5', label: 'Rasit (Employee)' },
];

// Status options
const STATUS_OPTIONS = [
  { value: 'NEW', label: 'New' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'QUALIFIED', label: 'Qualified' },
  { value: 'QUOTE_SENT', label: 'Quote Sent' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'LOST', label: 'Lost' },
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
  page_url?: string;
  utm_source?: string;
  device?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  isAdmin: boolean;
  employeeId?: string;
}

const TOKEN_STORAGE_KEY = 'admin_token';

export default function AdminLeads() {
  const [role, setRole] = useState<'admin' | 'employee'>('admin');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [authToken, setAuthToken] = useState<string>('');
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isAdmin: false,
  });
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('');
  
  // Edit state
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editStatus, setEditStatus] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');

  // Load token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (savedToken) {
      setAuthToken(savedToken);
      authenticate(savedToken);
    }
  }, []);

  // Check if token is valid and determine auth level
  const authenticate = async (token: string) => {
    if (!token.trim()) {
      setAuthState({ isAuthenticated: false, isAdmin: false });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/leads?limit=1', {
        headers: {
          'x-admin-token': token,
        },
      });

      if (response.ok) {
        // Token is valid - determine if admin or employee
        const isAdmin = !token.startsWith('EMPLOYEE:');
        const employeeId = token.startsWith('EMPLOYEE:') 
          ? token.split(':')[1] 
          : undefined;
        
        setAuthState({
          isAuthenticated: true,
          isAdmin,
          employeeId,
        });
        setError(null);
        // Save token to localStorage
        localStorage.setItem(TOKEN_STORAGE_KEY, token.trim());
      } else {
        const data = await response.json().catch(() => ({}));
        setAuthState({ isAuthenticated: false, isAdmin: false });
        setError(data.error || 'Authentication failed');
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    } catch (err) {
      setAuthState({ isAuthenticated: false, isAdmin: false });
      setError('Failed to connect to server. Please check your connection.');
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle login form submit
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    if (role === 'employee' && !username.trim()) {
      setError('Username is required for employee login');
      return;
    }

    // Build token based on role
    let token = '';
    if (role === 'admin') {
      token = password.trim(); // Admin token is just the password
    } else {
      token = `EMPLOYEE:${username.trim()}:${password.trim()}`;
    }

    setAuthToken(token);
    await authenticate(token);
  };

  // Handle logout
  const handleLogout = () => {
    setAuthToken('');
    setAuthState({ isAuthenticated: false, isAdmin: false });
    setLeads([]);
    setError(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setPassword('');
    setUsername('');
  };

  // Load leads from API
  const loadLeads = async () => {
    if (!authToken || !authState.isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      params.set('limit', '100');

      const response = await fetch(`/api/leads?${params.toString()}`, {
        headers: {
          'x-admin-token': authToken,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          handleLogout();
          setError('Session expired. Please login again.');
          return;
        }
        const data = await response.json();
        throw new Error(data.error || 'Failed to load leads');
      }

      const data = await response.json();
      setLeads(data.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load leads';
      setError(errorMessage);
      console.error('[AdminLeads] Error loading leads:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Update lead
  const updateLead = async (leadId: string, updates: { status?: string; notes?: string; assigned_to?: string }) => {
    if (!authToken || !authState.isAuthenticated) return;

    try {
      const response = await fetch('/api/leads', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': authToken,
        },
        body: JSON.stringify({
          id: leadId,
          ...updates,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleLogout();
          setError('Session expired. Please login again.');
          return;
        }
        const data = await response.json();
        throw new Error(data.error || 'Failed to update lead');
      }

      // Reload leads
      await loadLeads();
      setError(null);          // ✅ banner temizle
      setEditingLead(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update lead';
      setError(errorMessage);
      console.error('[AdminLeads] Error updating lead:', err);
    }
  };

  // Handle edit start
  const handleEditStart = (lead: Lead) => {
    setEditingLead(lead);
    setEditStatus(lead.status || 'NEW');
    setEditNotes(lead.notes || '');
  };

  // Handle edit save
  const handleEditSave = () => {
    if (!editingLead) return;

    const updates: any = {};
    if (editStatus !== editingLead.status) updates.status = editStatus;
    if (editNotes !== (editingLead.notes || '')) updates.notes = editNotes;

    if (Object.keys(updates).length > 0) {
      updateLead(editingLead.id, updates);
    } else {
      setEditingLead(null);
    }
  };

  // Auto-load when authenticated
  useEffect(() => {
    if (authState.isAuthenticated && authToken) {
      loadLeads();
    }
  }, [authState.isAuthenticated, filterStatus]);

  // Not authenticated - show login
  if (!authState.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Login</h1>
            <p className="text-gray-600 text-sm">
              Sign in to access the leads management panel
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value as 'admin' | 'employee');
                  setError(null);
                }}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="admin">Admin</option>
                <option value="employee">Employee</option>
              </select>
            </div>

            {/* Username (Employee only) */}
            {role === 'employee' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  Username
                </label>
                <select
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError(null);
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">Select employee</option>
                  {TEAM.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Lock className="w-4 h-4 inline mr-1" />
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder={role === 'admin' ? 'Enter admin password' : 'Enter employee password'}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !password.trim() || (role === 'employee' && !username.trim())}
              className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              {role === 'admin' ? (
                <>Admin: Use your admin password token</>
              ) : (
                <>Employee: Format is <code className="bg-gray-100 px-1 rounded">EMPLOYEE:username:password</code></>
              )}
            </p>
          </div>
        </div>
      </div>
    );
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
                {authState.employeeId && (
                  <span className="ml-2 text-blue-600">• Assigned to: {authState.employeeId}</span>
                )}
                {authState.isAdmin && <span className="ml-2 text-green-600">• Admin Mode</span>}
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
                onChange={(e) => setFilterStatus(e.target.value)}
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
            {filterStatus && (
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
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Treatment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50">
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
                        ) : (
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            lead.status === 'NEW' ? 'bg-yellow-100 text-yellow-800' :
                            lead.status === 'CONTACTED' ? 'bg-blue-100 text-blue-800' :
                            lead.status === 'CLOSED' ? 'bg-green-100 text-green-800' :
                            lead.status === 'LOST' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {STATUS_OPTIONS.find(s => s.value === lead.status)?.label || lead.status || 'NEW'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {lead.assigned_to ? lead.assigned_to : 'Unassigned'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {editingLead?.id === lead.id ? (
                          <input
                            type="text"
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            placeholder="Add notes..."
                            className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                          />
                        ) : (
                          <span className="max-w-xs truncate block">
                            {lead.notes || '-'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {editingLead?.id === lead.id ? (
                          <div className="flex gap-2">
                            <button
                              onClick={handleEditSave}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingLead(null)}
                              className="text-gray-600 hover:text-gray-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditStart(lead)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
