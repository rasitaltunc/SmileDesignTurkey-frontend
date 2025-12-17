import { Shield, Award, Heart, CheckCircle } from 'lucide-react';
import { useLanguage } from '../../lib/i18n';
import { RevealOnScroll } from '../animations/RevealOnScroll';
import { useEffect, useRef } from 'react';
import { trackEvent } from '../../lib/analytics';

const iconMap: { [key: string]: any } = {
  Shield: Shield,
  Award: Award,
  Heart: Heart,
  CheckCircle: CheckCircle,
};

export function TrustPack() {
  const { copy, lang } = useLanguage();
  const hasTrackedView = useRef(false);
  const currentPage = typeof window !== 'undefined' ? window.location.pathname.replace('/', '') || 'home' : 'home';

  // Track view once per page load
  useEffect(() => {
    if (!hasTrackedView.current && copy.trustPack?.badges.length) {
      trackEvent({
        type: 'trust_pack_view',
        page: currentPage,
        lang,
      });
      hasTrackedView.current = true;
    }
  }, [currentPage, lang, copy.trustPack]);

  if (!copy.trustPack || copy.trustPack.badges.length === 0) {
    return null;
  }

  return (
    <RevealOnScroll direction="up" delay={0}>
      <section className="py-16 bg-white border-b border-gray-100" aria-label="Trust pack">
        <div className="max-w-7xl mx-auto px-8">
          <h2 className="text-center text-text-primary mb-4 text-2xl font-semibold">
            {copy.trustPack.title}
          </h2>
          {copy.trustPack.subtitle && (
            <p className="text-center text-text-secondary mb-12 max-w-3xl mx-auto text-lg">
              {copy.trustPack.subtitle}
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {copy.trustPack.badges.map((badge, idx) => {
              const IconComponent = iconMap[badge.icon] || Shield;
              const handleClick = () => {
                trackEvent({
                  type: 'trust_badge_click',
                  badge_id: `badge_${idx}`,
                  badge_title: badge.title,
                  page: currentPage,
                  lang,
                });
              };
              return (
                <button
                  key={idx}
                  onClick={handleClick}
                  className="text-center p-6 bg-gray-50 rounded-lg border border-gray-100 hover:border-accent-primary hover:shadow-md transition-all cursor-pointer"
                  aria-label={badge.title}
                >
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-accent-soft rounded-lg mb-4" aria-hidden="true">
                    <IconComponent className="w-7 h-7 text-accent-primary" />
                  </div>
                  <h3 className="text-text-primary font-semibold mb-2">{badge.title}</h3>
                  <p className="text-sm text-text-secondary">{badge.description}</p>
                  {badge.note && (
                    <p className="text-xs text-text-tertiary mt-2 italic">{badge.note}</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </RevealOnScroll>
  );
}

