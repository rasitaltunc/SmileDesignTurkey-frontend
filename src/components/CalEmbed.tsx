import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface CalEmbedProps {
  calLink: string; // e.g., "smiledesignturkey/consultation"
  isOpen: boolean;
  onClose: () => void;
  leadName?: string;
  leadEmail?: string;
  leadPhone?: string;
}

export default function CalEmbed({ calLink, isOpen, onClose, leadName, leadEmail, leadPhone }: CalEmbedProps) {
  const calRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    if (!isOpen || scriptLoadedRef.current) return;

    // Load Cal.com embed script
    const script = document.createElement('script');
    script.src = 'https://cal.com/embed.js';
    script.async = true;
    script.onload = () => {
      scriptLoadedRef.current = true;
    };
    document.body.appendChild(script);

    return () => {
      // Don't remove script on unmount (it's reusable)
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !calRef.current || !scriptLoadedRef.current) return;

    // Clear previous embed
    calRef.current.innerHTML = '';

    // Create Cal embed element
    const calElement = document.createElement('cal-inline');
    calElement.setAttribute('cal-link', calLink);
    
    // Pre-fill lead data if available
    if (leadName) {
      calElement.setAttribute('cal-config-name', leadName);
    }
    if (leadEmail) {
      calElement.setAttribute('cal-config-email', leadEmail);
    }
    if (leadPhone) {
      calElement.setAttribute('cal-config-phone', leadPhone);
    }

    calRef.current.appendChild(calElement);

    // Cleanup on close
    return () => {
      if (calRef.current) {
        calRef.current.innerHTML = '';
      }
    };
  }, [isOpen, calLink, leadName, leadEmail, leadPhone]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Book Consultation</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Cal Embed Container */}
        <div className="p-6">
          <div ref={calRef} className="min-h-[600px] w-full" />
        </div>
      </div>
    </div>
  );
}

