import React, { useState, useEffect, useContext } from 'react';
import { Link } from '../components/Link';
import { NavigationContext } from '../lib/navigationContext';
import {
  Button,
  GuidedPanel,
  TrustStage,
  ChoiceCard,
  ProcessCard,
  ReviewCard,
  TrustBadge
} from '../components/design-system';
import Footer from '../components/Footer';
import {
  Smile,
  Anchor,
  Layers,
  Crown,
  Sun,
  FileCheck,
  MessageCircle,
  ChevronRight,
  Upload,
  Calendar,
  Heart,
  Shield,
  Star,
  Video,
  Plane,
  Building,
  Headphones,
  Award,
  Users,
  Clock,
  ChevronLeft,
  User,
  Stethoscope,
  CheckCircle
} from 'lucide-react';
import { cn } from '../components/ui/utils';
import { BRAND } from '../config';
import { getWhatsAppUrl } from '../lib/whatsapp';
import { trackEvent } from '../lib/analytics';
import { useLanguage } from '../lib/i18n';
import { SEO } from '../lib/seo';
import { ProfessionalCTA } from '../components/animations/ProfessionalCTA';
import { RevealOnScroll } from '../components/animations/RevealOnScroll';
import { ProofStrip } from '../components/trust/ProofStrip';
import { TrustPack } from '../components/trust/TrustPack';
import { AftercareBlock } from '../components/trust/AftercareBlock';
import { EvidenceStrip } from '../components/trust/EvidenceStrip';

export default function Home() {
  const { lang, content, copy } = useLanguage();
  const { navigate } = useContext(NavigationContext);
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  // SEO handled by <SEO> component below

  const handleWhatsAppClick = (location: string) => {
    trackEvent({
      type: 'whatsapp_click',
      where: location,
      lang
    });

    const message = copy.whatsapp.templates?.consultation || copy.whatsapp.ctaText || 'Hi, I want a free consultation.';
    const url = getWhatsAppUrl({ phoneE164: BRAND.whatsappPhoneE164, text: message });

    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      console.warn('[WhatsApp] Invalid phone number, cannot open WhatsApp');
    }
  };

  const handleGetStartedClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Fire analytics events (funnel: hero_cta_click -> start_onboarding -> submit_lead)
    trackEvent({
      type: 'hero_cta_click',
      lang
    });
    trackEvent({
      type: 'start_onboarding',
      entry: 'home',
      lang
    });
    trackEvent({ type: 'cta_click', where: 'home', cta: 'get_started', lang });
  };

  const handleNavigateToOnboarding = () => {
    navigate('/onboarding');
  };

  const handleCTAClick = (ctaName: string, location: string) => {
    trackEvent({ type: 'cta_click', where: location, cta: ctaName, lang });
  };

  const iconMap: { [key: string]: any } = {
    Sparkles: Smile,
    Anchor: Anchor,
    Layers: Layers,
    Crown: Crown,
    Sun: Sun,
    FileCheck: FileCheck,
    Video: Video,
    Plane: Plane,
    Building: Building,
    Heart: Heart,
    Headphones: Headphones,
  };

  const trustIconMap: { [key: string]: any } = {
    Shield: Shield,
    Users: Users,
    Award: Award,
    Clock: Clock,
  };


  return (
    <div className="min-h-screen bg-bg-primary">
      <SEO
        title={copy?.seo?.home?.title || "GuideHealth"}
        description={copy?.seo?.home?.description || "Premium Dental Care"}
        url="/"
      />

      {/* Split Hero Section */}
      <section className="relative bg-overlay-wash">
        <div className="max-w-[1440px] mx-auto px-8 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            {/* Left: Guided Panel */}
            <GuidedPanel
              showStepper={false}
              headline={copy?.hero?.headline}
              subheadline={copy?.hero?.subheadline}
              showTrustLine={true}
            >
              <div className="flex flex-col sm:flex-row gap-4">
                <ProfessionalCTA
                  onClick={handleGetStartedClick}
                  onNavigate={handleNavigateToOnboarding}
                  className="px-6 py-3 bg-accent-primary text-white rounded-lg hover:bg-accent-hover font-semibold w-full sm:w-auto flex items-center justify-center gap-2"
                  aria-label={copy?.hero?.ctaPrimary || "Get Started"}
                >
                  {copy?.hero?.ctaPrimary || "Get Started"}
                  <ChevronRight className="w-5 h-5" />
                </ProfessionalCTA>
                <button
                  onClick={() => handleWhatsAppClick('hero_cta')}
                  className="px-6 py-3 bg-white border-2 border-accent-primary text-accent-primary rounded-lg hover:bg-accent-soft transition-colors font-semibold w-full sm:w-auto"
                  aria-label={copy?.whatsapp?.ctaText || "WhatsApp"}
                >
                  <MessageCircle className="w-5 h-5 inline mr-2" />
                  {copy?.whatsapp?.ctaText || "WhatsApp"}
                </button>
              </div>
              <p className="text-xs text-text-tertiary mt-3">
                {copy?.disclaimer?.medical}
              </p>
            </GuidedPanel>

            {/* Right: Trust Stage */}
            <TrustStage
              mediaUrl="https://images.unsplash.com/photo-1758202292826-c40e172eed1c?w=1200"
              mediaAlt="Modern medical clinic"
              showBadges={true}
              showReviews={true}
            />
          </div>
        </div>
      </section>

      {/* Proof Strip */}
      <ProofStrip />

      {/* Evidence Strip */}
      <EvidenceStrip pageKey="home" />

      {/* TrustPack */}
      <TrustPack />

      {/* HowItWorks */}
      <RevealOnScroll direction="up" delay={150}>
        <section className="py-20 bg-bg-secondary">
          <div className="max-w-[1280px] mx-auto px-8">
            <div className="text-center mb-16 max-w-3xl mx-auto">
              <h2 className="text-text-primary mb-6 text-3xl font-semibold">{copy?.process?.title}</h2>
              <p className="text-text-secondary text-lg">
                {copy?.process?.subtitle}
              </p>
            </div>

            <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-8">
              {copy?.process?.steps?.map((step) => {
                const StepIcon = iconMap[step.icon] || Heart;
                return (
                  <ProcessCard
                    key={step.number}
                    step={step.number}
                    icon={<StepIcon className="w-6 h-6 text-accent-primary" />}
                    title={step.title}
                    description={step.description}
                  />
                );
              })}
            </div>

            <div className="text-center mt-12">
              <Link
                to="/process"
                className="inline-flex items-center gap-2 text-accent-primary hover:text-accent-hover font-semibold"
                onClick={() => handleCTAClick('learn_more_process', 'home')}
              >
                Learn More About Our Process
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>
      </RevealOnScroll>

      {/* WhyUs */}
      <RevealOnScroll direction="up" delay={200}>
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-8">
            <div className="text-center mb-16 max-w-3xl mx-auto">
              <h2 className="text-text-primary mb-6 text-3xl font-semibold">{copy.whyUs.title}</h2>
              <p className="text-text-secondary text-lg">
                {copy.whyUs.subtitle}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {copy.whyUs.points.map((point, idx) => {
                const PointIcon = trustIconMap[point.icon] || iconMap[point.icon] || Shield;
                return (
                  <div key={idx} className="bg-bg-secondary rounded-lg p-6 border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-accent-soft rounded-lg mb-4">
                      <PointIcon className="w-6 h-6 text-accent-primary" />
                    </div>
                    <h3 className="text-text-primary font-semibold mb-2">{point.title}</h3>
                    <p className="text-sm text-text-secondary leading-relaxed">{point.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </RevealOnScroll>

      {/* PackagesPreview */}
      <RevealOnScroll direction="up" delay={100}>
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-8">
            <div className="text-center mb-12">
              <h2 className="text-text-primary mb-4 text-3xl font-semibold">{copy.packages.title}</h2>
              <p className="text-text-secondary text-lg max-w-2xl mx-auto">
                {copy.packages.subtitle}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {copy.packages.items.map((pkg, idx) => (
                <div
                  key={idx}
                  className={`bg-white rounded-lg p-8 border-2 ${pkg.popular ? 'border-accent-primary shadow-lg' : 'border-gray-200'} hover:shadow-xl transition-all`}
                >
                  {pkg.popular && (
                    <div className="inline-block bg-accent-primary text-white text-xs font-semibold px-3 py-1 rounded-full mb-4">
                      Most Popular
                    </div>
                  )}
                  <h3 className="text-xl font-semibold text-text-primary mb-3">{pkg.name}</h3>
                  <div className="mb-6">
                    <span className="text-2xl font-bold text-accent-primary">{pkg.priceRange}</span>
                    <p className="text-xs text-text-tertiary mt-1">Starting from</p>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {pkg.includes.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                        <CheckCircle className="w-4 h-4 text-accent-primary mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/pricing"
                    className="block w-full text-center px-6 py-3 bg-accent-primary text-white rounded-lg hover:bg-accent-hover transition-colors font-semibold"
                    onClick={() => {
                      trackEvent({ type: 'pricing_cta_click', package: pkg.name, lang });
                      handleCTAClick('view_package', 'packages_preview');
                    }}
                  >
                    Learn More
                  </Link>
                </div>
              ))}
            </div>

            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <p className="text-sm text-text-secondary text-center">
                <strong className="text-text-primary">{copy.packages.disclaimer}</strong>
              </p>
            </div>
          </div>
        </section>
      </RevealOnScroll>

      {/* TestimonialsPreview */}
      <RevealOnScroll direction="up" delay={100}>
        <section className="py-20 bg-bg-primary">
          <div className="max-w-[1280px] mx-auto px-8">
            <div className="text-center mb-16 max-w-3xl mx-auto">
              <h2 className="text-text-primary mb-6 text-3xl font-semibold">Patient Testimonials</h2>
              <p className="text-text-secondary text-lg">
                Verified reviews from patients who chose GuideHealth for their dental care
              </p>
            </div>

            <div className="max-w-5xl mx-auto">
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                {copy.testimonials.map((testimonial, index) => (
                  <div key={index} className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-1 mb-3">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-text-secondary text-sm mb-4 leading-relaxed">"{testimonial.text}"</p>
                    <div className="pt-4 border-t border-gray-100">
                      <p className="font-semibold text-text-primary text-sm">{testimonial.name}</p>
                      <p className="text-xs text-text-tertiary">{testimonial.location}</p>
                      <p className="text-xs text-text-tertiary mt-1">{testimonial.treatment} • {testimonial.date}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center">
                <Link to="/reviews" onClick={() => handleCTAClick('read_all_reviews', 'home')}>
                  <Button variant="secondary" size="md">
                    Read All Reviews
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </RevealOnScroll>

      {/* FAQPreview */}
      <RevealOnScroll direction="up" delay={150}>
        <section className="py-20 bg-bg-secondary">
          <div className="max-w-4xl mx-auto px-8">
            <div className="text-center mb-16">
              <h2 className="text-text-primary mb-6 text-3xl font-semibold">Frequently Asked Questions</h2>
              <p className="text-text-secondary text-lg">
                Common questions about safety, treatment, pricing, and aftercare
              </p>
            </div>

            <div className="space-y-4 mb-12">
              {copy.faq.slice(0, 6).map((faq, index) => (
                <div
                  key={index}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  <button
                    onClick={() => {
                      const isExpanding = openFAQ !== index;
                      setOpenFAQ(openFAQ === index ? null : index);
                      if (isExpanding) {
                        trackEvent({ type: 'faq_expand', question: faq.question, lang });
                      }
                    }}
                    className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                    aria-expanded={openFAQ === index}
                  >
                    <span className="font-semibold text-text-primary pr-4">
                      {faq.question}
                    </span>
                    <ChevronRight
                      className={cn(
                        'w-5 h-5 text-text-tertiary flex-shrink-0 transition-transform duration-200',
                        openFAQ === index && 'rotate-90'
                      )}
                    />
                  </button>
                  {openFAQ === index && (
                    <div className="px-6 pb-6 text-text-secondary leading-relaxed text-sm">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="text-center">
              <Link to="/faq" onClick={() => handleCTAClick('view_all_faqs', 'home')}>
                <Button variant="ghost" size="md">
                  View All FAQs
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </RevealOnScroll>

      {/* Aftercare & Safety Block */}
      <AftercareBlock />

      {/* FinalCTA */}
      <section className="py-24 bg-gradient-to-br from-accent-primary to-accent-hover">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <h2 className="text-white mb-6 text-4xl font-bold">{copy.cta.final.title}</h2>
          <p className="text-white/90 text-lg mb-6 max-w-2xl mx-auto leading-relaxed">
            {copy.cta.final.subtitle}
          </p>
          <p className="text-white/70 text-sm mb-10">
            {copy.disclaimer.medical}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <ProfessionalCTA
              onClick={(e) => {
                e.preventDefault();
                trackEvent({ type: 'start_onboarding', entry: 'final_cta', lang });
                trackEvent({ type: 'cta_click', where: 'final_cta', cta: 'get_started', lang });
              }}
              onNavigate={() => navigate('/onboarding')}
              className="px-8 py-4 bg-white text-accent-primary hover:bg-white/95 shadow-lg font-semibold w-full sm:w-auto flex items-center justify-center gap-2"
              aria-label={copy?.hero?.ctaPrimary || "Get Started"}
            >
              {copy.hero.ctaPrimary}
              <ChevronRight className="w-5 h-5" />
            </ProfessionalCTA>
            <button
              onClick={() => handleWhatsAppClick('final_cta')}
              className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg hover:bg-white/10 transition-colors font-semibold w-full sm:w-auto flex items-center justify-center gap-2"
              aria-label={copy?.whatsapp?.ctaText || "WhatsApp"}
            >
              <MessageCircle className="w-5 h-5" />
              {copy.whatsapp.ctaText}
            </button>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-white/80 text-sm">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>Licensed Specialists</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>JCI Accredited</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>Lifetime Warranty</span>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
