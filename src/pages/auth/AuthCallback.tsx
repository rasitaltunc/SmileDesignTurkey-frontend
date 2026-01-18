/**
 * Auth Callback Page
 * Handles Supabase magic link verification callback
 * - Reads case_id + portal_token from URL query params (if localStorage is empty)
 * - Verifies email via Supabase Auth (PKCE/token flow)
 * - Updates leads.email_verified_at via /api/secure/verify-lead
 * - Signs out of Supabase auth (patient shouldn't stay logged in as employee/admin)
 * - Cleans URL hash/query and redirects to /portal
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
  const [resendCaseId, setResendCaseId] = useState<string>('');
  const [resendPortalToken, setResendPortalToken] = useState<string>('');

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

        // STEP 1: Get case_id and portal_token from URL query params FIRST (critical for cross-browser/context)
        // This ensures we can verify even if localStorage is empty (different browser/incognito/device)
        const urlCaseId = searchParams.get('case_id');
        const urlPortalToken = searchParams.get('portal_token');
        
        // Fallback to localStorage session if query params missing
        let case_id = urlCaseId;
        let portal_token = urlPortalToken;
        let email = '';
        
        if (!case_id || !portal_token) {
          const session = getPortalSession();
          case_id = case_id || session?.case_id || '';
          portal_token = portal_token || session?.portal_token || '';
          email = session?.email || '';
        }

        // If we still don't have case_id/portal_token, show error with resend option
        if (!case_id || !portal_token) {
          setStatus('error');
          setMessage('Missing case information. Please request a new verification link from your portal.');
          setShowResend(true);
          // Try to get email from portal session for resend
          const session = getPortalSession();
          if (session?.email) {
            setResendEmail(session.email);
            setResendCaseId(session.case_id || '');
            setResendPortalToken(session.portal_token || '');
          }
          return;
        }

        // Store for resend functionality
        setResendCaseId(case_id);
        setResendPortalToken(portal_token);

        // STEP 2: Extract error from hash or query params
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

        // STEP 3: Verify Supabase auth session (PKCE or token flow)
        let verifiedEmail: string | null = null;

        // Check if we already have a session (implicit flow: #access_token=...)
        const { data: existingSession } = await supabase.auth.getSession();
        if (existingSession?.session?.user?.email) {
          verifiedEmail = existingSession.session.user.email.toLowerCase().trim();
        } else {
          // Try PKCE flow (code in hash or query: ?code=... or #code=...)
          const hashCode = hashParams.get('code');
          const queryCode = searchParams.get('code');
          const code = hashCode || queryCode;
          
          if (code) {
            // PKCE flow: exchange code for session
            try {
              const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(window.location.href);
              
              if (exchangeError || !data?.session?.user?.email) {
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
              
              verifiedEmail = data.session.user.email.toLowerCase().trim();
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
          } else {
            // Try token flow (token in query params: ?token=...&type=magiclink)
            const token = searchParams.get('token');
            const type = searchParams.get('type');

            if (token && type === 'magiclink') {
              try {
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
                
                verifiedEmail = verifyData.user.email.toLowerCase().trim();
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
            } else {
              // No code or token found
              setStatus('error');
              setMessage('No verification code found in the link');
              setShowResend(true);
              const session = getPortalSession();
              if (session?.email) {
                setResendEmail(session.email);
              }
              return;
            }
          }
        }

        if (!verifiedEmail) {
          setStatus('error');
          setMessage('Could not verify email from authentication session');
          setShowResend(true);
          return;
        }

        // STEP 4: Call backend endpoint to update leads.email_verified_at
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const accessToken = sessionData?.session?.access_token;

          if (!accessToken) {
            throw new Error('No access token available');
          }

          const verifyResponse = await fetch('/api/secure/verify-lead', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              case_id,
              portal_token,
            }),
          });

          const verifyResult = await verifyResponse.json().catch(() => ({}));
          if (!verifyResponse.ok || !verifyResult.ok) {
            console.error('[AuthCallback] Verify-lead endpoint failed:', verifyResponse.status, verifyResult);
            throw new Error(verifyResult.error || 'Failed to update verification status');
          }

          console.log('[AuthCallback] Lead verified successfully:', case_id);

          // STEP 5: Update portal session with verified status
          const session = getPortalSession();
          if (session && session.case_id === case_id) {
            createPortalSession(
              case_id,
              portal_token,
              verifiedEmail,
              session.phone,
              true
            );
          } else {
            // Create new session if it doesn't exist (cross-browser case)
            createPortalSession(
              case_id,
              portal_token,
              verifiedEmail,
              null,
              true
            );
          }

          // Refresh portal data to get updated email_verified_at
          try {
            await fetchPortalData();
          } catch (refreshError) {
            console.warn('[AuthCallback] Failed to refresh portal data:', refreshError);
            // Continue anyway
          }

          // STEP 6: Sign out of Supabase auth (patient shouldn't stay logged in as employee/admin)
          // This ensures patient portal users don't see Leads/Logout in navbar
          try {
            await supabase.auth.signOut();
          } catch (signOutError) {
            console.warn('[AuthCallback] Failed to sign out:', signOutError);
            // Continue anyway - redirect will still work
          }

          // STEP 7: Clean URL hash/query to avoid React 306 crashes and redirect to portal
          // ✅ CRITICAL: Clean URL immediately (replace hash and query params) - no token in history
          window.history.replaceState({}, '', '/portal');

          setStatus('success');
          setMessage('Email verified! Redirecting to your portal...');

          // ✅ CRITICAL: Redirect to portal immediately with replace (no history entry for auth callback)
          navigate('/portal', { replace: true });
        } catch (verifyError) {
          console.error('[AuthCallback] Error during verification:', verifyError);
          setStatus('error');
          setMessage(verifyError instanceof Error ? verifyError.message : 'Failed to complete verification');
          setShowResend(true);
          // Store email for resend
          setResendEmail(verifiedEmail);
        }
      } catch (error) {
        console.error('[AuthCallback] Error:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Verification failed');
        setShowResend(true);
        const session = getPortalSession();
        if (session?.email) {
          setResendEmail(session.email);
          setResendCaseId(session.case_id || '');
          setResendPortalToken(session.portal_token || '');
        }
      }
    };

    handleCallback();
  }, [navigate, searchParams]);
    
  const handleResendVerification = async () => {
    if (!resendEmail) return;
    
    setStatus('loading');
    setMessage('Sending new verification link...');
    setShowResend(false);
    
    const result = await startEmailVerification(
      resendEmail,
      resendCaseId || undefined,
      resendPortalToken || undefined
    );
    
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
