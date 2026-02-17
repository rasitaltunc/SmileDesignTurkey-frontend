/**
 * PDFHistoryPanel - View and download patient PDF history
 * Part of: Model B++ - Smile Design Ultimate Ecosystem
 * Purpose: Display archived PDFs for a patient with download/preview
 */

import { useState, useEffect } from 'react';
import {
    FileText,
    Download,
    ExternalLink,
    Clock,
    RefreshCw,
    AlertCircle,
    FileCheck,
    FileLock2,
    Loader2,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { toast } from '@/lib/toast';
import {
    PDFArchiveRecord,
    getPatientPDFHistory,
    refreshPDFSignedUrl,
    downloadPDFFromStorage,
    formatFileSize,
    isUrlExpired,
} from '@/lib/pdf/pdfArchiveService';

// =================================================================
// Types
// =================================================================

interface PDFHistoryPanelProps {
    patientId: string;
    title?: string;
    maxItems?: number;
    showExpanded?: boolean;
    className?: string;
}

// =================================================================
// Component
// =================================================================

export default function PDFHistoryPanel({
    patientId,
    title = 'Document History',
    maxItems = 10,
    showExpanded = false,
    className = '',
}: PDFHistoryPanelProps) {
    const [pdfs, setPdfs] = useState<PDFArchiveRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(showExpanded);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Load PDF history
    useEffect(() => {
        if (patientId) {
            loadPDFHistory();
        }
    }, [patientId]);

    const loadPDFHistory = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const history = await getPatientPDFHistory(patientId);
            setPdfs(history.slice(0, maxItems));
        } catch (err) {
            console.error('Failed to load PDF history:', err);
            setError('Failed to load documents');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = async (pdf: PDFArchiveRecord) => {
        setDownloadingId(pdf.id);
        try {
            // Get fresh signed URL if expired
            let downloadUrl = pdf.signed_url;
            if (!downloadUrl || (pdf.expires_at && isUrlExpired(pdf.expires_at))) {
                downloadUrl = await refreshPDFSignedUrl(pdf.file_path);
            }

            if (downloadUrl) {
                // Open in new tab or trigger download
                window.open(downloadUrl, '_blank');
                toast.success('Opening document...');
            } else {
                // Fallback: download blob
                const blob = await downloadPDFFromStorage(pdf.file_path);
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = pdf.file_name;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    toast.success('Download started');
                } else {
                    throw new Error('Failed to download');
                }
            }
        } catch (err) {
            console.error('Download failed:', err);
            toast.error('Failed to download document');
        } finally {
            setDownloadingId(null);
        }
    };

    const getPDFTypeIcon = (type: string) => {
        switch (type) {
            case 'patient_proforma':
                return <FileCheck className="w-4 h-4 text-teal-500" />;
            case 'doctor_note':
                return <FileLock2 className="w-4 h-4 text-blue-500" />;
            default:
                return <FileText className="w-4 h-4 text-gray-500" />;
        }
    };

    const getPDFTypeBadge = (type: string) => {
        const configs: Record<string, { bg: string; text: string; label: string }> = {
            patient_proforma: { bg: 'bg-teal-100', text: 'text-teal-700', label: 'Proforma' },
            doctor_note: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Doctor Note' },
            treatment_plan: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Treatment' },
            consent_form: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Consent' },
            other: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Document' },
        };
        const config = configs[type] || configs.other;
        return (
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
                {config.label}
            </span>
        );
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Loading state
    if (isLoading) {
        return (
            <div className={`bg-white rounded-lg border p-6 ${className}`}>
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className={`bg-white rounded-lg border p-6 ${className}`}>
                <div className="flex items-center gap-3 text-red-600">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                    <button
                        onClick={loadPDFHistory}
                        className="ml-auto text-sm underline hover:no-underline"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    // Empty state
    if (pdfs.length === 0) {
        return (
            <div className={`bg-white rounded-lg border p-6 ${className}`}>
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gray-400" />
                    {title}
                </h3>
                <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No documents yet</p>
                    <p className="text-sm mt-1">PDFs will appear here after generation</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-white rounded-lg border ${className}`}>
            {/* Header */}
            <div
                className="p-4 border-b flex items-center justify-between cursor-pointer hover:bg-gray-50"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <h3 className="font-bold text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gray-600" />
                    {title}
                    <span className="text-sm font-normal text-gray-500">
                        ({pdfs.length})
                    </span>
                </h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            loadPDFHistory();
                        }}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                </div>
            </div>

            {/* Content */}
            {isExpanded && (
                <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
                    {pdfs.map((pdf) => (
                        <div
                            key={pdf.id}
                            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                        >
                            {/* Icon */}
                            <div className="flex-shrink-0">
                                {getPDFTypeIcon(pdf.pdf_type)}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm text-gray-900 truncate">
                                        {pdf.case_code || pdf.file_name.split('_').slice(1).join(' ').replace('.pdf', '')}
                                    </span>
                                    {getPDFTypeBadge(pdf.pdf_type)}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {formatDate(pdf.created_at)} • {formatTime(pdf.created_at)}
                                    </span>
                                    <span>{formatFileSize(pdf.file_size)}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleDownload(pdf)}
                                    disabled={downloadingId === pdf.id}
                                    className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors disabled:opacity-50"
                                    title="Download"
                                >
                                    {downloadingId === pdf.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Download className="w-4 h-4" />
                                    )}
                                </button>
                                {pdf.signed_url && !isUrlExpired(pdf.expires_at || '') && (
                                    <button
                                        onClick={() => window.open(pdf.signed_url, '_blank')}
                                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Open in new tab"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Footer - Show more */}
            {isExpanded && pdfs.length === maxItems && (
                <div className="p-3 border-t bg-gray-50 text-center">
                    <button className="text-sm text-teal-600 hover:text-teal-700 font-medium">
                        Load more documents...
                    </button>
                </div>
            )}
        </div>
    );
}
