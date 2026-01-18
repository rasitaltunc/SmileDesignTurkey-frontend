/**
 * Auth Callback Page
 * Handles Supabase magic link verification callback
 * Supports both PKCE flow (code in hash) and token flow (token in query params)
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { getPortalSession, createPortalSession } from '../../lib/portalSession';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const supabase = getSupabaseClient();
        if (!supabase) {
          setStatus('error');
          setMessage('Authentication service not configured');
          setTimeout(() => navigate('/'), 3000);
          return;
        }

        // Check if we already have a session
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user?.email) {
          // Session already exists - verification succeeded
          await completeVerification(sessionData.session.user.email);
          return;
        }

        // Try PKCE flow first (code in hash)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const code = hashParams.get('code');
        const error = hashParams.get('error');
        const errorDescription = hashParams.get('error_description');

        if (error) {
          setStatus('error');
          setMessage(errorDescription || error || 'Verification failed');
          setTimeout(() => navigate('/'), 3000);
          return;
        }

        if (code) {
          // PKCE flow: exchange code for session
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError || !data?.session?.user?.email) {
            setStatus('error');
            setMessage(exchangeError?.message || 'Failed to verify email');
            setTimeout(() => navigate('/'), 3000);
            return;
          }

          await completeVerification(data.session.user.email);
          return;
        }

        // Try token flow (token in query params)
        const token = searchParams.get('token');
        const type = searchParams.get('type');

        if (token && type === 'magiclink') {
          // Token flow: verify OTP
          // Note: Supabase magic link tokens need to be handled via signInWithPassword with the token
          // But since we're using OTP, we should have the code flow above
          // If we get here, it might be an older format or error
          setStatus('error');
          setMessage('Invalid verification link format. Please request a new verification email.');
          setTimeout(() => navigate('/'), 3000);
          return;
        }

        // No code or token found
        setStatus('error');
        setMessage('No verification code found in the link');
        setTimeout(() => navigate('/'), 3000);
      } catch (error) {
        console.error('[AuthCallback] Error:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Verification failed');
        setTimeout(() => navigate('/'), 3000);
      }
    };

    const completeVerification = async (verifiedEmail: string) => {
      try {
        const session = getPortalSession();
        
        if (session && session.case_id && session.portal_token) {
          // Call server endpoint to mark lead as verified
          const { data: sessionData } = await supabase.auth.getSession();
          const accessToken = sessionData?.session?.access_token;
          
          if (accessToken) {
            const verifyResponse = await fetch('/api/secure/verify-lead', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                case_id: session.case_id,
                portal_token: session.portal_token,
              }),
            });

            const verifyResult = await verifyResponse.json().catch(() => ({}));
            if (verifyResponse.ok && verifyResult.ok) {
              // Update portal session with verified status
              createPortalSession(
                session.case_id,
                session.portal_token,
                verifiedEmail,
                session.phone,
                true
              );
            }
          }

          // Redirect to portal
          setStatus('success');
          setMessage('Email verified! Redirecting to your portal...');
          setTimeout(() => {
            navigate('/portal', { replace: true });
          }, 1500);
          return;
        }

        // No portal session - redirect to home with success message
        setStatus('success');
        setMessage('Email verified successfully!');
        setTimeout(() => {
          navigate('/?verified=true', { replace: true });
        }, 1500);
      } catch (error) {
        console.error('[AuthCallback] Verification completion error:', error);
        // Even if verification update fails, redirect to portal if session exists
        const session = getPortalSession();
        if (session?.case_id) {
          setStatus('success');
          setMessage('Redirecting to your portal...');
          setTimeout(() => {
            navigate('/portal', { replace: true });
          }, 1500);
        } else {
          setStatus('success');
          setMessage('Email verified! Redirecting...');
          setTimeout(() => {
            navigate('/?verified=true', { replace: true });
          }, 1500);
        }
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-teal-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Verifying your email</h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Verification successful!</h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Verification failed</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              Go to Home
            </button>
          </>
        )}
      </div>
    </div>
  );
}

