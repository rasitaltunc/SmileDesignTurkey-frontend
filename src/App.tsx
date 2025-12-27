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
