import { FileText, Image, Video, ExternalLink, Download } from 'lucide-react';
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
};

interface EvidenceGalleryProps {
  pageKey: 'home' | 'pricing' | 'process';
  compact?: boolean;
}

export function EvidenceGallery({ pageKey, compact = false }: EvidenceGalleryProps) {
  const { lang } = useLanguage();
  const hasTrackedView = useRef(false);
  const sections = getEvidenceForPage(pageKey);

  // Track view once per page load
  useEffect(() => {
    if (!hasTrackedView.current && sections.length > 0) {
      trackEvent({
        type: 'trust_pack_view',
        page: pageKey,
        lang,
      });
      hasTrackedView.current = true;
    }
  }, [pageKey, lang, sections.length]);

  if (sections.length === 0) {
    return null;
  }

  const isPlaceholder = (url: string) => url.includes('placeholder') || url === '#';
  const isDev = import.meta.env.DEV;

  const renderItem = (item: EvidenceItem) => {
    const isPlaceholderItem = isPlaceholder(item.url);
    const IconComponent = iconMap[item.type] || Image;

    if (compact) {
      // Compact card view
      return (
        <div
          key={item.id}
          className={`bg-white rounded-lg p-4 border ${
            isPlaceholderItem
              ? 'border-dashed border-gray-300 opacity-60'
              : 'border-gray-200 hover:border-accent-primary hover:shadow-sm transition-all'
          }`}
          aria-label={item.title}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isPlaceholderItem ? 'bg-gray-100' : 'bg-accent-soft'
            }`}>
              <IconComponent className={`w-5 h-5 ${isPlaceholderItem ? 'text-gray-400' : 'text-accent-primary'}`} aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-text-primary truncate">{item.title}</h4>
              {item.description && (
                <p className="text-xs text-text-secondary truncate">{item.description}</p>
              )}
            </div>
          </div>
          {isPlaceholderItem && isDev && (
            <p className="text-xs text-text-tertiary italic">Coming soon</p>
          )}
          {isPlaceholderItem && !isDev && (
            <p className="text-xs text-text-tertiary">Available during consultation</p>
          )}
        </div>
      );
    }

    // Full gallery view
    return (
      <div
        key={item.id}
        className={`bg-white rounded-lg overflow-hidden border ${
          isPlaceholderItem
            ? 'border-dashed border-gray-300 opacity-60'
            : 'border-gray-200 hover:border-accent-primary hover:shadow-md transition-all'
        }`}
        aria-label={item.title}
      >
        {item.type === 'image' && (
          <div className="aspect-video bg-gray-100 flex items-center justify-center">
            {isPlaceholderItem ? (
              <div className="text-center p-4">
                <Image className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-text-tertiary">
                  {isDev ? 'Coming soon' : 'Available during consultation'}
                </p>
              </div>
            ) : (
              <img
                src={item.url}
                alt={item.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            )}
          </div>
        )}
        
        {item.type === 'video' && !isPlaceholderItem && (
          <div className="aspect-video bg-gray-900">
            <video
              src={item.url}
              controls
              className="w-full h-full"
              aria-label={item.title}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        )}
        
        {item.type === 'video' && isPlaceholderItem && (
          <div className="aspect-video bg-gray-100 flex items-center justify-center">
            <div className="text-center p-4">
              <Video className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-text-tertiary">
                {isDev ? 'Coming soon' : 'Available during consultation'}
              </p>
            </div>
          </div>
        )}

        {(item.type === 'pdf' || item.type === 'link') && (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                isPlaceholderItem ? 'bg-gray-100' : 'bg-accent-soft'
              }`}>
                <IconComponent className={`w-6 h-6 ${isPlaceholderItem ? 'text-gray-400' : 'text-accent-primary'}`} aria-hidden="true" />
              </div>
              <div className="flex-1">
                <h4 className="text-base font-semibold text-text-primary">{item.title}</h4>
                {item.description && (
                  <p className="text-sm text-text-secondary mt-1">{item.description}</p>
                )}
              </div>
            </div>
            {!isPlaceholderItem && (
              <a
                href={item.url}
                target={item.type === 'link' ? '_blank' : undefined}
                rel={item.type === 'link' ? 'noopener noreferrer' : undefined}
                className="inline-flex items-center gap-2 text-sm text-accent-primary hover:text-accent-hover transition-colors"
                download={item.type === 'pdf'}
              >
                {item.type === 'pdf' ? (
                  <>
                    <Download className="w-4 h-4" />
                    Download PDF
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4" />
                    View Link
                  </>
                )}
              </a>
            )}
            {isPlaceholderItem && (
              <p className="text-xs text-text-tertiary italic">
                {isDev ? 'Coming soon' : 'Available during consultation'}
              </p>
            )}
          </div>
        )}

        {item.type !== 'pdf' && item.type !== 'link' && (
          <div className="p-4 border-t border-gray-100">
            <h4 className="text-sm font-semibold text-text-primary">{item.title}</h4>
            {item.description && (
              <p className="text-xs text-text-secondary mt-1">{item.description}</p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <RevealOnScroll direction="up" delay={0}>
      <section className="py-16 bg-white" aria-label="Evidence gallery">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {sections.map((section) => (
            <div key={section.key} className="mb-12 last:mb-0">
              <h3 className="text-2xl font-semibold text-text-primary mb-6 text-center">
                {section.title}
              </h3>
              <div className={`grid gap-6 ${
                compact
                  ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                  : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              }`}>
                {section.items.map(renderItem)}
              </div>
            </div>
          ))}
        </div>
      </section>
    </RevealOnScroll>
  );
}

