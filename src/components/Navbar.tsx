import { Link } from './Link';
import { Menu, X, MessageCircle, Globe } from 'lucide-react';
import { useState } from 'react';
import { BRAND } from '../config';
import { getWhatsAppUrl } from '../lib/whatsapp';
import { trackEvent } from '../lib/analytics';
import { useLanguage } from '../lib/i18n';

interface NavbarProps {
  minimal?: boolean;
}

export default function Navbar({ minimal = false }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { lang, setLang, content } = useLanguage();

  const handleWhatsAppClick = () => {
    trackEvent({ 
      type: 'whatsapp_click', 
      where: 'navbar',
      lang 
    });
    const message = content.whatsapp.defaultMessage;
    const url = getWhatsAppUrl({ phoneE164: BRAND.whatsappPhoneE164, text: message });
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      console.warn('[WhatsApp] Invalid phone number, cannot open WhatsApp');
    }
  };

  const toggleLanguage = () => {
    const newLang = lang === 'en' ? 'tr' : 'en';
    setLang(newLang);
    trackEvent({ type: 'nav_click', where: 'language_toggle', lang: newLang });
  };

  if (minimal) {
    return (
      <nav className="bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="text-teal-600">
              GuideHealth
            </Link>
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 text-gray-600 hover:text-teal-600 transition-colors"
              aria-label={`Switch to ${lang === 'en' ? 'Turkish' : 'English'}`}
            >
              <Globe className="w-4 h-4" />
              {lang.toUpperCase()}
            </button>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="text-teal-600">
            GuideHealth
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/treatments" className="text-gray-700 hover:text-teal-600 transition-colors">
              Treatments
            </Link>
            <Link to="/pricing" className="text-gray-700 hover:text-teal-600 transition-colors">
              Pricing
            </Link>
            <Link to="/process" className="text-gray-700 hover:text-teal-600 transition-colors">
              Process
            </Link>
            <Link to="/reviews" className="text-gray-700 hover:text-teal-600 transition-colors">
              Reviews
            </Link>
            <Link to="/faq" className="text-gray-700 hover:text-teal-600 transition-colors">
              FAQ
            </Link>
            <Link to="/contact" className="text-gray-700 hover:text-teal-600 transition-colors">
              Contact
            </Link>
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 text-gray-600 hover:text-teal-600 transition-colors"
              aria-label={`Switch to ${lang === 'en' ? 'Turkish' : 'English'}`}
            >
              <Globe className="w-4 h-4" />
              {lang.toUpperCase()}
            </button>
            <button
              onClick={handleWhatsAppClick}
              className="flex items-center gap-2 px-4 py-2 text-teal-600 border border-teal-600 rounded-lg hover:bg-teal-50 transition-colors"
              aria-label={content.whatsapp.ctaText}
            >
              <MessageCircle className="w-4 h-4" />
              {content.whatsapp.ctaText}
            </button>
            <Link
              to="/onboarding"
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              onClick={() => trackEvent({ type: 'cta_click', where: 'navbar', cta: 'free_consultation', lang })}
            >
              {content.cta.primary}
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-gray-700"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-gray-100">
            <div className="flex flex-col gap-4">
              <Link
                to="/treatments"
                className="text-gray-700 hover:text-teal-600 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Treatments
              </Link>
              <Link
                to="/pricing"
                className="text-gray-700 hover:text-teal-600 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Pricing
              </Link>
              <Link
                to="/process"
                className="text-gray-700 hover:text-teal-600 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Process
              </Link>
              <Link
                to="/reviews"
                className="text-gray-700 hover:text-teal-600 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Reviews
              </Link>
              <Link
                to="/faq"
                className="text-gray-700 hover:text-teal-600 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                FAQ
              </Link>
              <Link
                to="/contact"
                className="text-gray-700 hover:text-teal-600 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Contact
              </Link>
              <button
                onClick={toggleLanguage}
                className="flex items-center gap-2 text-gray-600 hover:text-teal-600 transition-colors"
              >
                <Globe className="w-4 h-4" />
                {language}
              </button>
              <button
                onClick={handleWhatsAppClick}
                className="flex items-center justify-center gap-2 px-4 py-2 text-teal-600 border border-teal-600 rounded-lg hover:bg-teal-50 transition-colors"
                aria-label={content.whatsapp.ctaText}
              >
                <MessageCircle className="w-4 h-4" />
                {content.whatsapp.ctaText}
              </button>
              <Link
                to="/onboarding"
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-center"
                onClick={() => {
                  setIsOpen(false);
                  trackEvent({ type: 'cta_click', where: 'navbar_mobile', cta: 'free_consultation', lang });
                }}
              >
                {content.cta.primary}
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}