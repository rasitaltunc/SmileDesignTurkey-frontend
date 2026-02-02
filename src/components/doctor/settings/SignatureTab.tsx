import { useState, useRef, useEffect } from 'react';
import { PenTool, Loader2, CheckCircle2, AlertCircle, Upload } from 'lucide-react';
import { toast } from '@/lib/toast';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';

export default function SignatureTab({ settings, onSave }: { settings: any, onSave: (updates: any) => Promise<void> }) {
    const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
    const [stampUrl, setStampUrl] = useState<string | null>(null);
    const [isLoadingSignature, setIsLoadingSignature] = useState(false);
    const [isLoadingStamp, setIsLoadingStamp] = useState(false);

    // Refs for file inputs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const stampInputRef = useRef<HTMLInputElement>(null);

    const { user } = useAuthStore();
    const supabase = getSupabaseClient();

    // Initialize state from settings
    useEffect(() => {
        if (settings) {
            if (settings.signature_url) setSignatureUrl(settings.signature_url);
            if (settings.stamp_url) setStampUrl(settings.stamp_url);
        }
    }, [settings]);

    // Handle Upload
    const handleUpload = async (file: File, type: 'signature' | 'stamp') => {
        if (!user || !supabase) {
            toast.error('Authentication error');
            return;
        }

        // Validate
        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file (PNG, JPG)');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            toast.error('File size must be less than 2MB');
            return;
        }

        const isSignature = type === 'signature';
        const setLoading = isSignature ? setIsLoadingSignature : setIsLoadingStamp;
        const setUrl = isSignature ? setSignatureUrl : setStampUrl;
        const fieldName = isSignature ? 'signature_url' : 'stamp_url';

        setLoading(true);
        try {
            // 1. Upload to Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${type}_${Date.now()}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('doctor-assets')
                .upload(filePath, file, {
                    upsert: true
                });

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data } = supabase.storage
                .from('doctor-assets')
                .getPublicUrl(filePath);

            const publicUrl = data.publicUrl;

            // 3. Update DB via onSave (optimistic UI update handled by parent)
            await onSave({ [fieldName]: publicUrl });

            // Update local state (redundant if parent updates, but good for immediate feedback)
            setUrl(publicUrl);

            toast.success(`${isSignature ? 'Signature' : 'Stamp'} uploaded successfully`);

        } catch (error: any) {
            console.error('Upload failed:', error);
            toast.error(error.message || 'Upload failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Signature Section */}
            <div className="border border-gray-200 rounded-xl p-6 bg-white">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h4 className="text-base font-semibold text-gray-900">Your Signature</h4>
                        <p className="text-sm text-gray-500">Used for official documents</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${signatureUrl ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {signatureUrl ? (
                            <><CheckCircle2 className="w-3 h-3" /> Active</>
                        ) : (
                            <><AlertCircle className="w-3 h-3" /> Not Uploaded</>
                        )}
                    </span>
                </div>

                <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer min-h-[200px] ${isLoadingSignature ? 'bg-gray-50 opacity-50 cursor-not-allowed' : 'bg-gray-50 hover:bg-gray-100 border-gray-300 hover:border-gray-400'
                        }`}
                >
                    {isLoadingSignature ? (
                        <Loader2 className="w-10 h-10 text-teal-600 animate-spin" />
                    ) : signatureUrl ? (
                        <div className="relative group w-full flex justify-center">
                            <img
                                src={signatureUrl}
                                alt="Signature"
                                className="max-h-[160px] object-contain"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                                <span className="bg-white/90 text-gray-700 px-3 py-1 rounded-md text-sm font-medium shadow-sm">
                                    Click to change
                                </span>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="w-12 h-12 bg-white rounded-full border border-gray-200 flex items-center justify-center">
                                <PenTool className="w-6 h-6 text-gray-400" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium text-gray-600">Click to upload signature</p>
                                <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 2MB</p>
                            </div>
                        </>
                    )}
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/png,image/jpeg,image/jpg"
                        onChange={(e) => {
                            if (e.target.files?.[0]) handleUpload(e.target.files[0], 'signature');
                        }}
                        disabled={isLoadingSignature}
                    />
                </div>
            </div>

            {/* Stamp Section */}
            <div className="border border-gray-200 rounded-xl p-6 bg-white">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h4 className="text-base font-semibold text-gray-900">Clinic Stamp</h4>
                        <p className="text-sm text-gray-500">Official clinic stamp overlay</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${stampUrl ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {stampUrl ? (
                            <><CheckCircle2 className="w-3 h-3" /> Active</>
                        ) : (
                            <><AlertCircle className="w-3 h-3" /> Not Uploaded</>
                        )}
                    </span>
                </div>

                <div
                    onClick={() => stampInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer min-h-[200px] ${isLoadingStamp ? 'bg-gray-50 opacity-50 cursor-not-allowed' : 'bg-gray-50 hover:bg-gray-100 border-gray-300 hover:border-gray-400'
                        }`}
                >
                    {isLoadingStamp ? (
                        <Loader2 className="w-10 h-10 text-teal-600 animate-spin" />
                    ) : stampUrl ? (
                        <div className="relative group w-full flex justify-center">
                            <img
                                src={stampUrl}
                                alt="Stamp"
                                className="max-h-[160px] object-contain"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                                <span className="bg-white/90 text-gray-700 px-3 py-1 rounded-md text-sm font-medium shadow-sm">
                                    Click to change
                                </span>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="w-12 h-12 bg-white rounded-full border border-gray-200 flex items-center justify-center">
                                <span className="text-2xl">🏢</span>
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium text-gray-600">Click to upload stamp</p>
                                <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 2MB</p>
                            </div>
                        </>
                    )}
                    <input
                        type="file"
                        ref={stampInputRef}
                        className="hidden"
                        accept="image/png,image/jpeg,image/jpg"
                        onChange={(e) => {
                            if (e.target.files?.[0]) handleUpload(e.target.files[0], 'stamp');
                        }}
                        disabled={isLoadingStamp}
                    />
                </div>
            </div>
        </div>
    );
}
