/**
 * Verify Email Page
 * Handles custom token-based email verification (alternative to Supabase Auth OTP)
 * - Reads token from URL query params
 * - Calls /api/secure/verify-email to verify token
 * - Updates leads.email_verified_at in database
 * - Redirects to /portal on success
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { getPortalSession, createPortalSession } from '../../lib/portalSession';
import { fetchPortalData } from '../../lib/portalApi';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');
  const [verifiedLeadId, setVerifiedLeadId] = useState<string | null>(null);

  useEffect(() => {
    const handleVerification = async () => {
      console.log('[VerifyEmail] Starting verification. Current URL:', window.location.href);
      
      try {
        const token = searchParams.get('token');
        
        if (!token) {
          setStatus('error');
          setMessage('No verification token found in the link.');
          return;
        }

        // Call backend endpoint to verify token
        const verifyResponse = await fetch('/api/secure/verify-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const result = await verifyResponse.json().catch(() => ({}));

        if (!verifyResponse.ok || !result.ok) {
          if (result.already) {
            // Already verified - still success
            setStatus('success');
            setMessage('Email already verified. Redirecting to your portal...');
            setVerifiedLeadId(result.lead_id || null);
            
            // Update portal session if we have it
            const session = getPortalSession();
            if (session) {
              createPortalSession(
                session.case_id,
                session.portal_token,
                result.email || session.email,
                session.phone,
                true
              );
            }

            // Redirect after short delay
            setTimeout(() => {
              window.history.replaceState({}, '', '/portal');
              navigate('/portal', { replace: true });
            }, 2000);
            return;
          }

          setStatus('error');
          setMessage(result.error || 'Verification failed. The link may have expired or is invalid.');
          return;
        }

        // Verification successful
        console.log('[VerifyEmail] Email verified successfully:', result);

        setStatus('success');
        setMessage('Email verified! Redirecting to your portal...');
        setVerifiedLeadId(result.lead_id || null);

        // Update portal session with verified status
        const session = getPortalSession();
        if (session) {
          createPortalSession(
            session.case_id,
            session.portal_token,
            result.email || session.email,
            session.phone,
            true
          );
        }

        // Refresh portal data to get updated email_verified_at
        try {
          await fetchPortalData();
        } catch (refreshError) {
          console.warn('[VerifyEmail] Failed to refresh portal data:', refreshError);
          // Continue anyway
        }

        // Clean URL and redirect
        window.history.replaceState({}, '', '/portal');
        
        // Redirect after short delay to show success message
        setTimeout(() => {
          navigate('/portal', { replace: true });
        }, 2000);

      } catch (error) {
        console.error('[VerifyEmail] Error:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Verification failed');
      }
    };

    handleVerification();
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
            {verifiedLeadId && (
              <p className="text-sm text-gray-500 mt-2">Lead ID: {verifiedLeadId}</p>
            )}
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Verification failed</h2>
            <p className="text-gray-600 mb-4">{message}</p>
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

