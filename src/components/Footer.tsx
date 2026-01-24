import { Link } from './Link';
import { MessageCircle, Mail, MapPin, Phone } from 'lucide-react';
import { BRAND } from '../config';
import { getWhatsAppUrl } from '../lib/whatsapp';
import { trackEvent } from '../lib/analytics';
import { useLanguage } from '../lib/i18n';

export default function Footer() {
  const { lang, copy } = useLanguage();

  const handleWhatsAppClick = () => {
    trackEvent({
      type: 'whatsapp_click',
      where: 'footer',
      lang
    });
    const message = copy.whatsapp.templates.question;
    const url = getWhatsAppUrl({ phoneE164: BRAND.whatsappPhoneE164, text: message });
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      console.warn('[WhatsApp] Invalid phone number, cannot open WhatsApp');
    }
  };

  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="text-teal-600 mb-4">GuideHealth</div>
            <p className="text-gray-600 text-sm mb-4">
              Premium dental care abroad. Personalized, private, and professional.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleWhatsAppClick}
                className="p-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-4 text-gray-900">Quick Links</h3>
            <div className="flex flex-col gap-2 text-sm">
              <Link to="/treatments" className="text-gray-600 hover:text-teal-600 transition-colors">
                Treatments
              </Link>
              <Link to="/pricing" className="text-gray-600 hover:text-teal-600 transition-colors">
                Pricing
              </Link>
              <Link to="/process" className="text-gray-600 hover:text-teal-600 transition-colors">
                Process
              </Link>
              <Link to="/reviews" className="text-gray-600 hover:text-teal-600 transition-colors">
                Reviews
              </Link>
            </div>
          </div>

          {/* Support */}
          <div>
            <h3 className="mb-4 text-gray-900">Support</h3>
            <div className="flex flex-col gap-2 text-sm">
              <Link to="/faq" className="text-gray-600 hover:text-teal-600 transition-colors">
                FAQ
              </Link>
              <Link to="/contact" className="text-gray-600 hover:text-teal-600 transition-colors">
                Contact Us
              </Link>
              <Link to="/onboarding" className="text-gray-600 hover:text-teal-600 transition-colors">
                Free Consultation
              </Link>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-4 text-gray-900">Contact</h3>
            <div className="flex flex-col gap-3 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>123 Medical Plaza, Healthcare City</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 flex-shrink-0" />
                <span>{BRAND.whatsappPhoneE164}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <span>hello@guidehealth.com</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-600">
            <div className="flex flex-col gap-2">
              <p>© 2024 GuideHealth. All rights reserved.</p>
              <p className="text-xs text-gray-500 italic">{copy?.disclaimer?.medical}</p>
            </div>
            <div className="flex gap-6">
              <Link to="#" className="hover:text-teal-600 transition-colors">
                Privacy Policy
              </Link>
              <Link to="#" className="hover:text-teal-600 transition-colors">
                Terms of Service
              </Link>
              <Link to="#" className="hover:text-teal-600 transition-colors">
                Cookie Policy
              </Link>
              {import.meta.env.DEV && (
                <Link to="/admin/leads" className="hover:text-teal-600 transition-colors text-xs text-gray-400">
                  Admin (Dev)
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}