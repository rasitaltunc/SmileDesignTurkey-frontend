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

      if (role === 'admin') {
        window.history.pushState({}, '', '/admin/leads');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } else if (role === 'employee') {
        window.history.pushState({}, '', '/employee/leads');
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
