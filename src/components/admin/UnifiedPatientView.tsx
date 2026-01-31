import { useState, useEffect } from 'react';
import { apiJsonAuth } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, Mail, FileText, Upload } from 'lucide-react';

interface Lead {
  id: string;
  email: string;
  name: string;
  status: string;
  created_at: string;
}

interface TimelineEvent {
  type: 'note' | 'upload';
  lead_id: string;
  timestamp: string;
  data: any;
}

interface UnifiedPatientViewProps {
  email: string;
  onClose?: () => void;
}

export default function UnifiedPatientView({ email, onClose }: UnifiedPatientViewProps) {
  const [loading, setLoading] = useState(true);
  const [canonicalLead, setCanonicalLead] = useState<Lead | null>(null);
  const [historicalLeads, setHistoricalLeads] = useState<Lead[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetchUnifiedPatient();
  }, [email]);

  const fetchUnifiedPatient = async () => {
    setLoading(true);
    try {
      const result = await apiJsonAuth<{
        ok: boolean;
        canonical_lead: Lead & { is_canonical: boolean };
        historical_leads: Lead[];
        unified_timeline: TimelineEvent[];
        stats: any;
      }>(`/api/admin/patient/unified?email=${encodeURIComponent(email)}`);

      if (result.ok) {
        setCanonicalLead(result.canonical_lead);
        setHistoricalLeads(result.historical_leads);
        setTimeline(result.unified_timeline);
        setStats(result.stats);
      } else {
        toast.error('Failed to load patient');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error loading patient');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!canonicalLead) {
    return (
      <div className="p-6 bg-red-50 rounded-lg border border-red-200">
        <p className="text-red-700">Patient not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">{canonicalLead.name}</h2>
            <div className="flex items-center gap-2 mt-2 text-gray-600">
              <Mail className="w-4 h-4" />
              <span>{canonicalLead.email}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
              {canonicalLead.status}
            </div>
          </div>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border p-4">
            <div className="text-gray-600 text-sm">Total Leads</div>
            <div className="text-2xl font-bold">{stats.total_leads}</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-gray-600 text-sm">Notes</div>
            <div className="text-2xl font-bold">{stats.total_notes}</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-gray-600 text-sm">Uploads</div>
            <div className="text-2xl font-bold">{stats.total_uploads}</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-gray-600 text-sm">Last Activity</div>
            <div className="text-sm font-mono">
              {new Date(stats.last_activity).toLocaleDateString()}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border p-6">
        <h3 className="font-bold text-lg mb-4">Merged Timeline</h3>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {timeline.map((event, idx) => (
            <div key={idx} className="pb-3 border-b last:border-b-0">
              <div className="flex items-start gap-3">
                {event.type === 'note' ? (
                  <FileText className="w-4 h-4 text-blue-500 mt-1" />
                ) : (
                  <Upload className="w-4 h-4 text-green-500 mt-1" />
                )}
                <div className="flex-1">
                  <div className="text-sm font-medium capitalize">
                    {event.type === 'note' ? 'Note' : 'Upload'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(event.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {historicalLeads.length > 0 && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="font-bold text-lg mb-4">Historical Leads ({historicalLeads.length})</h3>
          <div className="space-y-2">
            {historicalLeads.map((lead) => (
              <div key={lead.id} className="p-3 bg-gray-50 rounded border">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium">{lead.name}</div>
                    <div className="text-xs text-gray-500">{lead.id}</div>
                  </div>
                  <div className="text-xs text-gray-600">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
