import { useState } from 'react';
import { Menu, X, Globe } from 'lucide-react';
import { Link } from '../Link';
import { cn } from '../ui/utils';
import { useLanguage } from '../../lib/i18n';
import { trackEvent } from '../../lib/analytics';

export interface TopNavProps {
  variant?: 'desktop' | 'mobile';
  className?: string;
}

/**
 * C/TopNav - Design System Component
 * Variants: desktop, mobile
 */
export function TopNav({ variant = 'desktop', className }: TopNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { lang, setLang, content } = useLanguage();

  const toggleLanguage = () => {
    const newLang = lang === 'en' ? 'tr' : 'en';
    setLang(newLang);
    trackEvent({ type: 'nav_click', where: 'topnav_language', lang: newLang });
  };

  const navLinks = [
    { label: 'Treatments', href: '/treatments' },
    { label: 'Process', href: '/process' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Reviews', href: '/reviews' },
    { label: 'FAQ', href: '/faq' },
  ];

  if (variant === 'mobile') {
    return (
      <nav className={cn('bg-white border-b border-border-subtle', className)}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-accent-primary rounded-[var(--radius-sm)] flex items-center justify-center">
                <span className="text-white font-bold text-sm">GH</span>
              </div>
              <span className="font-semibold text-text-primary">GuideHealth</span>
            </Link>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-text-secondary hover:text-text-primary transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="pb-4 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="block px-4 py-3 text-text-primary hover:bg-bg-secondary rounded-[var(--radius-sm)] transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="px-4 py-3">
                <Link
                  to="/onboarding"
                  className="inline-block w-full text-center px-6 py-3 bg-accent-primary text-white rounded-[var(--radius-md)] hover:bg-accent-hover transition-colors"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    trackEvent({ type: 'cta_click', where: 'topnav_mobile', cta: 'get_started', lang });
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

  return (
    <nav className={cn('bg-white border-b border-border-subtle shadow-premium-sm', className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent-primary rounded-[var(--radius-md)] flex items-center justify-center shadow-premium-sm">
              <span className="text-white font-bold">GH</span>
            </div>
            <span className="font-semibold text-xl text-text-primary">GuideHealth</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-[var(--radius-sm)] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleLanguage}
              className="hidden md:flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-[var(--radius-sm)] transition-colors"
              aria-label={`Switch to ${lang === 'en' ? 'Turkish' : 'English'}`}
            >
              <Globe className="w-4 h-4" />
              {lang.toUpperCase()}
            </button>
            
            <Link
              to="/onboarding"
              className="px-5 py-2.5 bg-accent-primary text-white text-sm font-semibold rounded-[var(--radius-md)] hover:bg-accent-hover transition-colors shadow-premium-sm"
              onClick={() => trackEvent({ type: 'cta_click', where: 'topnav', cta: 'get_started', lang })}
            >
              {content.cta.primary}
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
