import { ShieldCheck, CheckCircle } from 'lucide-react';
import { useLanguage } from '../../lib/i18n';
import { RevealOnScroll } from '../animations/RevealOnScroll';
import { useEffect, useRef } from 'react';
import { trackEvent } from '../../lib/analytics';

export function TransparencyCard() {
  const { copy, lang } = useLanguage();
  const hasTrackedView = useRef(false);
  const currentPage = typeof window !== 'undefined' ? window.location.pathname.replace('/', '') || 'pricing' : 'pricing';

  // Track view once per page load
  useEffect(() => {
    if (!hasTrackedView.current && copy.packages?.transparency) {
      trackEvent({
        type: 'trust_pack_view',
        page: currentPage,
        lang,
      });
      hasTrackedView.current = true;
    }
  }, [currentPage, lang, copy.packages]);

  if (!copy.packages?.transparency) {
    return null;
  }

  const transparency = copy.packages.transparency;

  return (
    <RevealOnScroll direction="up" delay={0}>
      <section className="py-12 bg-white" aria-label="Transparency information">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-accent-soft to-white rounded-xl p-8 border border-gray-200 shadow-sm">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 bg-accent-primary rounded-lg flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-6 h-6 text-white" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-semibold text-text-primary mb-3">
                  {transparency.title}
                </h3>
                <p className="text-text-secondary leading-relaxed mb-6">
                  {transparency.note}
                </p>
                <ul className="space-y-3 mb-6">
                  {transparency.bullets.map((bullet, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-accent-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <span className="text-text-secondary">{bullet}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-text-tertiary italic">
                  {transparency.microDisclaimer}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </RevealOnScroll>
  );
}

