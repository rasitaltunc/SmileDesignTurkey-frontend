import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import type { Language } from '../content/siteContent';
import { getInternalContent, type InternalContent } from '../content/internal';
import { DEFAULT_SITE_CONTENT, DEFAULT_COPY } from './siteContentDefaults';

// Available languages (moved here to avoid static import of entire siteContent)
export const availableLanguages: Language[] = ['en', 'tr'];

// Types for public content (lazy loaded)
type PublicContent = any;
type CopyContent = any;

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  content: PublicContent | InternalContent;
  copy: CopyContent;
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
        // Ensure content/copy always have required fields (merge with defaults)
        const safeContent = content && typeof content === 'object' 
          ? { ...DEFAULT_SITE_CONTENT, ...content, 
              whatsapp: { ...DEFAULT_SITE_CONTENT.whatsapp, ...(content.whatsapp || {}) },
              seo: { ...DEFAULT_SITE_CONTENT.seo, ...(content.seo || {}) },
            }
          : DEFAULT_SITE_CONTENT;
        const safeCopy = copy && typeof copy === 'object'
          ? { ...DEFAULT_COPY, ...copy,
              whatsapp: { ...DEFAULT_COPY.whatsapp, ...(copy.whatsapp || {}), 
                templates: { ...DEFAULT_COPY.whatsapp.templates, ...(copy.whatsapp?.templates || {}) } },
              seo: { ...DEFAULT_COPY.seo, ...(copy.seo || {}) },
            }
          : DEFAULT_COPY;
        setPublicContent(safeContent);
        setPublicCopy(safeCopy);
      }).catch((err) => {
        console.error('[i18n] Failed to load public content:', err);
        // On error, use defaults
        setPublicContent(DEFAULT_SITE_CONTENT as any);
        setPublicCopy(DEFAULT_COPY as any);
      });
    }
  }, [internal, lang, publicContent]);

  // Use memoized content/copy based on route type
  // Always return a safe object (never null)
  const content = useMemo(() => {
    if (internal) {
      return getInternalContent(lang);
    }
    return publicContent || DEFAULT_SITE_CONTENT as any;
  }, [internal, lang, publicContent]);

  const copy = useMemo(() => {
    if (internal) {
      return DEFAULT_COPY as any; // Internal routes may not need copy, but provide defaults
    }
    return publicCopy || DEFAULT_COPY as any;
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
