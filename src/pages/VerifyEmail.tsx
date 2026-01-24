/**
 * Verify Email Page
 * Handles custom token-based email verification
 * User clicks link → this page opens → token sent to backend → shows "Verified ✅" → redirects to /portal or /
 */

import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { getPortalSession, createPortalSession, hasValidPortalSession } from '../lib/portalSession';
import { fetchPortalData } from '../lib/portalApi';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const handleVerification = async () => {
      // Get token from URL query params
      const params = new URLSearchParams(location.search);
      const token = params.get('token');

      if (!token) {
        setStatus('error');
        setMessage('No verification token found in the link');
        return;
      }

      try {
        // POST token to backend
        const verifyResponse = await fetch('/api/secure/confirm-lead-verification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const verifyResult = await verifyResponse.json().catch(() => ({}));
        
        if (!verifyResponse.ok || !verifyResult.ok) {
          const errorMsg = verifyResult.error || 'Verification failed';
          
          // Handle specific error cases
          if (errorMsg.toLowerCase().includes('expired')) {
            setStatus('error');
            setMessage('This verification link has expired. Please request a new one.');
          } else if (errorMsg.toLowerCase().includes('invalid')) {
            setStatus('error');
            setMessage('Invalid verification link. Please request a new one.');
          } else {
            setStatus('error');
            setMessage(errorMsg);
          }
          return;
        }

        // ✅ Verification successful
        setStatus('success');
        setMessage('Verified ✅');

        // ✅ Canonical Lead Merge: If redirect_to_canonical, update session to canonical lead
        if (verifyResult.redirect_to_canonical && verifyResult.case_id && verifyResult.portal_token) {
          console.log('[VerifyEmail] Redirecting to canonical lead:', {
            canonical_case_id: verifyResult.case_id,
            was_merged: true,
          });

          // Create new portal session with canonical lead credentials
          createPortalSession(
            verifyResult.case_id,
            verifyResult.portal_token,
            verifyResult.email || undefined,
            undefined, // phone not provided by backend
            true // verified
          );

          // Clean URL and redirect to canonical portal
          window.history.replaceState({}, '', '/portal');
          setTimeout(() => {
            navigate('/portal', { replace: true });
          }, 1500);
          return;
        }

        // Normal flow: Update portal session if exists
        const session = getPortalSession();
        if (session) {
          createPortalSession(
            session.case_id,
            session.portal_token,
            session.email,
            session.phone,
            true
          );
          
          // Refresh portal data
          try {
            await fetchPortalData();
          } catch (refreshError) {
            console.warn('[VerifyEmail] Failed to refresh portal data:', refreshError);
          }
        }

        // Clean URL and redirect
        window.history.replaceState({}, '', '/verify-email');

        // Redirect to portal if session exists, otherwise to home
        setTimeout(() => {
          const redirectTo = hasValidPortalSession() ? '/portal' : '/';
          navigate(redirectTo, { replace: true });
        }, 2000);
      } catch (error) {
        console.error('[VerifyEmail] Error:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Verification failed');
      }
    };

    handleVerification();
  }, [location.search, navigate]);

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
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Verified ✅</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500">Redirecting...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Verification failed</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <div className="space-y-2">
              <button
                onClick={() => navigate(hasValidPortalSession() ? '/portal' : '/')}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {hasValidPortalSession() ? 'Go to Portal' : 'Go to Home'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

