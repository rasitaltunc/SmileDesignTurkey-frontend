import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { hasValidPortalSession, createPortalSession } from '@/lib/portalSession';
import { startCustomEmailVerification } from '@/lib/verification';

export default function PortalLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (hasValidPortalSession()) {
      navigate('/portal', { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/public/portal-login-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim(), password }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        // Always show generic error (security)
        setError(json.error || 'Invalid credentials');
        return;
      }

      // Save portal session
      createPortalSession(json.case_id, json.portal_token, email.toLowerCase().trim());

      // Redirect to portal
      navigate('/portal', { replace: true });
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMagicLink = async () => {
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setError(null);
    setMagicLinkLoading(true);

    try {
      const res = await fetch('/api/public/portal-send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        setError(json.error || 'Failed to send magic link');
        return;
      }

      setMagicLinkSent(true);
      setError(null);
    } catch (err) {
      setError('Failed to send magic link. Please try again.');
    } finally {
      setMagicLinkLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Portal Login</h1>
          <p className="text-gray-600 mb-6">Access your treatment plan portal</p>

          {magicLinkSent && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-sm text-emerald-800">
                Check your email to access your portal. Click the verification link we sent you.
              </p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  disabled={loading || magicLinkLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  disabled={loading || magicLinkLoading}
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || magicLinkLoading}
              className="w-full py-2.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </button>

            <div className="pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleSendMagicLink}
                disabled={loading || magicLinkLoading || magicLinkSent}
                className="w-full py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {magicLinkLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : magicLinkSent ? (
                  'Magic link sent ✓'
                ) : (
                  'Send magic link instead'
                )}
              </button>

              <p className="mt-3 text-xs text-center text-gray-500">
                Don't have a password? Use the magic link option above or{' '}
                <button
                  type="button"
                  onClick={handleSendMagicLink}
                  className="text-teal-600 hover:text-teal-700 underline"
                >
                  request one
                </button>
                .
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

