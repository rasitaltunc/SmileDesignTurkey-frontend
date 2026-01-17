import { Link } from '../components/Link';
import { MessageCircle, ChevronRight } from 'lucide-react';
import React, { useState, useEffect, useContext } from 'react';
import Footer from '../components/Footer';
import { BRAND } from '../config';
import { getWhatsAppUrl } from '../lib/whatsapp';
import { trackEvent } from '../lib/analytics';
import { useLanguage } from '../lib/i18n';
import { SEO } from '../lib/seo';
import { DEFAULT_COPY } from '../lib/siteContentDefaults';
import { NavigationContext } from '../lib/navigationContext';
import { ProfessionalCTA } from '../components/animations/ProfessionalCTA';

export default function FAQ() {
  const { lang, content, copy } = useLanguage();
  const { navigate } = useContext(NavigationContext);
  const [openFAQ, setOpenFAQ] = useState<string | null>(null);

  // SEO handled by <SEO> component below
  
  const handleGetStartedClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    trackEvent({ type: 'start_onboarding', entry: 'faq', lang });
    trackEvent({ type: 'cta_click', where: 'faq', cta: 'get_started', lang });
  };
  
  const handleNavigateToOnboarding = () => {
    navigate('/onboarding');
  };
  
  const handleWhatsAppClick = (location: string) => {
    trackEvent({ type: 'whatsapp_click', where: location, lang });
    const message = copy?.whatsapp?.templates?.question || DEFAULT_COPY.whatsapp.templates.question;
    const url = getWhatsAppUrl({ phoneE164: BRAND.whatsappPhoneE164, text: message });
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // SEO handled by <SEO> component below
  const seo = copy?.seo?.faq ?? DEFAULT_COPY.seo.faq;

  // Group FAQs by category
  const faqCategories = (copy?.faq || []).reduce((acc, faq) => {
    const existing = acc.find(cat => cat.category === faq.category);
    if (existing) {
      existing.questions.push({ id: `${faq.category}-${existing.questions.length + 1}`, question: faq.question, answer: faq.answer });
    } else {
      acc.push({ category: faq.category, questions: [{ id: `${faq.category}-1`, question: faq.question, answer: faq.answer }] });
    }
    return acc;
  }, [] as Array<{ category: string; questions: Array<{ id: string; question: string; answer: string }> }>);

  return (
    <div className="min-h-screen bg-white">
      <SEO 
        title={seo.title} 
        description={seo.description}
        url="/faq"
      />

      {/* Header */}
      <section className="bg-gradient-to-br from-teal-50 to-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-gray-900 mb-4 text-4xl font-bold">{seo.title.split('|')[0].trim()}</h1>
          <p className="text-gray-600 max-w-3xl mx-auto mb-6 text-lg">
            {seo.description}
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center text-teal-600 hover:text-teal-700 transition-colors"
            onClick={() => trackEvent({ type: 'nav_click', where: 'faq_contact_link', lang })}
          >
            Still have a question? Contact us
            <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-8">
            {faqCategories.map((category) => (
              <div key={category.category}>
                <h2 className="text-gray-900 mb-4">{category.category}</h2>
                <div className="space-y-2">
                  {category.questions.map((faq) => (
                    <div
                      key={faq.id}
                      className="bg-white border border-gray-200 rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() => {
                          const isExpanding = openFAQ !== faq.id;
                          setOpenFAQ(openFAQ === faq.id ? null : faq.id);
                          if (isExpanding) {
                            trackEvent({ type: 'faq_expand', question: faq.question, lang });
                          }
                        }}
                        className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-gray-900 pr-4">{faq.question}</span>
                        <ChevronRight
                          className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${
                            openFAQ === faq.id ? 'rotate-90' : ''
                          }`}
                        />
                      </button>
                      {openFAQ === faq.id && (
                        <div className="px-4 pb-4 text-gray-600">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 bg-gradient-to-r from-teal-600 to-teal-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-white mb-4">Still Have Questions?</h2>
          <p className="text-teal-100 mb-8 max-w-2xl mx-auto">
            Get personalized answers during your free consultation, or reach out to us directly on WhatsApp.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <ProfessionalCTA
              onClick={handleGetStartedClick}
              onNavigate={handleNavigateToOnboarding}
              className="px-8 py-3 bg-white text-teal-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
              aria-label={copy.hero.ctaPrimary}
            >
              {copy.hero.ctaPrimary}
            </ProfessionalCTA>
            <button
              onClick={() => handleWhatsAppClick('faq_cta')}
              className="px-8 py-3 border-2 border-white text-white rounded-lg hover:bg-white/10 transition-colors font-semibold flex items-center justify-center gap-2"
              aria-label={copy?.whatsapp?.ctaText || DEFAULT_COPY.whatsapp.ctaText}
            >
              <MessageCircle className="w-4 h-4" />
              {copy?.whatsapp?.ctaText || DEFAULT_COPY.whatsapp.ctaText}
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