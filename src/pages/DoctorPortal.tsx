import React, { useState, useEffect } from 'react'; // React imported for types if needed
import {
  Users,
  Calendar,
  Activity,
  Settings,
  LogOut,
  Menu,
  X,
  MessageSquare,
  Search,
  Filter
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import DoctorDashboard from '@/components/doctor/DoctorDashboard';
import { apiFetchAuth } from '@/lib/api';

// Types
interface Lead {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  treatment: string;
  message: string;
  status: string;
  source: string;
  assigned_to?: string;
  doctor_notes?: string;
  doctor_review_status?: 'pending' | 'approved' | 'rejected' | 'more_info';
  doctor_assigned_at?: string;
  updated_at?: string;
  ref?: string; // Add ref for compatibility
}

export default function DoctorPortal() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'aegis' | 'classic'>('aegis'); // Default to Aegis

  // Lazy load Aegis to keep bundle size optimized
  const AegisDashboard = React.useMemo(() => React.lazy(() => import('@/components/doctor/DeepDesign/AegisDashboard')), []);

  // Filter states
  // const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'schedule'>('overview');

  useEffect(() => {
    loadLeads('unread');
  }, []);

  const loadLeads = async (bucket: 'unread' | 'reviewed' = 'unread') => {
    if (!user) return;

    // setIsLoading(true); // Removed unused state
    // setError(null); // Removed unused state

    // DEMO MODE BYPASS
    if (import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true') {
      console.log('⚡️ DEMO MODE: Returning mock leads');
      await new Promise(r => setTimeout(r, 600)); // Simulate network
      setLeads([
        {
          id: '123',
          ref: '123',
          name: 'Sarah Connor',
          treatment: 'Smile Makeover',
          message: 'I want to fix my smile.',
          status: 'new',
          created_at: new Date().toISOString(),
          email: 'sarah@example.com',
          phone: '+1234567890',
          country: 'UK',
          source: 'instagram',
          doctor_review_status: 'pending',
          doctor_assigned_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '124',
          ref: '124',
          name: 'John Wick',
          treatment: 'Implants',
          message: 'Need urgent care.',
          status: 'new',
          created_at: new Date().toISOString(),
          email: 'john@example.com',
          phone: '+1987654321',
          country: 'USA',
          source: 'google',
          doctor_review_status: 'pending',
          doctor_assigned_at: new Date(Date.now() - 86400000).toISOString(),
          updated_at: new Date().toISOString()
        }
      ]);
      // setIsLoading(false);
      return;
    }

    try {
      const response = await apiFetchAuth(`/api/doctor/leads?bucket=${bucket}`);
      const result = await response.json().catch(() => ({ ok: false, error: 'Invalid JSON response' }));

      if (!result.ok) {
        const errorMsg = result.error || 'Failed to load leads';
        // const requestId = result.requestId || 'N/A';
        // const buildSha = result.buildSha || 'N/A';
        // const fullErrorMsg = `${errorMsg} (requestId: ${requestId}${buildSha !== 'N/A' ? ` / build: ${buildSha}` : ''})`;
        // setError(fullErrorMsg);
        toast.error(errorMsg);
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
      const errorMessage = err instanceof Error ? err.message : 'Failed to load leads';
      toast.error(errorMessage);
      setLeads([]);
    } finally {
      // setIsLoading(false);
    }
  };

  const metrics = {
    pendingReviews: leads.filter(l => l.doctor_review_status === 'pending').length,
    urgentCases: leads.filter(l => l.message.toLowerCase().includes('urgent') || l.treatment.toLowerCase().includes('implant')).length,
    todaySurgeries: 0, // Mock for now
    revenueThisMonth: 145000 // Mock for now
  };

  return (
    <div className="h-full flex flex-col">
      {/* Dashboard View Switcher */}
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white tracking-tight">Clinical Overview</h2>
        <div className="bg-slate-800/50 p-1 rounded-xl inline-flex border border-white/10 backdrop-blur-md">
          <button
            onClick={() => setViewMode('aegis')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${viewMode === 'aegis' ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            Aegis View
          </button>
          <button
            onClick={() => setViewMode('classic')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${viewMode === 'classic' ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            Classic View
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        {viewMode === 'aegis' ? (
          <React.Suspense fallback={<div className="p-10 text-center text-teal-400/50 animate-pulse">Initializing Aegis Core...</div>}>
            <AegisDashboard leads={leads} onNavigate={(path: string) => navigate(path)} />
          </React.Suspense>
        ) : (
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-6 shadow-2xl h-full overflow-y-auto">
            <DoctorDashboard
              doctorName={user?.user_metadata?.full_name || "Dr. Emre"}
              metrics={metrics}
              recentLeads={leads}
              onNavigate={(path: string) => navigate(path)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
