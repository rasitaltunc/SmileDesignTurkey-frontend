import { useAuthStore } from '@/store/authStore';
import { useEffect } from 'react';

export default function DoctorPortal() {
  const { role, logout } = useAuthStore();

  // Redirect if not doctor
  useEffect(() => {
    if (role && role !== 'doctor') {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, [role]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-sm p-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Doctor Portal</h1>
        <p className="text-gray-600 mb-8">Coming soon...</p>
        <button
          onClick={logout}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

