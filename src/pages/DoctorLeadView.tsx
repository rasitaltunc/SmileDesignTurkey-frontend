// src/pages/DoctorLeadView.tsx
// Hook-safe DoctorLeadView - prevents React #301 errors

import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { apiJsonAuth } from '@/lib/api';
import { toast } from 'sonner';
import { ArrowLeft, Brain, RefreshCw, FileText } from 'lucide-react';
import DoctorNotePanel from '@/components/doctor/DoctorNotePanel';

// Parse AI Brief response (handles JSON string or plain text)
function parseAIBrief(raw: string): React.ReactNode {
  if (!raw) return null;
  
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    // If it's structured JSON, render nicely
    if (typeof parsed === 'object' && parsed !== null) {
      return (
        <div className="space-y-4">
          {parsed.one_line_case && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-xs font-semibold text-blue-900 uppercase mb-1">Summary</div>
              <div className="text-sm text-blue-800">{parsed.one_line_case}</div>
            </div>
          )}
          {parsed.top_3_findings && Array.isArray(parsed.top_3_findings) && parsed.top_3_findings.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-900 uppercase mb-2">Top Findings</div>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                {parsed.top_3_findings.map((finding: string, idx: number) => (
                  <li key={idx}>{finding}</li>
                ))}
              </ul>
            </div>
          )}
          {parsed.top_3_questions && Array.isArray(parsed.top_3_questions) && parsed.top_3_questions.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-900 uppercase mb-2">Questions</div>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                {parsed.top_3_questions.map((question: string, idx: number) => (
                  <li key={idx}>{question}</li>
                ))}
              </ul>
            </div>
          )}
          {parsed.suggested_direction && (
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
              <div className="text-xs font-semibold text-teal-900 uppercase mb-1">Suggested Direction</div>
              <div className="text-sm text-teal-800">{parsed.suggested_direction}</div>
            </div>
          )}
          {/* Fallback: show full JSON if other fields exist */}
          {!parsed.one_line_case && !parsed.top_3_findings && !parsed.top_3_questions && !parsed.suggested_direction && (
            <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(parsed, null, 2)}</pre>
          )}
        </div>
      );
    }
    return <pre className="whitespace-pre-wrap">{JSON.stringify(parsed, null, 2)}</pre>;
  } catch {
    // Not JSON, render as plain text
    return <pre className="whitespace-pre-wrap">{raw}</pre>;
  }
}

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
  const [doctorBrief, setDoctorBrief] = useState<string | null>(null);
  const [isLoadingDoctorBrief, setIsLoadingDoctorBrief] = useState(false);

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

  // ✅ Generate Doctor AI Brief - only in event handler, never in render
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

  // ✅ Render - no setState, no navigate, no conditional hooks
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
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 disabled:bg-gray-100 disabled:text-gray-700 disabled:border disabled:border-gray-200 disabled:cursor-not-allowed transition-colors"
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
                  {parseAIBrief(doctorBrief)}
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
        </>
      )}
    </div>
  );
}
