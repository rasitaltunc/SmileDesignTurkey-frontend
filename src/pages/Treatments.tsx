import { Link } from '../components/Link';
import { Smile, Anchor, Layers, Crown, Sun, FileCheck, ChevronRight, MessageCircle } from 'lucide-react';
import React, { useEffect } from 'react';
import Footer from '../components/Footer';
import { treatments } from '../data/treatments';
import { useLanguage } from '../lib/i18n';
import { SEO } from '../lib/seo';
import { trackEvent } from '../lib/analytics';
import { BRAND } from '../config';
import { getWhatsAppUrl } from '../lib/whatsapp';
import { ProfessionalCTA } from '../components/animations/ProfessionalCTA';
import { useContext } from 'react';
import { NavigationContext } from '../lib/navigationContext';

export default function Treatments() {
  const { lang, content, copy } = useLanguage();
  const { navigate } = useContext(NavigationContext);

  // SEO handled by <SEO> component below

  const handleCTAClick = (ctaName: string) => {
    trackEvent({ type: 'cta_click', where: 'treatments', cta: ctaName, lang });
  };
  
  const handleWhatsAppClick = (location: string) => {
    trackEvent({ type: 'whatsapp_click', where: location, lang });
    const message = copy.whatsapp.templates.consultation;
    const url = getWhatsAppUrl({ phoneE164: BRAND.whatsappPhoneE164, text: message });
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };
  
  const handleGetStartedClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    trackEvent({ type: 'start_onboarding', entry: 'treatments', lang });
    trackEvent({ type: 'cta_click', where: 'treatments', cta: 'get_started', lang });
  };
  
  const handleNavigateToOnboarding = () => {
    navigate('/onboarding');
  };
  const iconMap: { [key: string]: any } = {
    Sparkles: Smile,
    Anchor: Anchor,
    Layers: Layers,
    Crown: Crown,
    Sun: Sun,
    FileCheck: FileCheck
  };

  return (
    <div className="min-h-screen bg-white">
      <SEO 
        title={copy.seo.treatments.title} 
        description={copy.seo.treatments.description}
        url="/treatments"
      />

      {/* Header */}
      <section className="bg-gradient-to-br from-teal-50 to-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-gray-900 mb-4 text-4xl font-bold">Our Treatments</h1>
          <p className="text-gray-600 max-w-3xl mx-auto text-lg">
            {copy.seo.treatments.description}
          </p>
        </div>
      </section>

      {/* Treatment Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {treatments.map((treatment) => {
              const IconComponent = iconMap[treatment.icon];
              return (
                <div
                  key={treatment.id}
                  className="bg-white border border-gray-200 rounded-xl p-8 hover:shadow-xl hover:border-teal-200 transition-all group"
                >
                  <div className="w-16 h-16 bg-teal-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-teal-200 transition-colors">
                    <IconComponent className="w-8 h-8 text-teal-600" />
                  </div>

                  <h3 className="text-gray-900 mb-3">{treatment.name}</h3>
                  <p className="text-gray-600 mb-6">{treatment.shortDescription}</p>

                  <div className="mb-6 pb-6 border-b border-gray-100">
                    <div className="text-sm text-gray-500 mb-1">Starting from</div>
                    <div className="text-teal-600">
                      ${treatment.priceRange.from.toLocaleString()} - ${treatment.priceRange.to.toLocaleString()}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <Link
                      to="/treatment-detail"
                      className="w-full px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-center"
                    >
                      Learn More
                    </Link>
                    <Link
                      to="/onboarding"
                      className="w-full px-6 py-3 border border-teal-600 text-teal-600 rounded-lg hover:bg-teal-50 transition-colors text-center"
                    >
                      Start Your Plan
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white p-8 md:p-12 rounded-2xl border border-gray-200 shadow-lg">
            <h2 className="text-gray-900 mb-4">Not Sure Which Treatment Is Right?</h2>
            <p className="text-gray-600 mb-8">
              Start your guided arrival for a personalized recommendation tailored to your unique needs and goals.
            </p>
            <Link
              to="/onboarding"
              className="inline-flex items-center px-8 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              Begin Your Journey
              <ChevronRight className="w-4 h-4 ml-2" />
            </Link>
            <p className="text-gray-500 text-sm mt-4">
              2 minutes • No obligation • Your data stays private
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}