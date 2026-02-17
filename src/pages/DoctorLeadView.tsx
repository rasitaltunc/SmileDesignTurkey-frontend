// src/pages/DoctorLeadView.tsx
// Hook-safe DoctorLeadView - prevents React #301 errors

import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { apiJsonAuth } from '@/lib/api';
import { toast } from '@/lib/toast';
import { ArrowLeft, RefreshCw, FileText } from 'lucide-react';
import DoctorNotePanel from '@/components/doctor/DoctorNotePanel';
import { DoctorBriefCard } from '@/components/DoctorBriefCard';



type Lead = any;

export default function DoctorLeadView() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // ✅ Hook-safe: useMemo for leadRef (no conditional hooks)
  const leadRef = useMemo(() => {
    const p = params.ref ? decodeURIComponent(params.ref) : null;
    if (p) return p.replace(/^CASE-/, '').trim() || null;

    const qs = new URLSearchParams(location.search);
    const q = qs.get("ref") || qs.get("leadRef");
    return q ? q.replace(/^CASE-/, '').trim() : null;
  }, [params.ref, location.search]);

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Fetch lead - only in useEffect, never in render
  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!leadRef) {
        setLead(null);
        setError("Missing lead ref");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // DEMO MODE BYPASS
        if (import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true') {
          console.log('⚡️ DEMO MODE: Returning mock lead details');
          await new Promise(r => setTimeout(r, 600));
          if (!cancelled) {
            setLead({
              id: '123',
              ref: '123',
              case_code: 'CASE-123',
              name: 'Sarah Connor',
              treatment: 'Smile Makeover',
              message: 'I want to fix my smile. It is very expensive though.',
              original_message: 'I want to fix my smile. It is very expensive though.',
              doctor_review_status: 'pending'
            });
          }
          return;
        }

        const result = await apiJsonAuth<{ ok: true; lead: Lead; documents?: any[] }>(
          `/api/doctor/lead?ref=${encodeURIComponent(leadRef)}`
        );

        if (!cancelled) {
          if (result.ok && result.lead) {
            setLead(result.lead);
          } else {
            setError("Lead not found or not assigned to you");
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? String(e));
          toast.error(e?.message ?? "Failed to load lead");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [leadRef]);
  return (
    <div className="space-y-6">
      {/* Debug info */}
      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
        <div><b>pathname:</b> {location.pathname}</div>
        <div><b>ref:</b> {leadRef ?? "null"}</div>
      </div>

      {/* Header */}
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

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-3 text-gray-600">Loading lead...</span>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="p-4 rounded-lg bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Lead content */}
      {lead && !loading && (
        <>
          {/* Original Message Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-600" />
              Original Message
            </h2>
            <div className="prose prose-sm max-w-none">
              <div className="text-sm text-gray-700 whitespace-pre-wrap break-words border border-gray-200 rounded-lg p-4 bg-gray-50">
                {lead.original_message || lead.initial_message || lead.message || 'No message available'}
              </div>
            </div>
          </div>

          {/* Doctor AI Brief Card */}
          <DoctorBriefCard leadId={lead?.id || (leadRef as string)} lead={lead} />

          {/* Doctor Note Panel - ALWAYS render when leadRef exists */}
          {leadRef && (
            <DoctorNotePanel lead={lead} leadRef={leadRef} />
          )}
        </>
      )}
    </div>
  );
}
