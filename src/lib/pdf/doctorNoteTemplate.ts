/**
 * Doctor Internal Note Template - Clinical, confidential
 * Blue clinical styling, CONFIDENTIAL header, margin analysis
 */

export interface DoctorNoteData {
    // Patient Info
    patientName: string;
    patientAge?: number;
    patientEmail?: string;
    patientPhone?: string;
    caseCode: string;
    date: string;
    createdAt?: string;

    // Brief Data
    chiefComplaint: string;
    keyPoints: string[];
    confidenceScore?: number;
    nextAction?: string;

    // Clinical
    medicalHistory?: string;
    allergies?: string;
    currentMedications?: string;
    clinicalNotes?: string;

    // Treatment
    treatments: {
        name: string;
        specification?: string;
        cost?: number;
        margin?: number;
        duration?: string;
    }[];

    // Costing
    totalCost: number;
    totalMargin?: number;
    marginPercent?: number;
    patientPrice: number;

    // Risks
    riskFactors?: string[];
    contraindications?: string[];

    // Schedule
    appointments?: {
        date?: string;
        type: string;
        duration?: string;
        notes?: string;
    }[];

    // Doctor
    doctorName: string;
    doctorNotes?: string;
    signatureUrl?: string;
    internalRemarks?: string;
}

export function generateDoctorNoteHTML(data: DoctorNoteData): string {
    const formattedDate = new Date(data.date).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const keyPointsHTML = data.keyPoints.map(p => `
        <li style="margin-bottom: 6px; padding-left: 8px; border-left: 2px solid #3b82f6;">${p}</li>
    `).join('');

    const treatmentsHTML = data.treatments.map(t => `
        <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 500;">${t.name}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px;">${t.specification || '-'}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">€${(t.cost || 0).toLocaleString()}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #059669;">€${(t.margin || 0).toLocaleString()}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #6b7280;">${t.duration || '-'}</td>
        </tr>
    `).join('');

    const riskFactorsHTML = (data.riskFactors || []).map(r => `
        <li style="margin-bottom: 4px; color: #b91c1c;">⚠️ ${r}</li>
    `).join('');

    const appointmentsHTML = (data.appointments || []).map(a => `
        <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${a.date || 'TBD'}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 500;">${a.type}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${a.duration || '-'}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px;">${a.notes || '-'}</td>
        </tr>
    `).join('');

    const confidenceColor = (data.confidenceScore || 0) >= 0.8 ? '#059669' :
        (data.confidenceScore || 0) >= 0.6 ? '#d97706' : '#dc2626';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Courier New', Courier, monospace; color: #374151; line-height: 1.5; font-size: 13px; }
        .page { max-width: 800px; margin: 0 auto; background: white; }
    </style>
</head>
<body>
    <div class="page">
        <!-- CONFIDENTIAL Header -->
        <div style="background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%); color: white; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <div style="font-size: 18px; font-weight: bold; font-family: 'Segoe UI', sans-serif;">INTERNAL MEDICAL NOTE</div>
                <div style="font-size: 12px; opacity: 0.8;">SmileDesign Turkey - Doctor Portal</div>
            </div>
            <div style="background: #dc2626; color: white; padding: 8px 16px; font-weight: bold; font-size: 11px; letter-spacing: 2px; border-radius: 4px;">
                🔒 CONFIDENTIAL
            </div>
        </div>

        <!-- Document Info Bar -->
        <div style="background: #f1f5f9; padding: 12px 24px; display: flex; justify-content: space-between; border-bottom: 2px solid #1e40af; font-size: 12px;">
            <div><strong>Case:</strong> ${data.caseCode}</div>
            <div><strong>Generated:</strong> ${formattedDate}</div>
            <div><strong>Doctor:</strong> ${data.doctorName}</div>
        </div>

        <div style="padding: 24px;">

            <!-- Patient Assessment Grid -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <div style="font-size: 14px; font-weight: bold; color: #1e40af; margin-bottom: 16px; font-family: 'Segoe UI', sans-serif; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
                    📋 PATIENT ASSESSMENT
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div>
                        <div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Patient Name</div>
                        <div style="font-weight: bold; font-size: 15px; color: #111827;">${data.patientName}</div>
                    </div>
                    <div>
                        <div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Age</div>
                        <div style="font-weight: bold; font-size: 15px; color: #111827;">${data.patientAge || 'N/A'} years</div>
                    </div>
                    <div>
                        <div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Contact</div>
                        <div style="color: #374151;">${data.patientEmail || ''} ${data.patientPhone ? `| ${data.patientPhone}` : ''}</div>
                    </div>
                    <div>
                        <div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">AI Confidence</div>
                        <div style="color: ${confidenceColor}; font-weight: bold;">${Math.round((data.confidenceScore || 0) * 100)}%</div>
                    </div>
                </div>
            </div>

            <!-- Chief Complaint -->
            <div style="margin-bottom: 24px;">
                <div style="font-size: 14px; font-weight: bold; color: #1e40af; margin-bottom: 12px; font-family: 'Segoe UI', sans-serif;">
                    🩺 CHIEF COMPLAINT
                </div>
                <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; font-size: 14px; color: #1e40af;">
                    ${data.chiefComplaint}
                </div>
            </div>

            <!-- Key Clinical Points -->
            <div style="margin-bottom: 24px;">
                <div style="font-size: 14px; font-weight: bold; color: #1e40af; margin-bottom: 12px; font-family: 'Segoe UI', sans-serif;">
                    📌 KEY CLINICAL POINTS
                </div>
                <ul style="list-style: none;">
                    ${keyPointsHTML}
                </ul>
            </div>

            <!-- Medical History (if available) -->
            ${data.medicalHistory || data.allergies || data.currentMedications ? `
            <div style="margin-bottom: 24px; background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px;">
                <div style="font-size: 14px; font-weight: bold; color: #92400e; margin-bottom: 12px;">⚕️ MEDICAL BACKGROUND</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; font-size: 12px;">
                    ${data.medicalHistory ? `<div><strong>History:</strong><br/>${data.medicalHistory}</div>` : ''}
                    ${data.allergies ? `<div><strong>Allergies:</strong><br/><span style="color: #dc2626;">${data.allergies}</span></div>` : ''}
                    ${data.currentMedications ? `<div><strong>Medications:</strong><br/>${data.currentMedications}</div>` : ''}
                </div>
            </div>
            ` : ''}

            <!-- Treatment Specification Table -->
            <div style="margin-bottom: 24px;">
                <div style="font-size: 14px; font-weight: bold; color: #1e40af; margin-bottom: 12px; font-family: 'Segoe UI', sans-serif;">
                    🦷 TREATMENT SPECIFICATIONS
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 12px; border: 1px solid #e5e7eb;">
                    <thead>
                        <tr style="background: #1e40af; color: white;">
                            <th style="padding: 10px 12px; text-align: left;">Treatment</th>
                            <th style="padding: 10px 12px; text-align: left;">Specification</th>
                            <th style="padding: 10px 12px; text-align: right;">Cost</th>
                            <th style="padding: 10px 12px; text-align: right;">Margin</th>
                            <th style="padding: 10px 12px; text-align: center;">Duration</th>
                        </tr>
                    </thead>
                    <tbody style="background: white;">
                        ${treatmentsHTML}
                    </tbody>
                </table>
            </div>

            <!-- Cost Analysis -->
            <div style="margin-bottom: 24px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px;">
                <div style="font-size: 14px; font-weight: bold; color: #166534; margin-bottom: 12px;">💰 INTERNAL COST ANALYSIS</div>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; text-align: center;">
                    <div>
                        <div style="font-size: 11px; color: #64748b;">Total Cost</div>
                        <div style="font-size: 18px; font-weight: bold; color: #374151;">€${data.totalCost.toLocaleString()}</div>
                    </div>
                    <div>
                        <div style="font-size: 11px; color: #64748b;">Patient Price</div>
                        <div style="font-size: 18px; font-weight: bold; color: #1e40af;">€${data.patientPrice.toLocaleString()}</div>
                    </div>
                    <div>
                        <div style="font-size: 11px; color: #64748b;">Gross Margin</div>
                        <div style="font-size: 18px; font-weight: bold; color: #059669;">€${(data.totalMargin || 0).toLocaleString()}</div>
                    </div>
                    <div>
                        <div style="font-size: 11px; color: #64748b;">Margin %</div>
                        <div style="font-size: 18px; font-weight: bold; color: #059669;">${data.marginPercent || 0}%</div>
                    </div>
                </div>
            </div>

            <!-- Risk Factors -->
            ${data.riskFactors && data.riskFactors.length > 0 ? `
            <div style="margin-bottom: 24px; background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 16px;">
                <div style="font-size: 14px; font-weight: bold; color: #991b1b; margin-bottom: 12px;">⚠️ RISK FACTORS & CONTRAINDICATIONS</div>
                <ul style="list-style: none; font-size: 12px;">
                    ${riskFactorsHTML}
                </ul>
            </div>
            ` : ''}

            <!-- Appointment Schedule -->
            ${data.appointments && data.appointments.length > 0 ? `
            <div style="margin-bottom: 24px;">
                <div style="font-size: 14px; font-weight: bold; color: #1e40af; margin-bottom: 12px; font-family: 'Segoe UI', sans-serif;">
                    📅 APPOINTMENT SCHEDULE
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 12px; border: 1px solid #e5e7eb;">
                    <thead>
                        <tr style="background: #f3f4f6;">
                            <th style="padding: 8px 12px; text-align: left;">Date</th>
                            <th style="padding: 8px 12px; text-align: left;">Type</th>
                            <th style="padding: 8px 12px; text-align: left;">Duration</th>
                            <th style="padding: 8px 12px; text-align: left;">Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${appointmentsHTML}
                    </tbody>
                </table>
            </div>
            ` : ''}

            <!-- Next Action -->
            ${data.nextAction ? `
            <div style="margin-bottom: 24px; background: #eff6ff; border: 2px solid #3b82f6; border-radius: 8px; padding: 16px;">
                <div style="font-size: 14px; font-weight: bold; color: #1e40af; margin-bottom: 8px;">🎯 RECOMMENDED NEXT ACTION</div>
                <div style="font-size: 14px; color: #1e3a8a;">${data.nextAction}</div>
            </div>
            ` : ''}

            <!-- Doctor Notes -->
            ${data.doctorNotes || data.internalRemarks ? `
            <div style="margin-bottom: 24px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px;">
                <div style="font-size: 14px; font-weight: bold; color: #374151; margin-bottom: 8px;">📝 DOCTOR NOTES</div>
                <div style="white-space: pre-wrap; font-size: 13px; color: #4b5563;">${data.doctorNotes || data.internalRemarks}</div>
            </div>
            ` : ''}

            <!-- Signature -->
            <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #1e40af;">
                <div style="display: flex; justify-content: flex-end;">
                    <div style="text-align: center;">
                        ${data.signatureUrl ? `
                            <img src="${data.signatureUrl}" style="max-height: 50px; max-width: 180px; object-fit: contain;" />
                        ` : `
                            <div style="border-bottom: 2px solid #374151; width: 200px; height: 40px; margin-bottom: 8px;"></div>
                        `}
                        <div style="font-weight: bold; color: #111827;">${data.doctorName}</div>
                        <div style="font-size: 11px; color: #6b7280;">Attending Physician</div>
                        <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">${formattedDate}</div>
                    </div>
                </div>
            </div>

        </div>

        <!-- Footer -->
        <div style="background: #1e3a8a; color: white; padding: 12px 24px; font-size: 10px; text-align: center;">
            <div style="opacity: 0.8;">This document is confidential and intended for internal use only. Do not share with patients.</div>
            <div style="opacity: 0.6; margin-top: 4px;">SmileDesign Turkey Internal Medical Records System</div>
        </div>
    </div>
</body>
</html>
`;
}
