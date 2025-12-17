import { Shield, Award, Heart, CheckCircle, Users, Clock } from 'lucide-react';
import { useLanguage } from '../../lib/i18n';
import { useEffect, useRef } from 'react';
import { trackEvent } from '../../lib/analytics';
import { RevealOnScroll } from '../animations/RevealOnScroll';

const iconMap: { [key: string]: any } = {
  Shield: Shield,
  Award: Award,
  Heart: Heart,
  CheckCircle: CheckCircle,
  Users: Users,
  Clock: Clock,
};

export function TrustBadges() {
  const { copy, lang } = useLanguage();
  const hasTrackedView = useRef(false);
  const currentPage = typeof window !== 'undefined' ? window.location.pathname.replace('/', '') || 'home' : 'home';

  // Track view once per page load
  useEffect(() => {
    if (!hasTrackedView.current && copy.trust?.badges.length) {
      trackEvent({
        type: 'trust_pack_view',
        page: currentPage,
        lang,
      });
      hasTrackedView.current = true;
    }
  }, [currentPage, lang, copy.trust]);

  if (!copy.trust || copy.trust.badges.length === 0) {
    return null;
  }

  return (
    <RevealOnScroll direction="up" delay={0}>
      <section className="py-12 bg-white border-b border-gray-100" aria-label="Trust badges">
        <div className="max-w-7xl mx-auto px-8">
          <h2 className="text-center text-text-primary mb-8 text-2xl font-semibold">
            {copy.trust.title}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {copy.trust.badges.map((badge, idx) => {
              const IconComponent = iconMap[badge.icon] || Shield;
              const handleClick = () => {
                trackEvent({
                  type: 'trust_badge_click',
                  badge_id: `trust_badge_${idx}`,
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
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-accent-soft rounded-lg mb-3" aria-hidden="true">
                    <IconComponent className="w-6 h-6 text-accent-primary" />
                  </div>
                  <h3 className="text-text-primary font-semibold mb-2 text-sm">{badge.title}</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">{badge.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </RevealOnScroll>
  );
}

