import { Heart, Shield, CheckCircle, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../lib/i18n';
import { RevealOnScroll } from '../animations/RevealOnScroll';
import { useContext, useEffect, useRef } from 'react';
import { NavigationContext } from '../../lib/navigationContext';
import { ProfessionalCTA } from '../animations/ProfessionalCTA';
import { trackEvent } from '../../lib/analytics';

export function AftercareBlock() {
  const { copy, lang } = useLanguage();
  const { navigate } = useContext(NavigationContext);
  const hasTrackedView = useRef(false);
  const currentPage = typeof window !== 'undefined' ? window.location.pathname.replace('/', '') || 'home' : 'home';

  // Track view once per page load
  useEffect(() => {
    if (!hasTrackedView.current && copy.aftercareBlock) {
      trackEvent({
        type: 'trust_pack_view',
        page: currentPage,
        lang,
      });
      hasTrackedView.current = true;
    }
  }, [currentPage, lang, copy.aftercareBlock]);

  if (!copy.aftercareBlock) {
    return null;
  }

  const handleCTAClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    trackEvent({
      type: 'trust_pack_cta_click',
      page: currentPage,
      placement: 'aftercare',
      lang,
    });
    trackEvent({
      type: 'start_onboarding',
      entry: `${currentPage}_aftercare`,
      lang,
    });
  };

  const handleNavigateToOnboarding = () => {
    navigate('/onboarding');
  };

  return (
    <RevealOnScroll direction="up" delay={100}>
      <section className="py-16 bg-bg-secondary">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Aftercare */}
            <div className="bg-white rounded-lg p-8 border border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-accent-soft rounded-lg flex items-center justify-center">
                  <Heart className="w-6 h-6 text-accent-primary" />
                </div>
                <h3 className="text-xl font-semibold text-text-primary">
                  {copy.aftercareBlock.aftercare.title}
                </h3>
              </div>
              <p className="text-text-secondary mb-4 leading-relaxed">
                {copy.aftercareBlock.aftercare.description}
              </p>
              <ul className="space-y-2 text-sm text-text-secondary">
                {copy.aftercareBlock.aftercare.items.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-primary mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Safety */}
            <div className="bg-white rounded-lg p-8 border border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-accent-soft rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-accent-primary" />
                </div>
                <h3 className="text-xl font-semibold text-text-primary">
                  {copy.aftercareBlock.safety.title}
                </h3>
              </div>
              <p className="text-text-secondary mb-4 leading-relaxed">
                {copy.aftercareBlock.safety.description}
              </p>
              <ul className="space-y-2 text-sm text-text-secondary">
                {copy.aftercareBlock.safety.items.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-accent-primary mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
            <h3 className="text-2xl font-semibold text-text-primary mb-3">
              {copy.aftercareBlock.cta?.headline || 'Your smile, supported for the long term.'}
            </h3>
            <p className="text-text-secondary mb-6 max-w-2xl mx-auto">
              {copy.aftercareBlock.cta?.promise || 'Get comprehensive aftercare and lifetime support with every treatment.'}
            </p>
            <ProfessionalCTA
              onClick={handleCTAClick}
              onNavigate={handleNavigateToOnboarding}
              className="inline-flex items-center justify-center px-8 py-3 bg-accent-primary text-white rounded-lg hover:bg-accent-hover transition-colors font-semibold"
              aria-label={copy.hero.ctaPrimary}
            >
              {copy.hero.ctaPrimary}
              <ChevronRight className="w-5 h-5 ml-2" />
            </ProfessionalCTA>
            {copy.disclaimer?.medical && (
              <p className="text-xs text-text-tertiary mt-4 italic">
                {copy.disclaimer.medical}
              </p>
            )}
          </div>
        </div>
      </section>
    </RevealOnScroll>
  );
}

