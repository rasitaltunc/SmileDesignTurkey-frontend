/**
 * WhatsApp Message Sender - Send messages via 360Dialog API
 * Part of: Model B++ - Smile Design Ultimate Ecosystem
 * Purpose: Send text, template, and media messages to patients
 * Phase: 2 - Communication Lock
 * 
 * MOCK MODE: When VITE_WHATSAPP_MODE=MOCK, messages are simulated
 * PRODUCTION MODE: When credentials are set, uses real 360Dialog API
 */

import { getSupabaseClient } from '../supabaseClient';
import { getWhatsAppConfig, logWhatsApp, generateMockMessageId } from './mockWhatsAppConfig';

// =================================================================
// Types
// =================================================================

export interface SendMessageOptions {
    to: string; // Phone number with country code (e.g., '905551234567')
    type: 'text' | 'template' | 'image' | 'document';
}

export interface SendTextOptions extends SendMessageOptions {
    type: 'text';
    text: string;
    previewUrl?: boolean;
}

export interface SendTemplateOptions extends SendMessageOptions {
    type: 'template';
    templateName: string;
    language?: string;
    components?: TemplateComponent[];
}

export interface TemplateComponent {
    type: 'header' | 'body' | 'button';
    parameters: TemplateParameter[];
}

export interface TemplateParameter {
    type: 'text' | 'image' | 'document' | 'video';
    text?: string;
    image?: { link: string };
    document?: { link: string; filename: string };
}

export interface SendMediaOptions extends SendMessageOptions {
    type: 'image' | 'document';
    mediaUrl: string;
    caption?: string;
    filename?: string; // For documents
}

export interface MessageResponse {
    success: boolean;
    messageId?: string;
    error?: string;
    waMessageId?: string;
    mockMode?: boolean;
}

// =================================================================
// Configuration (from mockWhatsAppConfig)
// =================================================================

const getConfig = () => getWhatsAppConfig();


// =================================================================
// Core Send Functions
// =================================================================

/**
 * Send a text message
 */
export async function sendTextMessage(
    to: string,
    text: string,
    options?: { previewUrl?: boolean; patientId?: string; doctorId?: string; conversationId?: string }
): Promise<MessageResponse> {
    const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formatPhoneNumber(to),
        type: 'text',
        text: {
            preview_url: options?.previewUrl ?? false,
            body: text,
        },
    };

    return sendMessage(payload, {
        patientId: options?.patientId,
        doctorId: options?.doctorId,
        conversationId: options?.conversationId,
        content: text,
        messageType: 'text',
    });
}

/**
 * Send a template message
 */
export async function sendTemplateMessage(
    to: string,
    templateName: string,
    variables: Record<string, string>,
    options?: {
        language?: string;
        patientId?: string;
        doctorId?: string;
        conversationId?: string;
    }
): Promise<MessageResponse> {
    const language = options?.language || 'en';

    // Fetch template from database
    const template = await getTemplate(templateName, language);
    if (!template) {
        return { success: false, error: `Template '${templateName}' not found` };
    }

    // Build components with variables
    const components: TemplateComponent[] = [];

    // Body parameters
    if (template.variables && Array.isArray(template.variables)) {
        const bodyParams: TemplateParameter[] = template.variables.map((v: any) => ({
            type: 'text' as const,
            text: variables[v.name] || variables[v.index.toString()] || v.example || '',
        }));

        if (bodyParams.length > 0) {
            components.push({
                type: 'body',
                parameters: bodyParams,
            });
        }
    }

    const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formatPhoneNumber(to),
        type: 'template',
        template: {
            name: templateName,
            language: { code: language },
            components,
        },
    };

    // Render message content for storage
    const renderedContent = renderTemplateContent(template.body_text, variables);

    return sendMessage(payload, {
        patientId: options?.patientId,
        doctorId: options?.doctorId,
        conversationId: options?.conversationId,
        content: renderedContent,
        messageType: 'template',
        templateName,
    });
}

/**
 * Send an image message
 */
export async function sendImageMessage(
    to: string,
    imageUrl: string,
    caption?: string,
    options?: { patientId?: string; doctorId?: string; conversationId?: string }
): Promise<MessageResponse> {
    const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formatPhoneNumber(to),
        type: 'image',
        image: {
            link: imageUrl,
            caption: caption || '',
        },
    };

    return sendMessage(payload, {
        patientId: options?.patientId,
        doctorId: options?.doctorId,
        conversationId: options?.conversationId,
        content: caption || '[Image]',
        messageType: 'image',
        mediaUrl: imageUrl,
    });
}

/**
 * Send a document message
 */
export async function sendDocumentMessage(
    to: string,
    documentUrl: string,
    filename: string,
    caption?: string,
    options?: { patientId?: string; doctorId?: string; conversationId?: string }
): Promise<MessageResponse> {
    const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formatPhoneNumber(to),
        type: 'document',
        document: {
            link: documentUrl,
            filename,
            caption: caption || '',
        },
    };

    return sendMessage(payload, {
        patientId: options?.patientId,
        doctorId: options?.doctorId,
        conversationId: options?.conversationId,
        content: filename,
        messageType: 'document',
        mediaUrl: documentUrl,
    });
}

// =================================================================
// Internal Functions
// =================================================================

/**
 * Send message via 360Dialog API and store in database
 * In MOCK mode: Skips API call, stores in database, simulates success
 * In PRODUCTION mode: Sends via real 360Dialog API
 */
async function sendMessage(
    payload: any,
    dbOptions: {
        patientId?: string;
        doctorId?: string;
        conversationId?: string;
        content: string;
        messageType: string;
        mediaUrl?: string;
        templateName?: string;
    }
): Promise<MessageResponse> {
    const config = getConfig();
    const mockMode = config.mode === 'MOCK';

    try {
        let waMessageId: string;

        if (mockMode) {
            // MOCK MODE: Skip API call, generate mock message ID
            logWhatsApp('MOCK: Simulating message send', { to: payload.to, type: payload.type });
            waMessageId = generateMockMessageId();

            // Simulate small delay
            await new Promise(resolve => setTimeout(resolve, 100));
        } else {
            // PRODUCTION MODE: Send to 360Dialog API
            const response = await fetch(`${config.apiBaseUrl}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'D360-API-KEY': config.apiKey,
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('[WhatsApp Sender] API error:', data);
                return {
                    success: false,
                    error: data.error?.message || 'Failed to send message',
                    mockMode,
                };
            }

            waMessageId = data.messages?.[0]?.id || generateMockMessageId();
        }

        // Store in database (both MOCK and PRODUCTION)
        const client = getSupabaseClient();
        if (client && dbOptions.patientId) {
            const { data: msgData, error: dbError } = await client
                .from('messages')
                .insert({
                    patient_id: dbOptions.patientId,
                    doctor_id: dbOptions.doctorId,
                    conversation_id: dbOptions.conversationId,
                    direction: 'outbound',
                    channel: 'whatsapp',
                    message_type: dbOptions.messageType,
                    content: dbOptions.content,
                    media_url: dbOptions.mediaUrl,
                    wa_message_id: waMessageId,
                    wa_template_name: dbOptions.templateName,
                    wa_status: mockMode ? 'delivered' : 'sent', // Mock shows delivered immediately
                })
                .select()
                .single();

            if (dbError) {
                console.error('[WhatsApp Sender] DB error:', dbError);
            }

            // Update template usage count
            if (dbOptions.templateName) {
                // Use raw increment instead of sql template literal
                const { data: templateData } = await client
                    .from('wa_templates')
                    .select('usage_count')
                    .eq('name', dbOptions.templateName)
                    .single();

                if (templateData) {
                    await client
                        .from('wa_templates')
                        .update({
                            usage_count: (templateData.usage_count || 0) + 1,
                            last_used_at: new Date().toISOString(),
                        })
                        .eq('name', dbOptions.templateName);
                }
            }

            return {
                success: true,
                messageId: msgData?.id,
                waMessageId,
                mockMode,
            };
        }

        return {
            success: true,
            waMessageId,
            mockMode,
        };
    } catch (error) {
        console.error('[WhatsApp Sender] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            mockMode,
        };
    }
}


/**
 * Get template from database
 */
async function getTemplate(name: string, language: string) {
    const client = getSupabaseClient();
    if (!client) return null;

    const { data } = await client
        .from('wa_templates')
        .select('*')
        .eq('name', name)
        .eq('language', language)
        .eq('submission_status', 'approved')
        .single();

    return data;
}

/**
 * Render template content with variables
 */
function renderTemplateContent(bodyText: string, variables: Record<string, string>): string {
    let rendered = bodyText;

    // Replace {{1}}, {{2}}, etc.
    for (const [key, value] of Object.entries(variables)) {
        rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }

    return rendered;
}

/**
 * Format phone number for WhatsApp API
 */
function formatPhoneNumber(phone: string): string {
    // Remove all non-digits
    let formatted = phone.replace(/\D/g, '');

    // Ensure it starts with country code
    if (formatted.startsWith('0')) {
        // Assume Turkey, add country code
        formatted = '90' + formatted.substring(1);
    }

    return formatted;
}

// =================================================================
// Convenience Functions
// =================================================================

/**
 * Send welcome message to new patient
 */
export async function sendWelcomeMessage(
    patientPhone: string,
    patientName: string,
    treatmentType: string,
    options?: { patientId?: string; conversationId?: string }
): Promise<MessageResponse> {
    return sendTemplateMessage(patientPhone, 'welcome_patient', {
        '1': patientName,
        '2': treatmentType,
    }, options);
}

/**
 * Send treatment plan ready notification
 */
export async function sendTreatmentPlanReady(
    patientPhone: string,
    patientName: string,
    treatmentName: string,
    price: string,
    duration: string,
    options?: { patientId?: string; conversationId?: string }
): Promise<MessageResponse> {
    return sendTemplateMessage(patientPhone, 'treatment_plan_ready', {
        '1': patientName,
        '2': treatmentName,
        '3': price,
        '4': duration,
    }, options);
}

/**
 * Send appointment reminder
 */
export async function sendAppointmentReminder(
    patientPhone: string,
    clinicName: string,
    appointmentTime: string,
    doctorName: string,
    options?: { patientId?: string; conversationId?: string }
): Promise<MessageResponse> {
    return sendTemplateMessage(patientPhone, 'appointment_reminder', {
        '1': clinicName,
        '2': appointmentTime,
        '3': doctorName,
    }, options);
}

/**
 * Check if service window is active (free messaging)
 */
export async function isServiceWindowActive(conversationId: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    const { data } = await client
        .from('conversations')
        .select('service_window_active')
        .eq('id', conversationId)
        .single();

    return data?.service_window_active || false;
}

// =================================================================
// Export
// =================================================================

export default {
    sendText: sendTextMessage,
    sendTemplate: sendTemplateMessage,
    sendImage: sendImageMessage,
    sendDocument: sendDocumentMessage,
    sendWelcome: sendWelcomeMessage,
    sendTreatmentPlanReady,
    sendAppointmentReminder,
    isServiceWindowActive,
};
