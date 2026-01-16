import { useEffect } from 'react';

export interface UseLeadKeyboardNavParams {
  enabled: boolean;
  isComposing: boolean;
  notesLeadId: string | null;
  activeLeadId: string | null;
  rows: { id: string }[];
  onSetActiveLeadId: (id: string) => void;
  onFocusRow?: (id: string) => void;
  onOpenNotes?: (leadId: string) => void;
  onMarkContacted?: (leadId: string) => void;
  onRunAIAnalysis?: (leadId: string) => void;
  onCopyContact?: (leadId: string) => void;
  searchRef?: React.RefObject<HTMLInputElement>;
}

/**
 * Hook to handle keyboard navigation for lead rows.
 * Disabled when modal is open or when user is typing.
 */
export function useLeadKeyboardNav(params: UseLeadKeyboardNavParams): void {
  const {
    enabled,
    isComposing,
    notesLeadId,
    activeLeadId,
    rows,
    onSetActiveLeadId,
    onFocusRow,
    onOpenNotes,
    onMarkContacted,
    onRunAIAnalysis,
    onCopyContact,
    searchRef,
  } = params;

  useEffect(() => {
    if (!enabled) return;

    const isModalOpen = notesLeadId !== null;
    if (isModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Strong guard: don't handle if user is typing in input/textarea/contentEditable
      const target = e.target as HTMLElement | null;
      const isTypingTarget =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      // If typing in an input field, only allow / for search focus (not other hotkeys)
      if (isTypingTarget) {
        // Handle / for search focus even when typing (but not if already in input)
        if (e.key === '/' && target.tagName !== 'INPUT') {
          e.preventDefault();
          searchRef?.current?.focus();
        }
        // Handle ESC to blur search if empty
        if (e.key === 'Escape' && target.tagName === 'INPUT' && (target as HTMLInputElement).value === '') {
          target.blur();
        }
        return; // Block all other hotkeys when typing
      }

      // Also check IME composition state
      if (isComposing) {
        return;
      }

      if (rows.length === 0) return;

      const currentIndex = rows.findIndex((row) => row.id === activeLeadId);

      // J or ArrowDown = next lead
      if ((e.key === 'j' || e.key === 'J' || e.key === 'ArrowDown') && !e.shiftKey) {
        e.preventDefault();
        const nextIndex = currentIndex < rows.length - 1 ? currentIndex + 1 : 0;
        const nextLead = rows[nextIndex];
        onSetActiveLeadId(nextLead.id);
        onFocusRow?.(nextLead.id);
      }

      // K or ArrowUp = previous lead
      if ((e.key === 'k' || e.key === 'K' || e.key === 'ArrowUp') && !e.shiftKey) {
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : rows.length - 1;
        const prevLead = rows[prevIndex];
        onSetActiveLeadId(prevLead.id);
        onFocusRow?.(prevLead.id);
      }

      // G = first lead
      if (e.key === 'g' || e.key === 'G') {
        if (!e.shiftKey) {
          e.preventDefault();
          const firstLead = rows[0];
          onSetActiveLeadId(firstLead.id);
          onFocusRow?.(firstLead.id);
        }
      }

      // Shift+G = last lead
      if (e.key === 'G' && e.shiftKey) {
        e.preventDefault();
        const lastLead = rows[rows.length - 1];
        onSetActiveLeadId(lastLead.id);
        onFocusRow?.(lastLead.id);
      }

      // Enter = open Notes modal
      if (e.key === 'Enter' && activeLeadId) {
        e.preventDefault();
        onOpenNotes?.(activeLeadId);
      }

      // / = focus search
      if (e.key === '/') {
        e.preventDefault();
        searchRef?.current?.focus();
      }

      // Quick actions 1-4
      if (activeLeadId && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        if (e.key === '1') {
          onMarkContacted?.(activeLeadId);
        } else if (e.key === '2') {
          onRunAIAnalysis?.(activeLeadId);
        } else if (e.key === '3') {
          onOpenNotes?.(activeLeadId);
        } else if (e.key === '4') {
          onCopyContact?.(activeLeadId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    enabled,
    isComposing,
    notesLeadId,
    activeLeadId,
    rows,
    onSetActiveLeadId,
    onFocusRow,
    onOpenNotes,
    onMarkContacted,
    onRunAIAnalysis,
    onCopyContact,
    searchRef,
  ]);
}

