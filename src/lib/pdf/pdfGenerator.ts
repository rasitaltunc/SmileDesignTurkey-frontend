/**
 * PDF Generator - Main functions for generating both PDF types
 * Uses html2pdf.js to convert beautiful HTML templates to PDFs
 */

import { generatePatientProformaHTML, PatientProformaData } from './patientProformaTemplate';
import { generateDoctorNoteHTML, DoctorNoteData } from './doctorNoteTemplate';

// Dynamic import for html2pdf.js (heavy library, load on demand)
async function loadHtml2Pdf() {
    const module = await import('html2pdf.js');
    return module.default;
}

/**
 * Generate Patient Proforma PDF
 * Beautiful, client-facing PDF with treatment plan and pricing
 */
export async function generatePatientProforma(data: PatientProformaData): Promise<void> {
    const html2pdf = await loadHtml2Pdf();
    const html = generatePatientProformaHTML(data);

    const element = document.createElement('div');
    element.innerHTML = html;
    document.body.appendChild(element);

    const options = {
        margin: 0,
        filename: `${data.caseCode}_Patient_Proforma_${data.patientName.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            letterRendering: true,
            logging: false
        },
        jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait'
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
        await html2pdf().set(options).from(element).save();
    } finally {
        document.body.removeChild(element);
    }
}

/**
 * Generate Doctor Internal Note PDF
 * Clinical, confidential PDF with cost analysis and margins
 */
export async function generateDoctorNote(data: DoctorNoteData): Promise<void> {
    const html2pdf = await loadHtml2Pdf();
    const html = generateDoctorNoteHTML(data);

    const element = document.createElement('div');
    element.innerHTML = html;
    document.body.appendChild(element);

    const options = {
        margin: 0,
        filename: `${data.caseCode}_Doctor_Note_CONFIDENTIAL.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            letterRendering: true,
            logging: false
        },
        jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait'
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
        await html2pdf().set(options).from(element).save();
    } finally {
        document.body.removeChild(element);
    }
}

/**
 * Generate both PDFs at once - Patient Proforma + Doctor Note
 * Main function called from the UI
 */
export async function generateBothPDFs(
    patientData: PatientProformaData,
    doctorData: DoctorNoteData
): Promise<void> {
    // Generate patient proforma first
    await generatePatientProforma(patientData);

    // Small delay between downloads to prevent browser issues
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate doctor note
    await generateDoctorNote(doctorData);
}

/**
 * Helper function to create PDF data from lead and brief
 */
export interface LeadData {
    id: string;
    case_code?: string;
    name?: string;
    full_name?: string;
    email?: string;
    phone?: string;
    age?: number;
    original_message?: string;
}

export interface BriefData {
    patient_name: string;
    age?: number;
    contact?: string;
    chief_complaint: string;
    key_points: string[];
    next_action?: string;
    confidence_score?: number;
}

export interface DoctorSettings {
    signature_url?: string;
    clinic_name?: string;
    full_name?: string;
    specialization?: string;
}

/**
 * Transform raw data into PDF-ready format
 */
export function preparePDFData(
    lead: LeadData,
    brief: BriefData,
    settings?: DoctorSettings
): { patientData: PatientProformaData; doctorData: DoctorNoteData } {
    const now = new Date().toISOString();
    const caseCode = lead.case_code || `CASE-${lead.id?.substring(0, 8) || 'UNKNOWN'}`;
    const patientName = brief.patient_name || lead.full_name || lead.name || 'Patient';

    // Sample treatments - in real app, this would come from database
    const treatments = [
        {
            name: 'Initial Consultation & Examination',
            description: 'Complete dental assessment and treatment planning',
            phase: 'Phase 1',
            price: 150,
            specification: 'Full oral examination + X-rays',
            cost: 50,
            margin: 100,
            duration: '1 hour'
        },
        {
            name: 'Dental Implant Placement',
            description: 'Premium titanium dental implants',
            phase: 'Phase 2',
            price: 2500,
            specification: 'Straumann BLX Implant System',
            cost: 800,
            margin: 1700,
            duration: '2 hours'
        },
        {
            name: 'Ceramic Crown',
            description: 'Full zirconia crown with natural aesthetics',
            phase: 'Phase 3',
            price: 850,
            specification: 'E.max / Zirconia',
            cost: 250,
            margin: 600,
            duration: '1.5 hours'
        }
    ];

    const subtotal = treatments.reduce((sum, t) => sum + (t.price || 0), 0);
    const discountPercent = 15;
    const discount = Math.round(subtotal * (discountPercent / 100));
    const total = subtotal - discount;

    const totalCost = treatments.reduce((sum, t) => sum + (t.cost || 0), 0);
    const totalMargin = total - totalCost;
    const marginPercent = Math.round((totalMargin / total) * 100);

    const patientData: PatientProformaData = {
        patientName,
        patientAge: brief.age || lead.age,
        patientEmail: lead.email,
        patientPhone: lead.phone,
        caseCode,
        date: now,
        chiefComplaint: brief.chief_complaint || 'Dental consultation requested',
        goals: lead.original_message?.substring(0, 200),
        keyPoints: brief.key_points || [],
        treatments: treatments.map(t => ({
            name: t.name,
            description: t.description,
            phase: t.phase,
            price: t.price
        })),
        subtotal,
        discount,
        discountPercent,
        total,
        currency: '€',
        doctorName: settings?.full_name || 'Dr. SmileDesign',
        doctorSpecialization: settings?.specialization || 'Dental Surgeon',
        signatureUrl: settings?.signature_url,
        clinicName: settings?.clinic_name || 'SmileDesign Turkey'
    };

    const doctorData: DoctorNoteData = {
        patientName,
        patientAge: brief.age || lead.age,
        patientEmail: lead.email,
        patientPhone: lead.phone,
        caseCode,
        date: now,
        chiefComplaint: brief.chief_complaint || 'Dental consultation requested',
        keyPoints: brief.key_points || [],
        confidenceScore: brief.confidence_score,
        nextAction: brief.next_action,
        treatments: treatments.map(t => ({
            name: t.name,
            specification: t.specification,
            cost: t.cost,
            margin: t.margin,
            duration: t.duration
        })),
        totalCost,
        totalMargin,
        marginPercent,
        patientPrice: total,
        riskFactors: [], // Would come from medical history analysis
        appointments: [
            { type: 'Initial Consultation', duration: '1 hour', notes: 'Assessment & Planning' },
            { type: 'Treatment Day 1', duration: '3 hours', notes: 'Implant Placement' },
            { type: 'Follow-up', duration: '30 min', notes: 'Healing check' },
            { type: 'Crown Fitting', duration: '2 hours', notes: 'Final restoration' }
        ],
        doctorName: settings?.full_name || 'Dr. SmileDesign',
        signatureUrl: settings?.signature_url
    };

    return { patientData, doctorData };
}
