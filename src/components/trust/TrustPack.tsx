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
    if (!hasTrackedView.current && copy?.trustPack?.badges?.length) {
      trackEvent({
        type: 'trust_pack_view',
        page: currentPage,
        lang,
      });
      hasTrackedView.current = true;
    }
  }, [currentPage, lang, copy?.trustPack]);

  if (!copy?.trustPack || copy?.trustPack?.badges?.length === 0) {
    return null;
  }

  return (
    <RevealOnScroll direction="up" delay={0}>
      <section className="py-12 relative z-10" aria-label="Trust pack">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <h2 className="text-center mb-4 text-xl font-semibold opacity-90" style={{ color: 'var(--hub-text-primary)' }}>
            {copy?.trustPack?.title}
          </h2>
          {copy?.trustPack?.subtitle && (
            <p className="text-center mb-10 max-w-2xl mx-auto text-sm opacity-70" style={{ color: 'var(--hub-text-secondary)' }}>
              {copy?.trustPack?.subtitle}
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {copy?.trustPack?.badges?.map((badge, idx) => {
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
                  className="text-center p-6 rounded-2xl border transition-all cursor-pointer group hub-glass"
                  style={{
                    background: 'var(--hub-glass-bg)',
                    borderColor: 'var(--hub-glass-border)',
                  }}
                  aria-label={badge.title}
                >
                  <div
                    className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 transition-transform group-hover:scale-110"
                    style={{ background: 'rgba(20, 184, 166, 0.1)' }}
                    aria-hidden="true"
                  >
                    <IconComponent className="w-6 h-6" style={{ color: 'var(--hub-accent)' }} />
                  </div>
                  <h3 className="font-semibold mb-2 text-base" style={{ color: 'var(--hub-text-primary)' }}>{badge.title}</h3>
                  <p className="text-xs leading-relaxed opacity-80" style={{ color: 'var(--hub-text-secondary)' }}>{badge.description}</p>
                  {badge.note && (
                    <p className="text-[10px] mt-3 italic opacity-60" style={{ color: 'var(--hub-text-muted)' }}>{badge.note}</p>
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

