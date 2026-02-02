import { useState, useRef } from 'react';
import { PenTool, Upload, X, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';

// Separate component for reusability between Signature and Stamp
function AssetUploader({
    title,
    description,
    type,
    currentUrl,
    onUpload
}: {
    title: string;
    description: string;
    type: 'signature' | 'stamp';
    currentUrl?: string | null;
    onUpload: (url: string) => Promise<void>;
}) {
    const [isHovering, setIsHovering] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { user } = useAuthStore();

    const handleFile = async (file: File) => {
        if (!user) return;

        // Validate
        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file (PNG, JPG)');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            toast.error('File size must be less than 2MB');
            return;
        }

        setIsUploading(true);
        try {
            const supabase = getSupabaseClient();
            if (!supabase) throw new Error('Supabase client not initialized');

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
            const { data: { publicUrl } } = supabase.storage
                .from('doctor-assets')
                .getPublicUrl(filePath);

            // 3. Callback to update DB
            await onUpload(publicUrl);
            toast.success(`${title} uploaded successfully`);

        } catch (error: any) {
            console.error('Upload failed:', error);
            toast.error(error.message || 'Upload failed');
        } finally {
            setIsUploading(false);
            setIsHovering(false);
        }
    };

    return (
        <div className="border border-gray-200 rounded-xl p-6 bg-white">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h4 className="text-base font-semibold text-gray-900">{title}</h4>
                    <p className="text-sm text-gray-500">{description}</p>
                </div>
                {currentUrl ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle2 className="w-3 h-3" /> Active
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        ❌ Not Uploaded
                    </span>
                )}
            </div>

            <div
                className={`relative border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer min-h-[200px] ${isHovering ? 'border-teal-500 bg-teal-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                    }`}
                onDragOver={(e) => { e.preventDefault(); setIsHovering(true); }}
                onDragLeave={() => setIsHovering(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setIsHovering(false);
                    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
                }}
                onClick={() => fileInputRef.current?.click()}
            >
                {isUploading ? (
                    <Loader2 className="w-10 h-10 text-teal-600 animate-spin" />
                ) : currentUrl ? (
                    <div className="relative group w-full h-full flex items-center justify-center">
                        <img
                            src={currentUrl}
                            alt={title}
                            className="max-h-[160px] max-w-full object-contain"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                            <div className="text-white font-medium flex items-center gap-2">
                                <Upload className="w-5 h-5" /> Change
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="w-12 h-12 bg-white rounded-full border border-gray-200 flex items-center justify-center">
                            {type === 'signature' ? <PenTool className="w-6 h-6 text-gray-400" /> : <span className="text-2xl">🏢</span>}
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium text-gray-600">Click to upload or drag & drop</p>
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
                        if (e.target.files?.[0]) handleFile(e.target.files[0]);
                    }}
                />
            </div>
        </div>
    );
}

export default function SignatureTab({ settings, onSave }: { settings: any, onSave: (updates: any) => Promise<void> }) {
    return (
        <div className="space-y-6">
            <AssetUploader
                title="Your Signature"
                description="Used for official prescriptions and notes"
                type="signature"
                currentUrl={settings.signature_url}
                onUpload={async (url) => await onSave({ signature_url: url })}
            />

            <AssetUploader
                title="Clinic Stamp"
                description="Official clinic stamp overlay"
                type="stamp"
                currentUrl={settings.stamp_url}
                onUpload={async (url) => await onSave({ stamp_url: url })}
            />
        </div>
    );
}
