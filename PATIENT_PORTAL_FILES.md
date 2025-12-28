# Patient Portal - 6 Core Files

## 1. src/App.tsx (Router)

```tsx
import { useState, createContext, useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import Home from './pages/Home';
import Treatments from './pages/Treatments';
import TreatmentDetail from './pages/TreatmentDetail';
import Pricing from './pages/Pricing';
import Process from './pages/Process';
import Reviews from './pages/Reviews';
import FAQ from './pages/FAQ';
import Contact from './pages/Contact';
import UploadCenter from './pages/UploadCenter';
import Onboarding from './pages/Onboarding';
import PlanDashboard from './pages/PlanDashboard';
import AdminLeads from './pages/AdminLeads';
import Intake from './pages/Intake';
import PatientPortal from './pages/PatientPortal';
import DoctorPortal from './pages/DoctorPortal';
import Login from './pages/auth/Login';
import { PageTransition } from './components/animations/PageTransition';
import Navbar from './components/Navbar';

export const NavigationContext = createContext<{
  navigate: (path: string, params?: any) => void;
  currentPath: string;
  params: any;
}>({
  navigate: () => {},
  currentPath: '/',
  params: {}
});

export default function App() {
  const { isAuthenticated, isLoading, role, checkSession } = useAuthStore();
  
  // Initialize auth session on mount
  useEffect(() => {
    checkSession();
  }, [checkSession]);
  
  const getPathFromUrl = () => {
    return window.location.pathname || '/';
  };

  const [currentPath, setCurrentPath] = useState(getPathFromUrl());
  const [params, setParams] = useState<any>({});

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(getPathFromUrl());
    };

    setCurrentPath(getPathFromUrl());
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const navigate = (path: string, newParams?: any) => {
    setCurrentPath(path);
    if (newParams) {
      setParams(newParams);
    }
    window.history.pushState({}, '', path);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && currentPath !== '/') {
    return <Login />;
  }

  const isAdminRoute = currentPath.startsWith('/admin');
  const isEmployeeRoute = currentPath.startsWith('/employee');
  const navbarVariant = (isAdminRoute || isEmployeeRoute) ? 'admin' : 'public';

  const renderPage = () => {
    if (!isAuthenticated && currentPath === '/') {
      return <Home />;
    }

    switch (currentPath) {
      case '/':
        return <Home />;
      case '/treatments':
        return <Treatments />;
      case '/treatment-detail':
        return <TreatmentDetail />;
      case '/pricing':
        return <Pricing />;
      case '/process':
        return <Process />;
      case '/reviews':
        return <Reviews />;
      case '/faq':
        return <FAQ />;
      case '/contact':
        return <Contact />;
      case '/upload-center':
        return <UploadCenter />;
      case '/onboarding':
        return <Onboarding />;
      case '/plan-dashboard':
        return <PlanDashboard />;
      case '/intake':
        return <Intake />;
      case '/patient/portal':
        // Role check: only patient can access
        if (role && role !== 'patient') {
          return (
            <div className="min-h-screen flex items-center justify-center p-6">
              <div className="max-w-md w-full bg-white rounded-xl shadow p-6 text-center">
                <h2 className="text-xl font-semibold text-gray-900">Unauthorized</h2>
                <p className="mt-2 text-gray-600">You don't have permission to access the patient portal.</p>
                <button
                  className="mt-5 px-4 py-2 rounded-lg bg-teal-600 text-white"
                  onClick={() => navigate('/')}
                >
                  Go back home
                </button>
              </div>
            </div>
          );
        }
        return <PatientPortal />;
      case '/doctor/portal':
        // Role check: only doctor can access
        if (role && role !== 'doctor') {
          return (
            <div className="min-h-screen flex items-center justify-center p-6">
              <div className="max-w-md w-full bg-white rounded-xl shadow p-6 text-center">
                <h2 className="text-xl font-semibold text-gray-900">Unauthorized</h2>
                <p className="mt-2 text-gray-600">You don't have permission to access the doctor portal.</p>
                <button
                  className="mt-5 px-4 py-2 rounded-lg bg-teal-600 text-white"
                  onClick={() => navigate('/')}
                >
                  Go back home
                </button>
              </div>
            </div>
          );
        }
        return <DoctorPortal />;
      case '/admin':
        // Redirect /admin to /admin/leads
        navigate('/admin/leads', { replace: true });
        return null;
      case '/employee':
        // Redirect /employee to /employee/leads
        navigate('/employee/leads', { replace: true });
        return null;
      case '/admin/leads':
        // Role gelene kadar loader göster (ÇOK ÖNEMLİ)
        if (isLoading || !role) {
          return (
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading...</p>
              </div>
            </div>
          );
        }
        // Role uyuşmuyorsa -> home
        if (role !== 'admin') {
          return (
            <div className="min-h-screen flex items-center justify-center p-6">
              <div className="max-w-md w-full bg-white rounded-xl shadow p-6 text-center">
                <h2 className="text-xl font-semibold text-gray-900">Unauthorized</h2>
                <p className="mt-2 text-gray-600">
                  You don't have permission to access the admin panel.
                </p>
                <button
                  className="mt-5 px-4 py-2 rounded-lg bg-teal-600 text-white"
                  onClick={() => navigate('/')}
                >
                  Go back home
                </button>
              </div>
            </div>
          );
        }
        return <AdminLeads />;
      case '/employee/leads':
        // Role gelene kadar loader göster (ÇOK ÖNEMLİ)
        if (isLoading || !role) {
          return (
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading...</p>
              </div>
            </div>
          );
        }
        // Role uyuşmuyorsa -> home
        if (role !== 'employee' && role !== 'admin') {
          return (
            <div className="min-h-screen flex items-center justify-center p-6">
              <div className="max-w-md w-full bg-white rounded-xl shadow p-6 text-center">
                <h2 className="text-xl font-semibold text-gray-900">Unauthorized</h2>
                <p className="mt-2 text-gray-600">You don't have permission to access the employee panel.</p>
                <button
                  className="mt-5 px-4 py-2 rounded-lg bg-teal-600 text-white"
                  onClick={() => navigate('/')}
                >
                  Go back home
                </button>
              </div>
            </div>
          );
        }
        return <AdminLeads />;
      default:
        return <Home />;
    }
  };

  return (
    <NavigationContext.Provider value={{ navigate, currentPath, params }}>
      <Navbar variant={navbarVariant} minimal={false} />
      <PageTransition currentPath={currentPath}>
        {renderPage()}
      </PageTransition>
    </NavigationContext.Provider>
  );
}
```

---

## 2. src/main.tsx (App Bootstrap)

```tsx
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { initPosthog } from "./lib/posthog";
import { LanguageProvider } from "./lib/i18n";

// Initialize PostHog once at app startup
initPosthog();

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </HelmetProvider>
);
```

---

## 3. src/components/Navbar.tsx (Navigation Menu)

```tsx
import { Link } from './Link';
import { Menu, X, MessageCircle, Globe, User, LogOut } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { BRAND } from '../config';
import { getWhatsAppUrl } from '../lib/whatsapp';
import { trackEvent } from '../lib/analytics';
import { useLanguage } from '../lib/i18n';
import { useAuthStore } from '../store/authStore';

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

  // Auth modal state
  const [authOpen, setAuthOpen] = useState(false);
  const [view, setView] = useState<'portal' | 'staff'>('portal');
  const [selectedPortal, setSelectedPortal] = useState<Portal>('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const roleLabel = useMemo(() => {
    if (!role) return null;
    return role === 'admin' ? 'Admin Dashboard' : 'My Leads';
  }, [role]);

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

      if (role === 'admin') {
        closeAuth();
        pushRoute('/admin/leads');
      } else if (role === 'employee') {
        closeAuth();
        pushRoute('/employee/leads');
      } else {
        closeAuth();
        pushRoute('/');
      }
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
                className="flex items-center gap-2 text-gray-600 hover:text-teal-600 transition-colors"
                aria-label={`Switch to ${lang === 'en' ? 'Turkish' : 'English'}`}
              >
                <Globe className="w-4 h-4" />
                {lang.toUpperCase()}
              </button>

              {!isAuthenticated ? (
                <button
                  onClick={openAuth}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <User className="w-4 h-4" />
                  Login
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  {roleLabel && role ? (
                    <Link
                      to={role === 'admin' ? '/admin/leads' : '/employee/leads'}
                      className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
                    >
                      {roleLabel}
                    </Link>
                  ) : roleLabel ? (
                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
                      {roleLabel}
                    </span>
                  ) : null}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
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
          {variant !== 'admin' && (
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
          )}

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 text-gray-600 hover:text-teal-600 transition-colors"
              aria-label={`Switch to ${lang === 'en' ? 'Turkish' : 'English'}`}
            >
              <Globe className="w-4 h-4" />
              {lang.toUpperCase()}
            </button>

            {variant !== 'admin' && (
              <>
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
              </>
            )}

            {/* Account - her zaman görünür */}
            {!isAuthenticated ? (
              <button
                onClick={openAuth}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <User className="w-4 h-4" />
                Login
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {roleLabel && role ? (
                  <Link
                    to={role === 'admin' ? '/admin/leads' : '/employee/leads'}
                    className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    {roleLabel}
                  </Link>
                ) : roleLabel ? (
                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
                    {roleLabel}
                  </span>
                ) : null}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
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
              {variant !== 'admin' && (
                <>
                  <Link to="/treatments" className="text-gray-700 hover:text-teal-600 transition-colors" onClick={() => setIsOpen(false)}>
                    Treatments
                  </Link>
                  <Link to="/pricing" className="text-gray-700 hover:text-teal-600 transition-colors" onClick={() => setIsOpen(false)}>
                    Pricing
                  </Link>
                  <Link to="/process" className="text-gray-700 hover:text-teal-600 transition-colors" onClick={() => setIsOpen(false)}>
                    Process
                  </Link>
                  <Link to="/reviews" className="text-gray-700 hover:text-teal-600 transition-colors" onClick={() => setIsOpen(false)}>
                    Reviews
                  </Link>
                  <Link to="/faq" className="text-gray-700 hover:text-teal-600 transition-colors" onClick={() => setIsOpen(false)}>
                    FAQ
                  </Link>
                  <Link to="/contact" className="text-gray-700 hover:text-teal-600 transition-colors" onClick={() => setIsOpen(false)}>
                    Contact
                  </Link>

                  <button
                    onClick={() => {
                      setIsOpen(false);
                      handleWhatsAppClick();
                    }}
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
                </>
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
                    <Link
                      to={role === 'admin' ? '/admin/leads' : '/employee/leads'}
                      onClick={() => setIsOpen(false)}
                      className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-center"
                    >
                      {roleLabel}
                    </Link>
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
        className="absolute inset-0 bg-black/30"
        aria-label="Close login modal"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
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

        <div className="px-5 pt-4">
          <div className="flex gap-2 p-1 bg-gray-50 rounded-xl border border-gray-100">
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
```

---

## 4. src/pages/auth/Login.tsx (Demo Login Screen)

```tsx
import { useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';

const TEST_USERS = [
  {
    email: 'patient@smiledesignturkey.com',
    password: 'Patient123!',
    label: '👤 Patient User',
    role: 'patient'
  },
  {
    email: 'doctor@smiledesignturkey.com',
    password: 'Doctor123!',
    label: '👨‍⚕️ Doctor User',
    role: 'doctor'
  },
  {
    email: 'admin@smiledesignturkey.com',
    password: 'Admin123!',
    label: '👑 Admin User',
    role: 'admin'
  }
];

export default function Login() {
  const { loginWithTestUser, isLoading, error, clearError } = useAuthStore();

  const handleTestLogin = async (email: string, password: string) => {
    clearError();
    try {
      const result = await loginWithTestUser(email, password);
      
      // ÖNEMLİ: role yoksa redirect yok
      const role = result?.role;
      if (!role) return;

      // Redirect based on role
      if (role === 'admin') {
        window.history.pushState({}, '', '/admin/leads');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } else if (role === 'employee') {
        window.history.pushState({}, '', '/employee/leads');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } else if (role === 'patient') {
        window.history.pushState({}, '', '/patient/portal');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } else if (role === 'doctor') {
        window.history.pushState({}, '', '/doctor/portal');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } else {
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    } catch {
      // store error gösteriyor; burada hiçbir şey yapma (redirect yok, modal açık kalır)
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-white p-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-premium-lg border border-teal-100">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Smile Design Turkey
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Patient Portal - Demo Login
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-4 border border-red-200">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Login Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Test Kullanıcıları ile Giriş Yap
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Aşağıdaki test hesaplarından birini seçerek giriş yapabilirsin.
              Giriş başarılı olursa otomatik olarak admin panel sayfasına yönlendirileceksin.
            </p>
          </div>

          <div className="space-y-3">
            {TEST_USERS.map((user) => (
              <button
                key={user.email}
                onClick={() => handleTestLogin(user.email, user.password)}
                disabled={isLoading}
                className="w-full flex justify-between items-center px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors duration-200"
              >
                <span className="flex items-center gap-2">
                  <span className="text-lg">{user.label.split(' ')[0]}</span>
                  <span>{user.label.split(' ').slice(1).join(' ')}</span>
                </span>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {user.email}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="text-center pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Not: Bu test hesapları Supabase Auth tablosunda tanımlı olmalıdır.
            <br />
            Eğer giriş başarısız olursa, önce Supabase'te kullanıcıları oluşturduğundan emin ol.
          </p>
        </div>
      </div>
    </div>
  );
}
```

---

## 5. src/pages/AdminLeads.tsx (Employee/Admin Leads Page)

**Note:** Bu dosya çok uzun (1180 satır). İlk 200 satırı ve önemli kısımları gösteriyorum. Tam dosya için repo'ya bakın.

```tsx
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, X, Save, LogOut, MessageSquare } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';

// Status options - CRM MVP Pipeline (3C: Appointment → Deposit)
const LEAD_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'appointment_set', label: 'Appointment Set' },
  { value: 'deposit_paid', label: 'Deposit Paid' },
  { value: 'arrived', label: 'Arrived' },
  { value: 'completed', label: 'Completed' },
  { value: 'lost', label: 'Lost' },
] as const;

// WhatsApp helper functions
function normalizePhoneToWhatsApp(phone?: string) {
  if (!phone) return null;
  let p = String(phone).trim().replace(/[^\d+]/g, "");

  // if starts with 0 and looks TR, convert to +90
  if (p.startsWith("0")) p = "+90" + p.slice(1);

  // if starts without + and length seems like TR mobile, assume +90
  if (!p.startsWith("+") && p.length === 10) p = "+90" + p;

  // if still no +, add +
  if (!p.startsWith("+")) p = "+" + p;

  const digits = p.replace(/\+/g, ""); // wa.me wants digits only (remove all + signs)

  // ✅ minimum uzunluk kontrolü (wa.me digits only)
  if (p.replace(/\D/g, "").length < 11) return null;

  return digits;
}

function waMessageEN(lead: any) {
  return (
    `Hi ${lead?.name || ""}! 👋\n` +
    `This is Smile Design Turkey.\n\n` +
    `I'm reaching out about your request:\n` +
    `• Treatment: ${lead?.treatment || "-"}\n` +
    `• Timeline: ${lead?.timeline || "-"}\n\n` +
    `To prepare your plan, could you send:\n` +
    `1) A clear smile photo\n` +
    `2) A short video (front + side)\n` +
    `3) Any x-ray if available 😊`
  );
}

interface Lead {
  id: string;
  created_at: string;
  name?: string;
  email?: string;
  phone?: string;
  source: string;
  lang?: string;
  treatment?: string;
  timeline?: string;
  status?: string;
  notes?: string;
  assigned_to?: string;
  follow_up_at?: string;
  page_url?: string;
  utm_source?: string;
  device?: string;
}

interface LeadNote {
  id: string;
  lead_id: string;
  author_id: string;
  note: string;
  created_at: string;
  updated_at: string;
}

export default function AdminLeads() {
  const { user, isAuthenticated, logout, role } = useAuthStore();
  const isAdmin = role === 'admin';
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Quick filter tabs
  type LeadTab = 'all' | 'unassigned' | 'due_today' | 'appointment_set' | 'deposit_paid';
  const [tab, setTab] = useState<LeadTab>('all');

  // ... (rest of the component - 1180 lines total)
  // Key features:
  // - Load leads from API
  // - Filter by tab (all, unassigned, due_today, etc.)
  // - Edit lead status, notes, follow_up_at
  // - Assign leads to employees (admin only)
  // - Notes modal with createPortal
  // - Patient intakes section (admin only)
  // - Convert intake to lead

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      {/* ... */}
    </div>
  );
}
```

**Full file:** `src/pages/AdminLeads.tsx` (1180 lines) - Repo'da tam hali mevcut.

---

## 6. src/pages/PatientPortal.tsx (Patient Portal Page)

```tsx
import { useState, useEffect } from 'react';
import { Upload, File, Trash2, Download, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import {
  getPatientPortalData,
  getPatientFiles,
  uploadPatientFile,
  deletePatientFile,
  getPatientFileUrl,
  type PatientPortalData,
  type PatientFile,
} from '@/lib/patientPortal';

interface UploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

export default function PatientPortal() {
  const { user, role, logout } = useAuthStore();
  const [portalData, setPortalData] = useState<PatientPortalData | null>(null);
  const [files, setFiles] = useState<PatientFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadQueue, setUploadQueue] = useState<UploadProgress[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Redirect if not patient
  useEffect(() => {
    if (role && role !== 'patient') {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, [role]);

  // Load portal data and files
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [portal, fileList] = await Promise.all([
          getPatientPortalData(),
          getPatientFiles(),
        ]);
        setPortalData(portal);
        setFiles(fileList);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load portal data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    // Validate file sizes (50MB max)
    const maxSize = 50 * 1024 * 1024;
    const validFiles = selectedFiles.filter((file) => {
      if (file.size > maxSize) {
        setToast({ message: `File ${file.name} is too large (max 50MB)`, type: 'error' });
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Add to upload queue
    const newUploads: UploadProgress[] = validFiles.map((file) => ({
      file,
      progress: 0,
      status: 'uploading',
    }));
    setUploadQueue((prev) => [...prev, ...newUploads]);

    // Upload each file
    for (const upload of newUploads) {
      try {
        // Simulate progress (Supabase doesn't provide progress callbacks)
        const progressInterval = setInterval(() => {
          setUploadQueue((prev) =>
            prev.map((u) => {
              if (u.file === upload.file && u.progress < 90) {
                return { ...u, progress: u.progress + 10 };
              }
              return u;
            })
          );
        }, 200);

        await uploadPatientFile(upload.file);
        clearInterval(progressInterval);
        
        setUploadQueue((prev) =>
          prev.map((u) => (u.file === upload.file ? { ...u, status: 'success' as const, progress: 100 } : u))
        );
        
        // Reload files list
        setIsLoadingFiles(true);
        const fileList = await getPatientFiles();
        setFiles(fileList);
        setIsLoadingFiles(false);
        
        setToast({ message: `${upload.file.name} uploaded successfully`, type: 'success' });
        
        // Remove from queue after 2 seconds
        setTimeout(() => {
          setUploadQueue((prev) => prev.filter((u) => u.file !== upload.file));
        }, 2000);
      } catch (err) {
        setUploadQueue((prev) =>
          prev.map((u) => (u.file === upload.file ? { ...u, status: 'error' as const, error: err instanceof Error ? err.message : 'Upload failed' } : u))
        );
        setToast({ message: `Failed to upload ${upload.file.name}`, type: 'error' });
      }
    }

    // Reset file input
    e.target.value = '';
  };

  const handleDeleteFile = async (filePath: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete ${fileName}?`)) return;

    try {
      await deletePatientFile(filePath);
      setFiles(files.filter((f) => f.name !== fileName));
      setToast({ message: `${fileName} deleted successfully`, type: 'success' });
    } catch (err) {
      setToast({ message: `Failed to delete ${fileName}`, type: 'error' });
    }
  };

  const handleDownloadFile = async (filePath: string, fileName: string) => {
    try {
      const url = await getPatientFileUrl(filePath);
      window.open(url, '_blank');
    } catch (err) {
      setToast({ message: `Failed to open ${fileName}`, type: 'error' });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Toast Notification */}
        {toast && (
          <div
            className={`mb-4 p-4 rounded-lg flex items-center gap-3 ${
              toast.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <p className="text-sm font-medium">{toast.message}</p>
            <button
              onClick={() => setToast(null)}
              className="ml-auto text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Plan</h1>
              <p className="text-gray-600 mt-1">Welcome back, {user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Patient Profile & Lead Info */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">My Information</h2>
          
          {portalData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Full Name</label>
                <p className="text-gray-900 mt-1">{portalData.name || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p className="text-gray-900 mt-1">{portalData.email || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Phone</label>
                <p className="text-gray-900 mt-1">{portalData.phone || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Treatment Interest</label>
                <p className="text-gray-900 mt-1">{portalData.treatment_type || 'Not specified'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Plan Created</label>
                <p className="text-gray-900 mt-1">{formatDate(portalData.lead_created_at)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <p className="text-gray-900 mt-1">{portalData.lead_status || 'New'}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Your plan is not yet linked to your account.</p>
              <p className="text-sm text-gray-500 mt-2">
                Please contact support to link your plan.
              </p>
            </div>
          )}
        </div>

        {/* Document Upload Section */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">My Documents</h2>

          {/* Upload Area */}
          <div className="mb-6">
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Upload Files (Photos, PDFs, Documents)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-teal-500 transition-colors">
              <input
                type="file"
                id="file-upload"
                multiple
                accept="image/*,application/pdf,.doc,.docx"
                onChange={handleFileSelect}
                className="hidden"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Max file size: 50MB. Supported: Images, PDF, Word documents
                </p>
              </label>
            </div>

            {/* Upload Progress */}
            {uploadQueue.length > 0 && (
              <div className="mt-4 space-y-2">
                {uploadQueue.map((upload, idx) => (
                  <div key={idx} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 truncate flex-1">
                        {upload.file.name}
                      </span>
                      {upload.status === 'uploading' && (
                        <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                      )}
                      {upload.status === 'success' && (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                      {upload.status === 'error' && (
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    {upload.status === 'uploading' && (
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-teal-600 h-2 rounded-full transition-all"
                          style={{ width: `${upload.progress}%` }}
                        />
                      </div>
                    )}
                    {upload.error && (
                      <p className="text-xs text-red-600 mt-1">{upload.error}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Files List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-700">
                Uploaded Files ({files.length})
              </h3>
              <button
                onClick={async () => {
                  setIsLoadingFiles(true);
                  try {
                    const fileList = await getPatientFiles();
                    setFiles(fileList);
                  } catch (err) {
                    setToast({ message: 'Failed to refresh files', type: 'error' });
                  } finally {
                    setIsLoadingFiles(false);
                  }
                }}
                disabled={isLoadingFiles}
                className="text-sm text-teal-600 hover:text-teal-700 disabled:opacity-50"
              >
                {isLoadingFiles ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {files.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <File className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No files uploaded yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {files.map((file) => {
                  const filePath = `patient/${user?.id}/${file.name}`;
                  const fileSize = file.metadata?.size || 0;
                  return (
                    <div
                      key={file.id || file.name}
                      className="border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <File className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(fileSize)} • {formatDate(file.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownloadFile(filePath, file.name)}
                          className="p-2 text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                          title="Open/Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteFile(filePath, file.name)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Özet

**6 Dosya:**
1. ✅ `src/App.tsx` - Router kurulumu (route'lar + role-based protection)
2. ✅ `src/main.tsx` - App bootstrap
3. ✅ `src/components/Navbar.tsx` - Navigation menü (login modal dahil)
4. ✅ `src/pages/auth/Login.tsx` - Demo Login ekranı (test users)
5. ✅ `src/pages/AdminLeads.tsx` - Employee/Admin leads sayfası (1180 satır - özet gösterildi)
6. ✅ `src/pages/PatientPortal.tsx` - Patient portal sayfası (upload/download/delete)

**Not:** `AdminLeads.tsx` çok uzun olduğu için özet gösterildi. Tam dosya repo'da mevcut.

