import { FileText, Image, Video, Award } from 'lucide-react';
import { useLanguage } from '../../lib/i18n';
import { RevealOnScroll } from '../animations/RevealOnScroll';

interface PlaceholderItem {
  icon: any;
  label: string;
  description: string;
}

export function EvidencePlaceholders() {
  const { copy, lang } = useLanguage();

  // Placeholder items - can be replaced with real evidence later
  const placeholders: PlaceholderItem[] = [
    {
      icon: Award,
      label: 'Certificates',
      description: 'Clinic accreditations and certifications',
    },
    {
      icon: Image,
      label: 'Before & After',
      description: 'Patient case studies and results',
    },
    {
      icon: Video,
      label: 'Clinic Tour',
      description: 'Virtual facility walkthrough',
    },
  ];

  return (
    <RevealOnScroll direction="up" delay={100}>
      <section className="py-12 bg-gray-50" aria-label="Evidence placeholders">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6">
            {placeholders.map((item, idx) => {
              const IconComponent = item.icon;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-lg p-6 border-2 border-dashed border-gray-300 text-center opacity-60"
                  aria-label={`${item.label} placeholder`}
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <IconComponent className="w-6 h-6 text-gray-400" aria-hidden="true" />
                  </div>
                  <h4 className="text-sm font-semibold text-text-secondary mb-2">{item.label}</h4>
                  <p className="text-xs text-text-tertiary">{item.description}</p>
                  <p className="text-xs text-text-tertiary mt-2 italic">Coming soon</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </RevealOnScroll>
  );
}

