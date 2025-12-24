import { Link } from '../components/Link';
import { Upload, File, CheckCircle, XCircle, Shield, Lock, HelpCircle, MessageCircle, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import Footer from '../components/Footer';
import { BRAND } from '../config';
import { getWhatsAppUrl } from '../lib/whatsapp';
import { trackEvent } from '../lib/analytics';

interface UploadedFile {
  id: string;
  name: string;
  size: string;
  status: 'uploading' | 'complete' | 'error';
  progress?: number;
}

export default function UploadCenter() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (files: FileList) => {
    const newFiles: UploadedFile[] = Array.from(files).map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      status: 'uploading',
      progress: 0
    }));

    setUploadedFiles([...uploadedFiles, ...newFiles]);

    // Simulate upload progress
    newFiles.forEach((file) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        if (progress >= 100) {
          clearInterval(interval);
          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.id === file.id ? { ...f, status: 'complete', progress: 100 } : f
            )
          );
        } else {
          setUploadedFiles((prev) =>
            prev.map((f) => (f.id === file.id ? { ...f, progress } : f))
          );
        }
      }, 200);
    });
  };

  const removeFile = (id: string) => {
    setUploadedFiles(uploadedFiles.filter((f) => f.id !== id));
  };

  const faqs = [
    {
      question: 'What types of files can I upload?',
      answer: 'You can upload images (JPG, PNG), documents (PDF), and X-rays. Maximum file size is 10MB per file.'
    },
    {
      question: 'Is my data secure?',
      answer: 'Yes. All files are encrypted during transmission and storage. Only your assigned care coordinator and reviewing specialist can access your files.'
    },
    {
      question: 'What if I have trouble uploading?',
      answer: 'You can skip this step and send files later via WhatsApp or email. Contact us if you need technical assistance.'
    }
  ];

  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <section className="bg-gradient-to-br from-teal-50 to-white py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Upload className="w-8 h-8 text-teal-600" />
          </div>
          <h1 className="text-gray-900 mb-4">Upload Center</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Share documents or photos securely. Your data is private and encrypted.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Upload Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
            isDragging
              ? 'border-teal-500 bg-teal-50'
              : 'border-gray-300 bg-gray-50'
          }`}
        >
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-gray-900 mb-2">Drag and drop your files here</h3>
          <p className="text-gray-600 text-sm mb-6">
            or click the button below to browse
          </p>
          <label className="inline-block">
            <input
              type="file"
              multiple
              accept="image/*,.pdf"
              onChange={handleFileInput}
              className="hidden"
            />
            <span className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors cursor-pointer">
              <File className="w-4 h-4" />
              Browse Files
            </span>
          </label>
          <p className="text-xs text-gray-500 mt-4">
            Accepted: JPG, PNG, PDF • Max size: 10MB per file
          </p>
        </div>

        {/* Uploaded Files List */}
        {uploadedFiles.length > 0 && (
          <div className="mt-8">
            <h3 className="text-gray-900 mb-4">Uploaded Files</h3>
            <div className="space-y-3">
              {uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <File className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-900 text-sm">{file.name}</span>
                      <span className="text-gray-500 text-xs">{file.size}</span>
                    </div>
                    {file.status === 'uploading' && (
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-teal-600 h-1.5 rounded-full transition-all"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                  {file.status === 'complete' && (
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  )}
                  {file.status === 'error' && (
                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  )}
                  <button
                    onClick={() => removeFile(file.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Steps */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <div className="p-6 bg-teal-50 rounded-xl border border-teal-200 text-center">
            <div className="w-10 h-10 bg-teal-600 text-white rounded-full flex items-center justify-center mx-auto mb-3">
              1
            </div>
            <h3 className="text-gray-900 mb-2">Choose Files</h3>
            <p className="text-gray-600 text-sm">
              Upload photos, X-rays, or documents
            </p>
          </div>

          <div className="p-6 bg-white rounded-xl border border-gray-200 text-center">
            <div className="w-10 h-10 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center mx-auto mb-3">
              2
            </div>
            <h3 className="text-gray-900 mb-2">Confirm Privacy</h3>
            <p className="text-gray-600 text-sm">
              We never share your files
            </p>
          </div>

          <div className="p-6 bg-white rounded-xl border border-gray-200 text-center">
            <div className="w-10 h-10 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center mx-auto mb-3">
              3
            </div>
            <h3 className="text-gray-900 mb-2">Continue</h3>
            <p className="text-gray-600 text-sm">
              You can skip this step if needed
            </p>
          </div>
        </div>

        {/* Privacy Banner */}
        <div className="mt-8 p-6 bg-gradient-to-r from-teal-600 to-teal-500 rounded-xl text-white">
          <div className="flex items-start gap-4">
            <Shield className="w-8 h-8 flex-shrink-0" />
            <div>
              <h3 className="mb-2">Your Privacy is Protected</h3>
              <p className="text-teal-100 text-sm">
                All uploads are encrypted end-to-end. Only your assigned care coordinator and reviewing specialist can access your files. You can request deletion at any time.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-12">
          <h3 className="text-gray-900 mb-4">Common Questions</h3>
          <div className="space-y-2">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
                  className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <span className="text-gray-900">{faq.question}</span>
                  <ChevronRight
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      openFAQ === index ? 'rotate-90' : ''
                    }`}
                  />
                </button>
                {openFAQ === index && (
                  <div className="px-4 pb-4 text-gray-600 text-sm">{faq.answer}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial */}
        <div className="mt-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex gap-1 mb-3">
            {[...Array(5)].map((_, i) => (
              <span key={i} className="text-yellow-400">★</span>
            ))}
          </div>
          <p className="text-gray-700 italic mb-3">
            "Uploading my X-ray was easy and felt safe. The encrypted system gave me peace of mind."
          </p>
          <p className="text-gray-600 text-sm">— Verified Patient</p>
        </div>

        {/* WhatsApp Alternative */}
        <div className="mt-8 p-6 bg-white rounded-xl border border-gray-200 text-center">
          <HelpCircle className="w-8 h-8 text-gray-400 mx-auto mb-3" />
          <h3 className="text-gray-900 mb-2">Having Trouble?</h3>
          <p className="text-gray-600 text-sm mb-4">
            You can also send files directly via WhatsApp or skip this step entirely.
          </p>
          <button
            onClick={() => {
              trackEvent({ 
                type: 'whatsapp_click', 
                where: 'upload_center',
                lang: BRAND.defaultLang 
              });
              const message = `Hi, I need help with file upload. Language: ${BRAND.defaultLang}.`;
              const url = getWhatsAppUrl({ phoneE164: BRAND.whatsappPhoneE164, text: message });
              if (url) {
                window.open(url, '_blank', 'noopener,noreferrer');
              } else {
                console.warn('[WhatsApp] Invalid phone number, cannot open WhatsApp');
              }
            }}
            className="inline-flex items-center gap-2 px-6 py-2 border border-teal-600 text-teal-600 rounded-lg hover:bg-teal-50 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Ask Us on WhatsApp
          </button>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <Link
            to="/onboarding"
            className="flex-1 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-center"
          >
            Continue
          </Link>
          <Link
            to="/onboarding"
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-center"
          >
            Continue Without Upload
          </Link>
        </div>
        <p className="text-center text-sm text-gray-500 mt-4">
          You can upload later. This won't affect your plan.
        </p>
      </div>

      <Footer />
    </div>
  );
}