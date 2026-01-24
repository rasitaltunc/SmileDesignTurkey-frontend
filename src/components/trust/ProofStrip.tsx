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
    if (!hasTrackedView.current && copy.proofStrip?.items.length) {
      trackEvent({
        type: 'trust_pack_view',
        page: currentPage,
        lang,
      });
      hasTrackedView.current = true;
    }
  }, [currentPage, lang, copy.proofStrip]);

  if (!copy.proofStrip || copy.proofStrip.items.length === 0) {
    return null;
  }

  return (
    <RevealOnScroll direction="up" delay={0}>
      <section className="py-8 bg-accent-soft/30 border-b border-gray-100" aria-label="Trust indicators">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8 text-sm text-text-secondary">
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
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
                  aria-label={item.text}
                >
                  <IconComponent className="w-4 h-4 text-accent-primary" aria-hidden="true" />
                  <span>{item.text}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </RevealOnScroll>
  );
}

