import { useState, createContext, useEffect, ReactNode } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
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
import DoctorSettings from './pages/DoctorSettings';
import DoctorLeadView from './pages/DoctorLeadView';
import Login from './pages/auth/Login';
import DoctorLayout from './layouts/DoctorLayout';
import { PageTransition } from './components/animations/PageTransition';
import Navbar from './components/Navbar';
import BuildStamp from './components/BuildStamp';

// NotFound component for route debugging
function NotFound() {
  const loc = useLocation();
  return (
    <div style={{ padding: 24 }}>
      <h1>404 - Route Not Found</h1>
      <p><b>Path:</b> {loc.pathname}{loc.search}</p>
      <p>Bu ekranı görüyorsan route match olmuyor demektir.</p>
    </div>
  );
}

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
  const { role, user, isLoading: authLoading } = useAuthStore();
  const isLoading = externalLoading ?? authLoading;

  // ✅ Redirect to role's home if role is known but not allowed
  useEffect(() => {
    if (!isLoading && role) {
      const normalizedRole = (role || "").toLowerCase().trim();
      const normalizedRoles = roles.map((r) => (r || "").toLowerCase().trim());
      if (!normalizedRoles.includes(normalizedRole)) {
        const homePath = getHomePath(role);
        navigate(homePath, { replace: true });
      }
    }
  }, [role, roles, isLoading, navigate]);

  // Show loading while role is being determined
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

  // ✅ User yoksa → Login'e yönlendir
  if (!user) {
    // Navigate to login (handled by useEffect in parent, but show message)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl font-semibold mb-2">Unauthorized</div>
          <p className="text-gray-600">You don't have access to this page.</p>
          <p className="text-sm text-gray-500 mt-2">Please log in to continue.</p>
        </div>
      </div>
    );
  }

  // ✅ Role yoksa → Unauthorized göster
  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl font-semibold mb-2">Unauthorized</div>
          <p className="text-gray-600">Role not assigned. Please contact administrator.</p>
        </div>
      </div>
    );
  }

  // ✅ Role biliniyorsa ama allowed değilse → kendi home'una redirect (useEffect ile)
  // Bu durumda redirect gerçekleşene kadar "Redirecting..." göster
  const normalizedRole = (role || "").toLowerCase().trim();
  const normalizedRoles = roles.map((r) => (r || "").toLowerCase().trim());
  if (!normalizedRoles.includes(normalizedRole)) {
    if (import.meta.env.DEV) {
      console.log("RequireRole blocked:", { role: normalizedRole, allowed: normalizedRoles });
    }
    
    // ✅ Redirect is handled in useEffect above, show loading while redirecting
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirecting to your dashboard...</p>
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
    '/doctor/settings',
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

  const location = useLocation();
  const reactRouterNavigate = useNavigate();
  
  // Sync custom navigate with React Router
  const syncNavigate = (path: string, options?: { replace?: boolean }) => {
    setCurrentPath(path);
    if (options?.replace) {
      reactRouterNavigate(path, { replace: true });
    } else {
      reactRouterNavigate(path);
    }
  };

  // Update currentPath when React Router location changes
  useEffect(() => {
    setCurrentPath(location.pathname);
  }, [location.pathname]);

  const isAdminRoute = location.pathname.startsWith('/admin');
  const isEmployeeRoute = location.pathname.startsWith('/employee');
  const navbarVariant = (isAdminRoute || isEmployeeRoute) ? 'admin' : 'public';

  return (
    <NavigationContext.Provider value={{ navigate: syncNavigate, currentPath, params }}>
      <Navbar variant={navbarVariant} minimal={false} />
      <PageTransition currentPath={currentPath}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/treatments" element={<Treatments />} />
          <Route path="/treatment-detail" element={<TreatmentDetail />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/process" element={<Process />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/upload-center" element={<UploadCenter />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/intake" element={<Intake />} />
          <Route path="/plan-dashboard" element={<PlanDashboard />} />
          
          {/* Login routes */}
          <Route path="/login" element={<Login />} />
          {ENABLE_DEMO_LOGIN && <Route path="/demo-login" element={<Login />} />}
          
          {/* Patient portal */}
          <Route 
            path="/patient/portal" 
            element={
              <RequireRole roles={['patient']} navigate={syncNavigate}>
                <PatientPortal />
              </RequireRole>
            } 
          />
          
          {/* Doctor routes - NESTED with DoctorLayout */}
          <Route path="/doctor" element={<DoctorLayout />}>
            <Route 
              index 
              element={
                <RequireRole roles={['doctor']} navigate={syncNavigate} isLoading={isLoading}>
                  <DoctorPortal />
                </RequireRole>
              } 
            />
            <Route 
              path="settings" 
              element={
                <RequireRole roles={['doctor']} navigate={syncNavigate} isLoading={isLoading}>
                  <DoctorSettings />
                </RequireRole>
              } 
            />
            <Route 
              path="lead/:ref" 
              element={
                <RequireRole roles={['doctor']} navigate={syncNavigate} isLoading={isLoading}>
                  <DoctorLeadView />
                </RequireRole>
              } 
            />
          </Route>
          
          {/* Backward compatible: /doctor/leads/:ref -> redirect to /doctor/lead/:ref */}
          <Route 
            path="/doctor/leads/:ref" 
            element={<DoctorLeadsRedirect />} 
          />
          
          {/* Admin routes */}
          <Route path="/admin" element={<Navigate to="/admin/leads" replace />} />
          <Route 
            path="/admin/leads" 
            element={
              <RequireRole roles={['admin']} navigate={syncNavigate} isLoading={isLoading}>
                <AdminLeads />
              </RequireRole>
            } 
          />
          <Route 
            path="/admin/lead/:id" 
            element={
              <RequireRole roles={['admin', 'employee']} navigate={syncNavigate} isLoading={isLoading}>
                <AdminPatientProfile />
              </RequireRole>
            } 
          />
          
          {/* Employee routes */}
          <Route path="/employee" element={<Navigate to="/employee/leads" replace />} />
          <Route 
            path="/employee/leads" 
            element={
              <RequireRole roles={['employee', 'admin']} navigate={syncNavigate} isLoading={isLoading}>
                <AdminLeads />
              </RequireRole>
            } 
          />
          
          {/* Catch-all: 404 Not Found */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </PageTransition>
      <BuildStamp />
    </NavigationContext.Provider>
  );
}
