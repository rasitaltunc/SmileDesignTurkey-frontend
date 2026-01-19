/**
 * Auth Callback Page
 * Handles Supabase magic link verification callback for EMPLOYEE/ADMIN login ONLY
 * 
 * NOTE: Lead email verification uses /verify-email route with custom token system.
 * This page is ONLY for employee/admin Supabase Auth OTP login.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { useAuthStore } from '../../store/authStore';
import { getHomePath } from '../../lib/roleHome';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { checkSession } = useAuthStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your login...');

  useEffect(() => {
    const handleCallback = async () => {
      console.log('[AuthCallback] Starting callback handler. Current URL:', window.location.href);
      
      try {
        const supabase = getSupabaseClient();
        if (!supabase) {
          setStatus('error');
          setMessage('Authentication service not configured');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        // Extract error from hash or query params
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const hashError = hashParams.get('error');
        const hashErrorDescription = hashParams.get('error_description');
        const queryError = searchParams.get('error');
        const queryErrorDescription = searchParams.get('error_description');

        if (hashError || queryError) {
          const errorMsg = hashErrorDescription || queryErrorDescription || hashError || queryError || 'Login failed';
          
          if (hashError === 'otp_expired' || queryError === 'otp_expired' || 
              errorMsg.toLowerCase().includes('expired')) {
            setStatus('error');
            setMessage('This login link has expired. Please request a new one.');
            return;
          }
          
          setStatus('error');
          setMessage(errorMsg);
          return;
        }

        // Verify Supabase auth session (PKCE or token flow)
        let session = null;

        // Check if we already have a session
        const { data: existingSession } = await supabase.auth.getSession();
        if (existingSession?.session) {
          session = existingSession.session;
        } else {
          // Try PKCE flow (code in hash or query)
          const hashCode = hashParams.get('code');
          const queryCode = searchParams.get('code');
          const code = hashCode || queryCode;
          
          if (code) {
            // PKCE flow: exchange code for session
            try {
              const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(window.location.href);
              
              if (exchangeError || !data?.session) {
                if (exchangeError?.message?.toLowerCase().includes('expired') || 
                    exchangeError?.message?.toLowerCase().includes('invalid')) {
                  setStatus('error');
                  setMessage('This login link has expired. Please request a new one.');
                  return;
                }
                
                setStatus('error');
                setMessage(exchangeError?.message || 'Failed to verify login');
                return;
              }
              
              session = data.session;
            } catch (exchangeErr) {
              console.error('[AuthCallback] PKCE exchange error:', exchangeErr);
              setStatus('error');
              setMessage('Failed to verify login. Please try again.');
              return;
            }
          } else {
            // Try token flow (token in query params)
            const token = searchParams.get('token');
            const type = searchParams.get('type');

            if (token && type === 'magiclink') {
              try {
                const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
                  type: 'magiclink',
                  token_hash: token,
                });

                if (verifyError || !verifyData?.user) {
                  if (verifyError?.message?.toLowerCase().includes('expired') || 
                      verifyError?.message?.toLowerCase().includes('invalid')) {
                    setStatus('error');
                    setMessage('This login link has expired. Please request a new one.');
                    return;
                  }
                  
                  setStatus('error');
                  setMessage(verifyError?.message || 'Failed to verify login');
                  return;
                }
                
                // For verifyOtp, we need to get session manually
                const { data: sessionData } = await supabase.auth.getSession();
                if (!sessionData?.session) {
                  setStatus('error');
                  setMessage('Failed to establish session');
                  return;
                }
                session = sessionData.session;
              } catch (verifyErr) {
                console.error('[AuthCallback] Token verification error:', verifyErr);
                setStatus('error');
                setMessage('Invalid login link format. Please try again.');
                return;
              }
            } else {
              // No code or token found
              setStatus('error');
              setMessage('No verification code found in the link');
              return;
            }
          }
        }

        if (!session) {
          setStatus('error');
          setMessage('Could not establish login session');
          return;
        }

        // Update auth store
        await checkSession();

        // Clean URL
        window.history.replaceState({}, '', '/');

        setStatus('success');
        setMessage('Login successful! Redirecting...');

        // Get user role and redirect to appropriate home
        const { data: { user } } = await supabase.auth.getUser();
        const role = user?.user_metadata?.role || 'employee';
        const homePath = getHomePath(role);

        setTimeout(() => {
          navigate(homePath, { replace: true });
        }, 1500);
      } catch (error) {
        console.error('[AuthCallback] Error:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Login failed');
      }
    };

    handleCallback();
  }, [navigate, searchParams, checkSession]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-teal-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Verifying your login</h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Login successful!</h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Login failed</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <button
              onClick={() => navigate('/login')}
              className="mt-3 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Go to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
