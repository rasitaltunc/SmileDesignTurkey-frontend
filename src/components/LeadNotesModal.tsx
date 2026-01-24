import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, MessageSquare, RefreshCw, HelpCircle } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { toast } from '@/lib/toast';

interface LeadNote {
  id: string;
  lead_id: string;
  content?: string;
  note?: string;
  created_at: string;
  created_by?: string | null;
}

interface LeadNotesModalProps {
  isOpen: boolean;
  leadId: string | null;
  onClose: () => void;
  supabase: SupabaseClient;
  apiBase?: string;
  onNoteCreated?: () => void;
}

export default function LeadNotesModal({
  isOpen,
  leadId,
  onClose,
  supabase,
  apiBase = '',
  onNoteCreated,
}: LeadNotesModalProps) {
  // Notes state
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [newNoteContent, setNewNoteContent] = useState<string>('');
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Modal UI state
  const modalScrollRef = useRef<HTMLDivElement | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [showCheatSheet, setShowCheatSheet] = useState(false);

  // Load notes when modal opens
  useEffect(() => {
    if (isOpen && leadId) {
      loadNotes(leadId);
    } else {
      // Reset state when closed
      setNotes([]);
      setNewNoteContent('');
      setIsClosing(false);
    }
  }, [isOpen, leadId]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const scrollY = window.scrollY;
    const body = document.body;
    const html = document.documentElement;

    // Save previous values before modifying
    const prevBodyPosition = body.style.position;
    const prevBodyTop = body.style.top;
    const prevBodyLeft = body.style.left;
    const prevBodyRight = body.style.right;
    const prevBodyWidth = body.style.width;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;

    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';

    return () => {
      // Restore previous values
      body.style.position = prevBodyPosition;
      body.style.top = prevBodyTop;
      body.style.left = prevBodyLeft;
      body.style.right = prevBodyRight;
      body.style.width = prevBodyWidth;
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const target = e.target as HTMLElement;
      const isTyping =
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'INPUT' ||
        target?.isContentEditable;
      if (isTyping || isComposing) return;
      handleClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isComposing]);

  // Load notes for a lead
  const loadNotes = async (leadIdParam: string) => {
    setIsLoadingNotes(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        toast.error('Session expired. Please login again.');
        setIsLoadingNotes(false);
        return;
      }

      const apiUrl = apiBase || import.meta.env.VITE_API_URL || window.location.origin;
      const response = await fetch(
        `${apiUrl}/api/lead-notes?lead_id=${encodeURIComponent(leadIdParam)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to load notes' }));
        throw new Error(errorData.error || 'Failed to load notes');
      }

      const result = await response.json();
      setNotes(result.notes || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load notes';
      toast.error('Failed to load notes', { description: errorMessage });
      console.error('[LeadNotesModal] Error loading notes:', err);
    } finally {
      setIsLoadingNotes(false);
    }
  };

  // Create new note
  const createNote = async (leadIdParam: string, content: string) => {
    if (!content.trim()) return;

    setIsSavingNote(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        toast.error('Session expired. Please login again.');
        setIsSavingNote(false);
        return;
      }

      const apiUrl = apiBase || import.meta.env.VITE_API_URL || window.location.origin;
      const response = await fetch(`${apiUrl}/api/lead-notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          lead_id: leadIdParam,
          note: content.trim(),
          content: content.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create note' }));
        throw new Error(errorData.error || 'Failed to create note');
      }

      // Reload notes
      await loadNotes(leadIdParam);
      setNewNoteContent('');
      toast.success('Note saved');
      onNoteCreated?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save note';
      toast.error('Failed to save note', { description: errorMessage });
      console.error('[LeadNotesModal] Error saving note:', err);
    } finally {
      setIsSavingNote(false);
    }
  };

  // Handle add note form submission
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingNote || !newNoteContent.trim() || !leadId) return;
    createNote(leadId, newNoteContent);
  };

  // Handle close with animation
  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    requestAnimationFrame(() => {
      setTimeout(() => {
        setIsClosing(false);
        onClose();
      }, 180);
    });
  };

  if (!isOpen && !isClosing) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="notes-modal-title"
      aria-describedby="notes-modal-desc"
      className={`fixed inset-0 bg-black/40 flex items-center justify-center p-4 transition-opacity duration-200 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ zIndex: 2147483647 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        data-modal-root="true"
        className={`relative bg-white rounded-2xl shadow-2xl border border-gray-200 ring-1 ring-black/5 overflow-hidden transition-all duration-200 ${
          isClosing ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'
        }`}
        style={{
          width: 'min(92vw, 720px)',
          height: 'min(80vh, 720px)',
          display: 'grid',
          gridTemplateRows: 'auto minmax(0, 1fr) auto',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="shrink-0 border-b border-gray-200 px-5 py-3 bg-white">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <h3 id="notes-modal-title" className="text-base font-semibold text-gray-900 break-words">
                Notes
              </h3>
              <p className="text-xs text-gray-500 mt-0.5 break-words">Lead notes and activity</p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="h-10 w-10 text-gray-500 hover:text-gray-700 text-xl leading-none rounded hover:bg-gray-100 transition-colors flex items-center justify-center"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* BODY - SCROLL AREA */}
        <div
          ref={modalScrollRef}
          tabIndex={0}
          role="region"
          id="notes-modal-desc"
          aria-label="Notes content"
          className="min-h-0 overflow-y-auto overscroll-contain touch-pan-y px-5 py-4 pr-3"
          style={{
            WebkitOverflowScrolling: 'touch',
            scrollbarGutter: 'stable',
          }}
        >
          <div className="space-y-4 pb-4">
            {/* Notes Section */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Notes</h4>
              {isLoadingNotes ? (
                <div className="text-gray-500 text-sm">Loading notes…</div>
              ) : notes.length === 0 ? (
                <div className="text-gray-500 text-sm border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <p>No notes yet.</p>
                  <p className="text-xs mt-1 text-gray-400">
                    Use the form below to add your first note about this lead.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notes.map((n) => (
                    <div key={n.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">
                        {new Date(n.created_at).toLocaleString()}
                      </div>
                      <div
                        className="text-sm text-gray-900 whitespace-pre-wrap break-words"
                        style={{ overflowWrap: 'anywhere' }}
                      >
                        {n.content ?? n.note ?? ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER - ALWAYS VISIBLE */}
        <div className="shrink-0 border-t border-gray-200 px-5 py-3 bg-gray-50">
          <form onSubmit={handleAddNote} className="space-y-3">
            <textarea
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              onKeyDown={(e) => {
                if (isSavingNote) return;
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && newNoteContent.trim()) {
                  e.preventDefault();
                  handleAddNote(e);
                }
              }}
              readOnly={isSavingNote}
              placeholder="Add a note... (Cmd/Ctrl+Enter to submit)"
              rows={3}
              className={`w-full rounded-lg border p-3 resize-none max-h-28 overflow-y-auto bg-white leading-relaxed placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isSavingNote ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            />
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-gray-500 flex items-center gap-3">
                <span>ESC to close</span>
                <span>•</span>
                <span>Cmd/Ctrl+Enter to add note</span>
                <button
                  type="button"
                  onClick={() => setShowCheatSheet(!showCheatSheet)}
                  className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Keyboard shortcuts"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </div>
              {showCheatSheet && (
                <div className="absolute right-5 bottom-14 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 min-w-[280px]">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-900">Keyboard Shortcuts</h4>
                    <button
                      type="button"
                      onClick={() => setShowCheatSheet(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="font-medium text-gray-700 mb-1">In Modal:</div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-gray-600">ESC</span>
                      <span className="text-gray-900">Close modal</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-gray-600">Cmd/Ctrl+Enter</span>
                      <span className="text-gray-900">Add note</span>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-50 transition-colors text-sm"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={!newNoteContent.trim() || isSavingNote}
                  className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-semibold border transition-all min-w-[120px] ${
                    !newNoteContent.trim() || isSavingNote
                      ? 'bg-gray-100 text-gray-700 border-gray-200 opacity-70 cursor-not-allowed'
                      : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700 shadow-sm hover:shadow'
                  }`}
                  title={
                    isSavingNote
                      ? 'Saving note...'
                      : !newNoteContent.trim()
                        ? 'Type a note to enable'
                        : 'Add note to lead'
                  }
                >
                  {isSavingNote ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-4 h-4" />
                      <span>Add Note</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}

