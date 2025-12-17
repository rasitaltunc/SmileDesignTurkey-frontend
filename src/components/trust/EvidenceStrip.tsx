import { FileText, Image, Video, Award, ExternalLink } from 'lucide-react';
import { useLanguage } from '../../lib/i18n';
import { getEvidenceForPage } from '../../content/loadEvidence';
import { EvidenceItem } from '../../content/evidence.schema';
import { RevealOnScroll } from '../animations/RevealOnScroll';
import { useEffect, useRef } from 'react';
import { trackEvent } from '../../lib/analytics';

const iconMap: { [key: string]: any } = {
  image: Image,
  video: Video,
  pdf: FileText,
  link: ExternalLink,
  default: Award,
};

interface EvidenceStripProps {
  pageKey: 'home' | 'pricing' | 'process';
  maxItems?: number;
}

export function EvidenceStrip({ pageKey, maxItems = 6 }: EvidenceStripProps) {
  const { lang } = useLanguage();
  const hasTrackedView = useRef(false);
  const sections = getEvidenceForPage(pageKey);
  
  // Flatten items from all sections
  const allItems: EvidenceItem[] = sections.flatMap((section) => section.items).slice(0, maxItems);
  
  // Track view once per page load
  useEffect(() => {
    if (!hasTrackedView.current && allItems.length > 0) {
      trackEvent({
        type: 'trust_pack_view',
        page: pageKey,
        lang,
      });
      hasTrackedView.current = true;
    }
  }, [pageKey, lang, allItems.length]);

  if (allItems.length === 0) {
    return null;
  }

  const isPlaceholder = (url: string) => url.includes('placeholder') || url === '#';

  return (
    <RevealOnScroll direction="up" delay={0}>
      <section className="py-8 bg-white border-b border-gray-100" aria-label="Evidence registry">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
            {allItems.map((item) => {
              const IconComponent = iconMap[item.type] || iconMap.default;
              const isPlaceholderItem = isPlaceholder(item.url);
              
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                    isPlaceholderItem
                      ? 'border-dashed border-gray-300 bg-gray-50 opacity-60'
                      : 'border-gray-200 bg-white hover:border-accent-primary hover:shadow-sm transition-all'
                  }`}
                  aria-label={item.title}
                >
                  <IconComponent className="w-4 h-4 text-accent-primary flex-shrink-0" aria-hidden="true" />
                  <span className="text-sm text-text-secondary whitespace-nowrap">{item.title}</span>
                  {isPlaceholderItem && import.meta.env.DEV && (
                    <span className="text-xs text-text-tertiary italic ml-1">(placeholder)</span>
                  )}
                </div>
              );
            })}
          </div>
          {allItems.some((item) => isPlaceholder(item.url)) && (
            <p className="text-center text-xs text-text-tertiary mt-4 italic">
              {import.meta.env.PROD
                ? 'Documentation available during consultation.'
                : 'Placeholder items — replace with real evidence in evidence.json'}
            </p>
          )}
        </div>
      </section>
    </RevealOnScroll>
  );
}

