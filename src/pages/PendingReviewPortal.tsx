/**
 * Pending Review Portal (V1)
 * "Soft lead" portal - user lands here after submitting lead
 * Shows timeline, next actions, uploads, and locked modules
 */

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  Upload,
  MessageCircle,
  Lock,
  Shield,
  Mail,
  AlertCircle,
  Loader2,
  FileText,
  Calendar,
  Plane,
  DollarSign,
} from 'lucide-react';
import { getPortalSession, createPortalSession, hasValidPortalSession } from '@/lib/portalSession';
import { sendMagicLink, verifyMagicLink } from '@/lib/verification';
import { getWhatsAppUrl } from '@/lib/whatsapp';
import { BRAND } from '@/config';
import { trackEvent } from '@/lib/analytics';

interface TimelineStep {
  id: string;
  label: string;
  status: 'completed' | 'current' | 'upcoming';
  icon: React.ReactNode;
}

const TIMELINE_STEPS: TimelineStep[] = [
  { id: 'docs', label: 'Docs Received', status: 'completed', icon: <FileText className="w-5 h-5" /> },
  { id: 'review', label: 'Doctor Reviewing', status: 'current', icon: <Clock className="w-5 h-5" /> },
  { id: 'plan', label: 'Plan in Progress', status: 'upcoming', icon: <CheckCircle2 className="w-5 h-5" /> },
  { id: 'quote', label: 'Quote & Scheduling', status: 'upcoming', icon: <Calendar className="w-5 h-5" /> },
  { id: 'travel', label: 'Travel & Transfer', status: 'upcoming', icon: <Plane className="w-5 h-5" /> },
  { id: 'treatment', label: 'Treatment Day', status: 'upcoming', icon: <CheckCircle2 className="w-5 h-5" /> },
  { id: 'aftercare', label: 'Aftercare', status: 'upcoming', icon: <Shield className="w-5 h-5" /> },
];

export default function PendingReviewPortal() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const case_id = searchParams.get('case_id') || '';
  const verificationToken = searchParams.get('token');
  
  const [session, setSession] = useState(getPortalSession());
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [showVerificationSuccess, setShowVerificationSuccess] = useState(false);

  // Check if user has valid portal session
  useEffect(() => {
    setIsVerified(hasValidPortalSession());
    setIsLoading(false);
  }, []);

  // Handle verification token from URL
  useEffect(() => {
    if (verificationToken && case_id) {
      setIsLoading(true);
      verifyMagicLink(verificationToken, case_id).then((result) => {
        if (result.success) {
          setIsVerified(true);
          setSession(getPortalSession());
          trackEvent({ type: 'verification_completed', case_id });
        } else {
          setError(result.error || 'Verification failed');
        }
        setIsLoading(false);
      });
    }
  }, [verificationToken, case_id]);

  // Track portal view
  useEffect(() => {
    if (case_id) {
      trackEvent({ type: 'portal_viewed', case_id, is_verified: isVerified });
    }
  }, [case_id, isVerified]);

  const handleVerifyEmail = async () => {
    if (!verificationEmail || !case_id) return;

    setIsSendingVerification(true);
    const result = await sendMagicLink(verificationEmail, case_id);
    setIsSendingVerification(false);

    if (result.success) {
      setShowVerificationSuccess(true);
      createPortalSession(case_id, verificationEmail);
      trackEvent({ type: 'verification_started', case_id, method: 'email' });
    } else {
      setError(result.error || 'Failed to send verification email');
    }
  };

  const handleWhatsAppClick = () => {
    const message = `Hi, I submitted a request with case ID ${case_id}. I'd like to follow up.`;
    const url = getWhatsAppUrl({ phoneE164: BRAND.whatsappPhoneE164, text: message });
    
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      trackEvent({ type: 'whatsapp_clicked', where: 'pending_portal', case_id });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading your portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Your Treatment Plan</h1>
              {case_id && (
                <p className="text-sm text-gray-600 mt-1">Case ID: <span className="font-mono font-semibold">{case_id}</span></p>
              )}
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-lg">
              <Clock className="w-4 h-4 text-yellow-700" />
              <span className="text-sm font-medium text-yellow-800">Pending Doctor Review</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              <span>Assigned Coordinator: <span className="font-medium">Pending assignment</span></span>
            </div>
          </div>
        </div>

        {/* Verification Banner (if not verified) */}
        {!isVerified && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-2">Verify your access</h3>
                <p className="text-sm text-blue-800 mb-4">
                  Verify your email to access all portal features and receive updates about your case.
                </p>
                {!showVerificationSuccess ? (
                  <div className="flex gap-3">
                    <input
                      type="email"
                      value={verificationEmail}
                      onChange={(e) => setVerificationEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="flex-1 px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleVerifyEmail}
                      disabled={isSendingVerification || !verificationEmail}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSendingVerification ? 'Sending...' : 'Send Link'}
                    </button>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <p className="text-sm text-blue-900 font-medium">
                      ✓ Verification link sent! Check your email and click the link to verify your access.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Timeline */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Your Journey</h2>
          <div className="space-y-4">
            {TIMELINE_STEPS.map((step, idx) => (
              <div key={step.id} className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    step.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : step.status === 'current'
                      ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {step.status === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    step.icon
                  )}
                </div>
                <div className="flex-1">
                  <p
                    className={`font-medium ${
                      step.status === 'completed'
                        ? 'text-green-900'
                        : step.status === 'current'
                        ? 'text-blue-900'
                        : 'text-gray-500'
                    }`}
                  >
                    {step.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Next Best Action */}
        <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-xl border-2 border-teal-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Next Step</h2>
          <div className="space-y-3">
            <button
              onClick={() => {
                trackEvent({ type: 'upload_started', case_id });
                navigate('/upload-center');
              }}
              className="w-full flex items-center justify-between p-4 bg-white rounded-lg border border-teal-200 hover:border-teal-400 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3">
                <Upload className="w-5 h-5 text-teal-600" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">Upload Photos or X-rays</p>
                  <p className="text-sm text-gray-600">Help our doctors prepare your treatment plan</p>
                </div>
              </div>
              <CheckCircle2 className="w-5 h-5 text-teal-600" />
            </button>

            <button
              onClick={handleWhatsAppClick}
              className="w-full flex items-center justify-between p-4 bg-white rounded-lg border border-teal-200 hover:border-teal-400 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-teal-600" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">Message Your Coordinator</p>
                  <p className="text-sm text-gray-600">Get quick answers via WhatsApp</p>
                </div>
              </div>
              <CheckCircle2 className="w-5 h-5 text-teal-600" />
            </button>
          </div>
        </div>

        {/* Upload Section (Simplified - redirects to UploadCenter) */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Documents</h2>
          <p className="text-sm text-gray-600 mb-4">
            Upload photos, X-rays, or medical records to help our team prepare your personalized treatment plan.
          </p>
          <button
            onClick={() => navigate('/upload-center')}
            className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg text-teal-600 hover:border-teal-400 hover:bg-teal-50 transition-colors"
          >
            <Upload className="w-5 h-5 inline mr-2" />
            Go to Upload Center
          </button>
        </div>

        {/* Locked Modules */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Coming Soon</h2>
          <p className="text-sm text-gray-600 mb-4">
            These features will unlock after your case is reviewed by a doctor.
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              { icon: <Plane className="w-5 h-5" />, label: 'Travel Arrangements', locked: true },
              { icon: <DollarSign className="w-5 h-5" />, label: 'Payment & Packages', locked: true },
              { icon: <Calendar className="w-5 h-5" />, label: 'Accommodation', locked: true },
              { icon: <FileText className="w-5 h-5" />, label: 'Treatment Details', locked: true },
            ].map((module, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 opacity-60"
              >
                <div className="text-gray-400">{module.icon}</div>
                <div className="flex-1">
                  <p className="font-medium text-gray-600">{module.label}</p>
                </div>
                <Lock className="w-4 h-4 text-gray-400" />
              </div>
            ))}
          </div>
        </div>

        {/* Trust Micro-block */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-wrap gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-teal-600" />
              <span>GDPR Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-teal-600" />
              <span>Medical Confidentiality</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-600" />
              <span>24-48h Response Time</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

