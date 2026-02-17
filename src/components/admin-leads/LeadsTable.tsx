import React from 'react';
import { FormInput } from '@/components/ui/FormInput';
import { X, Save, MessageSquare, CheckCircle2, Phone, Mail, MessageCircle, Copy, ChevronRight } from 'lucide-react';
import { useRedZone } from '@/hooks/useRedZone';
import { InterventionToast } from '@/components/ui/InterventionToast';

// Types
export interface LeadRowVM {
  // Lead data
  id: string;
  created_at: string;
  name?: string;
  email?: string;
  phone?: string;
  source?: string;
  source_label?: string;
  treatment?: string;
  treatment_type?: string;
  status?: string;
  notes?: string;
  assigned_to?: string;
  follow_up_at?: string | null;
  next_action?: string | null;
  last_contacted_at?: string | null;

  // Computed fields
  priorityBadge: { emoji: string; label: string; color: string };
  priorityScore: number;
  canonicalRisk: number | null;
  canonicalNBA: { label: string; script: string[] } | null;
  canonicalMissing: string[];
  needsNormalize: boolean;
  isStale: boolean;
  daysSinceActivity: number;
  hasBrief: boolean;
  hasNotes: boolean;
  hasPhone: boolean;
  hasEmail: boolean;
  nextAction: { icon: string; label: string; action: string };
  actionReasoning: string;

  // Computed UI helpers
  whatsAppUrl: string | null;
  isWhatsAppLead: boolean;
  isOnboardingLead: boolean;
  followUpStatus: 'overdue' | 'due_soon' | null;
}

export interface LeadStatusOption {
  value: string;
  label: string;
}

export interface Employee {
  id: string;
  full_name?: string;
  email?: string;
}

interface LeadsTableProps {
  rows: LeadRowVM[];
  isLoading: boolean;
  searchQuery: string;
  activeLeadId: string | null;
  editingLeadId: string | null;
  editStatus: string;
  editFollowUpAt: string;
  editNotes: string;
  role: string;
  employees: Employee[];
  selectedEmployeeByLead: Record<string, string>;
  assigningLeadId: string | null;
  leadRowRefs: React.MutableRefObject<Record<string, HTMLTableRowElement | null>>;
  leadStatusOptions: LeadStatusOption[];
  leadStatusLabels: Record<string, string>;

  // Callbacks
  onRowClick: (leadId: string) => void;
  onOpenNotes: (leadId: string) => void;
  onEditStart: (leadId: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onStatusChange: (value: string) => void;
  onFollowUpChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onMarkContacted: (leadId: string) => void;
  onAssignChange: (leadId: string, employeeId: string) => void;
  onNextAction: (row: LeadRowVM, action: string) => void | Promise<void>;
  onCopyScript: (script: string[]) => void;
  onCopyContact: (phone: string | undefined, email: string | undefined) => void;
  onEmailClick?: (email: string) => void;
}

export default function LeadsTable({
  rows,
  isLoading,
  searchQuery,
  activeLeadId,
  editingLeadId,
  editStatus,
  editFollowUpAt,
  editNotes,
  role,
  employees,
  selectedEmployeeByLead,
  assigningLeadId,
  leadRowRefs,
  leadStatusOptions,
  leadStatusLabels,
  onRowClick,
  onOpenNotes,
  onEditStart,
  onEditSave,
  onEditCancel,
  onStatusChange,
  onFollowUpChange,
  onNotesChange,
  onMarkContacted,
  onAssignChange,
  onNextAction,
  onCopyScript,
  onCopyContact,
  onEmailClick,
}: LeadsTableProps) {
  // Red Zone Hook
  const { detectedZone, checkInput, dismissZone } = useRedZone();

  const handleCopyScript = (text: string) => {
    onNotesChange(text);
    dismissZone();
  };
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-12 text-center">
        <p className="text-gray-500 text-lg">
          {searchQuery.trim() ? 'No leads match your search.' : 'No leads found.'}
        </p>
        <p className="text-gray-400 text-sm mt-2">
          {isLoading ? 'Loading...' : searchQuery.trim() ? 'Try a different search term.' : 'Try adjusting your filters or check back later.'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-[1100px] w-full" style={{ tableLayout: 'fixed', width: '100%' }}>
          <colgroup>
            <col style={{ width: '140px' }} /> {/* Created */}
            <col style={{ width: '150px' }} /> {/* Name */}
            <col style={{ width: '180px' }} /> {/* Email */}
            <col style={{ width: '150px' }} /> {/* Phone */}
            <col style={{ width: '160px' }} /> {/* Source */}
            <col style={{ width: '176px' }} /> {/* Treatment */}
            <col style={{ width: '120px' }} /> {/* Status */}
            <col style={{ width: '140px' }} /> {/* Follow-up */}
            <col style={{ width: '140px' }} /> {/* Assigned To */}
            <col style={{ width: '220px' }} /> {/* Notes */}
            <col style={{ width: '200px' }} /> {/* Actions */}
          </colgroup>
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">Source</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-44">Treatment</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Follow-up</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky right-0 bg-gray-50 z-10 border-l border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.map((row) => {
              const isEditing = editingLeadId === row.id;
              const isActive = activeLeadId === row.id;

              return (
                <React.Fragment key={row.id}>
                  <tr
                    ref={(el) => { leadRowRefs.current[row.id] = el; }}
                    onClick={() => onRowClick(row.id)}
                    className={`hover:bg-gray-50 group cursor-pointer transition-colors ${isActive ? "bg-blue-50/40 border-blue-300 ring-2 ring-blue-200" : ""
                      }`}
                  >
                    {/* Created */}
                    <td className="px-6 py-4 align-middle text-sm text-gray-700 leading-5">
                      <div className="flex flex-col gap-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-gray-500">{new Date(row.created_at).toLocaleString()}</span>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${row.priorityBadge.color}`}>
                            {row.priorityBadge.emoji} {row.priorityBadge.label}
                          </span>
                          {row.canonicalRisk !== null && (
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium bg-gray-50 text-gray-700 ring-1 ring-gray-100">
                              Risk {row.canonicalRisk}
                            </span>
                          )}
                          {row.isStale && (
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium bg-gray-50 text-gray-700 ring-1 ring-gray-100">
                              ⏳ {row.daysSinceActivity}d no activity
                            </span>
                          )}
                          {row.needsNormalize && (
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium bg-orange-50 text-orange-700 ring-1 ring-orange-100">
                              AI outdated
                            </span>
                          )}
                          {row.next_action && (() => {
                            const actionLabels: Record<string, string> = {
                              send_whatsapp: "Send WhatsApp",
                              request_photos: "Request photos",
                              doctor_review: "Doctor review",
                              offer_sent: "Offer sent",
                              book_call: "Book call",
                            };
                            const label = actionLabels[row.next_action!] || row.next_action;
                            return (
                              <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium bg-teal-50 text-teal-700 ring-1 ring-teal-100">
                                📋 {label}
                              </span>
                            );
                          })()}
                          {row.follow_up_at && row.followUpStatus && (
                            row.followUpStatus === 'overdue' ? (
                              <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium bg-red-50 text-red-700 ring-1 ring-red-100">
                                ⚠️ Overdue
                              </span>
                            ) : row.followUpStatus === 'due_soon' ? (
                              <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium bg-yellow-50 text-yellow-700 ring-1 ring-yellow-100">
                                ⏰ Due soon
                              </span>
                            ) : null
                          )}
                        </div>
                        {row.canonicalNBA && row.canonicalNBA.label && (
                          <div className="text-xs text-gray-700 font-medium truncate max-w-[300px]" title={row.canonicalNBA.label}>
                            Next: {row.canonicalNBA.label}
                          </div>
                        )}
                        {row.canonicalMissing.length > 0 && (
                          <div className="flex flex-wrap gap-1 max-w-[300px]">
                            {row.canonicalMissing.slice(0, 3).map((field, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium bg-yellow-50 text-yellow-700 ring-1 ring-yellow-100">
                                {field}
                              </span>
                            ))}
                            {row.canonicalMissing.length > 3 && (
                              <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium bg-gray-50 text-gray-700 ring-1 ring-gray-100">
                                +{row.canonicalMissing.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                        {!row.canonicalNBA && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenNotes(row.id);
                            }}
                            className="text-xs text-purple-600 hover:text-purple-700 underline"
                          >
                            Open Notes to generate snapshot
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Name */}
                    <td className="px-6 py-4 align-middle text-sm text-gray-700 leading-5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRowClick(row.id);
                        }}
                        className="text-teal-600 hover:text-teal-700 hover:underline font-medium truncate block max-w-full"
                        title="Open Profile"
                      >
                        {row.name || '-'}
                      </button>
                    </td>

                    {/* Email */}
                    {/* Email */}
                    <td className="px-6 py-4 align-middle text-sm text-gray-700 leading-5 whitespace-nowrap truncate max-w-[200px]">
                      <button onClick={() => onEmailClick?.(row.email!)} className="text-blue-600 hover:underline cursor-pointer">
                        {row.email || '-'}
                      </button>
                    </td>

                    {/* Phone */}
                    <td className="px-6 py-4 align-top text-sm text-gray-700">
                      {(() => {
                        const phoneText = row.phone ?? "-";
                        const waUrl = row.isWhatsAppLead ? row.whatsAppUrl : null;

                        if (!waUrl || phoneText === "-") {
                          return <span className="text-sm text-gray-700">{phoneText}</span>;
                        }

                        return (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm text-gray-900 hover:text-teal-700 underline decoration-teal-300 underline-offset-2"
                            title="Open WhatsApp"
                          >
                            {phoneText}
                          </a>
                        );
                      })()}
                    </td>

                    {/* Source */}
                    <td className="px-6 py-4 align-top text-sm text-gray-700">
                      {row.isOnboardingLead ? (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-900 ring-1 ring-inset ring-blue-200">
                          Onboarding
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>

                    {/* Treatment */}
                    <td className="px-6 py-4 align-top w-44">
                      <div className="text-sm text-gray-900 truncate">{row.treatment ?? "-"}</div>
                      {row.treatment_type && (
                        <div className="mt-1 text-xs text-gray-500 truncate">{row.treatment_type}</div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 align-middle text-sm text-gray-700 leading-5">
                      {isEditing ? (
                        <div className="flex flex-col gap-2">
                          <select
                            value={editStatus}
                            onChange={(e) => onStatusChange(e.target.value)}
                            className="text-sm border border-gray-300 rounded px-2 py-1"
                          >
                            {leadStatusOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditSave();
                              }}
                              className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                            >
                              <Save className="w-3 h-3" />
                              Save
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditCancel();
                              }}
                              className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center gap-1"
                            >
                              <X className="w-3 h-3" />
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${(row.status?.toLowerCase() || 'new') === 'new' ? 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-100' :
                          row.status?.toLowerCase() === 'contacted' ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-100' :
                            row.status?.toLowerCase() === 'deposit_paid' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100' :
                              row.status?.toLowerCase() === 'appointment_set' ? 'bg-purple-50 text-purple-700 ring-1 ring-purple-100' :
                                row.status?.toLowerCase() === 'arrived' ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100' :
                                  row.status?.toLowerCase() === 'completed' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100' :
                                    row.status?.toLowerCase() === 'lost' ? 'bg-gray-50 text-gray-700 ring-1 ring-gray-100' :
                                      'bg-gray-50 text-gray-700 ring-1 ring-gray-100'
                          }`}>
                          {leadStatusLabels[row.status?.toLowerCase() || 'new'] ||
                            (row.status ? row.status.charAt(0).toUpperCase() + row.status.slice(1).replace(/_/g, ' ') : 'New Lead')}
                        </span>
                      )}
                    </td>

                    {/* Follow-up */}
                    <td className="px-6 py-4 align-middle text-sm text-gray-700 leading-5 truncate max-w-[180px]">
                      {isEditing ? (
                        <div className="flex flex-col gap-2">
                          <input
                            type="datetime-local"
                            value={editFollowUpAt}
                            onChange={(e) => onFollowUpChange(e.target.value)}
                            className="text-sm border border-gray-300 rounded px-2 py-1"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditSave();
                              }}
                              className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                            >
                              <Save className="w-3 h-3" />
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditCancel();
                              }}
                              className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center gap-1"
                            >
                              <X className="w-3 h-3" />
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-700 truncate block">
                          {row.follow_up_at
                            ? new Date(row.follow_up_at).toLocaleString()
                            : '-'}
                        </span>
                      )}
                    </td>

                    {/* Assigned To */}
                    <td className="px-6 py-4 align-middle text-sm text-gray-700 leading-5 truncate max-w-[150px]">
                      {role === 'admin' ? (
                        <div className="flex items-center gap-2 min-w-0">
                          <select
                            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm bg-white"
                            value={selectedEmployeeByLead[row.id] ?? row.assigned_to ?? ""}
                            onChange={(e) => onAssignChange(row.id, e.target.value)}
                          >
                            <option value="">Unassigned</option>
                            {employees.map((emp) => (
                              <option key={emp.id} value={emp.id}>
                                {emp.full_name || emp.email || emp.id}
                              </option>
                            ))}
                          </select>
                          {assigningLeadId === row.id && (
                            <span className="text-xs text-gray-500 whitespace-nowrap">Saving…</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-600">
                          {row.assigned_to ? row.assigned_to : 'Unassigned'}
                        </span>
                      )}
                    </td>

                    {/* Notes */}
                    <td className="px-6 py-4 text-sm text-gray-500 overflow-hidden" style={{ width: '220px', maxWidth: '220px' }}>
                      {isEditing ? (
                        <div className="flex flex-col gap-2 relative">
                          <InterventionToast
                            zone={detectedZone}
                            onDismiss={dismissZone}
                            onCopy={handleCopyScript}
                          />
                          <FormInput
                            value={editNotes}
                            onChange={(e) => {
                              onNotesChange(e.target.value);
                              checkInput(e.target.value);
                            }}
                            placeholder="Add notes..."
                            className="w-full"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditSave();
                              }}
                              className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                            >
                              <Save className="w-3 h-3" />
                              Save
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditCancel();
                              }}
                              className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center gap-1"
                            >
                              <X className="w-3 h-3" />
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="block truncate" title={row.notes || undefined}>
                          {row.notes || '-'}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-sm sticky right-0 bg-white group-hover:bg-gray-50 z-10 border-l border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
                      {isEditing ? (
                        <div className="flex gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditSave();
                            }}
                            className="text-green-600 hover:text-green-700 shrink-0"
                            title="Save"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditCancel();
                            }}
                            className="text-gray-600 hover:text-gray-700 shrink-0"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenNotes(row.id);
                            }}
                            className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors shrink-0"
                            title="Open Notes"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          {isActive && (
                            <div className="flex items-center gap-1 flex-wrap shrink-0">
                              {row.canonicalNBA?.script && row.canonicalNBA.script.length > 0 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onCopyScript(row.canonicalNBA!.script);
                                  }}
                                  className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                  title="Copy NBA script"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onMarkContacted(row.id);
                                }}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                                title="Mark as contacted"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              {row.hasPhone && (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onNextAction(row, 'call');
                                    }}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="Call"
                                  >
                                    <Phone className="w-4 h-4" />
                                  </button>
                                  {row.whatsAppUrl && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onNextAction(row, 'whatsapp');
                                      }}
                                      className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                                      title="WhatsApp"
                                    >
                                      <MessageCircle className="w-4 h-4" />
                                    </button>
                                  )}
                                </>
                              )}
                              {row.hasEmail && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onNextAction(row, 'email');
                                  }}
                                  className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                  title="Email"
                                >
                                  <Mail className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCopyContact(row.phone, row.email);
                                }}
                                className="p-1.5 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                                title="Copy contact"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditStart(row.id);
                            }}
                            className="text-blue-600 hover:text-blue-700 text-xs shrink-0"
                          >
                            Edit
                          </button>
                          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                        </div>
                      )}
                    </td>
                  </tr>

                  {/* Next Best Action Row */}
                  <tr
                    key={`${row.id}-action`}
                    className={`${isActive ? "bg-blue-50/20" : "bg-gray-50/50"} border-t border-gray-100`}
                  >
                    <td colSpan={11} className="px-6 py-2">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span className="font-medium">Next:</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onNextAction(row, row.nextAction.action);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                          >
                            <span>{row.nextAction.icon}</span>
                            <span>{row.nextAction.label}</span>
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 italic ml-12">
                          {row.actionReasoning}
                        </p>
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

