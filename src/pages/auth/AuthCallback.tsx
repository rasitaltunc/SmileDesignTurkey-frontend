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
import { startEmailVerification } from '../../lib/verification';
import { fetchPortalData } from '../../lib/portalApi';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');
  const [showResend, setShowResend] = useState(false);
  const [resendEmail, setResendEmail] = useState<string>('');

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

        // Extract error from hash or query params first
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const hashError = hashParams.get('error');
        const hashErrorDescription = hashParams.get('error_description');
        const queryError = searchParams.get('error');
        const queryErrorDescription = searchParams.get('error_description');

        if (hashError || queryError) {
          const errorMsg = hashErrorDescription || queryErrorDescription || hashError || queryError || 'Verification failed';
          
          // Check if it's an expired/invalid token error
          if (hashError === 'otp_expired' || queryError === 'otp_expired' || 
              errorMsg.toLowerCase().includes('expired') ||
              errorMsg.toLowerCase().includes('invalid') ||
              errorMsg.toLowerCase().includes('requested path is invalid')) {
            setStatus('error');
            setMessage('This verification link has expired. Please request a new one.');
            setShowResend(true);
            // Try to get email from portal session for resend
            const session = getPortalSession();
            if (session?.email) {
              setResendEmail(session.email);
            }
            return;
          }
          
          setStatus('error');
          setMessage(errorMsg);
          setShowResend(true);
          const session = getPortalSession();
          if (session?.email) {
            setResendEmail(session.email);
          }
          return;
        }

        // Check if we already have a session (implicit flow: #access_token=...)
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user?.email) {
          // Session already exists - verification succeeded
          await completeVerification(sessionData.session.user.email);
          return;
        }

        // Try PKCE flow (code in hash or query: ?code=... or #code=...)
        const hashCode = hashParams.get('code');
        const queryCode = searchParams.get('code');
        const code = hashCode || queryCode;
        
        if (code) {
          // PKCE flow: prefer exchangeCodeForSession with full URL (supabase-js v2 best practice)
          // This handles both hash and query param formats
          try {
            // Use full URL for exchange (more robust in supabase-js v2)
            const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(window.location.href);
            
            if (exchangeError || !data?.session?.user?.email) {
              // Check for expired/invalid errors
              if (exchangeError?.message?.toLowerCase().includes('expired') || 
                  exchangeError?.message?.toLowerCase().includes('invalid') ||
                  exchangeError?.message?.toLowerCase().includes('requested path is invalid')) {
                setStatus('error');
                setMessage('This verification link has expired. Please request a new one.');
                setShowResend(true);
                const session = getPortalSession();
                if (session?.email) {
                  setResendEmail(session.email);
                }
                return;
              }
              
              setStatus('error');
              setMessage(exchangeError?.message || 'Failed to verify email');
              setShowResend(true);
              const session = getPortalSession();
              if (session?.email) {
                setResendEmail(session.email);
              }
              return;
            }
            
            // Confirm session exists after exchange
            const { data: sessionCheck, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !sessionCheck?.session?.user?.email) {
              setStatus('error');
              setMessage('Session verification failed. Please try again.');
              setShowResend(true);
              const session = getPortalSession();
              if (session?.email) {
                setResendEmail(session.email);
              }
              return;
            }

            await completeVerification(sessionCheck.session.user.email);
            return;
          } catch (exchangeErr) {
            console.error('[AuthCallback] PKCE exchange error:', exchangeErr);
            setStatus('error');
            setMessage('Failed to verify email. Please request a new verification link.');
            setShowResend(true);
            const session = getPortalSession();
            if (session?.email) {
              setResendEmail(session.email);
            }
            return;
          }
        }

        // Try token flow (token in query params: ?token=...&type=magiclink)
        const token = searchParams.get('token');
        const type = searchParams.get('type');

        if (token && type === 'magiclink') {
          // Token flow: verify OTP token
          // Supabase v2 uses verifyOtp for magic link tokens
          try {
            // Token flow: verify OTP using verifyOtp (supabase-js v2)
            // Note: Supabase magic link tokens can be verified via verifyOtp
            const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
              type: 'magiclink',
              token_hash: token,
            });

            if (verifyError || !verifyData?.user?.email) {
              if (verifyError?.message?.toLowerCase().includes('expired') || 
                  verifyError?.message?.toLowerCase().includes('invalid') ||
                  verifyError?.message?.toLowerCase().includes('requested path is invalid')) {
                setStatus('error');
                setMessage('This verification link has expired. Please request a new one.');
                setShowResend(true);
                const session = getPortalSession();
                if (session?.email) {
                  setResendEmail(session.email);
                }
                return;
              }
              
              setStatus('error');
              setMessage(verifyError?.message || 'Failed to verify email');
              setShowResend(true);
              const session = getPortalSession();
              if (session?.email) {
                setResendEmail(session.email);
              }
              return;
            }
            
            // Confirm session exists after OTP verification
            const { data: sessionCheck, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !sessionCheck?.session?.user?.email) {
              setStatus('error');
              setMessage('Session verification failed. Please try again.');
              setShowResend(true);
              const session = getPortalSession();
              if (session?.email) {
                setResendEmail(session.email);
              }
              return;
            }

            await completeVerification(sessionCheck.session.user.email);
            return;
          } catch (verifyErr) {
            console.error('[AuthCallback] Token verification error:', verifyErr);
            setStatus('error');
            setMessage('Invalid verification link format. Please request a new verification email.');
            setShowResend(true);
            const session = getPortalSession();
            if (session?.email) {
              setResendEmail(session.email);
            }
            return;
          }
        }

        // No code or token found
        setStatus('error');
        setMessage('No verification code found in the link');
        setShowResend(true);
        const session = getPortalSession();
        if (session?.email) {
          setResendEmail(session.email);
        }
      } catch (error) {
        console.error('[AuthCallback] Error:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Verification failed');
        setShowResend(true);
        const session = getPortalSession();
        if (session?.email) {
          setResendEmail(session.email);
        }
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
              
              // Refresh portal data to get updated email_verified_at
              try {
                await fetchPortalData();
              } catch (refreshError) {
                console.warn('[AuthCallback] Failed to refresh portal data:', refreshError);
                // Continue anyway
              }
            }
          }

          // Redirect to portal after 1-2s
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
    
    const handleResendVerification = async () => {
      if (!resendEmail) return;
      
      setStatus('loading');
      setMessage('Sending new verification link...');
      setShowResend(false);
      
      const result = await startEmailVerification(resendEmail);
      
      if (result.success) {
        setStatus('success');
        setMessage('New verification link sent! Check your email.');
        setTimeout(() => {
          navigate('/portal', { replace: true });
        }, 2000);
      } else {
        setStatus('error');
        setMessage(result.error || 'Failed to send verification link');
        setShowResend(true);
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
            {showResend && (
              <div className="space-y-3">
                {!resendEmail && (
                  <input
                    type="email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                )}
                <button
                  onClick={handleResendVerification}
                  disabled={!resendEmail}
                  className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Resend verification link
                </button>
              </div>
            )}
            <button
              onClick={() => navigate('/portal')}
              className="mt-3 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Go to Portal
            </button>
          </>
        )}
      </div>
    </div>
  );
}

