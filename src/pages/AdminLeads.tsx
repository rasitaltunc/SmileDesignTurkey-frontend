import { useState, useEffect } from 'react';
import { listLeadsUnified, exportLeadsCsvUnified, clearLeadsLocal, type Lead } from '../lib/leadStore';
import { fetchLeadsFromSupabaseSecure } from '../lib/adminLeadsApi';
import { Download, Trash2, Shield, AlertCircle, RefreshCw, Database, AlertTriangle } from 'lucide-react';

export default function AdminLeads() {
  // Get token from URL query params
  const getTokenFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('token');
  };
  
  const token = getTokenFromUrl();
  const requiredToken = import.meta.env.VITE_ADMIN_TOKEN;
  
  const [leadsData, setLeadsData] = useState<{ local: Lead[]; supabase: Lead[]; all: Lead[] }>({
    local: [],
    supabase: [],
    all: [],
  });
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'local' | 'supabase' | 'all'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);

  useEffect(() => {
    // Check authorization
    const trimmedToken = requiredToken?.trim() || '';
    
    // If no token is set, allow access ONLY in DEV mode
    if (trimmedToken.length === 0) {
      if (import.meta.env.DEV) {
        setIsAuthorized(true);
        loadLeads();
      } else {
        // Production: block access if no token configured
        setIsAuthorized(false);
      }
      return;
    }

    // Token is required - check if provided token matches
    if (token === trimmedToken) {
      setIsAuthorized(true);
      loadLeads();
    } else {
      setIsAuthorized(false);
    }
  }, [token, requiredToken]);

  const loadLeads = async () => {
    setIsLoading(true);
    setSupabaseError(null);
    
    try {
      // Load local leads
      const localLeads = (await listLeadsUnified()).local;
      
      // Load Supabase leads via secure endpoint (if token and Supabase URL are configured)
      let supabaseLeads: Lead[] = [];
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      if (token && supabaseUrl && supabaseUrl.trim().length > 0) {
        try {
          const response = await fetchLeadsFromSupabaseSecure(token);
          supabaseLeads = response.leads;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load from Supabase';
          setSupabaseError(errorMessage);
          console.warn('[AdminLeads] Failed to load Supabase leads:', error);
          // Continue with local leads only
        }
      }
      
      // Merge and deduplicate
      const leadMap = new Map<string, Lead>();
      localLeads.forEach(lead => leadMap.set(lead.id, lead));
      supabaseLeads.forEach(lead => leadMap.set(lead.id, lead));
      
      const allLeads = Array.from(leadMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      setLeadsData({
        local: localLeads,
        supabase: supabaseLeads,
        all: allLeads,
      });
    } catch (error) {
      console.warn('[AdminLeads] Failed to load leads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const csv = await exportLeadsCsvUnified();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `leads_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Fix memory leak: revoke object URL after download
      URL.revokeObjectURL(url);
    } catch (error) {
      console.warn('[AdminLeads] Failed to export leads:', error);
    }
  };

  const handleRefresh = () => {
    loadLeads();
  };

  const handleClear = () => {
    clearLeadsLocal();
    setLeadsData({ local: [], supabase: leadsData.supabase, all: leadsData.supabase });
    setShowClearConfirm(false);
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Unauthorized</h1>
          <p className="text-gray-600 mb-4">
            This page requires an admin token. Please provide a valid token in the URL.
          </p>
          <p className="text-sm text-gray-500">
            Example: <code className="bg-gray-100 px-2 py-1 rounded">/admin/leads?token=your_token</code>
          </p>
        </div>
      </div>
    );
  }

  const { local, supabase, all } = leadsData;
  const displayLeads = activeTab === 'all' 
    ? all.map(l => ({ ...l, _source: local.some(ll => ll.id === l.id) ? 'local' : 'supabase' }))
    : activeTab === 'local'
    ? local.map(l => ({ ...l, _source: 'local' }))
    : supabase.map(l => ({ ...l, _source: 'supabase' }));

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Leads Management</h1>
              <p className="text-gray-600 mt-1">
                <span className="font-medium">{all.length} total</span>
                {' • '}
                <span className="text-gray-500">{local.length} local</span>
                {supabase.length > 0 && (
                  <>
                    {' • '}
                    <span className="text-purple-600">{supabase.length} Supabase</span>
                  </>
                )}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                title="Reload local and Supabase leads"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                {import.meta.env.VITE_SUPABASE_URL ? 'Load from Supabase' : 'Refresh'}
              </button>
              <button
                onClick={handleExport}
                disabled={all.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={() => setShowClearConfirm(true)}
                disabled={local.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Clear Local Leads
              </button>
            </div>
          </div>
        </div>

        {/* Supabase Error Banner */}
        {supabaseError && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-yellow-800 mb-1">Supabase Connection Error</h3>
                <p className="text-sm text-yellow-700">{supabaseError}</p>
                <p className="text-xs text-yellow-600 mt-2">
                  Make sure the Edge Function is deployed and environment variables are set correctly. See README_SUPABASE.md for setup instructions.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        {supabase.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex gap-2 border-b border-gray-200">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'all'
                    ? 'border-teal-600 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                All ({all.length})
              </button>
              <button
                onClick={() => setActiveTab('local')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'local'
                    ? 'border-teal-600 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                LocalStorage ({local.length})
              </button>
              <button
                onClick={() => setActiveTab('supabase')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === 'supabase'
                    ? 'border-teal-600 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Database className="w-4 h-4" />
                Supabase ({supabase.length})
              </button>
            </div>
          </div>
        )}

        {showClearConfirm && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border-2 border-red-200">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Clear Local Leads</h3>
                <p className="text-gray-600 mb-4">
                  This will permanently delete all {local.length} leads from localStorage. Supabase leads will remain untouched. This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleClear}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Yes, Clear Local Leads
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {displayLeads.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500 text-lg">No leads found.</p>
            <p className="text-gray-400 text-sm mt-2">
              Leads will appear here when users submit the contact form or complete onboarding.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Storage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Treatment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timeline
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Language
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Page URL
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      UTM Source
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Device
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {displayLeads.map((lead: any) => (
                    <tr key={lead.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(lead.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${
                          lead._source === 'supabase'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {lead._source === 'supabase' && <Database className="w-3 h-3" />}
                          {lead._source === 'supabase' ? 'Supabase' : 'Local'}
                        </span>
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lead.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lead.email || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lead.phone || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lead.treatment || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lead.timeline || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lead.lang || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {lead.pageUrl || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {lead.utmSource || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {lead.device || '-'}
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
