import { Link } from '../components/Link';
import { MessageCircle, Check, TrendingUp, Package, Headphones, CheckCircle } from 'lucide-react';
import React, { useEffect, useContext } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { treatments } from '../data/treatments';
import { BRAND } from '../config';
import { getWhatsAppUrl } from '../lib/whatsapp';
import { trackEvent } from '../lib/analytics';
import { useLanguage } from '../lib/i18n';
import { SEO } from '../lib/seo';
import { NavigationContext } from '../App';
import { ProfessionalCTA } from '../components/animations/ProfessionalCTA';
import { InclusionsList } from '../components/trust/InclusionsList';
import { TrustPack } from '../components/trust/TrustPack';
import { AftercareBlock } from '../components/trust/AftercareBlock';
import { TransparencyCard } from '../components/trust/TransparencyCard';
import { EvidenceStrip } from '../components/trust/EvidenceStrip';
import { TrustBadges } from '../components/trust/TrustBadges';

export default function Pricing() {
  const { lang, content, copy } = useLanguage();
  const { navigate } = useContext(NavigationContext);

  // SEO handled by <SEO> component below
  
  const handleGetStartedClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    trackEvent({ type: 'start_onboarding', entry: 'pricing', lang });
    trackEvent({ type: 'cta_click', where: 'pricing', cta: 'get_started', lang });
  };
  
  const handleNavigateToOnboarding = () => {
    navigate('/onboarding');
  };
  
  const handleWhatsAppClick = (location: string) => {
    trackEvent({ type: 'whatsapp_click', where: location, lang });
    const message = copy.whatsapp.templates.pricing;
    const url = getWhatsAppUrl({ phoneE164: BRAND.whatsappPhoneE164, text: message });
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };
  const pricingFactors = [
    {
      title: 'Treatment Complexity',
      description: 'More complex cases requiring additional procedures or expertise may have higher costs.',
      icon: TrendingUp
    },
    {
      title: 'Material Choices',
      description: 'Premium materials like zirconia or high-grade porcelain offer enhanced durability and aesthetics.',
      icon: Package
    },
    {
      title: 'Additional Services',
      description: 'Options like sedation, translation services, or extended aftercare can be added to your plan.',
      icon: Headphones
    }
  ];

  const included = [
    {
      title: 'Personalized Treatment Plan',
      description: 'Detailed plan tailored to your unique needs, goals, and budget.',
      icon: Check
    },
    {
      title: 'Dedicated Care Coordinator',
      description: 'Your personal guide from consultation through aftercare and beyond.',
      icon: Check
    },
    {
      title: 'Ongoing Aftercare & Support',
      description: 'Continued support and check-ins to ensure your results last.',
      icon: Check
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <SEO 
        title={copy.seo.pricing.title} 
        description={copy.seo.pricing.description}
        url="/pricing"
      />
      <Navbar />

      {/* Header */}
      <section className="bg-gradient-to-br from-teal-50 to-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-gray-900 mb-4 text-4xl font-bold">{copy.packages.title}</h1>
          <p className="text-gray-600 max-w-3xl mx-auto mb-6 text-lg">
            {copy.packages.subtitle}
          </p>
          <p className="text-sm text-gray-500">
            {copy.packages.disclaimer}
          </p>
        </div>
      </section>

      {/* Trust Badges */}
      <TrustBadges />

      {/* Transparency Card */}
      <TransparencyCard />

      {/* Pricing Table */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-gray-900 mb-2">Treatment Pricing Ranges</h2>
            <p className="text-gray-600">
              These are starting ranges only. Your plan is always personal and tailored to your unique situation.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {treatments.map((treatment) => (
              <div
                key={treatment.id}
                className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-teal-200 transition-all"
              >
                <h3 className="text-gray-900 mb-2">{treatment.name}</h3>
                <div className="mb-4">
                  <div className="text-sm text-gray-500 mb-1">Price Range</div>
                  <div className="text-teal-600">
                    ${treatment.priceRange.from.toLocaleString()} - ${treatment.priceRange.to.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">per treatment</div>
                </div>
                <p className="text-gray-600 text-sm mb-6">{treatment.shortDescription}</p>
                  <Link
                    to={`/treatment/${treatment.id}`}
                    className="block w-full px-4 py-2 text-center border border-teal-600 text-teal-600 rounded-lg hover:bg-teal-50 transition-colors text-sm"
                    onClick={() => {
                      trackEvent({ type: 'pricing_cta_click', package: treatment.name, lang });
                    }}
                  >
                    View Details
                  </Link>
              </div>
            ))}
          </div>

          <div className="mt-8 p-6 bg-teal-50 rounded-xl border border-teal-200">
            <p className="text-gray-700 text-sm">
              <strong className="text-teal-700">{copy.packages.disclaimer}</strong>
            </p>
          </div>
          
          {/* Packages Section */}
          <div className="mt-12">
            <h2 className="text-gray-900 mb-8 text-2xl font-semibold text-center">Treatment Packages</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {copy.packages.items.map((pkg, idx) => (
                <div
                  key={idx}
                  className={`bg-white rounded-lg p-8 border-2 ${pkg.popular ? 'border-teal-600 shadow-lg' : 'border-gray-200'} hover:shadow-xl transition-all`}
                >
                  {pkg.popular && (
                    <div className="inline-block bg-teal-600 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4">
                      Most Popular
                    </div>
                  )}
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{pkg.name}</h3>
                  <div className="mb-6">
                    <span className="text-2xl font-bold text-teal-600">{pkg.priceRange}</span>
                    <p className="text-xs text-gray-500 mt-1">Starting from</p>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {pkg.includes.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <Check className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/onboarding"
                    className="block w-full text-center px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-semibold"
                    onClick={() => {
                      trackEvent({ type: 'pricing_cta_click', package: pkg.name, lang });
                      trackEvent({ type: 'start_onboarding', entry: 'pricing_package', lang });
                    }}
                  >
                    {copy.hero.ctaPrimary}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* What Affects Price */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-gray-900 mb-4">What Affects Price?</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              We believe in transparent pricing. Here are the main factors that influence your treatment cost.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {pricingFactors.map((factor, index) => {
              const IconComponent = factor.icon;
              return (
                <div key={index} className="bg-white p-6 rounded-xl border border-gray-200">
                  <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-4">
                    <IconComponent className="w-6 h-6 text-teal-600" />
                  </div>
                  <h3 className="text-gray-900 mb-3">{factor.title}</h3>
                  <p className="text-gray-600 text-sm">{factor.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* What's Included */}
      <InclusionsList />

      {/* Evidence Strip */}
      <EvidenceStrip pageKey="pricing" maxItems={4} />

      {/* TrustPack */}
      <TrustPack />

      {/* AftercareBlock */}
      <AftercareBlock />

      {/* CTA */}
      <section className="py-12 bg-gradient-to-r from-teal-600 to-teal-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-white mb-4">Get Your Personalized Plan</h2>
          <p className="text-teal-100 mb-8 max-w-2xl mx-auto">
            Receive a detailed treatment plan with transparent pricing tailored specifically to your needs.
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
              onClick={() => handleWhatsAppClick('pricing_cta')}
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