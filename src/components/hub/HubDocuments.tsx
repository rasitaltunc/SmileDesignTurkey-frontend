import { useState, useEffect } from 'react';
import { X, FileText, Eye, Image as ImageIcon, Loader2 } from 'lucide-react';
import { getPatientFiles, getPatientFileUrl, type PatientFile } from '@/lib/patientPortal';
import { toast } from 'sonner';

interface HubDocumentsProps {
    isOpen: boolean;
    onClose: () => void;
}

export function HubDocuments({ isOpen, onClose }: HubDocumentsProps) {
    const [files, setFiles] = useState<PatientFile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            loadFiles();
        }
    }, [isOpen]);

    const loadFiles = async () => {
        setLoading(true);
        try {
            const data = await getPatientFiles();
            setFiles(data);
        } catch (error) {
            console.error('Failed to load documents:', error);
            toast.error('Failed to load documents');
        } finally {
            setLoading(false);
        }
    };

    const handleView = async (file: PatientFile) => {
        try {
            // Check if it's a path or full URL (legacy vs new)
            // The getPatientFileUrl handles paths
            const url = await getPatientFileUrl(file.id); // file.id is actually the path in our list function
            window.open(url, '_blank');
        } catch (error) {
            toast.error('Failed to open file');
        }
    };

    const getFileIcon = (mimeType?: string, name?: string) => {
        if (mimeType?.includes('image') || name?.match(/\.(jpg|jpeg|png|webp)$/i)) {
            return <ImageIcon className="w-5 h-5 text-purple-500" />;
        }
        return <FileText className="w-5 h-5 text-blue-500" />;
    };

    const formatSize = (bytes?: number) => {
        if (!bytes) return '';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={`hub-drawer-overlay ${isOpen ? 'hub-drawer-overlay--active' : ''}`}
                onClick={onClose}
            />

            {/* Drawer */}
            <div className={`hub-drawer ${isOpen ? 'hub-drawer--open' : ''}`}>
                {/* Header */}
                <div className="hub-drawer-header">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-500"
                        >
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold" style={{ color: 'var(--hub-text-primary)' }}>
                                Documents
                            </h3>
                            <p className="text-[11px]" style={{ color: 'var(--hub-text-muted)' }}>
                                Treatment plans, X-rays & quotes
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: 'var(--hub-glass-bg)' }}
                    >
                        <X className="w-4 h-4" style={{ color: 'var(--hub-text-muted)' }} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto" style={{ height: 'calc(100% - 70px)' }}>
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-48 gap-3">
                            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                            <p className="text-xs text-gray-500">Loading documents...</p>
                        </div>
                    ) : files.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                                <FileText className="w-8 h-8 text-gray-300" />
                            </div>
                            <p className="text-sm font-medium text-gray-600">No documents yet</p>
                            <p className="text-xs text-gray-400 mt-1">
                                Files shared by your doctor will appear here
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {files.map((file) => (
                                <div
                                    key={file.id}
                                    className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-black/5 cursor-pointer group"
                                    style={{ background: 'var(--hub-glass-bg)', border: '1px solid var(--hub-glass-border)' }}
                                    onClick={() => handleView(file)}
                                >
                                    <div className="w-10 h-10 rounded-lg bg-white/50 flex items-center justify-center flex-shrink-0">
                                        {getFileIcon(file.metadata?.mimetype, file.name)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate" style={{ color: 'var(--hub-text-primary)' }}>
                                            {file.name.replace(/^\d+_/, '')} {/* Remove timestamp prefix */}
                                        </p>
                                        <p className="text-[10px] truncate" style={{ color: 'var(--hub-text-muted)' }}>
                                            {new Date(file.created_at).toLocaleDateString()} · {formatSize(file.metadata?.size)}
                                        </p>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="p-2 hover:bg-black/5 rounded-lg">
                                            <Eye className="w-4 h-4 text-gray-500" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
