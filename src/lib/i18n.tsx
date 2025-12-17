import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, getContent, availableLanguages } from '../content/siteContent';
import { getCopy, type CopyContent } from '../content/copy';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  content: ReturnType<typeof getContent>;
  copy: CopyContent;
  availableLanguages: Language[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'guidehealth_lang';

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Get initial language from URL or localStorage
  const getInitialLang = (): Language => {
    // Check URL param first
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang') as Language;
    if (urlLang && availableLanguages.includes(urlLang)) {
      return urlLang;
    }
    
    // Check localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && availableLanguages.includes(stored as Language)) {
      return stored as Language;
    }
    
    // Default
    return 'en';
  };

  const [lang, setLangState] = useState<Language>(getInitialLang());

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem(STORAGE_KEY, newLang);
    
    // Update URL without reload
    const url = new URL(window.location.href);
    url.searchParams.set('lang', newLang);
    window.history.replaceState({}, '', url.toString());
  };

  // Listen for URL changes
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const urlLang = urlParams.get('lang') as Language;
      if (urlLang && availableLanguages.includes(urlLang) && urlLang !== lang) {
        setLangState(urlLang);
        localStorage.setItem(STORAGE_KEY, urlLang);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [lang]);

  const content = getContent(lang);
  const copy = getCopy(lang);

  return (
    <LanguageContext.Provider value={{ lang, setLang, content, copy, availableLanguages }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}

