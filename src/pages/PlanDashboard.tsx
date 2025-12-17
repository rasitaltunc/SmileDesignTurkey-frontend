import { Link } from '../components/Link';
import { Download, MessageCircle, Calendar, Upload, CheckCircle, Clock, User, Image as ImageIcon, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { trackEvent } from '../lib/analytics';
import { BRAND } from '../config';
import { getWhatsAppUrl } from '../lib/whatsapp';
import { SEO } from '../lib/seo';
import { useLanguage } from '../lib/i18n';

export default function PlanDashboard() {
  const { copy } = useLanguage();
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [onboardingData, setOnboardingData] = useState<any>(null);

  useEffect(() => {
    // Load onboarding data from localStorage
    try {
      const stored = localStorage.getItem('guidehealth_onboarding_v1');
      if (stored) {
        const data = JSON.parse(stored);
        setOnboardingData(data);
        
        // Track view with data
        trackEvent({ 
          type: 'view_plan_dashboard',
          goal: data.goal,
          timeline: data.timeline,
          lang: data.lang || BRAND.defaultLang
        });
      } else {
        // Track view without data
        trackEvent({ 
          type: 'view_plan_dashboard',
          lang: BRAND.defaultLang
        });
      }
    } catch (error) {
      console.warn('Failed to load onboarding data:', error);
      trackEvent({ 
        type: 'view_plan_dashboard',
        lang: BRAND.defaultLang
      });
    }
  }, []);

  const handleWhatsAppClick = (location: string) => {
    const lang = onboardingData?.lang || BRAND.defaultLang;
    trackEvent({ 
      type: 'whatsapp_click', 
      where: 'plan_dashboard',
      goal: onboardingData?.goal,
      timeline: onboardingData?.timeline,
      lang 
    });
    
    const message = onboardingData
      ? `Hi, I want a free consultation. My goal is: ${onboardingData.goal || 'Not specified'}. My timeline is: ${onboardingData.timeline || 'Not specified'}. Language: ${lang}.`
      : `Hi, I want a free consultation. Language: ${lang}.`;
    
    const url = getWhatsAppUrl({ phoneE164: BRAND.whatsappPhoneE164, text: message });
    
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      console.warn('[WhatsApp] Invalid phone number, cannot open WhatsApp');
    }
  };

  const timeline = [
    {
      title: 'Initial Consultation',
      status: 'completed',
      date: 'Dec 10, 2024',
      notes: 'Completed online. Treatment plan created.'
    },
    {
      title: 'Document Upload',
      status: 'completed',
      date: 'Dec 12, 2024',
      notes: 'X-rays and photos received and reviewed.'
    },
    {
      title: 'Doctor Review',
      status: 'in-progress',
      date: 'Dec 15, 2024',
      notes: 'Specialist reviewing your case. Results within 24h.'
    },
    {
      title: 'Travel Planning',
      status: 'upcoming',
      date: 'To be scheduled',
      notes: 'We\'ll help coordinate your visit dates.'
    },
    {
      title: 'Arrival & Treatment',
      status: 'upcoming',
      date: 'To be scheduled',
      notes: 'Meet your team and begin treatment.'
    },
    {
      title: 'Aftercare',
      status: 'upcoming',
      date: 'Ongoing',
      notes: 'Virtual check-ins and ongoing support.'
    }
  ];

  const quickActions = [
    {
      title: 'Schedule Your Call',
      description: 'Book a video consultation with your coordinator',
      icon: Calendar,
      action: 'Schedule'
    },
    {
      title: 'Ask on WhatsApp',
      description: 'Quick questions? Message us directly',
      icon: MessageCircle,
      action: 'Message'
    },
    {
      title: 'Upload More Documents',
      description: 'Add additional photos or files',
      icon: Upload,
      action: 'Upload'
    },
    {
      title: 'Download Plan as PDF',
      description: 'Save your personalized treatment plan',
      icon: Download,
      action: 'Download'
    }
  ];

  const faqs = [
    {
      question: 'Can I change my travel dates?',
      answer: 'Yes! Your coordinator will work with you to find dates that suit your schedule. We recommend booking flexible travel options when possible.'
    },
    {
      question: 'How is my data protected?',
      answer: 'All your information is encrypted and stored securely. Only your assigned care team has access, and you can request deletion at any time.'
    },
    {
      question: 'What happens next?',
      answer: 'Your specialist is currently reviewing your case. You\'ll receive a detailed treatment plan within 24 hours, and then we can schedule your next consultation call.'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO 
        title={copy.seo.planDashboard.title} 
        description={copy.seo.planDashboard.description}
        url="/plan-dashboard"
      />
      <Navbar minimal />

      {/* Header */}
      <section className="bg-gradient-to-r from-teal-600 to-teal-500 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-white mb-2">Welcome, Sarah!</h1>
              <p className="text-teal-100">
                Your personalized treatment journey is underway. We're here for you at every step.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Onboarding Summary Card */}
            {onboardingData && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <h2 className="text-gray-900 mb-4">Your Consultation Summary</h2>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-sm text-gray-600 font-medium min-w-[120px]">Goal:</span>
                    <span className="text-gray-900">{onboardingData.goal || 'Not specified'}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-sm text-gray-600 font-medium min-w-[120px]">Timeline:</span>
                    <span className="text-gray-900">{onboardingData.timeline || 'Not specified'}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-sm text-gray-600 font-medium min-w-[120px]">Treatment Interest:</span>
                    <span className="text-gray-900">{onboardingData.priority || 'Not specified'}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-sm text-gray-600 font-medium min-w-[120px]">Language:</span>
                    <span className="text-gray-900">{onboardingData.lang || BRAND.defaultLang}</span>
                  </div>
                  {onboardingData.notes && (
                    <div className="flex items-start gap-3">
                      <span className="text-sm text-gray-600 font-medium min-w-[120px]">Notes:</span>
                      <span className="text-gray-900">{onboardingData.notes}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  No spam. Your data stays on your device for now.
                </p>
              </div>
            )}
            {/* Timeline */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-gray-900 mb-6">Your Treatment Roadmap</h2>
              
              <div className="space-y-6">
                {timeline.map((item, index) => (
                  <div key={index} className="flex gap-6">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          item.status === 'completed'
                            ? 'bg-green-100 text-green-600'
                            : item.status === 'in-progress'
                            ? 'bg-teal-100 text-teal-600'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {item.status === 'completed' ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : item.status === 'in-progress' ? (
                          <Clock className="w-5 h-5 animate-pulse" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-gray-400" />
                        )}
                      </div>
                      {index < timeline.length - 1 && (
                        <div
                          className={`w-0.5 h-full my-2 ${
                            item.status === 'completed' ? 'bg-green-200' : 'bg-gray-200'
                          }`}
                        ></div>
                      )}
                    </div>

                    <div className="flex-1 pb-6">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-gray-900">{item.title}</h3>
                        <span className="text-sm text-gray-500">{item.date}</span>
                      </div>
                      <p className="text-gray-600 text-sm">{item.notes}</p>
                      {item.status === 'in-progress' && (
                        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-teal-50 text-teal-700 text-sm rounded-full">
                          <Clock className="w-3 h-3" />
                          In Progress
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-gray-900 mb-6">Quick Actions</h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                {quickActions.map((action, index) => {
                  const IconComponent = action.icon;
                  return (
                    <button
                      key={index}
                      onClick={() => {
                        if (action.title === 'Ask on WhatsApp') {
                          handleWhatsAppClick('quick_action_whatsapp');
                        }
                      }}
                      className="p-4 border border-gray-200 rounded-lg hover:border-teal-300 hover:bg-teal-50 transition-all text-left group"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-teal-200 transition-colors">
                          <IconComponent className="w-5 h-5 text-teal-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-gray-900 mb-1">{action.title}</h3>
                          <p className="text-gray-600 text-sm">{action.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Gallery Preview */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-gray-900">Your Clinic Preview</h2>
                <button className="text-sm text-teal-600 hover:text-teal-700">
                  View All
                </button>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="aspect-square bg-gradient-to-br from-teal-100 to-teal-50 rounded-lg flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-teal-400" />
                  </div>
                ))}
              </div>
              <p className="text-gray-600 text-sm mt-4">
                Explore our modern, comfortable facilities designed for your peace of mind.
              </p>
            </div>

            {/* FAQ */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-gray-900 mb-6">Common Questions at This Stage</h2>
              
              <div className="space-y-2">
                {faqs.map((faq, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
                      className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-gray-900">{faq.question}</span>
                      <ChevronRight
                        className={`w-5 h-5 text-gray-400 transition-transform ${
                          openFAQ === index ? 'rotate-90' : ''
                        }`}
                      />
                    </button>
                    {openFAQ === index && (
                      <div className="px-4 pb-4 text-gray-600 text-sm">{faq.answer}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Coordinator Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-gray-900 mb-4">Your Care Coordinator</h3>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-teal-600" />
                </div>
                <div>
                  <div className="text-gray-900">Dr. Emma Schmidt</div>
                  <div className="text-sm text-gray-600">Senior Coordinator</div>
                </div>
              </div>

              <p className="text-gray-600 text-sm mb-6">
                "Here for you at every step. Don't hesitate to reach out with any questions."
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => handleWhatsAppClick('coordinator_card')}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </button>
                <a
                  href="mailto:emma@guidehealth.com"
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Email
                </a>
              </div>
            </div>

            {/* Testimonial */}
            <div className="bg-gradient-to-br from-teal-50 to-white rounded-xl border border-teal-200 p-6">
              <div className="flex gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-yellow-400">★</span>
                ))}
              </div>
              <p className="text-gray-700 italic text-sm mb-3">
                "I felt supported the whole way. My coordinator answered every question and made the process so smooth."
              </p>
              <p className="text-gray-600 text-sm">— Verified Patient</p>
            </div>

            {/* CTA */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-gray-900 mb-3">Ready for the Next Step?</h3>
              <p className="text-gray-600 text-sm mb-4">
                Book your consultation call to discuss your personalized plan.
              </p>
              <button 
                onClick={() => handleWhatsAppClick('next_step_cta')}
                className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                Book Next Step
              </button>
              <button
                onClick={() => handleWhatsAppClick('ask_whatsapp_cta')}
                className="flex items-center justify-center gap-2 w-full px-4 py-2 mt-3 border border-teal-600 text-teal-600 rounded-lg hover:bg-teal-50 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Ask on WhatsApp
              </button>
            </div>

            {/* Privacy Note */}
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
              <h3 className="text-gray-900 mb-2">Your Privacy</h3>
              <p className="text-gray-600 text-sm">
                Your data is encrypted and secure. Only your assigned care team has access. You can request deletion at any time.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}