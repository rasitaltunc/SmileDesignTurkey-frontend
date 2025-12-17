import { Link } from '../components/Link';
import { MessageCircle, FileText, Calendar, Plane, Heart, CheckCircle, Lock, Shield, Globe, Video, Building, Headphones, Package } from 'lucide-react';
import React, { useEffect, useContext } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { BRAND } from '../config';
import { getWhatsAppUrl } from '../lib/whatsapp';
import { trackEvent } from '../lib/analytics';
import { useLanguage } from '../lib/i18n';
import { SEO } from '../lib/seo';
import { NavigationContext } from '../App';
import { ProfessionalCTA } from '../components/animations/ProfessionalCTA';
import { ClinicalStandards } from '../components/trust/ClinicalStandards';
import { TrustPack } from '../components/trust/TrustPack';
import { AftercareBlock } from '../components/trust/AftercareBlock';
import { EvidenceGallery } from '../components/trust/EvidenceGallery';
import { ClinicalStandardsMini } from '../components/trust/ClinicalStandardsMini';

export default function Process() {
  const { lang, content, copy } = useLanguage();
  const { navigate } = useContext(NavigationContext);

  // SEO handled by <SEO> component below
  
  const handleGetStartedClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    trackEvent({ type: 'start_onboarding', entry: 'process', lang });
    trackEvent({ type: 'cta_click', where: 'process', cta: 'get_started', lang });
  };
  
  const handleNavigateToOnboarding = () => {
    navigate('/onboarding');
  };
  
  const handleWhatsAppClick = (location: string) => {
    trackEvent({ type: 'whatsapp_click', where: location, lang });
    const message = copy.whatsapp.templates.question;
    const url = getWhatsAppUrl({ phoneE164: BRAND.whatsappPhoneE164, text: message });
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };
  const iconMap: { [key: string]: any } = {
    Video: Video,
    Plane: Plane,
    Building: Building,
    Heart: Heart,
    Headphones: Headphones,
  };

  const timeline = copy.process.steps.map((step) => ({
    step: step.number,
    title: step.title,
    description: step.description,
    icon: iconMap[step.icon] || Heart,
    microcopy: '',
    duration: ''
  }));

  const expectations = [
    {
      title: 'Private & Secure Communication',
      description: 'All your data is encrypted end-to-end. We never share your information without explicit consent.',
      icon: Shield
    },
    {
      title: 'No Commitment Until You\'re Ready',
      description: 'Get your personalized plan with zero obligation. Take all the time you need to decide.',
      icon: CheckCircle
    },
    {
      title: 'Multilingual Support',
      description: 'Our coordinators speak your language, ensuring clear communication and confidence at every step.',
      icon: Globe
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <SEO 
        title={copy.seo.process.title} 
        description={copy.seo.process.description}
        url="/process"
      />
      <Navbar />

      {/* Header */}
      <section className="bg-gradient-to-br from-teal-50 to-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-gray-900 mb-4 text-4xl font-bold">{copy.process.title}</h1>
          <p className="text-gray-600 max-w-3xl mx-auto text-lg">
            {copy.process.subtitle}
          </p>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-12">
            {timeline.map((item, index) => {
              const IconComponent = item.icon;
              return (
                <div key={index} className="flex gap-8">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <IconComponent className="w-8 h-8 text-teal-600" />
                    </div>
                    {index < timeline.length - 1 && (
                      <div className="w-0.5 flex-1 bg-teal-200 my-4"></div>
                    )}
                  </div>

                  <div className="flex-1 pb-12">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-sm text-teal-600 mb-1">Step {item.step}</div>
                        <h3 className="text-gray-900">{item.title}</h3>
                      </div>
                      <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                        {item.duration}
                      </div>
                    </div>
                    <p className="text-gray-600 mb-3">{item.description}</p>
                    <div className="inline-flex items-center gap-2 text-sm text-teal-700 bg-teal-50 px-3 py-1 rounded-full">
                      <CheckCircle className="w-4 h-4" />
                      {item.microcopy}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Clinical Standards Mini */}
      <ClinicalStandardsMini />

      {/* Clinical Standards */}
      <ClinicalStandards />

      {/* Evidence Gallery */}
      <EvidenceGallery pageKey="process" compact />

      {/* Key Expectations */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-gray-900 mb-4">What You Can Expect</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our commitment to your comfort, privacy, and confidence.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {expectations.map((item, index) => {
              const IconComponent = item.icon;
              return (
                <div key={index} className="bg-white p-8 rounded-xl border border-gray-200 text-center">
                  <div className="w-14 h-14 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <IconComponent className="w-7 h-7 text-teal-600" />
                  </div>
                  <h3 className="text-gray-900 mb-3">{item.title}</h3>
                  <p className="text-gray-600 text-sm">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* AftercareBlock */}
      <AftercareBlock />

      {/* CTA */}
      <section className="py-12 bg-gradient-to-r from-teal-600 to-teal-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-white mb-4">{copy.cta.final.title}</h2>
          <p className="text-teal-100 mb-8 max-w-2xl mx-auto">
            {copy.cta.final.subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <ProfessionalCTA
              onClick={handleGetStartedClick}
              onNavigate={handleNavigateToOnboarding}
              className="inline-flex items-center justify-center px-8 py-3 bg-white text-teal-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
              aria-label={copy.hero.ctaPrimary}
            >
              {copy.hero.ctaPrimary}
            </ProfessionalCTA>
            <button
              onClick={() => handleWhatsAppClick('process_cta')}
              className="inline-flex items-center justify-center px-8 py-3 border-2 border-white text-white rounded-lg hover:bg-white/10 transition-colors font-semibold"
              aria-label={copy.whatsapp.ctaText}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              {copy.whatsapp.ctaText}
            </button>
          </div>
          <p className="text-teal-100 text-sm mt-4">
            {copy.disclaimer.medical}
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}