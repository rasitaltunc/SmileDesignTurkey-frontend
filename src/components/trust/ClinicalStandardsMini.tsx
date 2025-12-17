import { Shield, Package, FileText, CheckCircle } from 'lucide-react';
import { useLanguage } from '../../lib/i18n';
import { RevealOnScroll } from '../animations/RevealOnScroll';
import { useEffect, useRef } from 'react';
import { trackEvent } from '../../lib/analytics';

const iconMap: { [key: string]: any } = {
  Shield: Shield,
  Package: Package,
  FileText: FileText,
};

export function ClinicalStandardsMini() {
  const { copy, lang } = useLanguage();
  const hasTrackedView = useRef(false);
  const currentPage = typeof window !== 'undefined' ? window.location.pathname.replace('/', '') || 'process' : 'process';

  // Track view once per page load
  useEffect(() => {
    if (!hasTrackedView.current && copy.clinicalStandards?.sections.length) {
      trackEvent({
        type: 'trust_pack_view',
        page: currentPage,
        lang,
      });
      hasTrackedView.current = true;
    }
  }, [currentPage, lang, copy.clinicalStandards]);

  if (!copy.clinicalStandards || copy.clinicalStandards.sections.length === 0) {
    return null;
  }

  // Show only first 2 sections for mini version
  const sections = copy.clinicalStandards.sections.slice(0, 2);

  return (
    <RevealOnScroll direction="up" delay={0}>
      <section className="py-12 bg-gray-50 border-b border-gray-100" aria-label="Clinical standards">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-8">
            <h2 className="text-text-primary mb-3 text-xl font-semibold">
              {copy.clinicalStandards.title}
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto text-sm">
              {copy.clinicalStandards.subtitle}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
          {sections.map((section, index) => {
            const IconComponent = iconMap[section.icon] || Shield;
            return (
              <div key={index} className="bg-white rounded-lg p-6 border border-gray-200 hover:shadow-md transition-shadow" aria-label={section.title}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-accent-soft rounded-lg flex items-center justify-center" aria-hidden="true">
                    <IconComponent className="w-5 h-5 text-accent-primary" />
                  </div>
                  <h3 className="text-base font-semibold text-text-primary">{section.title}</h3>
                </div>
                <ul className="space-y-2 text-sm text-text-secondary">
                  {section.items.slice(0, 3).map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-accent-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
    </RevealOnScroll>
  );
}

