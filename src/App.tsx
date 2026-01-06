import { useState, createContext, useEffect, ReactNode } from 'react';
import { useAuthStore } from './store/authStore';
import { getSupabaseClient } from './lib/supabaseClient';
import { installSessionRecovery } from './lib/auth/sessionRecovery';
import { getHomePath } from './lib/roleHome';
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
import AdminPatientProfile from './pages/AdminPatientProfile';
import Intake from './pages/Intake';
import PatientPortal from './pages/PatientPortal';
import DoctorPortal from './pages/DoctorPortal';
import Login from './pages/auth/Login';
import { PageTransition } from './components/animations/PageTransition';
import Navbar from './components/Navbar';

// RequireRole component for role-based access control
function RequireRole({ 
  roles, 
  children, 
  isLoading: externalLoading,
  navigate 
}: { 
  roles: string[]; 
  children: ReactNode;
  isLoading?: boolean;
  navigate: (path: string) => void;
}) {
  const { role, isLoading: authLoading } = useAuthStore();
  const isLoading = externalLoading ?? authLoading;

  // ✅ Redirect to role's home if role is known but not allowed
  useEffect(() => {
    if (!isLoading && role && !roles.includes(role)) {
      const homePath = getHomePath(role);
      navigate(homePath, { replace: true });
    }
  }, [role, roles, isLoading, navigate]);

  // Show loading while role is being determined
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

  // Check if user's role is in allowed roles
  if (!roles.includes(role)) {
    if (import.meta.env.DEV) {
      console.log("RequireRole blocked:", { role, allowed: roles });
    }
    
    // ✅ Redirect is handled in useEffect above, show loading while redirecting
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

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
  
  // Install session recovery on mount
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (supabase) {
      const cleanup = installSessionRecovery(supabase, {
        onExpired: () => {
          window.location.assign('/login');
        },
      });
      return cleanup;
    }
  }, []);
  
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

  // Public routes that don't require authentication
  const PUBLIC_ROUTES = new Set([
    '/',
    '/treatments',
    '/treatment-detail',
    '/pricing',
    '/process',
    '/reviews',
    '/faq',
    '/contact',
    '/upload-center',
    '/onboarding',
    '/intake',
  ]);

  // Private routes that require authentication
  const PRIVATE_ROUTES = new Set([
    '/admin',
    '/admin/leads',
    '/employee',
    '/employee/leads',
    '/patient/portal',
    '/doctor/portal',
    '/plan-dashboard',
  ]);

  const isPublicRoute = PUBLIC_ROUTES.has(currentPath);
  const isPrivateRoute = PRIVATE_ROUTES.has(currentPath) || currentPath.startsWith('/admin/') || currentPath.startsWith('/employee/');

  // Check if demo login is enabled
  const ENABLE_DEMO_LOGIN = import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true';

  // Handle /demo-login route (only if enabled, else redirect to /login)
  if (currentPath === '/demo-login') {
    if (!ENABLE_DEMO_LOGIN) {
      // Redirect to /login in prod
      window.history.replaceState({}, '', '/login');
      setCurrentPath('/login');
    }
  }

  // Handle /login route
  if (currentPath === '/login') {
    // If authenticated, redirect to role-based home or next param
    if (isAuthenticated && role) {
      const params = new URLSearchParams(window.location.search);
      const next = params.get('next');
      const defaultHome = role === 'admin' ? '/admin/leads' 
        : role === 'employee' ? '/employee/leads'
        : role === 'patient' ? '/patient/portal'
        : role === 'doctor' ? '/doctor/portal'
        : '/';
      const target = next || defaultHome;
      window.history.replaceState({}, '', target);
      setCurrentPath(target);
    } else {
      return <Login />;
    }
  }

  // Only require auth for private routes
  if (!isAuthenticated && isPrivateRoute) {
    // Redirect to /login with next parameter
    const next = encodeURIComponent(currentPath);
    window.history.replaceState({}, '', `/login?next=${next}`);
    setCurrentPath('/login');
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
      case '/login':
        // Already handled above, but keep for completeness
        return <Login />;
      case '/demo-login':
        // Only render if enabled, else redirect handled above
        if (ENABLE_DEMO_LOGIN) {
          return <Login />;
        }
        return null;
      case '/patient/portal':
        return (
          <RequireRole roles={['patient']} navigate={navigate}>
            <PatientPortal />
          </RequireRole>
        );
      case '/doctor/portal':
        return (
          <RequireRole roles={['doctor']} navigate={navigate} isLoading={isLoading}>
            <DoctorPortal />
          </RequireRole>
        );
      case '/admin':
        // Redirect /admin to /admin/leads
        navigate('/admin/leads', { replace: true });
        return null;
      case '/employee':
        // Redirect /employee to /employee/leads
        navigate('/employee/leads', { replace: true });
        return null;
      case '/admin/leads':
        return (
          <RequireRole roles={['admin']} navigate={navigate} isLoading={isLoading}>
            <AdminLeads />
          </RequireRole>
        );
      case '/employee/leads':
        return (
          <RequireRole roles={['employee', 'admin']} navigate={navigate} isLoading={isLoading}>
            <AdminLeads />
          </RequireRole>
        );
      default:
        // Handle dynamic /admin/lead/:id route
        if (currentPath.startsWith('/admin/lead/')) {
          return (
            <RequireRole roles={['admin', 'employee']} navigate={navigate} isLoading={isLoading}>
              <AdminPatientProfile />
            </RequireRole>
          );
        }
        
        // Handle dynamic /doctor/lead/:id route (for doctor mode)
        if (currentPath.startsWith('/doctor/lead/')) {
          const leadIdMatch = currentPath.match(/\/doctor\/lead\/([^/]+)/);
          const leadId = leadIdMatch ? leadIdMatch[1] : null;
          return (
            <RequireRole roles={['doctor']} navigate={navigate} isLoading={isLoading}>
              <AdminPatientProfile doctorMode={true} leadId={leadId} />
            </RequireRole>
          );
        }
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
