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
import Login from './pages/auth/Login';
import { PageTransition } from './components/animations/PageTransition';

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
  const { isAuthenticated, isLoading } = useAuthStore();
  
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
      case '/admin':
      case '/admin/leads':
        return <AdminLeads />;
      default:
        return <Home />;
    }
  };

  return (
    <NavigationContext.Provider value={{ navigate, currentPath, params }}>
      <PageTransition currentPath={currentPath}>
        {renderPage()}
      </PageTransition>
    </NavigationContext.Provider>
  );
}
