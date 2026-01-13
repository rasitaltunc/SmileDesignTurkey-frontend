import { useState } from 'react';
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

// Check if demo login is enabled (dev/test only)
const ENABLE_DEMO_LOGIN = import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true';

export default function Login() {
  const { login, loginWithTestUser, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Get "next" parameter from URL
  const getNextParam = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('next') || null;
  };
  
  const getDefaultHome = (role: string | null) => {
    if (role === 'admin') return '/admin/leads';
    if (role === 'employee') return '/employee/leads';
    if (role === 'patient') return '/patient/portal';
    if (role === 'doctor') return '/doctor';
    return '/';
  };

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    clearError();
    
    if (!email || !password) {
      return;
    }
    
    try {
      const result = await login(email, password);
      const role = result?.role;
      
      // Get redirect target
      const next = getNextParam();
      const target = next || getDefaultHome(role);
      
      // Navigate to target
      window.history.pushState({}, '', target);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch {
      // Error is shown by store
    }
  };

  const handleTestLogin = async (testEmail: string, testPassword: string) => {
    clearError();
    try {
      const result = await loginWithTestUser(testEmail, testPassword);
      
      // ÖNEMLİ: role yoksa redirect yok
      const role = result?.role;
      if (!role) return;

      // Get redirect target
      const next = getNextParam();
      const target = next || getDefaultHome(role);
      
      // Navigate to target
      window.history.pushState({}, '', target);
      window.dispatchEvent(new PopStateEvent('popstate'));
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
            Sign in to your account
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

        {/* Real Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !email || !password}
            className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {/* Demo Login (only if enabled) */}
        {ENABLE_DEMO_LOGIN && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Test Kullanıcıları ile Giriş Yap
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Aşağıdaki test hesaplarından birini seçerek giriş yapabilirsin.
                </p>
              </div>

              <div className="space-y-3">
                {TEST_USERS.map((user) => (
                  <button
                    key={user.email}
                    type="button"
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
          </>
        )}
      </div>
    </div>
  );
}
