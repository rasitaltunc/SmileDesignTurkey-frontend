/**
 * PDF Archive Service - Store PDFs in Supabase Storage
 * Part of: Model B++ - Smile Design Ultimate Ecosystem
 * Purpose: Archive generated PDFs for patient history and HIPAA compliance
 */

import { getSupabaseClient } from '../supabaseClient';

// =================================================================
// Types
// =================================================================

export interface PDFArchiveRecord {
    id: string;
    patient_id: string;
    doctor_id: string;
    clinic_id?: string;

    // PDF Metadata
    file_name: string;
    file_path: string;
    file_size: number;
    pdf_type: 'patient_proforma' | 'doctor_note' | 'treatment_plan' | 'other';

    // Context
    case_code?: string;
    treatment_type?: string;

    // URLs
    public_url?: string;
    signed_url?: string;

    // Timestamps
    created_at: string;
    expires_at?: string;
}

export interface UploadPDFOptions {
    patientId: string;
    doctorId: string;
    clinicId?: string;
    caseCode?: string;
    treatmentType?: string;
    expiresIn?: number; // Seconds for signed URL
}

// =================================================================
// Storage Configuration
// =================================================================

const BUCKET_NAME = 'pdfs';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// =================================================================
// Core Functions
// =================================================================

/**
 * Upload a generated PDF to Supabase Storage
 * Returns the file path and URLs
 */
export async function uploadPDFToStorage(
    pdfBlob: Blob,
    pdfType: 'patient_proforma' | 'doctor_note' | 'treatment_plan' | 'other',
    options: UploadPDFOptions
): Promise<PDFArchiveRecord | null> {
    const client = getSupabaseClient();
    if (!client) {
        console.error('[PDF Archive] Supabase not configured');
        return null;
    }

    // Validate file size
    if (pdfBlob.size > MAX_FILE_SIZE) {
        throw new Error(`PDF file too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`);
    }

    // Generate file path: /pdfs/{clinic_id}/{patient_id}/{timestamp}_{type}.pdf
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const clinicFolder = options.clinicId || 'default';
    const fileName = `${timestamp}_${pdfType}.pdf`;
    const filePath = `${clinicFolder}/${options.patientId}/${fileName}`;

    try {
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await client.storage
            .from(BUCKET_NAME)
            .upload(filePath, pdfBlob, {
                contentType: 'application/pdf',
                cacheControl: '3600',
                upsert: false,
            });

        if (uploadError) {
            console.error('[PDF Archive] Upload failed:', uploadError);
            throw uploadError;
        }

        // Get public URL (if bucket is public)
        const { data: publicUrlData } = client.storage
            .from(BUCKET_NAME)
            .getPublicUrl(filePath);

        // Get signed URL for secure access
        const expiresIn = options.expiresIn || 3600; // 1 hour default
        const { data: signedUrlData, error: signedError } = await client.storage
            .from(BUCKET_NAME)
            .createSignedUrl(filePath, expiresIn);

        if (signedError) {
            console.warn('[PDF Archive] Signed URL failed:', signedError);
        }

        // Record in database (if table exists)
        const record: PDFArchiveRecord = {
            id: crypto.randomUUID(),
            patient_id: options.patientId,
            doctor_id: options.doctorId,
            clinic_id: options.clinicId,
            file_name: fileName,
            file_path: uploadData.path,
            file_size: pdfBlob.size,
            pdf_type: pdfType,
            case_code: options.caseCode,
            treatment_type: options.treatmentType,
            public_url: publicUrlData?.publicUrl,
            signed_url: signedUrlData?.signedUrl,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
        };

        // Try to save to database
        await savePDFRecord(record);

        return record;
    } catch (error) {
        console.error('[PDF Archive] Failed to upload PDF:', error);
        throw error;
    }
}

/**
 * Save PDF record to database for history tracking
 */
async function savePDFRecord(record: PDFArchiveRecord): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;

    try {
        await client.from('pdf_archives').insert({
            id: record.id,
            patient_id: record.patient_id,
            doctor_id: record.doctor_id,
            clinic_id: record.clinic_id,
            file_name: record.file_name,
            file_path: record.file_path,
            file_size: record.file_size,
            pdf_type: record.pdf_type,
            case_code: record.case_code,
            treatment_type: record.treatment_type,
            created_at: record.created_at,
        });
    } catch (error) {
        // Table may not exist yet - that's OK, silent fail
        console.debug('[PDF Archive] Database record not saved (table may not exist):', error);
    }
}

/**
 * Get PDF history for a patient
 */
export async function getPatientPDFHistory(patientId: string): Promise<PDFArchiveRecord[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
        const { data, error } = await client
            .from('pdf_archives')
            .select('*')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('[PDF Archive] Failed to get history:', error);
        return [];
    }
}

/**
 * Get a fresh signed URL for a PDF
 */
export async function refreshPDFSignedUrl(
    filePath: string,
    expiresIn: number = 3600
): Promise<string | null> {
    const client = getSupabaseClient();
    if (!client) return null;

    try {
        const { data, error } = await client.storage
            .from(BUCKET_NAME)
            .createSignedUrl(filePath, expiresIn);

        if (error) throw error;
        return data?.signedUrl || null;
    } catch (error) {
        console.error('[PDF Archive] Failed to refresh signed URL:', error);
        return null;
    }
}

/**
 * Download a PDF from storage
 */
export async function downloadPDFFromStorage(filePath: string): Promise<Blob | null> {
    const client = getSupabaseClient();
    if (!client) return null;

    try {
        const { data, error } = await client.storage
            .from(BUCKET_NAME)
            .download(filePath);

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('[PDF Archive] Failed to download PDF:', error);
        return null;
    }
}

/**
 * Delete a PDF from storage
 */
export async function deletePDFFromStorage(filePath: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    try {
        const { error } = await client.storage
            .from(BUCKET_NAME)
            .remove([filePath]);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('[PDF Archive] Failed to delete PDF:', error);
        return false;
    }
}

// =================================================================
// Helper Functions
// =================================================================

/**
 * Convert HTML element to PDF Blob (for archiving)
 * Uses html2pdf.js to generate the PDF
 */
export async function htmlToPDFBlob(html: string, filename: string): Promise<Blob> {
    // Dynamic import for html2pdf.js
    const html2pdfModule = await import('html2pdf.js');
    const html2pdf = html2pdfModule.default;

    const element = document.createElement('div');
    element.innerHTML = html;

    const options = {
        margin: 0,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            letterRendering: true,
            logging: false,
        },
        jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait',
        },
    };

    // Generate PDF as blob instead of saving
    const pdfBlob = await html2pdf()
        .set(options)
        .from(element)
        .outputPdf('blob');

    return pdfBlob;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Check if URL has expired
 */
export function isUrlExpired(expiresAt: string): boolean {
    return new Date(expiresAt) < new Date();
}

// =================================================================
// Export
// =================================================================

export default {
    upload: uploadPDFToStorage,
    getHistory: getPatientPDFHistory,
    refreshUrl: refreshPDFSignedUrl,
    download: downloadPDFFromStorage,
    delete: deletePDFFromStorage,
    htmlToBlob: htmlToPDFBlob,
    formatSize: formatFileSize,
    isExpired: isUrlExpired,
};
