import { useState, useRef, useEffect } from 'react';
import { PenTool, Loader2, CheckCircle2, AlertCircle, Upload, Trash2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';

export default function SignatureTab({ settings = {}, onSave }: { settings?: any, onSave?: (updates: any) => Promise<void> } = {}) {
    console.log('SignatureTab MOUNTED', { settings, onSave, signatureUrl: settings?.signature_url }); // DEBUG LOG
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
            const resolveUrl = (path: string | null | undefined) => {
                if (!path) return null;
                if (path.startsWith('http')) return path; // Already a URL
                const { data } = supabase.storage.from('doctor-assets').getPublicUrl(path);
                return data.publicUrl;
            };

            // check for storage_path first (new), then url (legacy/fallback)
            const sigPath = settings.signature_storage_path || settings.signature_url;
            if (sigPath) setSignatureUrl(resolveUrl(sigPath));

            const stampPath = settings.stamp_storage_path || settings.stamp_url;
            if (stampPath) setStampUrl(resolveUrl(stampPath));
        }
    }, [settings, supabase]);

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
        const fieldName = isSignature ? 'signature_storage_path' : 'stamp_storage_path'; // CHANGED: Use storage_path column

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

            // 2. Get Public URL (for local display only)
            const { data } = supabase.storage
                .from('doctor-assets')
                .getPublicUrl(filePath);

            const publicUrl = data.publicUrl;

            // 3. Update DB via onSave (save the PATH, not the URL)
            if (onSave) {
                await onSave({ [fieldName]: filePath });
            } else {
                console.log('onSave not provided, skipping DB update');
            }

            // Update local state for immediate feedback
            setUrl(publicUrl);

            toast.success(`${isSignature ? 'Signature' : 'Stamp'} uploaded successfully`);

        } catch (error: any) {
            console.error('Upload failed:', error);
            toast.error(error.message || 'Upload failed');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (type: 'signature' | 'stamp') => {
        // 1. Ask confirmation
        const confirmDelete = window.confirm(
            `Are you sure you want to delete this ${type}? You can upload a new one after.`
        );

        if (!confirmDelete) return;

        const isSignature = type === 'signature';
        const setUrl = isSignature ? setSignatureUrl : setStampUrl;
        const setLoading = isSignature ? setIsLoadingSignature : setIsLoadingStamp;
        const fieldName = isSignature ? 'signature_storage_path' : 'stamp_storage_path';

        setLoading(true);
        try {
            // 2. Get current path from settings
            const currentPath = isSignature
                ? settings?.signature_storage_path
                : settings?.stamp_storage_path;

            // 3. Delete from storage (optional but clean)
            if (currentPath && supabase) {
                try {
                    await supabase.storage
                        .from('doctor-assets')
                        .remove([currentPath]);
                } catch (storageErr) {
                    console.warn('Storage delete failed (non-blocking):', storageErr);
                }
            }

            // 4. Clear from database
            if (onSave) {
                await onSave({ [fieldName]: null });
            }

            // 5. Clear local state
            setUrl(null);
            toast.success(`${type} deleted successfully`);
        } catch (err: any) {
            console.error('Delete failed:', err);
            toast.error(err.message || 'Failed to delete');
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
                        <div className="relative w-full flex justify-center">
                            <img
                                src={signatureUrl}
                                alt="Signature"
                                className="max-h-[160px] object-contain"
                            />
                            {/* Delete button - always visible in corner */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete('signature');
                                }}
                                disabled={isLoadingSignature}
                                className="absolute top-0 right-0 flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded-md text-xs font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                title="Delete this signature"
                            >
                                <Trash2 className="w-3 h-3" />
                                Delete
                            </button>
                            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-gray-800/70 text-white px-2 py-0.5 rounded text-xs">
                                Click to change
                            </span>
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
                        <div className="relative w-full flex justify-center">
                            <img
                                src={stampUrl}
                                alt="Stamp"
                                className="max-h-[160px] object-contain"
                            />
                            {/* Delete button - always visible in corner */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete('stamp');
                                }}
                                disabled={isLoadingStamp}
                                className="absolute top-0 right-0 flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded-md text-xs font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                title="Delete this stamp"
                            >
                                <Trash2 className="w-3 h-3" />
                                Delete
                            </button>
                            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-gray-800/70 text-white px-2 py-0.5 rounded text-xs">
                                Click to change
                            </span>
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
