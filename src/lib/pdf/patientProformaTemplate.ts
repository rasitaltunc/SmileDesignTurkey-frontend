/**
 * Patient Proforma Template - Beautiful client-facing PDF
 * Gradient teal branding, modern card design, WOW factor!
 */

export interface PatientProformaData {
    // Patient Info
    patientName: string;
    patientAge?: number;
    patientEmail?: string;
    patientPhone?: string;
    caseCode: string;
    date: string;

    // Brief Data
    chiefComplaint: string;
    goals?: string;
    keyPoints: string[];

    // Treatment Plan
    treatments: {
        name: string;
        description?: string;
        phase?: string;
        price?: number;
    }[];

    // Pricing
    subtotal: number;
    discount?: number;
    discountPercent?: number;
    total: number;
    currency?: string;

    // Care
    careInstructions?: string[];
    nextSteps?: string[];

    // Doctor
    doctorName: string;
    doctorSpecialization?: string;
    signatureUrl?: string;
    clinicName?: string;
    clinicLogo?: string;
}

export function generatePatientProformaHTML(data: PatientProformaData): string {
    const currency = data.currency || '€';
    const formattedDate = new Date(data.date).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    const treatmentsHTML = data.treatments.map((t, i) => `
        <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
                <div style="font-weight: 500; color: #111827;">${t.name}</div>
                ${t.description ? `<div style="font-size: 13px; color: #6b7280; margin-top: 2px;">${t.description}</div>` : ''}
            </td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: center;">
                <span style="background: #f0fdf4; color: #15803d; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500;">
                    ${t.phase || `Phase ${i + 1}`}
                </span>
            </td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: #111827;">
                ${t.price ? `${currency}${t.price.toLocaleString()}` : '-'}
            </td>
        </tr>
    `).join('');

    const keyPointsHTML = data.keyPoints.map(p => `
        <li style="margin-bottom: 8px; display: flex; align-items: flex-start; gap: 8px;">
            <span style="color: #0d9488; font-size: 18px; line-height: 1;">✓</span>
            <span style="color: #374151;">${p}</span>
        </li>
    `).join('');

    const careInstructionsHTML = (data.careInstructions || [
        'Follow all pre-operative instructions provided',
        'Arrange for someone to accompany you on treatment days',
        'Bring all relevant medical records and prescriptions',
        'Stay hydrated and maintain good oral hygiene'
    ]).map(c => `
        <div style="padding: 12px 16px; background: #fefce8; border-left: 4px solid #eab308; margin-bottom: 8px; border-radius: 0 8px 8px 0;">
            <span style="color: #854d0e;">${c}</span>
        </div>
    `).join('');

    const nextStepsHTML = (data.nextSteps || [
        'Review this treatment plan carefully',
        'Contact us with any questions',
        'Confirm your appointment dates',
        'Complete required pre-treatment tests'
    ]).map((s, i) => `
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
            <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #14b8a6, #0d9488); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px;">
                ${i + 1}
            </div>
            <span style="color: #374151;">${s}</span>
        </div>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #374151; line-height: 1.6; }
        .page { max-width: 800px; margin: 0 auto; }
    </style>
</head>
<body>
    <div class="page">
        <!-- Header with Gradient -->
        <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 50%, #0f766e 100%); color: white; padding: 40px; border-radius: 0 0 24px 24px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <h1 style="font-size: 28px; font-weight: 700; margin-bottom: 8px;">
                        ${data.clinicName || 'SmileDesign Turkey'}
                    </h1>
                    <p style="opacity: 0.9; font-size: 14px;">Your Journey to a Perfect Smile</p>
                </div>
                <div style="text-align: right; font-size: 13px; opacity: 0.9;">
                    <div style="font-weight: 600; font-size: 16px;">Treatment Proforma</div>
                    <div style="margin-top: 4px;">${formattedDate}</div>
                    <div style="margin-top: 2px; font-family: monospace; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 4px; margin-top: 8px;">
                        ${data.caseCode}
                    </div>
                </div>
            </div>
        </div>

        <!-- Patient Info Card -->
        <div style="margin: -20px 24px 0 24px; background: white; border-radius: 16px; padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e5e7eb;">
            <div style="display: flex; gap: 24px; align-items: center;">
                <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #e0f2fe, #f0fdf4); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px;">
                    👤
                </div>
                <div style="flex: 1;">
                    <h2 style="font-size: 22px; color: #111827; margin-bottom: 4px;">${data.patientName}</h2>
                    <div style="color: #6b7280; font-size: 14px;">
                        ${data.patientAge ? `${data.patientAge} years old` : ''}
                        ${data.patientEmail ? ` • ${data.patientEmail}` : ''}
                        ${data.patientPhone ? ` • ${data.patientPhone}` : ''}
                    </div>
                </div>
            </div>
        </div>

        <!-- Content -->
        <div style="padding: 24px;">
            
            <!-- Goals Section -->
            <div style="margin-bottom: 32px;">
                <h3 style="font-size: 16px; color: #0d9488; font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 20px;">📋</span> Your Smile Goals
                </h3>
                <div style="background: linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 100%); border-left: 4px solid #14b8a6; padding: 20px 24px; border-radius: 0 12px 12px 0;">
                    <div style="font-size: 18px; color: #0f766e; font-style: italic;">
                        "${data.chiefComplaint}"
                    </div>
                    ${data.goals ? `<div style="margin-top: 12px; color: #374151;">${data.goals}</div>` : ''}
                </div>
            </div>

            <!-- Key Points -->
            <div style="margin-bottom: 32px;">
                <h3 style="font-size: 16px; color: #0d9488; font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 20px;">✨</span> Treatment Highlights
                </h3>
                <ul style="list-style: none; padding: 0;">
                    ${keyPointsHTML}
                </ul>
            </div>

            <!-- Treatment Plan Table -->
            <div style="margin-bottom: 32px;">
                <h3 style="font-size: 16px; color: #0d9488; font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 20px;">🦷</span> Treatment Plan
                </h3>
                <div style="background: white; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f9fafb;">
                                <th style="padding: 14px 16px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Treatment</th>
                                <th style="padding: 14px 16px; text-align: center; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Phase</th>
                                <th style="padding: 14px 16px; text-align: right; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Investment</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${treatmentsHTML}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Investment Summary -->
            <div style="margin-bottom: 32px;">
                <h3 style="font-size: 16px; color: #0d9488; font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 20px;">💎</span> Investment Summary
                </h3>
                <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                        <span style="color: #64748b;">Subtotal</span>
                        <span style="color: #374151; font-weight: 500;">${currency}${data.subtotal.toLocaleString()}</span>
                    </div>
                    ${data.discount ? `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                        <span style="color: #059669;">Package Discount ${data.discountPercent ? `(${data.discountPercent}%)` : ''}</span>
                        <span style="color: #059669; font-weight: 500;">-${currency}${data.discount.toLocaleString()}</span>
                    </div>
                    ` : ''}
                    <div style="border-top: 2px solid #e2e8f0; padding-top: 12px; margin-top: 12px; display: flex; justify-content: space-between;">
                        <span style="font-size: 18px; font-weight: 600; color: #111827;">Total Investment</span>
                        <span style="font-size: 24px; font-weight: 700; color: #0d9488;">${currency}${data.total.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            <!-- Care Instructions -->
            <div style="margin-bottom: 32px;">
                <h3 style="font-size: 16px; color: #0d9488; font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 20px;">✋</span> Important: Care & Expectations
                </h3>
                ${careInstructionsHTML}
            </div>

            <!-- Next Steps -->
            <div style="margin-bottom: 32px;">
                <h3 style="font-size: 16px; color: #0d9488; font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 20px;">📅</span> Next Steps
                </h3>
                ${nextStepsHTML}
            </div>

            <!-- Signature Area -->
            <div style="margin-top: 48px; padding-top: 32px; border-top: 1px solid #e5e7eb;">
                <div style="display: flex; justify-content: space-between; gap: 48px;">
                    <div style="flex: 1;">
                        <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Patient Signature</div>
                        <div style="border-bottom: 2px solid #374151; height: 60px; margin-bottom: 8px;"></div>
                        <div style="font-size: 14px; color: #374151;">${data.patientName}</div>
                        <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Date: _______________</div>
                    </div>
                    <div style="flex: 1;">
                        <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Doctor Signature</div>
                        ${data.signatureUrl ? `
                            <img src="${data.signatureUrl}" style="max-height: 60px; max-width: 200px; object-fit: contain;" />
                        ` : `
                            <div style="border-bottom: 2px solid #374151; height: 60px; margin-bottom: 8px;"></div>
                        `}
                        <div style="font-size: 14px; color: #374151;">${data.doctorName}</div>
                        ${data.doctorSpecialization ? `<div style="font-size: 12px; color: #6b7280;">${data.doctorSpecialization}</div>` : ''}
                    </div>
                </div>
            </div>

        </div>

        <!-- Footer -->
        <div style="background: #f3f4f6; padding: 20px 24px; margin-top: 32px; text-align: center; border-radius: 16px 16px 0 0;">
            <div style="font-weight: 600; color: #111827; margin-bottom: 4px;">${data.clinicName || 'SmileDesign Turkey'}</div>
            <div style="font-size: 12px; color: #6b7280;">
                Your Smile Journey Partner • www.smiledesignturkey.com
            </div>
            <div style="font-size: 11px; color: #9ca3af; margin-top: 8px;">
                This document is for informational purposes. Final treatment plan may vary based on clinical evaluation.
            </div>
        </div>
    </div>
</body>
</html>
`;
}
