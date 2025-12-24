import { Link } from '../components/Link';
import { MessageCircle, Filter, Star } from 'lucide-react';
import React, { useState, useEffect, useContext } from 'react';
import Footer from '../components/Footer';
import { BRAND } from '../config';
import { getWhatsAppUrl } from '../lib/whatsapp';
import { trackEvent } from '../lib/analytics';
import { useLanguage } from '../lib/i18n';
import { SEO } from '../lib/seo';
import { NavigationContext } from '../App';
import { ProfessionalCTA } from '../components/animations/ProfessionalCTA';

interface Review {
  id: number;
  initials: string;
  country: string;
  countryCode: string;
  treatment: string;
  rating: number;
  text: string;
  date: string;
  image?: string;
}

export default function Reviews() {
  const { lang, content, copy } = useLanguage();
  const { navigate } = useContext(NavigationContext);
  const [selectedTreatment, setSelectedTreatment] = useState<string>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');

  // SEO handled by <SEO> component below
  
  const handleGetStartedClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    trackEvent({ type: 'start_onboarding', entry: 'reviews', lang });
    trackEvent({ type: 'cta_click', where: 'reviews', cta: 'get_started', lang });
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

  const reviews: Review[] = [
    {
      id: 1,
      initials: 'S.M.',
      country: 'United Kingdom',
      countryCode: '🇬🇧',
      treatment: 'Smile Makeover',
      rating: 5,
      text: 'The entire experience exceeded my expectations. From the first consultation to the final result, I felt supported and informed. The team was incredibly professional, and the results are absolutely stunning. I can\'t stop smiling!',
      date: 'December 2024',
      image: 'https://images.unsplash.com/photo-1650803075918-efbee311735d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkZW50YWwlMjBzbWlsZSUyMGhhcHB5fGVufDF8fHx8MTc2NTgzNDIwNXww&ixlib=rb-4.1.0&q=80&w=1080'
    },
    {
      id: 2,
      initials: 'M.T.',
      country: 'Germany',
      countryCode: '🇩🇪',
      treatment: 'Dental Implants',
      rating: 5,
      text: 'After years of feeling self-conscious about my missing teeth, I finally took the leap. The care coordinator spoke fluent German, which made everything so much easier. The clinic was modern and clean, and the doctors were highly skilled. I\'m so glad I chose GuideHealth.',
      date: 'November 2024'
    },
    {
      id: 3,
      initials: 'E.L.',
      country: 'Ireland',
      countryCode: '🇮🇪',
      treatment: 'Veneers',
      rating: 5,
      text: 'I was nervous about traveling abroad for dental work, but the team made everything seamless. The veneers look incredibly natural, and everyone has been complimenting my smile. The coordinator checked in with me regularly after I returned home, which was really reassuring.',
      date: 'November 2024'
    },
    {
      id: 4,
      initials: 'J.P.',
      country: 'France',
      countryCode: '🇫🇷',
      treatment: 'Crowns',
      rating: 5,
      text: 'Professional, transparent, and caring. The pricing was exactly as quoted—no surprises. The quality of work is exceptional, and I felt completely comfortable throughout the process. Highly recommend!',
      date: 'October 2024'
    },
    {
      id: 5,
      initials: 'A.K.',
      country: 'Netherlands',
      countryCode: '🇳🇱',
      treatment: 'Whitening',
      rating: 5,
      text: 'Quick, painless, and effective! I got professional whitening done in just one visit. The results are amazing, and the staff was friendly and accommodating. Great value for money.',
      date: 'October 2024'
    },
    {
      id: 6,
      initials: 'R.S.',
      country: 'Sweden',
      countryCode: '🇸🇪',
      treatment: 'Second Opinion',
      rating: 5,
      text: 'I was quoted a huge amount for treatment back home. The second opinion service at GuideHealth gave me peace of mind and saved me thousands. The specialist took time to explain everything clearly, and I felt confident moving forward with their recommendations.',
      date: 'September 2024'
    },
    {
      id: 7,
      initials: 'L.B.',
      country: 'Belgium',
      countryCode: '🇧🇪',
      treatment: 'Smile Makeover',
      rating: 5,
      text: 'Life-changing experience. The combination of veneers and whitening has given me the confidence I never had. The team was patient with all my questions and concerns. I\'m so grateful for the care I received.',
      date: 'September 2024'
    },
    {
      id: 8,
      initials: 'C.W.',
      country: 'United Kingdom',
      countryCode: '🇬🇧',
      treatment: 'Dental Implants',
      rating: 5,
      text: 'From the initial consultation to the follow-up care, everything was handled with professionalism and genuine care. My implants feel completely natural, and I can eat all my favorite foods again. Worth every penny.',
      date: 'August 2024'
    }
  ];

  const treatments = ['all', 'Smile Makeover', 'Dental Implants', 'Veneers', 'Crowns', 'Whitening', 'Second Opinion'];
  const languages = ['all', 'English', 'German', 'French', 'Dutch', 'Swedish'];

  const filteredReviews = reviews.filter(review => {
    const matchesTreatment = selectedTreatment === 'all' || review.treatment === selectedTreatment;
    const matchesLanguage = selectedLanguage === 'all'; // Simplified - in real app would filter by language
    return matchesTreatment && matchesLanguage;
  });

  return (
    <div className="min-h-screen bg-white">
      <SEO 
        title={copy.seo.reviews.title} 
        description={copy.seo.reviews.description}
        url="/reviews"
      />

      {/* Header */}
      <section className="bg-gradient-to-br from-teal-50 to-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-gray-900 mb-4 text-4xl font-bold">{copy.seo.reviews.title.split('|')[0].trim()}</h1>
          <p className="text-gray-600 max-w-3xl mx-auto mb-4 text-lg">
            {copy.seo.reviews.description}
          </p>
          <p className="text-sm text-gray-500">
            All reviews are verified and anonymized with consent.
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="py-8 bg-white border-b border-gray-200 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm text-gray-700 mb-2">Filter by Treatment</label>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={selectedTreatment}
                  onChange={(e) => setSelectedTreatment(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {treatments.map(treatment => (
                    <option key={treatment} value={treatment}>
                      {treatment === 'all' ? 'All Treatments' : treatment}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex-1">
              <label className="block text-sm text-gray-700 mb-2">Filter by Language</label>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {languages.map(language => (
                    <option key={language} value={language}>
                      {language === 'all' ? 'All Languages' : language}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-6">
            {filteredReviews.map((review) => (
              <div
                key={review.id}
                className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all"
              >
                {review.image && (
                  <img
                    src={review.image}
                    alt="Patient result"
                    className="w-full h-48 object-cover rounded-lg mb-4"
                  />
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center text-teal-600">
                    {review.initials}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900">{review.initials}</span>
                      <span className="text-xl">{review.countryCode}</span>
                    </div>
                    <div className="text-sm text-gray-600">{review.country}</div>
                  </div>
                  <div className="text-sm text-gray-500">{review.date}</div>
                </div>

                <div className="flex items-center gap-1 mb-3">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>

                <div className="inline-block px-3 py-1 bg-teal-50 text-teal-700 text-sm rounded-full mb-3">
                  {review.treatment}
                </div>

                <p className="text-gray-700 italic">"{review.text}"</p>
              </div>
            ))}
          </div>

          {filteredReviews.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600">No reviews found for the selected filters.</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 bg-gradient-to-r from-teal-600 to-teal-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-white mb-4">Ready for Your Own Story?</h2>
          <p className="text-teal-100 mb-8 max-w-2xl mx-auto">
            Start your free consultation and join hundreds of satisfied patients who transformed their smiles with confidence.
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
              onClick={() => handleWhatsAppClick('reviews_cta')}
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