import { useState } from 'react';
import { Globe, Check } from 'lucide-react';
import { cn } from '../ui/utils';

export interface LanguagePickerProps {
  className?: string;
}

const languages = [
  { code: 'EN', name: 'English', flag: '🇬🇧' },
  { code: 'ES', name: 'Español', flag: '🇪🇸' },
  { code: 'DE', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'FR', name: 'Français', flag: '🇫🇷' },
];

/**
 * C/Picker/Language - Design System Component
 */
export function LanguagePicker({ className }: LanguagePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState(languages[0]);

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-border-subtle rounded-[var(--radius-sm)] text-text-primary hover:border-accent-primary hover:shadow-premium-sm transition-all duration-200"
      >
        <Globe className="w-4 h-4 text-text-tertiary" />
        <span className="text-sm font-medium">{selected.code}</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-border-subtle rounded-[var(--radius-md)] shadow-premium-lg z-20 overflow-hidden">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => {
                  setSelected(language);
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-bg-secondary transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{language.flag}</span>
                  <span className="text-sm text-text-primary">{language.name}</span>
                </div>
                {selected.code === language.code && (
                  <Check className="w-4 h-4 text-accent-primary" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
