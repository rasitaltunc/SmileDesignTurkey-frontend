import { useState, useEffect, ReactNode, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { getSupabaseClient } from './lib/supabaseClient';
import { installSessionRecovery } from './lib/auth/sessionRecovery';
import { getHomePath } from './lib/roleHome';
import { NavigationContext } from './lib/navigationContext';
import { useRoleBasedPrefetch } from './hooks/useRoleBasedPrefetch';
import Home from './pages/Home';
import Treatments from './pages/Treatments';
import TreatmentDetail from './pages/TreatmentDetail';
import Pricing from './pages/Pricing';
import Process from './pages/Process';
import Reviews from './pages/Reviews';
import PlanDashboard from './pages/PlanDashboard';
import Intake from './pages/Intake';
import Login from './pages/auth/Login';
import DoctorLayout from './layouts/DoctorLayout';
import { PageTransition } from './components/animations/PageTransition';
import Navbar from './components/Navbar';
import BuildStamp from './components/BuildStamp';

// Lazy load admin/portal pages (code splitting)
const AdminLeads = lazy(() => import('./pages/AdminLeads'));
const AdminPatientProfile = lazy(() => import('./pages/AdminPatientProfile'));
const PatientPortal = lazy(() => import('./pages/PatientPortal'));
const DoctorPortal = lazy(() => import('./pages/DoctorPortal'));
const DoctorSettings = lazy(() => import('./pages/DoctorSettings'));
const DoctorLeadView = lazy(() => import('./pages/DoctorLeadView'));
const UploadCenter = lazy(() => import('./pages/UploadCenter'));

// Lazy load public pages (enables prefetch and reduces initial bundle)
const FAQ = lazy(() => import('./pages/FAQ'));
const Contact = lazy(() => import('./pages/Contact'));
const Onboarding = lazy(() => import('./pages/Onboarding'));

// Loading fallback component
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading page...</p>
      </div>
    </div>
  );
}

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

// NotFound page component (for Routes)
function NotFoundPage() {
  return <NotFound />;
}

// Redirect component for /doctor/leads/:ref -> /doctor/lead/:ref
function DoctorLeadsRedirect() {
  const { ref } = useParams<{ ref?: string }>();
  return <Navigate to={`/doctor/lead/${ref || ''}`} replace />;
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

// NavigationContext moved to src/lib/navigationContext.tsx to avoid pulling App.tsx dependencies into admin chunk
// // NavigationContext moved to src/lib/navigationContext.tsx to avoid pulling App.tsx dependencies into admin chunk
// Import from '@/lib/navigationContext' instead

export default function App() {
  // ✅ ALL HOOKS FIRST - never after conditional returns
  const { isAuthenticated, isLoading, role, checkSession } = useAuthStore();
  const location = useLocation();
  const reactRouterNavigate = useNavigate();
  
  // Role-based prefetch during idle time
  useRoleBasedPrefetch();
  
  const [currentPath, setCurrentPath] = useState(location.pathname);
  const [params, setParams] = useState<any>({});

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

  // Update currentPath when React Router location changes
  useEffect(() => {
    setCurrentPath(location.pathname);
  }, [location.pathname]);
  
  // Sync custom navigate with React Router
  const syncNavigate = (path: string, options?: { replace?: boolean }) => {
    setCurrentPath(path);
    if (options?.replace) {
      reactRouterNavigate(path, { replace: true });
    } else {
      reactRouterNavigate(path);
    }
  };

  const isAdminRoute = location.pathname.startsWith('/admin');
  const isEmployeeRoute = location.pathname.startsWith('/employee');
  const navbarVariant = (isAdminRoute || isEmployeeRoute) ? 'admin' : 'public';

  // Check if demo login is enabled
  const ENABLE_DEMO_LOGIN = import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true';

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
          <Route 
            path="/faq" 
            element={
              <Suspense fallback={<PageLoader />}>
                <FAQ />
              </Suspense>
            } 
          />
          <Route 
            path="/contact" 
            element={
              <Suspense fallback={<PageLoader />}>
                <Contact />
              </Suspense>
            } 
          />
          <Route
            path="/upload-center"
            element={
              <Suspense fallback={<PageLoader />}>
                <UploadCenter />
              </Suspense>
            } 
          />
          <Route 
            path="/onboarding" 
            element={
              <Suspense fallback={<PageLoader />}>
                <Onboarding />
              </Suspense>
            } 
          />
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
                <Suspense fallback={<PageLoader />}>
                  <PatientPortal />
                </Suspense>
              </RequireRole>
            } 
          />
          
          {/* ✅ Doctor route aliases (MUST be before nested routes) */}
          <Route path="/doctor/portal" element={<Navigate to="/doctor" replace />} />
          <Route path="/doctor/inbox" element={<Navigate to="/doctor" replace />} />
          
          {/* ✅ Doctor routes - NESTED with DoctorLayout */}
          <Route path="/doctor" element={<DoctorLayout />}>
            {/* Inbox = index */}
            <Route 
              index 
              element={
                <RequireRole roles={['doctor']} navigate={syncNavigate} isLoading={isLoading}>
                  <Suspense fallback={<PageLoader />}>
                    <DoctorPortal />
                  </Suspense>
                </RequireRole>
              } 
            />
            
            <Route 
              path="settings" 
              element={
                <RequireRole roles={['doctor']} navigate={syncNavigate} isLoading={isLoading}>
                  <Suspense fallback={<PageLoader />}>
                    <DoctorSettings />
                  </Suspense>
                </RequireRole>
              } 
            />
            
            {/* Lead view */}
            <Route 
              path="lead/:ref" 
              element={
                <RequireRole roles={['doctor']} navigate={syncNavigate} isLoading={isLoading}>
                  <Suspense fallback={<PageLoader />}>
                    <DoctorLeadView />
                  </Suspense>
                </RequireRole>
              } 
            />
            
            {/* Legacy: /doctor/leads/:ref → /doctor/lead/:ref */}
            <Route path="leads/:ref" element={<DoctorLeadsRedirect />} />
          </Route>
          
          {/* Admin routes */}
          <Route path="/admin" element={<Navigate to="/admin/leads" replace />} />
          <Route 
            path="/admin/leads" 
            element={
              <RequireRole roles={['admin']} navigate={syncNavigate} isLoading={isLoading}>
                <Suspense fallback={<PageLoader />}>
                  <AdminLeads />
                </Suspense>
              </RequireRole>
            } 
          />
          <Route 
            path="/admin/lead/:id" 
            element={
              <RequireRole roles={['admin', 'employee']} navigate={syncNavigate} isLoading={isLoading}>
                <Suspense fallback={<PageLoader />}>
                  <AdminPatientProfile />
                </Suspense>
              </RequireRole>
            } 
          />
          
          {/* Employee routes */}
          <Route path="/employee" element={<Navigate to="/employee/leads" replace />} />
          <Route 
            path="/employee/leads" 
            element={
              <RequireRole roles={['employee', 'admin']} navigate={syncNavigate} isLoading={isLoading}>
                <Suspense fallback={<PageLoader />}>
                  <AdminLeads />
                </Suspense>
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
