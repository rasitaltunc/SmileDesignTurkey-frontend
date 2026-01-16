import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import type { Language } from '../content/siteContent';
import { getInternalContent, type InternalContent } from '../content/internal';

// Available languages (moved here to avoid static import of entire siteContent)
export const availableLanguages: Language[] = ['en', 'tr'];

// Types for public content (lazy loaded)
type PublicContent = any;
type CopyContent = any;

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  content: PublicContent | InternalContent | null;
  copy: CopyContent | null;
  availableLanguages: Language[];
  isInternalRoute: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'guidehealth_lang';

/**
 * Check if current route is internal (admin/doctor/employee)
 */
const isInternalRoute = (): boolean => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname || '/';
  return path.startsWith('/admin') || path.startsWith('/doctor') || path.startsWith('/employee');
};

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
      return stored;
    }
    
    // Default
    return 'en';
  };

  const [lang, setLangState] = useState<Language>(getInitialLang());
  const [publicContent, setPublicContent] = useState<PublicContent | null>(null);
  const [publicCopy, setPublicCopy] = useState<CopyContent | null>(null);
  const internal = isInternalRoute();

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

  // Lazy load public content only for public routes
  useEffect(() => {
    if (!internal && !publicContent) {
      // Dynamic import public content (heavy marketing content)
      Promise.all([
        import('../content/siteContent'),
        import('../content/copy'),
      ]).then(([siteContentModule, copyModule]) => {
        const content = siteContentModule.getContent(lang);
        const copy = copyModule.getCopy(lang);
        setPublicContent(content);
        setPublicCopy(copy);
      }).catch((err) => {
        console.error('[i18n] Failed to load public content:', err);
      });
    }
  }, [internal, lang, publicContent]);

  // Use memoized content/copy based on route type
  const content = useMemo(() => {
    if (internal) {
      return getInternalContent(lang);
    }
    return publicContent;
  }, [internal, lang, publicContent]);

  const copy = useMemo(() => {
    return internal ? null : publicCopy;
  }, [internal, publicCopy]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, content, copy, availableLanguages, isInternalRoute: internal }}>
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
