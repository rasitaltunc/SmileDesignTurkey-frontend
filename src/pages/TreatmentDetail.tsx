import { Link, useParams } from '../components/Link';
import { MessageCircle, ChevronRight, Check, Clock, DollarSign } from 'lucide-react';
import Footer from '../components/Footer';
import { treatments } from '../data/treatments';
import { BRAND } from '../config';
import { getWhatsAppUrl } from '../lib/whatsapp';
import { trackEvent } from '../lib/analytics';

export default function TreatmentDetail() {
  const params = useParams();
  const treatment = params?.treatmentId 
    ? treatments.find(t => t.id === params.treatmentId)
    : treatments[0];

  const handleWhatsAppClick = (location: string) => {
    trackEvent({ 
      type: 'whatsapp_click', 
      where: 'treatment_detail',
      lang: BRAND.defaultLang 
    });
    const message = `Hi, I'm interested in ${treatment?.name || 'treatment'}. Language: ${BRAND.defaultLang}.`;
    const url = getWhatsAppUrl({ phoneE164: BRAND.whatsappPhoneE164, text: message });
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      console.warn('[WhatsApp] Invalid phone number, cannot open WhatsApp');
    }
  }; // Default to first treatment

  if (!treatment) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-gray-900 mb-4">Treatment Not Found</h1>
          <Link to="/treatments" className="text-teal-600 hover:text-teal-700">
            Back to Treatments
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <section className="relative bg-gradient-to-br from-teal-50 to-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
            <Link to="/" className="hover:text-teal-600">Home</Link>
            <ChevronRight className="w-4 h-4" />
            <Link to="/treatments" className="hover:text-teal-600">Treatments</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900">{treatment.name}</span>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-gray-900 mb-4">{treatment.name}</h1>
              <p className="text-gray-600 mb-8">{treatment.description}</p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/onboarding"
                  className="inline-flex items-center justify-center px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                  Free Consultation
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Link>
                <button
                  onClick={() => handleWhatsAppClick('treatment_detail_top')}
                  className="inline-flex items-center justify-center px-6 py-3 border border-teal-600 text-teal-600 rounded-lg hover:bg-teal-50 transition-colors"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp
                </button>
              </div>

              <p className="text-gray-500 text-sm mt-4">
                No obligation • Private consultation • No spam
              </p>
            </div>

            <div>
              <img
                src="https://images.unsplash.com/photo-1642844819197-5f5f21b89ff8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBkZW50aXN0JTIwb2ZmaWNlfGVufDF8fHx8MTc2NTczODU3N3ww&ixlib=rb-4.1.0&q=80&w=1080"
                alt={treatment.name}
                className="rounded-2xl shadow-xl w-full h-[400px] object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Who This Is For */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-gray-900 mb-6">Who This Treatment Is For</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {treatment.whoItsFor.map((item, index) => (
              <div key={index} className="flex items-start gap-3 p-4 bg-teal-50 rounded-lg">
                <Check className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-gray-900 mb-6">What's Included</h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {treatment.whatsIncluded.map((item, index) => (
              <div key={index} className="flex items-start gap-3 p-4">
                <Check className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-gray-900 mb-6">Treatment Timeline</h2>
          <div className="space-y-6">
            {treatment.timeline.map((phase, index) => (
              <div key={index} className="flex gap-6">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 flex-shrink-0">
                    {index + 1}
                  </div>
                  {index < treatment.timeline.length - 1 && (
                    <div className="w-0.5 h-full bg-teal-200 my-2"></div>
                  )}
                </div>
                <div className="flex-1 pb-8">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-gray-900">{phase.phase}</h3>
                    <div className="flex items-center gap-1 text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                      <Clock className="w-3 h-3" />
                      {phase.duration}
                    </div>
                  </div>
                  <p className="text-gray-600">{phase.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Factors */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-gray-900 mb-6">What Affects Pricing</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {treatment.pricingFactors.map((factor, index) => (
              <div key={index} className="flex items-start gap-3 p-4 bg-white rounded-lg border border-gray-200">
                <DollarSign className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{factor}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 bg-teal-50 rounded-lg border border-teal-200">
            <p className="text-gray-700 text-sm">
              <strong className="text-teal-700">Price Range:</strong> ${treatment.priceRange.from.toLocaleString()} - ${treatment.priceRange.to.toLocaleString()}
            </p>
            <p className="text-gray-600 text-sm mt-2">
              Your plan is always personal. Get your exact quote during your free consultation.
            </p>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-teal-50 to-white p-8 md:p-12 rounded-2xl border border-teal-100">
            <div className="flex gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="text-yellow-400">★</span>
              ))}
            </div>
            <p className="text-gray-700 mb-4 italic">
              "The {treatment.name.toLowerCase()} procedure exceeded all my expectations. The team was professional, caring, and made sure I understood every step. I felt safe and supported throughout the entire journey."
            </p>
            <div>
              <div className="text-gray-900">Patient Review</div>
              <div className="text-sm text-gray-600">Verified {treatment.name} Patient</div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-12 bg-gradient-to-r from-teal-600 to-teal-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-white mb-4">Ready to Get Started?</h2>
          <p className="text-teal-100 mb-8">
            Start your free consultation and get a personalized treatment plan with transparent pricing.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/onboarding"
              className="inline-flex items-center justify-center px-8 py-3 bg-white text-teal-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Start Free Consultation
            </Link>
            <button
              onClick={() => handleWhatsAppClick('treatment_detail_bottom')}
              className="inline-flex items-center justify-center px-8 py-3 border-2 border-white text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp Us
            </button>
          </div>
          <p className="text-teal-100 text-sm mt-4">
            No spam. Private. No obligation.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}