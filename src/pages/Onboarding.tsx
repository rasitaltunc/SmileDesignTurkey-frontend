import { useState, useEffect, useRef } from 'react';
import { useNavigate } from '../components/Link';
import { Upload, ChevronRight, ArrowLeft, CheckCircle, Lock, Shield, X, FileText, Image } from 'lucide-react';
import { 
  TopNav, 
  Stepper, 
  GuidedPanel, 
  ChoiceCard, 
  Input, 
  Dropzone,
  Button,
  TrustBadge
} from '../components/design-system';
import { Smile, Anchor, Layers, Crown, Sun, FileCheck } from 'lucide-react';
import Footer from '../components/Footer';
import { trackEvent } from '../lib/analytics';
import { BRAND } from '../config';
import { saveLead, addStagedFiles, getStagedFiles, removeStagedFile, clearStagedFiles, uploadStagedFiles } from '../lib/leadStore';
import { createPortalSession } from '../lib/portalSession';
import { validateSubmission, getHoneypotFieldName } from '../lib/antiSpam';
import { SEO } from '../lib/seo';
import { useLanguage } from '../lib/i18n';
import { DEFAULT_COPY } from '../lib/siteContentDefaults';
import { toast } from '../lib/toast';

export default function Onboarding() {
  const { copy } = useLanguage();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stagedFilesList, setStagedFilesList] = useState<File[]>([]);

  // SEO handled by <SEO> component below
  const seo = copy?.seo?.onboarding ?? DEFAULT_COPY.seo.onboarding;
  
  // Sync staged files from store on mount
  useEffect(() => {
    setStagedFilesList(getStagedFiles());
  }, []);
  
  const [formData, setFormData] = useState({
    treatment: '',
    goals: '',
    timeline: '',
    previousTreatment: '',
    concerns: '',
    name: '',
    email: '',
    whatsapp: '',
    preferredLanguage: 'English',
    [getHoneypotFieldName()]: '', // Honeypot field
  });
  const [formOpenTime] = useState(Date.now()); // Track when form was opened
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Track onboarding start
  useEffect(() => {
    const lang = formData.preferredLanguage.toLowerCase().substring(0, 2) || BRAND.defaultLang;
    trackEvent({ 
      type: 'start_onboarding',
      entry: 'onboarding_page',
      lang 
    });
  }, []);

  // Track step view
  useEffect(() => {
    const lang = formData.preferredLanguage.toLowerCase().substring(0, 2) || BRAND.defaultLang;
    trackEvent({ 
      type: 'onboarding_step_view',
      step: currentStep,
      lang 
    });
  }, [currentStep, formData.preferredLanguage]);

  const treatments = [
    { id: 'smile-makeover', name: 'Smile Makeover', icon: <Smile className="w-6 h-6" />, description: 'Complete dental transformation' },
    { id: 'dental-implants', name: 'Dental Implants', icon: <Anchor className="w-6 h-6" />, description: 'Permanent tooth replacement' },
    { id: 'veneers', name: 'Porcelain Veneers', icon: <Layers className="w-6 h-6" />, description: 'Natural-looking smile enhancement' },
    { id: 'crowns', name: 'Dental Crowns', icon: <Crown className="w-6 h-6" />, description: 'Restore damaged teeth' },
    { id: 'whitening', name: 'Professional Whitening', icon: <Sun className="w-6 h-6" />, description: 'Brighter, whiter smile' },
    { id: 'second-opinion', name: 'Second Opinion', icon: <FileCheck className="w-6 h-6" />, description: 'Expert case review' }
  ];

  const handleNext = () => {
    if (currentStep < 5) {
      const nextStep = (currentStep + 1) as 1 | 2 | 3 | 4 | 5;
      const lang = formData.preferredLanguage.toLowerCase().substring(0, 2) || BRAND.defaultLang;
      
      trackEvent({ 
        type: 'onboarding_step_complete', 
        step: currentStep,
        goal: currentStep === 2 ? formData.goals : undefined,
        timeline: currentStep === 3 ? formData.timeline : undefined,
        lang 
      });
      
      setCurrentStep(nextStep);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as 1 | 2 | 3 | 4 | 5);
    }
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    
    // Anti-spam validation
    const validation = validateSubmission(formData, formOpenTime);
    if (!validation.allowed) {
      setErrorMessage(validation.message || 'Please try again in a moment.');
      return;
    }
    
    const lang = formData.preferredLanguage.toLowerCase().substring(0, 2) || BRAND.defaultLang;
    
    // Save onboarding data to legacy localStorage (for plan-dashboard compatibility)
    const onboardingData = {
      goal: formData.goals,
      timeline: formData.timeline || 'Not specified',
      priority: formData.treatment,
      notes: formData.concerns,
      lang: lang,
      name: formData.name,
      email: formData.email,
      whatsapp: formData.whatsapp,
      previousTreatment: formData.previousTreatment,
    };
    
    try {
      localStorage.setItem('guidehealth_onboarding_v1', JSON.stringify(onboardingData));
    } catch (error) {
      console.warn('Failed to save onboarding data:', error);
    }

    // Save lead using new leads system (async) - returns case_id + portal_token
    const { case_id, portal_token } = await saveLead({
      source: 'onboarding',
      name: formData.name || undefined,
      email: formData.email || undefined,
      phone: formData.whatsapp || undefined,
      treatment: formData.treatment || undefined,
      message: formData.goals || undefined,
      timeline: formData.timeline || undefined,
      lang: lang,
      pageUrl: window.location.href,
    });

    // Create portal session with portal_token (secure, never in URL)
    if (case_id && portal_token) {
      createPortalSession(case_id, portal_token, formData.email, formData.whatsapp, false);
    }

    // Upload staged files if any (after lead creation)
    if (case_id && stagedFilesList.length > 0) {
      try {
        const uploadedPaths = await uploadStagedFiles(case_id);
        if (uploadedPaths.length > 0) {
          trackEvent({
            type: 'staged_files_uploaded',
            count: uploadedPaths.length,
            case_id,
          });
          toast.success(`${uploadedPaths.length} file${uploadedPaths.length > 1 ? 's' : ''} uploaded successfully`);
        } else if (stagedFilesList.length > 0) {
          // Some files failed to upload
          toast.info('Files will be available to upload in your portal');
        }
      } catch (uploadError) {
        console.warn('[Onboarding] Failed to upload staged files:', uploadError);
        toast.info('You can upload files later from your portal');
      }
      // Clear local state
      setStagedFilesList([]);
    }

    // Track analytics (no PII) - note: submit_lead is now tracked in leadStore
    trackEvent({ 
      type: 'onboarding_step_complete', 
      step: 5,
      goal: formData.goals,
      timeline: formData.timeline || 'Not specified',
      lang,
      case_id 
    });

    // Track lead submission
    trackEvent({
      type: 'lead_submitted',
      source: 'onboarding',
      has_case_id: !!case_id,
      lang,
    });
    
    // Redirect to portal (new flow) or fallback to plan-dashboard
    setTimeout(() => {
      if (case_id) {
        navigate(`/portal?case_id=${case_id}`);
      } else {
        navigate('/plan-dashboard');
      }
    }, 500);
  };

  // File upload handlers
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      addStagedFiles(fileArray);
      setStagedFilesList(getStagedFiles());
      trackEvent({ type: 'files_staged', count: fileArray.length, source: 'onboarding' });
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleRemoveFile = (index: number) => {
    removeStagedFile(index);
    setStagedFilesList(getStagedFiles());
  };
  
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="w-4 h-4 text-accent-primary" />;
    }
    return <FileText className="w-4 h-4 text-accent-primary" />;
  };
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.treatment !== '';
      case 2:
        return formData.goals.trim() !== '';
      case 3:
        return formData.timeline !== '' && formData.previousTreatment !== '';
      case 4:
        return formData.name.trim() !== '' && formData.email.trim() !== '';
      case 5:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-overlay-wash">
      <SEO 
        title={seo.title} 
        description={seo.description}
        url="/onboarding"
      />
      <TopNav variant="desktop" />
      
      <div className="max-w-4xl mx-auto px-8 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <Stepper currentStep={currentStep} totalSteps={5} className="justify-center mb-8" />
          <h1 className="text-text-primary mb-4">Your Personalized Plan Starts Here</h1>
          <p className="text-text-secondary text-lg">
            A simple 5-step process to get your custom treatment plan in 24-48 hours
          </p>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-[var(--radius-xl)] shadow-premium-lg border border-border-subtle p-10 mb-8">
          {/* Step 1: Treatment Interest */}
          {currentStep === 1 && (
            <div className="space-y-8">
              <div>
                <h3 className="text-text-primary mb-3">What brings you to GuideHealth?</h3>
                <p className="text-text-secondary">
                  Choose the treatment you're most interested in. You can discuss multiple options during your consultation.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {treatments.map((treatment) => (
                  <ChoiceCard
                    key={treatment.id}
                    title={treatment.name}
                    description={treatment.description}
                    icon={treatment.icon}
                    selected={formData.treatment === treatment.name}
                    onClick={() => setFormData({ ...formData, treatment: treatment.name })}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Goals */}
          {currentStep === 2 && (
            <div className="space-y-8">
              <div>
                <h3 className="text-text-primary mb-3">Tell us about your goals</h3>
                <p className="text-text-secondary">
                  What are you hoping to achieve? Share as much or as little as you're comfortable with.
                </p>
              </div>

              <textarea
                value={formData.goals}
                onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                rows={6}
                className="w-full px-4 py-3 bg-white border border-border-subtle rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent transition-all"
                placeholder="Example: I'm looking to improve my smile confidence. I have some staining and a chipped tooth that I'd like to address..."
              />

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf,.pdf"
                onChange={handleFileChange}
                className="hidden"
                aria-label="Upload photos or X-rays"
              />
              
              {/* Clickable upload card */}
              <button
                type="button"
                onClick={handleFileSelect}
                className="w-full bg-accent-soft rounded-[var(--radius-md)] p-6 border border-accent-primary/20 hover:border-accent-primary hover:bg-accent-soft/80 transition-all cursor-pointer text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-white rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0 shadow-premium-sm">
                    <Upload className="w-5 h-5 text-accent-primary" />
                  </div>
                  <div>
                    <h4 className="text-text-primary mb-2">Have photos or X-rays?</h4>
                    <p className="text-text-secondary text-sm">
                      Secure & encrypted. Only your coordinator sees this. You can also skip and upload later.
                    </p>
                    <p className="text-accent-primary text-sm mt-2 font-medium">
                      Click to select files →
                    </p>
                  </div>
                </div>
              </button>
              
              {/* Staged files list */}
              {stagedFilesList.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-text-secondary font-medium">
                    {stagedFilesList.length} file{stagedFilesList.length > 1 ? 's' : ''} ready to upload:
                  </p>
                  <div className="space-y-2">
                    {stagedFilesList.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between bg-white rounded-[var(--radius-sm)] p-3 border border-border-subtle"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {getFileIcon(file)}
                          <div className="min-w-0">
                            <p className="text-sm text-text-primary truncate">{file.name}</p>
                            <p className="text-xs text-text-tertiary">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFile(index);
                          }}
                          className="p-1 hover:bg-red-50 rounded transition-colors"
                          aria-label={`Remove ${file.name}`}
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Current Situation */}
          {currentStep === 3 && (
            <div className="space-y-8">
              <div>
                <h3 className="text-text-primary mb-3">Your current situation</h3>
                <p className="text-text-secondary">
                  Help us understand where you're starting from. Only relevant info, no medical jargon.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-text-primary font-semibold mb-4">
                    What's your timeline?
                  </label>
                  <div className="grid md:grid-cols-3 gap-3">
                    {['Within 1 month', '1-3 months', '3-6 months', '6+ months', 'Just exploring'].map((option) => (
                      <button
                        key={option}
                        onClick={() => setFormData({ ...formData, timeline: option })}
                        className={`p-4 rounded-[var(--radius-md)] border-2 transition-all font-medium ${
                          formData.timeline === option
                            ? 'border-accent-primary bg-accent-soft text-accent-primary'
                            : 'border-border-subtle bg-white text-text-primary hover:border-accent-primary'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-text-primary font-semibold mb-4">
                    Have you had dental treatment before?
                  </label>
                  <div className="grid md:grid-cols-3 gap-3">
                    {['Yes', 'No', 'Not sure'].map((option) => (
                      <button
                        key={option}
                        onClick={() => setFormData({ ...formData, previousTreatment: option })}
                        className={`p-4 rounded-[var(--radius-md)] border-2 transition-all font-medium ${
                          formData.previousTreatment === option
                            ? 'border-accent-primary bg-accent-soft text-accent-primary'
                            : 'border-border-subtle bg-white text-text-primary hover:border-accent-primary'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-text-primary font-semibold mb-3">
                    Any concerns or medical conditions we should know about?
                  </label>
                  <textarea
                    value={formData.concerns}
                    onChange={(e) => setFormData({ ...formData, concerns: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 bg-white border border-border-subtle rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent transition-all"
                    placeholder="Optional: allergies, anxiety about dental work, etc."
                  />
                  <p className="text-sm text-text-tertiary mt-2">
                    This helps us provide better care. You can leave this blank if you prefer.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Contact & Preferences */}
          {currentStep === 4 && (
            <div className="space-y-8">
              <div>
                <h3 className="text-text-primary mb-3">Contact & preferences</h3>
                <p className="text-text-secondary">
                  How should we reach you? No spam—your details are safe.
                </p>
              </div>

              <div className="space-y-5">
                <Input
                  label="Name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Your full name"
                />

                <Input
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your@email.com"
                />

                <Input
                  label="WhatsApp (Optional)"
                  type="tel"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  placeholder="+1 (234) 567-890"
                  helperText="Many patients prefer WhatsApp for quick questions"
                />

                {/* Honeypot field (hidden) */}
                <div style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }}>
                  <label htmlFor={getHoneypotFieldName()}>Leave this field empty</label>
                  <input
                    type="text"
                    id={getHoneypotFieldName()}
                    name={getHoneypotFieldName()}
                    value={formData[getHoneypotFieldName() as keyof typeof formData] as string}
                    onChange={(e) => setFormData({ ...formData, [getHoneypotFieldName()]: e.target.value })}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>

                {errorMessage && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">{errorMessage}</p>
                  </div>
                )}

                <div>
                  <label className="block text-text-secondary text-xs font-medium uppercase tracking-wide mb-2">
                    Preferred Contact Language
                  </label>
                  <select
                    value={formData.preferredLanguage}
                    onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-border-subtle rounded-[var(--radius-sm)] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent transition-all"
                  >
                    <option>English</option>
                    <option>German</option>
                    <option>French</option>
                    <option>Spanish</option>
                    <option>Italian</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Review & Confirm */}
          {currentStep === 5 && (
            <div className="space-y-8">
              <div>
                <h3 className="text-text-primary mb-3">Review & confirm</h3>
                <p className="text-text-secondary">
                  Double-check your information. You can edit any step before submitting.
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-5 bg-bg-secondary rounded-[var(--radius-md)] border border-border-subtle">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-text-tertiary font-medium uppercase tracking-wide">Treatment Interest</span>
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="text-sm text-accent-primary hover:text-accent-hover font-medium"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="text-text-primary font-semibold">{formData.treatment}</div>
                </div>

                <div className="p-5 bg-bg-secondary rounded-[var(--radius-md)] border border-border-subtle">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-text-tertiary font-medium uppercase tracking-wide">Your Goals</span>
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="text-sm text-accent-primary hover:text-accent-hover font-medium"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="text-text-primary">{formData.goals}</div>
                </div>

                <div className="p-5 bg-bg-secondary rounded-[var(--radius-md)] border border-border-subtle">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-text-tertiary font-medium uppercase tracking-wide">Contact Information</span>
                    <button
                      onClick={() => setCurrentStep(4)}
                      className="text-sm text-accent-primary hover:text-accent-hover font-medium"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="text-text-primary">
                    {formData.name} • {formData.email}
                  </div>
                </div>
              </div>

              <div className="p-5 border border-border-subtle rounded-[var(--radius-md)]">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="mt-1 accent-accent-primary" required />
                  <span className="text-sm text-text-secondary">
                    I consent to GuideHealth contacting me regarding my consultation. I understand my data is private and I can withdraw consent at any time.
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          {currentStep > 1 && (
            <Button
              variant="secondary"
              size="lg"
              onClick={handleBack}
              className="w-full sm:w-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          )}
          
          <div className="flex-1" />
          
          {currentStep < 5 ? (
            <Button
              variant="primary"
              size="lg"
              onClick={handleNext}
              disabled={!canProceed()}
              className="w-full sm:w-auto min-w-[200px]"
            >
              Continue
              <ChevronRight className="w-5 h-5" />
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              onClick={handleSubmit}
              className="w-full sm:w-auto min-w-[200px]"
            >
              <CheckCircle className="w-5 h-5" />
              See My Plan
            </Button>
          )}
        </div>

        {/* Trust Line */}
        <div className="flex flex-wrap justify-center gap-4 mt-12">
          <TrustBadge icon={<Lock className="w-3.5 h-3.5" />} text="2 minutes" variant="default" />
          <TrustBadge icon={<Shield className="w-3.5 h-3.5" />} text="Bank-level encryption" variant="accent" />
          <TrustBadge icon={<CheckCircle className="w-3.5 h-3.5" />} text="No obligation" variant="default" />
        </div>
      </div>

      <Footer />
    </div>
  );
}
