// src/pages/DoctorLeadView.tsx
// Clean doctor lead view - separate from AdminPatientProfile to avoid #301 errors

import { useState, useEffect, useContext } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { NavigationContext } from '@/App';
import { useAuthStore } from '@/store/authStore';
import { apiJsonAuth } from '@/lib/api';
import { toast } from 'sonner';
import { ArrowLeft, Brain, RefreshCw, FileText } from 'lucide-react';
import DoctorNotePanel from '@/components/doctor/DoctorNotePanel';
import DebugHud from '@/components/DebugHud';

interface Lead {
  id: string;
  lead_uuid?: string | null;
  case_code?: string | null;
  created_at?: string;
  patient_name?: string | null;
  original_message?: string | null;
  initial_message?: string | null;
  message?: string | null;
  stage?: string | null;
}

export default function DoctorLeadView() {
  const { ref } = useParams<{ ref?: string }>();
  const location = useLocation();
  const { navigate, params: contextParams } = useContext(NavigationContext);
  const { role } = useAuthStore();

  // Compute leadRef robustly (from params, query, context, or pathname)
  const qs = new URLSearchParams(location.search);
  const leadRef = (() => {
    const raw =
      ref ||
      contextParams?.ref ||
      contextParams?.leadRef ||
      contextParams?.leadId ||
      contextParams?.id ||
      qs.get('ref') ||
      qs.get('lead_id') ||
      qs.get('id') ||
      location.pathname.split('/').filter(Boolean).pop() ||
      '';
    return decodeURIComponent(String(raw)).replace(/^CASE-/, '').trim() || null;
  })();

  const [lead, setLead] = useState<Lead | null>(null);
  const [isLoadingLead, setIsLoadingLead] = useState(true);
  const [doctorBrief, setDoctorBrief] = useState<string | null>(null);
  const [isLoadingDoctorBrief, setIsLoadingDoctorBrief] = useState(false);

  // Redirect if not doctor
  useEffect(() => {
    if (role && role !== 'doctor') {
      navigate('/');
    }
  }, [role, navigate]);

  // Fetch lead minimal info
  useEffect(() => {
    if (!leadRef) {
      setIsLoadingLead(false);
      return;
    }

    const fetchLead = async () => {
      setIsLoadingLead(true);
      try {
        // Try fetching from leads list and filter (this endpoint exists and respects doctor RLS)
        const leadsResult = await apiJsonAuth<{ ok: true; leads: Lead[] }>(
          '/api/doctor/leads?bucket=unread'
        );
        if (leadsResult.ok && leadsResult.leads) {
          const found = leadsResult.leads.find(
            (l) =>
              l.id === leadRef ||
              l.lead_uuid === leadRef ||
              l.case_code === leadRef ||
              l.case_code === `CASE-${leadRef}`
          );
          if (found) {
            setLead(found);
          } else {
            // Try reviewed bucket
            const reviewedResult = await apiJsonAuth<{ ok: true; leads: Lead[] }>(
              '/api/doctor/leads?bucket=reviewed'
            );
            if (reviewedResult.ok && reviewedResult.leads) {
              const foundReviewed = reviewedResult.leads.find(
                (l) =>
                  l.id === leadRef ||
                  l.lead_uuid === leadRef ||
                  l.case_code === leadRef ||
                  l.case_code === `CASE-${leadRef}`
              );
              if (foundReviewed) {
                setLead(foundReviewed);
              } else {
                toast.error('Lead not found in your assigned leads');
              }
            } else {
              toast.error('Lead not found in your assigned leads');
            }
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load lead';
        toast.error(errorMessage);
        console.error('[DoctorLeadView] Fetch error:', err);
      } finally {
        setIsLoadingLead(false);
      }
    };

    fetchLead();
  }, [leadRef]);

  // Generate Doctor AI Brief
  const handleGenerateBrief = async () => {
    if (!leadRef) {
      toast.error('LeadRef missing in URL.');
      return;
    }

    setIsLoadingDoctorBrief(true);
    try {
      const result = await apiJsonAuth<{ ok: true; brief: string; requestId?: string }>(
        `/api/doctor/ai/brief`,
        {
          method: 'POST',
          body: JSON.stringify({ ref: leadRef, lead_ref: leadRef }),
        }
      );

      if (result.ok && result.brief) {
        setDoctorBrief(result.brief);
        toast.success('Doctor brief generated');
      } else {
        throw new Error('Failed to generate brief');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate doctor brief';
      toast.error(errorMessage);
      console.error('[Doctor AI Brief] Error:', err);
    } finally {
      setIsLoadingDoctorBrief(false);
    }
  };

  const isDoctorPath = location.pathname.startsWith('/doctor/');

  if (isLoadingLead) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-3 text-gray-600">Loading lead...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!leadRef) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="p-4 rounded-lg bg-red-50 text-red-700 text-sm">
            Lead reference missing in URL. Please open from Doctor Inbox again.
          </div>
        </div>
      </div>
    );
  }

  const messageText = lead?.original_message || lead?.initial_message || lead?.message || 'No message available';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Debug HUD (optional) */}
        {isDoctorPath && (
          <DebugHud
            leadRef={leadRef}
            isDoctorPath={isDoctorPath}
            finalIsDoctorMode={true}
            isLoadingDoctorBrief={isLoadingDoctorBrief}
          />
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/doctor')}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Inbox
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Doctor Lead</h1>
            {lead?.case_code && (
              <span className="text-sm text-gray-500 font-mono">{lead.case_code}</span>
            )}
          </div>
        </div>

        {/* Original Message Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-600" />
            Original Message
          </h2>
          <div className="prose prose-sm max-w-none">
            <div className="text-sm text-gray-700 whitespace-pre-wrap break-words border border-gray-200 rounded-lg p-4 bg-gray-50">
              {messageText}
            </div>
          </div>
        </div>

        {/* Doctor AI Brief Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Brain className="w-5 h-5 text-teal-600" />
              <span>Doctor AI Brief</span>
            </h2>
            <button
              type="button"
              onClick={handleGenerateBrief}
              disabled={isLoadingDoctorBrief || !leadRef}
              title={
                isLoadingDoctorBrief || !leadRef
                  ? `disabled: loading=${isLoadingDoctorBrief} leadRef=${leadRef}`
                  : 'ready'
              }
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
          </div>

          {doctorBrief ? (
            <div className="prose prose-sm max-w-none">
              <div className="text-sm text-gray-700 whitespace-pre-wrap break-words border-t border-gray-100 pt-4">
                {doctorBrief}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500">
              Click "Generate Doctor AI Brief" to create a PII-safe clinical review brief.
            </p>
          )}
        </div>

        {/* Doctor Note Panel - ALWAYS render when leadRef exists */}
        {leadRef && (
          <DoctorNotePanel lead={lead} leadRef={leadRef} />
        )}
      </div>
    </div>
  );
}

