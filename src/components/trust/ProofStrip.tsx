import { Shield, Award, Users, CheckCircle, ShieldCheck, ClipboardCheck, HeartHandshake } from 'lucide-react';
import { useLanguage } from '../../lib/i18n';
import { useEffect, useRef } from 'react';
import { trackEvent } from '../../lib/analytics';
import { RevealOnScroll } from '../animations/RevealOnScroll';

const iconMap: { [key: string]: any } = {
  Shield: Shield,
  ShieldCheck: ShieldCheck,
  Award: Award,
  Users: Users,
  CheckCircle: CheckCircle,
  ClipboardCheck: ClipboardCheck,
  HeartHandshake: HeartHandshake,
};

export function ProofStrip() {
  const { copy, lang } = useLanguage();
  const hasTrackedView = useRef(false);
  const currentPage = typeof window !== 'undefined' ? window.location.pathname.replace('/', '') || 'home' : 'home';

  // Track view once per page load
  useEffect(() => {
    if (!hasTrackedView.current && copy?.proofStrip?.items?.length) {
      trackEvent({
        type: 'trust_pack_view',
        page: currentPage,
        lang,
      });
      hasTrackedView.current = true;
    }
  }, [currentPage, lang, copy?.proofStrip]);

  if (!copy?.proofStrip || copy?.proofStrip?.items?.length === 0) {
    return null;
  }

  return (
    <RevealOnScroll direction="up" delay={0}>
      <section className="py-6 border-b border-t relative z-10"
        style={{
          borderColor: 'var(--hub-glass-border)',
          background: 'rgba(0,0,0,0.2)'
        }}
        aria-label="Trust indicators"
      >
        <div className="max-w-7xl mx-auto px-4 overflow-x-auto no-scrollbar">
          <div className="flex flex-nowrap md:flex-wrap items-center justify-start md:justify-center gap-6 md:gap-8 min-w-max text-xs font-medium">
            {copy?.proofStrip?.items?.map((item, idx) => {
              const IconComponent = iconMap[item.icon] || Shield;
              const handleClick = () => {
                trackEvent({
                  type: 'proof_strip_click',
                  item_id: `proof_${idx}`,
                  item_text: item.text,
                  page: currentPage,
                  lang,
                });
              };
              return (
                <button
                  key={idx}
                  onClick={handleClick}
                  className="flex items-center gap-2 transition-opacity cursor-pointer group whitespace-nowrap"
                  style={{ color: 'var(--hub-text-secondary)' }}
                  aria-label={item.text}
                >
                  <IconComponent className="w-3.5 h-3.5 group-hover:text-teal-400 transition-colors" style={{ color: 'var(--hub-accent)' }} aria-hidden="true" />
                  <span className="group-hover:text-white transition-colors">{item.text}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </RevealOnScroll>
  );
}

