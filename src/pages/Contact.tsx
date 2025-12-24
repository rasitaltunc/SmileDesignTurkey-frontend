import { MessageCircle, Phone, Mail, MapPin, Clock, Globe } from 'lucide-react';
import { useState } from 'react';
import Footer from '../components/Footer';
import { BRAND } from '../config';
import { getWhatsAppUrl } from '../lib/whatsapp';
import { trackEvent } from '../lib/analytics';
import { saveLead } from '../lib/leadStore';
import { validateSubmission, getHoneypotFieldName } from '../lib/antiSpam';
import { SEO } from '../lib/seo';
import { useLanguage } from '../lib/i18n';

export default function Contact() {
  const { copy } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    language: 'English',
    message: '',
    [getHoneypotFieldName()]: '', // Honeypot field
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formOpenTime] = useState(Date.now()); // Track when form was opened

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    
    // Anti-spam validation
    const validation = validateSubmission(formData, formOpenTime);
    if (!validation.allowed) {
      setErrorMessage(validation.message || 'Please try again in a moment.');
      return;
    }
    
    const lang = formData.language.toLowerCase().substring(0, 2) || BRAND.defaultLang;
    
    // Save lead using new leads system (async)
    await saveLead({
      source: 'contact',
      name: formData.name || undefined,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      message: formData.message || undefined,
      lang: lang,
      pageUrl: window.location.href,
    });
    
    // Mailto fallback
    const subject = encodeURIComponent(`Contact from ${formData.name}`);
    const body = encodeURIComponent(
      `Name: ${formData.name}\nEmail: ${formData.email}\nPhone: ${formData.phone}\nLanguage: ${formData.language}\n\nMessage:\n${formData.message}`
    );
    window.location.href = `mailto:hello@guidehealth.com?subject=${subject}&body=${body}`;
    
    // Track analytics (no PII) - note: submit_lead is now tracked in leadStore
    trackEvent({ 
      type: 'contact_submit',
      where: 'contact_page',
      hasEmail: !!formData.email,
      hasPhone: !!formData.phone,
      lang 
    });
    
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setFormData({ name: '', email: '', phone: '', language: 'English', message: '', [getHoneypotFieldName()]: '' });
    }, 5000);
  };

  const handleWhatsAppClick = () => {
    const lang = formData.language.toLowerCase().substring(0, 2) || BRAND.defaultLang;
    trackEvent({ 
      type: 'whatsapp_click', 
      where: 'contact',
      lang 
    });
    
    const message = `Hi, I have a question. Language: ${formData.language || BRAND.defaultLang}.`;
    const url = getWhatsAppUrl({ phoneE164: BRAND.whatsappPhoneE164, text: message });
    
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      console.warn('[WhatsApp] Invalid phone number, cannot open WhatsApp');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-white">
      <SEO 
        title={copy.seo.contact.title} 
        description={copy.seo.contact.description}
        url="/contact"
      />

      {/* Header */}
      <section className="bg-gradient-to-br from-teal-50 to-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-gray-900 mb-4">Contact GuideHealth</h1>
          <p className="text-gray-600 max-w-3xl mx-auto">
            We're here to answer your questions. Reach out via your preferred method—no obligation, no pressure, and multilingual support available.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Options */}
          <div>
            <h2 className="text-gray-900 mb-6">Get in Touch</h2>

            <div className="space-y-6 mb-8">
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5 text-teal-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-gray-900 mb-1">WhatsApp</h3>
                  <p className="text-gray-600 text-sm mb-3">Fast, direct messaging with our team</p>
                  <button
                    onClick={() => handleWhatsAppClick('contact_page_whatsapp')}
                    className="inline-flex items-center text-teal-600 hover:text-teal-700 transition-colors"
                  >
                    Message us now
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-teal-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-gray-900 mb-1">Phone</h3>
                  <p className="text-gray-600 text-sm mb-3">Speak with a care coordinator</p>
                  <a
                    href={`tel:${BRAND.whatsappPhoneE164}`}
                    className="inline-flex items-center text-teal-600 hover:text-teal-700 transition-colors"
                  >
                    {BRAND.whatsappPhoneE164}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-teal-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-gray-900 mb-1">Email</h3>
                  <p className="text-gray-600 text-sm mb-3">Send us a detailed message</p>
                  <a
                    href="mailto:hello@guidehealth.com"
                    className="inline-flex items-center text-teal-600 hover:text-teal-700 transition-colors"
                  >
                    hello@guidehealth.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-teal-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-gray-900 mb-1">Business Hours</h3>
                  <p className="text-gray-600 text-sm">Monday - Friday: 9:00 AM - 6:00 PM CET</p>
                  <p className="text-gray-600 text-sm">Saturday: 10:00 AM - 2:00 PM CET</p>
                  <p className="text-gray-600 text-sm">Sunday: Closed</p>
                </div>
              </div>
            </div>

            {/* Trust Note */}
            <div className="p-6 bg-teal-50 rounded-xl border border-teal-200">
              <h3 className="text-gray-900 mb-3">Why Trust Us?</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-0.5">•</span>
                  <span>Trusted by patients from 40+ countries</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-0.5">•</span>
                  <span>Coordinators are medical professionals</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-0.5">•</span>
                  <span>All inquiries are confidential</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-0.5">•</span>
                  <span>Multilingual support available</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Contact Form */}
          <div>
            <h2 className="text-gray-900 mb-6">Send Us a Message</h2>

            {isSubmitted ? (
              <div className="p-8 bg-teal-50 rounded-xl border border-teal-200 text-center">
                <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-teal-600" />
                </div>
                <h3 className="text-gray-900 mb-2">Message Sent!</h3>
                <p className="text-gray-600 mb-2">
                  We'll reply within 24 hours. Your data stays private.
                </p>
                <p className="text-xs text-gray-500">
                  Your message has been saved locally and a mailto link has been opened.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm text-gray-700 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm text-gray-700 mb-2">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="+90 507 957 30 62"
                  />
                </div>

                <div>
                  <label htmlFor="language" className="block text-sm text-gray-700 mb-2">
                    Preferred Language
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                      id="language"
                      name="language"
                      value={formData.language}
                      onChange={handleChange}
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option>English</option>
                      <option>German</option>
                      <option>French</option>
                      <option>Spanish</option>
                      <option>Italian</option>
                      <option>Dutch</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm text-gray-700 mb-2">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="How can we help you?"
                  />
                </div>

                {/* Honeypot field (hidden) */}
                <div style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }}>
                  <label htmlFor={getHoneypotFieldName()}>Leave this field empty</label>
                  <input
                    type="text"
                    id={getHoneypotFieldName()}
                    name={getHoneypotFieldName()}
                    value={formData[getHoneypotFieldName() as keyof typeof formData] as string}
                    onChange={handleChange}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>

                {errorMessage && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">{errorMessage}</p>
                  </div>
                )}

                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    We reply within 24h. Your data stays private.
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    No spam. Your data stays on your device for now.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                  Send Message
                </button>
              </form>
            )}

            {/* WhatsApp CTA */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg text-center">
              <p className="text-sm text-gray-600 mb-3">Prefer instant messaging?</p>
              <button
                onClick={() => handleWhatsAppClick('contact_form_whatsapp')}
                className="inline-flex items-center gap-2 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Message us on WhatsApp
              </button>
              <p className="text-xs text-gray-500 mt-2">No spam, no pressure—just answers</p>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="mt-16">
          <h2 className="text-gray-900 mb-6 text-center">Our Location</h2>
          <div className="bg-gray-50 rounded-xl overflow-hidden">
            <div className="aspect-video bg-gradient-to-br from-teal-100 to-teal-50 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="w-12 h-12 text-teal-600 mx-auto mb-3" />
                <p className="text-gray-700">123 Medical Plaza, Healthcare City</p>
                <p className="text-gray-600 text-sm">Interactive map coming soon</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
