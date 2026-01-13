// src/components/doctor/DoctorNotePanel.tsx
// Doctor Note Panel - Create, edit, approve notes with signature and PDF

import { useState, useEffect, useCallback } from 'react';
import { apiJsonAuth } from '@/lib/api';
import { toast } from 'sonner';
import {
  FileText,
  Save,
  RefreshCw,
  CheckCircle2,
  Plus,
  Trash2,
  Edit2,
  X,
  Upload,
  Brain,
  Eye,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface DoctorNoteItem {
  id?: string;
  catalog_item_id?: string | null;
  catalog_item_name?: string;
  name?: string;
  qty: number;
  unit_price: number;
  unit_price_override?: number | null;
  notes?: string | null;
}

interface DoctorNote {
  id: string;
  lead_id: string;
  doctor_id: string;
  note_markdown: string | null;
  status: 'draft' | 'approved';
  approved_at: string | null;
  pdf_storage_path: string | null;
  created_at: string;
  updated_at: string;
}

interface SignatureInfo {
  signature_image_url: string;
  signed_at: string;
}

interface CatalogItem {
  id: string;
  name: string;
  kind: 'procedure' | 'material' | 'service';
  description?: string | null;
}

interface DoctorNotePanelProps {
  lead?: any; // Lead object (optional, may not be fully loaded)
  leadRef: string | null; // Normalized lead reference (CASE- prefix stripped)
}

export default function DoctorNotePanel({ lead, leadRef: propLeadRef }: DoctorNotePanelProps) {
  const [note, setNote] = useState<DoctorNote | null>(null);
  const [items, setItems] = useState<DoctorNoteItem[]>([]);
  const [signature, setSignature] = useState<SignatureInfo | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [noteMarkdown, setNoteMarkdown] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isLoadingSignature, setIsLoadingSignature] = useState(false);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);
  const [isLoadingEstimate, setIsLoadingEstimate] = useState(false);
  const [estimateText, setEstimateText] = useState('');
  const [estimateResults, setEstimateResults] = useState<{
    unmatched?: string[];
    questions?: string[];
    assumptions?: string[];
  } | null>(null);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogKind, setCatalogKind] = useState<'procedure' | 'material' | 'service'>('procedure');

  // Compute effectiveRef from all possible sources
  const effectiveRef = (() => {
    const candidates = [
      propLeadRef,
      lead?.ref,
      lead?.lead_uuid,
      lead?.id,
      (lead as any)?.case_code ? String((lead as any).case_code).replace(/^CASE-/, '').trim() : null,
    ].filter(Boolean);
    
    const raw = candidates[0] || '';
    const normalized = String(raw).replace(/^CASE-/, '').trim();
    return normalized || null;
  })();

  // ✅ Mount log
  console.log("[DoctorNotePanel] MOUNT", { leadRef: propLeadRef, effectiveRef, lead: !!lead });

  // Fetch note and related data (useCallback to prevent loop)
  const fetchNote = useCallback(async () => {
    if (!effectiveRef) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const result = await apiJsonAuth<{
        ok: true;
        note: DoctorNote | null;
        items: DoctorNoteItem[];
        signature: SignatureInfo | null;
        pdfUrl: string | null;
      }>(`/api/doctor/note?lead_id=${encodeURIComponent(effectiveRef)}`);

      if (result.ok) {
        if (result.note) {
          setNote(result.note);
          setNoteMarkdown(result.note.note_markdown || '');
          setItems(result.items || []);
          setSignature(result.signature || null);
          setPdfUrl(result.pdfUrl || null);
        } else {
          // No note exists, create one
          await createNote();
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch note';
      toast.error(errorMessage);
      console.error('[DoctorNotePanel] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveRef]);

  // Create note (useCallback to prevent loop)
  const createNote = useCallback(async () => {
    if (!effectiveRef) {
      toast.error('Lead reference missing');
      return;
    }

    try {
      const result = await apiJsonAuth<{ ok: true; note_id: string }>(
        '/api/doctor/note/create',
        {
          method: 'POST',
          body: JSON.stringify({ lead_id: effectiveRef }),
        }
      );

      if (result.ok && result.note_id) {
        // Refetch note after creation
        await fetchNote();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create note';
      toast.error(errorMessage);
      console.error('[DoctorNotePanel] Create error:', err);
    }
  }, [effectiveRef, fetchNote]);

  // Save note (auto-create if missing)
  const handleSave = async () => {
    if (!effectiveRef) {
      toast.error('Lead reference missing');
      return;
    }

    // Ensure note exists
    let noteId = note?.id;
    if (!noteId) {
      // Auto-create draft note
      try {
        const createResult = await apiJsonAuth<{ ok: true; note_id: string }>(
          '/api/doctor/note/create',
          {
            method: 'POST',
            body: JSON.stringify({ lead_id: effectiveRef }),
          }
        );
        if (createResult.ok && createResult.note_id) {
          noteId = createResult.note_id;
          await fetchNote(); // Refresh note state
        } else {
          toast.error('Failed to create note');
          return;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create note';
        toast.error(errorMessage);
        return;
      }
    }

    if (note?.status === 'approved') {
      toast.error('Cannot edit approved note');
      return;
    }

    setIsSaving(true);
    try {
      const result = await apiJsonAuth<{ ok: true }>(
        '/api/doctor/note/save',
        {
          method: 'POST',
          body: JSON.stringify({
            note_id: noteId,
            note_markdown: noteMarkdown,
            items: items.map((item) => ({
              catalog_item_id: item.catalog_item_id || null,
              name: item.catalog_item_name || item.name || '',
              qty: item.qty || 1,
              unit_price_override: item.unit_price_override || item.unit_price || null,
              notes: item.notes || null,
            })),
          }),
        }
      );

      if (result.ok) {
        toast.success('Note saved');
        await fetchNote(); // Refetch to get updated data
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save note';
      toast.error(errorMessage);
      console.error('[DoctorNotePanel] Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Approve note (auto-create if missing)
  const handleApprove = async () => {
    if (!effectiveRef) {
      toast.error('Lead reference missing');
      return;
    }

    // Ensure note exists
    let noteId = note?.id;
    if (!noteId) {
      // Auto-create draft note first
      try {
        const createResult = await apiJsonAuth<{ ok: true; note_id: string }>(
          '/api/doctor/note/create',
          {
            method: 'POST',
            body: JSON.stringify({ lead_id: effectiveRef }),
          }
        );
        if (createResult.ok && createResult.note_id) {
          noteId = createResult.note_id;
          await fetchNote(); // Refresh note state
        } else {
          toast.error('Failed to create note');
          return;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create note';
        toast.error(errorMessage);
        return;
      }
    }

    setIsApproving(true);
    try {
      const result = await apiJsonAuth<{ ok: true }>(
        '/api/doctor/note/approve',
        {
          method: 'POST',
          body: JSON.stringify({ note_id: noteId }),
        }
      );

      if (result.ok) {
        toast.success('Note approved and PDF generated');
        await fetchNote(); // Refetch to get updated PDF URL
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to approve note';
      toast.error(errorMessage);
      console.error('[DoctorNotePanel] Approve error:', err);
    } finally {
      setIsApproving(false);
    }
  };

  // View PDF
  const handleViewPDF = async () => {
    if (!note?.id) {
      toast.error('Note not found');
      return;
    }

    try {
      const result = await apiJsonAuth<{ ok: true; signedUrl: string }>(
        `/api/doctor/note/pdf?note_id=${encodeURIComponent(note.id)}`
      );

      if (result.ok && result.signedUrl) {
        window.open(result.signedUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load PDF';
      toast.error(errorMessage);
      console.error('[DoctorNotePanel] PDF error:', err);
    }
  };

  // Fetch signature (useCallback to prevent loop)
  const fetchSignature = useCallback(async () => {
    setIsLoadingSignature(true);
    try {
      const result = await apiJsonAuth<{
        ok: true;
        signature: {
          signature_storage_path: string;
          signed_at: string;
        } | null;
      }>('/api/doctor/signature');

      if (result.ok && result.signature) {
        setSignature({
          signature_image_url: result.signature.signature_storage_path,
          signed_at: result.signature.signed_at,
        });
      } else {
        setSignature(null);
      }
    } catch (err) {
      // Signature might not exist, that's OK
      setSignature(null);
    } finally {
      setIsLoadingSignature(false);
    }
  }, []);

  // Upload signature
  const handleSignatureUpload = async (file: File) => {
    setIsUploadingSignature(true);
    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        if (!base64) {
          toast.error('Failed to read file');
          setIsUploadingSignature(false);
          return;
        }

        try {
          const result = await apiJsonAuth<{ ok: true }>(
            '/api/doctor/signature/upload',
            {
              method: 'POST',
              body: JSON.stringify({
                base64Image: base64,
                displayName: null, // Optional, can be set from profile
                title: null, // Optional, can be set from profile
              }),
            }
          );

          if (result.ok) {
            toast.success('Signature uploaded');
            await fetchSignature();
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to upload signature';
          toast.error(errorMessage);
          console.error('[DoctorNotePanel] Signature upload error:', err);
        } finally {
          setIsUploadingSignature(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process file';
      toast.error(errorMessage);
      setIsUploadingSignature(false);
    }
  };

  // AI Estimate (auto-create note if missing)
  const handleAIEstimate = async () => {
    if (!effectiveRef || !estimateText.trim()) {
      toast.error('Please enter estimate text');
      return;
    }

    // Ensure note exists
    let noteId = note?.id;
    if (!noteId) {
      try {
        const createResult = await apiJsonAuth<{ ok: true; note_id: string }>(
          '/api/doctor/note/create',
          {
            method: 'POST',
            body: JSON.stringify({ lead_id: effectiveRef }),
          }
        );
        if (createResult.ok && createResult.note_id) {
          noteId = createResult.note_id;
          await fetchNote(); // Refresh note state
        } else {
          toast.error('Failed to create note');
          return;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create note';
        toast.error(errorMessage);
        return;
      }
    }

    setIsLoadingEstimate(true);
    setEstimateResults(null);
    try {
      const result = await apiJsonAuth<{
        ok: true;
        items?: DoctorNoteItem[];
        unmatched?: string[];
        questions?: string[];
        assumptions?: string[];
      }>(
        '/api/doctor/ai/estimate',
        {
          method: 'POST',
          body: JSON.stringify({
            note_id: noteId,
            estimate_text: estimateText,
          }),
        }
      );

      if (result.ok) {
        if (result.items && result.items.length > 0) {
          setItems(result.items);
          toast.success(`Added ${result.items.length} items from estimate`);
        }
        setEstimateResults({
          unmatched: result.unmatched || [],
          questions: result.questions || [],
          assumptions: result.assumptions || [],
        });
        setEstimateText(''); // Clear input
        await fetchNote(); // Refresh to get updated items
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate estimate';
      toast.error(errorMessage);
      console.error('[DoctorNotePanel] AI Estimate error:', err);
    } finally {
      setIsLoadingEstimate(false);
    }
  };

  // Fetch catalog items (gracefully handle missing endpoint)
  const fetchCatalogItems = async () => {
    try {
      const result = await apiJsonAuth<{ ok: true; items: CatalogItem[] }>(
        `/api/catalog/items?kind=${catalogKind}`
      );
      if (result.ok && result.items) {
        setCatalogItems(result.items);
      }
    } catch (err) {
      // Catalog endpoint might not exist, that's OK
      console.debug('[DoctorNotePanel] Catalog endpoint not available:', err);
      setCatalogItems([]);
    }
  };

  // Add item from catalog
  const handleAddCatalogItem = (catalogItem: CatalogItem) => {
    const newItem: DoctorNoteItem = {
      catalog_item_id: catalogItem.id,
      catalog_item_name: catalogItem.name,
      qty: 1,
      unit_price: 0, // Will be fetched from price book on save
      notes: null,
    };
    setItems([...items, newItem]);
    setShowAddItemModal(false);
    setCatalogSearch('');
  };

  // Add manual item
  const handleAddManualItem = () => {
    const newItem: DoctorNoteItem = {
      name: 'New Item',
      qty: 1,
      unit_price: 0,
      notes: null,
    };
    setItems([...items, newItem]);
  };

  // Update item
  const handleUpdateItem = (index: number, updates: Partial<DoctorNoteItem>) => {
    const updated = [...items];
    updated[index] = { ...updated[index], ...updates };
    setItems(updated);
  };

  // Remove item
  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Initialize (useCallback functions in deps to prevent loop)
  useEffect(() => {
    // ✅ Guard: only run if effectiveRef exists
    if (!effectiveRef) {
      setIsLoading(false);
      if (propLeadRef) {
        toast.error('Lead reference missing');
      }
      return;
    }

    fetchNote();
    fetchSignature();
  }, [effectiveRef, propLeadRef, fetchNote, fetchSignature]);

  // Load catalog when modal opens
  useEffect(() => {
    if (!showAddItemModal) return;

    let cancelled = false;

    const loadCatalog = async () => {
      try {
        const result = await apiJsonAuth<{ ok: true; items: CatalogItem[] }>(
          `/api/catalog/items?kind=${catalogKind}`
        );
        if (!cancelled && result.ok && result.items) {
          setCatalogItems(result.items);
        }
      } catch (err) {
        // Catalog endpoint might not exist, that's OK
        if (!cancelled) {
          console.debug('[DoctorNotePanel] Catalog endpoint not available:', err);
          setCatalogItems([]);
        }
      }
    };

    loadCatalog();

    return () => {
      cancelled = true;
    };
  }, [showAddItemModal, catalogKind]);

  const isApproved = note?.status === 'approved';
  const isLocked = isApproved;

  if (isLoading) {
    return (
      <div className="border border-gray-200 rounded-lg bg-white p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-3 text-gray-600">Loading note...</span>
        </div>
      </div>
    );
  }

  const filteredCatalog = catalogItems.filter((item) =>
    item.name.toLowerCase().includes(catalogSearch.toLowerCase())
  );

  return (
    <div className="border border-gray-200 rounded-lg bg-white p-6 space-y-6">
      {/* Debug marker */}
      <div className="text-xs text-gray-400 mb-2">
        DoctorNotePanel ✅ leadRef: <span className="font-mono">{String(effectiveRef)}</span>
      </div>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-600" />
            Doctor Note (Signed PDF)
          </h3>
          {note && (
            <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
              <span>
                Status: {isApproved ? 'Approved' : 'Draft'}
                {isApproved && (
                  <CheckCircle2 className="w-4 h-4 inline ml-1 text-green-600" />
                )}
              </span>
              {note.updated_at && (
                <span>Updated: {new Date(note.updated_at).toLocaleDateString()}</span>
              )}
              {note.approved_at && (
                <span>Approved: {new Date(note.approved_at).toLocaleDateString()}</span>
              )}
            </div>
          )}
        </div>
        {isApproved && pdfUrl && (
          <button
            onClick={handleViewPDF}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Eye className="w-4 h-4" />
            View PDF
          </button>
        )}
      </div>

      {/* Note Editor */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Note Markdown
        </label>
        <textarea
          value={noteMarkdown}
          onChange={(e) => setNoteMarkdown(e.target.value)}
          disabled={isLocked}
          rows={8}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          placeholder="Enter note content in markdown..."
        />
        {!isLocked && (
          <button
            onClick={handleSave}
            disabled={isSaving || !effectiveRef}
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Note
              </>
            )}
          </button>
        )}
      </div>

      {/* Items Table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700">
            Items ({items.length})
          </label>
          {!isLocked && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddItemModal(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add from Catalog
              </button>
              <button
                onClick={handleAddManualItem}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Manual
              </button>
            </div>
          )}
        </div>

        {items.length === 0 ? (
          <div className="border border-gray-200 rounded-lg p-8 text-center text-gray-500">
            No items yet. Add items from catalog or manually.
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Item
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Qty
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Unit Price
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Notes
                  </th>
                  {!isLocked && (
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item, index) => {
                  const total = (item.qty || 1) * (item.unit_price || 0);
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {item.catalog_item_name || item.name || 'Unknown'}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={item.qty || 1}
                          onChange={(e) =>
                            handleUpdateItem(index, { qty: parseInt(e.target.value) || 1 })
                          }
                          disabled={isLocked}
                          min="1"
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm disabled:bg-gray-100"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={item.unit_price || 0}
                          onChange={(e) =>
                            handleUpdateItem(index, {
                              unit_price: parseFloat(e.target.value) || 0,
                              unit_price_override: parseFloat(e.target.value) || 0,
                            })
                          }
                          disabled={isLocked}
                          step="0.01"
                          min="0"
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm disabled:bg-gray-100"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                        ${total.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={item.notes || ''}
                          onChange={(e) => handleUpdateItem(index, { notes: e.target.value })}
                          disabled={isLocked}
                          placeholder="Notes..."
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm disabled:bg-gray-100"
                        />
                      </td>
                      {!isLocked && (
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleRemoveItem(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* AI Estimate */}
      {!isLocked && (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            AI Estimate (Natural Language → Draft Items)
          </label>
          <textarea
            value={estimateText}
            onChange={(e) => setEstimateText(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            placeholder="Paste natural language estimate (e.g., '3 zirconia crowns, 1 root canal')..."
          />
          <button
            onClick={handleAIEstimate}
            disabled={isLoadingEstimate || !effectiveRef || !estimateText.trim()}
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isLoadingEstimate ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4" />
                AI Estimate → Draft Items
              </>
            )}
          </button>

          {estimateResults && (
            <div className="mt-4 space-y-2">
              {estimateResults.unmatched && estimateResults.unmatched.length > 0 && (
                <div className="text-sm">
                  <span className="font-medium text-orange-700">Unmatched:</span>{' '}
                  {estimateResults.unmatched.join(', ')}
                </div>
              )}
              {estimateResults.questions && estimateResults.questions.length > 0 && (
                <div className="text-sm">
                  <span className="font-medium text-blue-700">Questions:</span>{' '}
                  {estimateResults.questions.join(', ')}
                </div>
              )}
              {estimateResults.assumptions && estimateResults.assumptions.length > 0 && (
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Assumptions:</span>{' '}
                  {estimateResults.assumptions.join(', ')}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Signature */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700">
            Doctor Signature
          </label>
          {signature && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              Signature on file
            </span>
          )}
        </div>
        {!signature && !isLoadingSignature && (
          <div>
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleSignatureUpload(file);
                }
              }}
              disabled={isUploadingSignature}
              className="block text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
            />
            {isUploadingSignature && (
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </div>
            )}
          </div>
        )}
        {isLoadingSignature && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading signature...
          </div>
        )}
      </div>

      {/* Approve Button */}
      {!isLocked && effectiveRef && (
        <div className="border-t border-gray-200 pt-4">
          <button
            onClick={handleApprove}
            disabled={isApproving || !effectiveRef}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 text-white text-base font-semibold rounded-lg hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isApproving ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Approving...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Approve & Generate Signed PDF
              </>
            )}
          </button>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Item from Catalog</h3>
              <button
                onClick={() => {
                  setShowAddItemModal(false);
                  setCatalogSearch('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 flex gap-2">
              <select
                value={catalogKind}
                onChange={(e) => setCatalogKind(e.target.value as typeof catalogKind)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="procedure">Procedure</option>
                <option value="material">Material</option>
                <option value="service">Service</option>
              </select>
              <input
                type="text"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Search catalog..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg">
              {filteredCatalog.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  {catalogItems.length === 0
                    ? 'Catalog endpoint not available. Add items manually.'
                    : 'No items found'}
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredCatalog.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleAddCatalogItem(item)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="font-medium text-gray-900">{item.name}</div>
                      {item.description && (
                        <div className="text-sm text-gray-500 mt-1">{item.description}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

