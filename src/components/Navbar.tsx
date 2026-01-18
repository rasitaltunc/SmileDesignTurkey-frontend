import { Link } from './Link';
import { PrefetchLink } from './PrefetchLink';
import { Menu, X, MessageCircle, Globe, User, LogOut } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { BRAND } from '../config';
import { getWhatsAppUrl } from '../lib/whatsapp';
import { trackEvent } from '../lib/analytics';
import { useLanguage } from '../lib/i18n';
import { useAuthStore } from '../store/authStore';
import { getHomePath, getHomeLabel } from '../lib/roleHome';
import { hasValidPortalSession } from '../lib/portalSession';

interface NavbarProps {
  minimal?: boolean;
  variant?: 'public' | 'app' | 'admin';
}

type Portal = 'patient' | 'doctor' | 'employee' | 'admin';

function pushRoute(path: string) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export default function Navbar({ minimal = false, variant = 'public' }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { lang, setLang, content } = useLanguage();

  const {
    role,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    clearError,
  } = useAuthStore();
  
  // ✅ Doctor mode: Hide marketing buttons when path starts with /doctor
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const isDoctorRoute = currentPath.startsWith('/doctor');
  const isDoctorMode = variant === 'admin' || isDoctorRoute || role === 'doctor';

  // Auth modal state
  const [authOpen, setAuthOpen] = useState(false);
  const [view, setView] = useState<'portal' | 'staff'>('portal');
  const [selectedPortal, setSelectedPortal] = useState<Portal>('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const roleLabel = useMemo(() => {
    if (!role) return null;
    return getHomeLabel(role);
  }, [role]);

  const handleWhatsAppClick = () => {
    trackEvent({
      type: 'whatsapp_click',
      where: 'navbar',
      lang
    });
    const message = content?.whatsapp?.defaultMessage || 'Hello, I\'m interested in learning more.';
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

  const openAuth = () => {
    clearError();
    setView('portal');
    setSelectedPortal('patient');
    setEmail('');
    setPassword('');
    setAuthOpen(true);
    trackEvent({ type: 'nav_click', where: 'login_open', lang });
  };

  const closeAuth = () => {
    setAuthOpen(false);
    clearError();
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      trackEvent({ type: 'nav_click', where: 'logout', lang });
      setIsOpen(false);
      closeAuth();
      pushRoute('/');
    }
  };

  const handleSubmitLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearError();
    try {
      const result = await login(email.trim(), password);
      
      // ÖNEMLİ: role yoksa redirect yok, modal açık kalır
      const role = result?.role;
      if (!role) return;

      // ✅ Single source of truth: getHomePath
      const homePath = getHomePath(role);
      closeAuth();
      pushRoute(homePath);
    } catch {
      // store error gösteriyor; burada hiçbir şey yapma (redirect yok, modal açık kalır)
    }
  };

  // ESC to close modal
  useEffect(() => {
    if (!authOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAuth();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [authOpen]);

  // Minimal navbar (still show login/logout)
  if (minimal) {
    return (
      <nav className="bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="text-teal-600">
              GuideHealth
            </Link>

            <div className="flex items-center gap-3">
              <button
                onClick={toggleLanguage}
                className="inline-flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-medium text-gray-700 hover:text-teal-600 hover:bg-gray-50 transition-colors"
                aria-label={`Switch to ${lang === 'en' ? 'Turkish' : 'English'}`}
              >
                <Globe className="w-4 h-4" />
                {lang.toUpperCase()}
              </button>

              {!isAuthenticated ? (
                <button
                  onClick={openAuth}
                  className="inline-flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <User className="w-4 h-4" />
                  Login
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  {roleLabel && role ? (
                    <Link
                      to={getHomePath(role)}
                      className="inline-flex items-center justify-center h-9 px-3 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                      {roleLabel}
                    </Link>
                  ) : roleLabel ? (
                    <span className="inline-flex items-center justify-center h-9 px-3 rounded-lg text-sm font-medium bg-gray-100 text-gray-500">
                      {roleLabel}
                    </span>
                  ) : null}
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {authOpen && (
          <AuthModal
            view={view}
            setView={setView}
            selectedPortal={selectedPortal}
            setSelectedPortal={setSelectedPortal}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            onClose={closeAuth}
            onSubmit={handleSubmitLogin}
            isLoading={isLoading}
            error={error}
          />
        )}
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
          {/* ✅ Doctor mode: Hide navigation links (minimal navbar) */}
          {variant !== 'admin' && !isDoctorMode && (
            <div className="hidden md:flex items-center gap-8">
              <PrefetchLink to="/treatments" prefetch="treatments" className="text-gray-700 hover:text-teal-600 transition-colors">
                Treatments
              </PrefetchLink>
              <PrefetchLink to="/pricing" prefetch="pricing" className="text-gray-700 hover:text-teal-600 transition-colors">
                Pricing
              </PrefetchLink>
              <PrefetchLink to="/process" prefetch="process" className="text-gray-700 hover:text-teal-600 transition-colors">
                Process
              </PrefetchLink>
              <PrefetchLink to="/reviews" prefetch="reviews" className="text-gray-700 hover:text-teal-600 transition-colors">
                Reviews
              </PrefetchLink>
              <PrefetchLink to="/faq" prefetch="faq" className="text-gray-700 hover:text-teal-600 transition-colors">
                FAQ
              </PrefetchLink>
              <PrefetchLink to="/contact" prefetch="contact" className="text-gray-700 hover:text-teal-600 transition-colors">
                Contact
              </PrefetchLink>
            </div>
          )}
          
          {/* ✅ Doctor mode: Show "Doctor Inbox" title instead of navigation */}
          {isDoctorMode && (
            <div className="hidden md:flex items-center">
              <h1 className="text-lg font-semibold text-gray-900">Doctor Inbox</h1>
            </div>
          )}

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-2 md:gap-3">
            <button
              onClick={toggleLanguage}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-medium text-gray-700 hover:text-teal-600 hover:bg-gray-50 transition-colors whitespace-nowrap shrink-0"
              aria-label={`Switch to ${lang === 'en' ? 'Turkish' : 'English'}`}
            >
              <Globe className="w-4 h-4" />
              {lang.toUpperCase()}
            </button>

            {/* ✅ Doctor mode: Hide marketing buttons (Ask on WhatsApp, Get Consultation) */}
            {variant !== 'admin' && !isDoctorMode && (
              <>
                <button
                  onClick={handleWhatsAppClick}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold text-teal-600 border border-teal-600 hover:bg-teal-50 transition-colors whitespace-nowrap shrink-0"
                  aria-label={content?.whatsapp?.ctaText || 'Ask on WhatsApp'}
                >
                  <MessageCircle className="w-4 h-4" />
                  {content?.whatsapp?.ctaText || 'Ask on WhatsApp'}
                </button>

                <PrefetchLink
                  to="/onboarding"
                  prefetch="onboarding"
                  className="inline-flex items-center justify-center h-10 px-5 rounded-xl text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors whitespace-nowrap shrink-0"
                  onClick={() => trackEvent({ type: 'cta_click', where: 'navbar', cta: 'free_consultation', lang })}
                >
                  {content.cta.primary}
                </PrefetchLink>
              </>
            )}

            {/* Account - her zaman görünür */}
            {/* ✅ CRITICAL HARD GUARD: Patient portal session ALWAYS shows Portal, NEVER shows Leads */}
            {/* hasValidPortalSession() takes absolute priority over Supabase auth state */}
            {hasValidPortalSession() ? (
              <Link
                to="/portal"
                className="inline-flex items-center justify-center h-10 px-4 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors whitespace-nowrap shrink-0"
              >
                Portal
              </Link>
            ) : !isAuthenticated ? (
              <button
                onClick={openAuth}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap shrink-0"
              >
                <User className="w-4 h-4" />
                Login
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {/* Only show role-based link if user is employee/admin/doctor (not patient) */}
                {roleLabel && role && role !== 'patient' ? (
                  <PrefetchLink
                    to={getHomePath(role)}
                    prefetch={role === 'admin' || role === 'employee' ? 'admin' : role === 'doctor' ? 'doctor' : undefined}
                    className="inline-flex items-center justify-center h-10 px-4 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors whitespace-nowrap shrink-0"
                  >
                    {roleLabel}
                  </PrefetchLink>
                ) : roleLabel === 'My Portal' ? (
                  <Link
                    to="/portal"
                    className="inline-flex items-center justify-center h-10 px-4 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors whitespace-nowrap shrink-0"
                  >
                    Portal
                  </Link>
                ) : null}
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap shrink-0"
                  aria-label="Logout"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-gray-700"
            aria-label="Open menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-gray-100">
            <div className="flex flex-col gap-4">
              {/* ✅ Doctor mode: Hide navigation links (minimal navbar) */}
              {variant !== 'admin' && !isDoctorMode && (
                <>
                  <PrefetchLink to="/treatments" prefetch="treatments" className="text-gray-700 hover:text-teal-600 transition-colors" onClick={() => setIsOpen(false)}>
                    Treatments
                  </PrefetchLink>
                  <PrefetchLink to="/pricing" prefetch="pricing" className="text-gray-700 hover:text-teal-600 transition-colors" onClick={() => setIsOpen(false)}>
                    Pricing
                  </PrefetchLink>
                  <PrefetchLink to="/process" prefetch="process" className="text-gray-700 hover:text-teal-600 transition-colors" onClick={() => setIsOpen(false)}>
                    Process
                  </PrefetchLink>
                  <PrefetchLink to="/reviews" prefetch="reviews" className="text-gray-700 hover:text-teal-600 transition-colors" onClick={() => setIsOpen(false)}>
                    Reviews
                  </PrefetchLink>
                  <PrefetchLink to="/faq" prefetch="faq" className="text-gray-700 hover:text-teal-600 transition-colors" onClick={() => setIsOpen(false)}>
                    FAQ
                  </PrefetchLink>
                  <PrefetchLink to="/contact" prefetch="contact" className="text-gray-700 hover:text-teal-600 transition-colors" onClick={() => setIsOpen(false)}>
                    Contact
                  </PrefetchLink>

                  <button
                    onClick={() => {
                      setIsOpen(false);
                      handleWhatsAppClick();
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-teal-600 border border-teal-600 rounded-lg hover:bg-teal-50 transition-colors"
                    aria-label={content?.whatsapp?.ctaText || 'Ask on WhatsApp'}
                  >
                    <MessageCircle className="w-4 h-4" />
                    {content?.whatsapp?.ctaText || 'Ask on WhatsApp'}
                  </button>

                  <PrefetchLink
                    to="/onboarding"
                    prefetch="onboarding"
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-center"
                    onClick={() => {
                      setIsOpen(false);
                      trackEvent({ type: 'cta_click', where: 'navbar_mobile', cta: 'free_consultation', lang });
                    }}
                  >
                    {content.cta.primary}
                  </PrefetchLink>
                </>
              )}
              
              {/* ✅ Doctor mode: Show "Doctor Inbox" title in mobile menu */}
              {isDoctorMode && (
                <div className="py-2">
                  <h1 className="text-base font-semibold text-gray-900">Doctor Inbox</h1>
                </div>
              )}

              <button
                onClick={() => {
                  toggleLanguage();
                }}
                className="flex items-center gap-2 text-gray-600 hover:text-teal-600 transition-colors"
              >
                <Globe className="w-4 h-4" />
                {lang.toUpperCase()}
              </button>

              {/* Account - her zaman görünür */}
              {!isAuthenticated ? (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    openAuth();
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <User className="w-4 h-4" />
                  Login
                </button>
              ) : (
                <div className="flex items-center gap-2 w-full">
                  {roleLabel && role ? (
                    <PrefetchLink
                      to={getHomePath(role)}
                      prefetch={role === 'admin' || role === 'employee' ? 'admin' : role === 'doctor' ? 'doctor' : role === 'patient' ? 'patient' : undefined}
                      onClick={() => setIsOpen(false)}
                      className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-center"
                    >
                      {roleLabel}
                    </PrefetchLink>
                  ) : roleLabel ? (
                    <span className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold bg-gray-100 text-gray-500 text-center">
                      {roleLabel}
                    </span>
                  ) : null}
                  <button
                    onClick={async () => {
                      setIsOpen(false);
                      await handleLogout();
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {authOpen && (
        <AuthModal
          view={view}
          setView={setView}
          selectedPortal={selectedPortal}
          setSelectedPortal={setSelectedPortal}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          onClose={closeAuth}
          onSubmit={handleSubmitLogin}
          isLoading={isLoading}
          error={error}
        />
      )}
    </nav>
  );
}

function AuthModal(props: {
  view: 'portal' | 'staff';
  setView: (v: 'portal' | 'staff') => void;
  selectedPortal: Portal;
  setSelectedPortal: (p: Portal) => void;
  email: string;
  setEmail: (s: string) => void;
  password: string;
  setPassword: (s: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  error: string | null;
}) {
  const {
    view, setView,
    selectedPortal, setSelectedPortal,
    email, setEmail,
    password, setPassword,
    onClose, onSubmit,
    isLoading, error
  } = props;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        aria-label="Close login modal"
        onClick={onClose}
      />

      <div className="relative w-[min(92vw,720px)] max-w-xl rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <div className="text-sm text-gray-500">Sign in</div>
            <div className="text-lg font-semibold text-gray-900">
              {view === 'portal' ? 'Patient / Doctor Portal' : 'Staff Access'}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-50" aria-label="Close">
            <X className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        <div className="px-6 pt-4 pb-6">
          <div className="flex gap-2 p-1 bg-gray-50 rounded-xl border border-gray-100 max-w-xl">
            <button
              type="button"
              onClick={() => {
                setView('portal');
                setSelectedPortal('patient');
              }}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === 'portal' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Patient/Doctor
            </button>
            <button
              type="button"
              onClick={() => {
                setView('staff');
                setSelectedPortal('admin');
              }}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === 'staff' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Staff
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {view === 'portal' ? (
              <>
                <RolePick label="Patient" active={selectedPortal === 'patient'} onClick={() => setSelectedPortal('patient')} />
                <RolePick label="Doctor" active={selectedPortal === 'doctor'} onClick={() => setSelectedPortal('doctor')} />
              </>
            ) : (
              <>
                <RolePick label="Employee" active={selectedPortal === 'employee'} onClick={() => setSelectedPortal('employee')} />
                <RolePick label="Admin" active={selectedPortal === 'admin'} onClick={() => setSelectedPortal('admin')} />
              </>
            )}
          </div>

          <form onSubmit={onSubmit} className="mt-4 pb-5">
            <div className="text-xs text-gray-500 mb-2">
              Selected: <span className="font-semibold text-gray-700">{selectedPortal.toUpperCase()}</span>
            </div>

            <label className="block text-sm text-gray-700">Email</label>
            <input
              className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-200"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />

            <label className="block text-sm text-gray-700 mt-3">Password</label>
            <input
              className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-200"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              type="password"
              autoComplete="current-password"
            />

            {error && (
              <div className="mt-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !email.trim() || !password}
              className="mt-4 w-full px-4 py-2.5 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Signing in…' : 'Sign in'}
            </button>

            <div className="mt-3 text-xs text-gray-500 text-center">
              Tip: Staff access is for internal users only.
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function RolePick(props: { label: string; active: boolean; onClick: () => void }) {
  const { label, active, onClick } = props;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
        active ? 'border-teal-300 bg-teal-50 text-teal-800' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
      }`}
    >
      {label}
    </button>
  );
}
