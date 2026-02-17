/**
 * WhatsApp Webhook Handler - Process incoming messages from 360Dialog
 * Part of: Model B++ - Smile Design Ultimate Ecosystem
 * Purpose: Receive webhooks, store messages, trigger AI routing
 * Phase: 2 - Communication Lock
 * 
 * CREATIVE VERSION: Uses intelligent AI Router with emotional understanding
 */

import { getSupabaseClient } from '../supabaseClient';
import { analyzeMessage } from '../ai/aiRouter';

// =================================================================
// Types - 360Dialog Webhook Payload
// =================================================================

export interface WhatsAppWebhookPayload {
    object: string;
    entry: WebhookEntry[];
}

export interface WebhookEntry {
    id: string;
    changes: WebhookChange[];
}

export interface WebhookChange {
    value: {
        messaging_product: string;
        metadata: {
            display_phone_number: string;
            phone_number_id: string;
        };
        contacts?: WebhookContact[];
        messages?: WebhookMessage[];
        statuses?: WebhookStatus[];
    };
    field: string;
}

export interface WebhookContact {
    profile: {
        name: string;
    };
    wa_id: string;
}

export interface WebhookMessage {
    from: string;
    id: string;
    timestamp: string;
    type: MessageType;
    text?: { body: string };
    image?: MediaMessage;
    document?: MediaMessage & { filename: string };
    audio?: MediaMessage;
    video?: MediaMessage;
    location?: LocationMessage;
    interactive?: InteractiveMessage;
    button?: ButtonMessage;
    context?: MessageContext;
}

export type MessageType = 'text' | 'image' | 'document' | 'audio' | 'video' | 'location' | 'interactive' | 'button';

export interface MediaMessage {
    id: string;
    mime_type: string;
    sha256?: string;
    caption?: string;
}

export interface LocationMessage {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
}

export interface InteractiveMessage {
    type: string;
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description: string };
}

export interface ButtonMessage {
    text: string;
    payload: string;
}

export interface MessageContext {
    from: string;
    id: string;
}

export interface WebhookStatus {
    id: string;
    status: 'sent' | 'delivered' | 'read' | 'failed';
    timestamp: string;
    recipient_id: string;
    errors?: Array<{ code: number; title: string }>;
}

// =================================================================
// Internal Types
// =================================================================

export interface ProcessedMessage {
    id: string;
    patient_id: string;
    conversation_id: string;
    wa_message_id: string;
    content: string;
    message_type: MessageType;
    media_url?: string;
    sender_phone: string;
    sender_name?: string;
}

export interface WebhookResult {
    success: boolean;
    processed: number;
    errors: string[];
}

// =================================================================
// Configuration
// =================================================================

const WEBHOOK_VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'smiledesign_webhook_verify';

// =================================================================
// Core Functions
// =================================================================

/**
 * Verify webhook subscription (GET request from WhatsApp)
 */
export function verifyWebhook(
    mode: string | null,
    token: string | null,
    challenge: string | null
): { valid: boolean; challenge?: string } {
    if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
        console.log('[WhatsApp Webhook] Verification successful');
        return { valid: true, challenge: challenge || '' };
    }
    console.warn('[WhatsApp Webhook] Verification failed');
    return { valid: false };
}

/**
 * Process incoming webhook payload
 */
export async function processWebhook(payload: WhatsAppWebhookPayload): Promise<WebhookResult> {
    const result: WebhookResult = {
        success: true,
        processed: 0,
        errors: [],
    };

    if (payload.object !== 'whatsapp_business_account') {
        console.log('[WhatsApp Webhook] Ignoring non-WhatsApp payload');
        return result;
    }

    for (const entry of payload.entry || []) {
        for (const change of entry.changes || []) {
            const { value } = change;

            // Process incoming messages
            if (value.messages && value.messages.length > 0) {
                for (const message of value.messages) {
                    try {
                        const contact = value.contacts?.find((c) => c.wa_id === message.from);
                        await processIncomingMessage(message, contact);
                        result.processed++;
                    } catch (error) {
                        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                        result.errors.push(`Message ${message.id}: ${errorMsg}`);
                        console.error('[WhatsApp Webhook] Failed to process message:', error);
                    }
                }
            }

            // Process status updates
            if (value.statuses && value.statuses.length > 0) {
                for (const status of value.statuses) {
                    try {
                        await processStatusUpdate(status);
                        result.processed++;
                    } catch (error) {
                        console.error('[WhatsApp Webhook] Failed to process status:', error);
                    }
                }
            }
        }
    }

    result.success = result.errors.length === 0;
    return result;
}

/**
 * Process a single incoming message
 */
async function processIncomingMessage(
    message: WebhookMessage,
    contact?: WebhookContact
): Promise<ProcessedMessage> {
    const client = getSupabaseClient();
    if (!client) {
        throw new Error('Supabase client not available');
    }

    const senderPhone = message.from;
    const senderName = contact?.profile?.name;

    // 1. Find or create patient
    const patientId = await getOrCreatePatient(senderPhone, senderName);

    // 2. Get or create conversation
    const { data: convData, error: convError } = await client.rpc('get_or_create_conversation', {
        p_patient_id: patientId,
        p_channel: 'whatsapp',
        p_wa_conversation_id: message.id,
    });

    if (convError) {
        console.error('[WhatsApp Webhook] Failed to get/create conversation:', convError);
    }

    const conversationId = convData || null;

    // 3. Extract message content
    const { content, mediaUrl } = extractMessageContent(message);

    // 4. Store message in database
    const { data: msgData, error: msgError } = await client
        .from('messages')
        .insert({
            patient_id: patientId,
            conversation_id: conversationId,
            direction: 'inbound',
            channel: 'whatsapp',
            message_type: message.type,
            content: content,
            media_url: mediaUrl,
            wa_message_id: message.id,
            wa_timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(),
            wa_status: 'delivered',
        })
        .select()
        .single();

    if (msgError) {
        console.error('[WhatsApp Webhook] Failed to store message:', msgError);
        throw msgError;
    }

    console.log(`[WhatsApp Webhook] Message stored: ${msgData.id} from ${senderPhone}`);

    // 5. Trigger AI processing (async, don't wait)
    triggerAIProcessing(msgData.id).catch((err) => {
        console.error('[WhatsApp Webhook] AI processing failed:', err);
    });

    return {
        id: msgData.id,
        patient_id: patientId,
        conversation_id: conversationId,
        wa_message_id: message.id,
        content,
        message_type: message.type,
        media_url: mediaUrl,
        sender_phone: senderPhone,
        sender_name: senderName,
    };
}

/**
 * Process a status update (sent, delivered, read, failed)
 */
async function processStatusUpdate(status: WebhookStatus): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;

    const { error } = await client
        .from('messages')
        .update({
            wa_status: status.status,
            ...(status.status === 'read' ? { read_at: new Date().toISOString() } : {}),
            ...(status.status === 'failed' && status.errors?.length
                ? {
                    wa_error_code: status.errors[0].code.toString(),
                    wa_error_message: status.errors[0].title,
                }
                : {}),
        })
        .eq('wa_message_id', status.id);

    if (error) {
        console.error('[WhatsApp Webhook] Failed to update status:', error);
    }
}

// =================================================================
// Helper Functions
// =================================================================

/**
 * Get or create patient from phone number
 */
async function getOrCreatePatient(phone: string, name?: string): Promise<string> {
    const client = getSupabaseClient();
    if (!client) {
        throw new Error('Supabase client not available');
    }

    // Normalize phone number
    const normalizedPhone = phone.replace(/\D/g, '');

    // Try to find existing patient
    const { data: existingLead } = await client
        .from('leads')
        .select('id')
        .eq('phone', normalizedPhone)
        .single();

    if (existingLead) {
        return existingLead.id;
    }

    // Create new lead/patient
    const { data: newLead, error } = await client
        .from('leads')
        .insert({
            phone: normalizedPhone,
            name: name || 'WhatsApp User',
            source: 'whatsapp',
            status: 'new',
        })
        .select()
        .single();

    if (error) {
        console.error('[WhatsApp Webhook] Failed to create lead:', error);
        throw error;
    }

    return newLead.id;
}

/**
 * Extract content and media URL from message
 */
function extractMessageContent(message: WebhookMessage): { content: string; mediaUrl?: string } {
    switch (message.type) {
        case 'text':
            return { content: message.text?.body || '' };

        case 'image':
            return {
                content: message.image?.caption || '[Image]',
                mediaUrl: message.image?.id, // Will need to fetch from WhatsApp Media API
            };

        case 'document':
            return {
                content: message.document?.filename || '[Document]',
                mediaUrl: message.document?.id,
            };

        case 'audio':
            return { content: '[Audio message]', mediaUrl: message.audio?.id };

        case 'video':
            return {
                content: message.video?.caption || '[Video]',
                mediaUrl: message.video?.id,
            };

        case 'location':
            return {
                content: `📍 ${message.location?.name || 'Location'}: ${message.location?.address || `${message.location?.latitude}, ${message.location?.longitude}`}`,
            };

        case 'interactive':
            if (message.interactive?.button_reply) {
                return { content: `[Button: ${message.interactive.button_reply.title}]` };
            }
            if (message.interactive?.list_reply) {
                return { content: `[List: ${message.interactive.list_reply.title}]` };
            }
            return { content: '[Interactive message]' };

        case 'button':
            return { content: message.button?.text || '[Button response]' };

        default:
            return { content: `[${message.type}]` };
    }
}

/**
 * Trigger AI processing for a message (async)
 * Uses intelligent AI Router with emotional understanding
 */
async function triggerAIProcessing(messageId: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;

    // Fetch message with conversation context
    const { data: message } = await client
        .from('messages')
        .select(`
      id,
      content,
      conversation_id,
      patient_id
    `)
        .eq('id', messageId)
        .single();

    if (!message?.content) return;

    try {
        // Get conversation history for context
        let conversationHistory: string[] = [];
        if (message.conversation_id) {
            const { data: historyData } = await client
                .from('messages')
                .select('content, direction')
                .eq('conversation_id', message.conversation_id)
                .order('created_at', { ascending: false })
                .limit(10);

            if (historyData) {
                conversationHistory = historyData.map(m =>
                    `${m.direction === 'inbound' ? 'Patient' : 'Team'}: ${m.content}`
                ).reverse();
            }
        }

        // Use intelligent AI Router for deep analysis
        const analysis = await analyzeMessage(
            message.content,
            conversationHistory,
            { patient_id: message.patient_id }
        );

        // Update message with rich AI analysis
        await client
            .from('messages')
            .update({
                ai_processed: true,
                ai_intent: analysis.intent,
                ai_sentiment: analysis.sentiment,
                ai_confidence: analysis.confidence,
                ai_suggested_response: analysis.suggestedResponse.text,
                routed_to: analysis.routing.destination,
                escalated: analysis.routing.destination === 'escalate',
                escalation_reason: analysis.routing.reason,
            })
            .eq('id', messageId);

        // Update conversation with AI insights
        if (message.conversation_id) {
            await client
                .from('conversations')
                .update({
                    ai_summary: `${analysis.emotionalState.primary} patient, ${analysis.anxietyLevel} anxiety, ${analysis.journeyStage} stage`,
                    ai_sentiment_trend: analysis.sentiment,
                    ai_next_action: analysis.routing.reason,
                    ai_booking_probability: analysis.journeyStage === 'decided' ? 0.85 :
                        analysis.journeyStage === 'comparing' ? 0.5 : 0.3,
                    priority: analysis.routing.priority,
                    priority_reason: analysis.routing.reason,
                })
                .eq('id', message.conversation_id);
        }

        console.log(`[AI Router] Analyzed message ${messageId}:`, {
            intent: analysis.intent,
            emotion: analysis.emotionalState.primary,
            routing: analysis.routing.destination,
        });

    } catch (error) {
        console.error('[AI Router] Analysis failed:', error);

        // Fallback to basic classification
        const intent = classifyIntentBasic(message.content);
        const sentiment = classifySentimentBasic(message.content);

        await client
            .from('messages')
            .update({
                ai_processed: true,
                ai_intent: intent,
                ai_sentiment: sentiment,
                ai_confidence: 0.5,
            })
            .eq('id', messageId);
    }
}

/**
 * Fallback: Simple rule-based intent classification
 */
function classifyIntentBasic(content: string): string {
    const lower = content.toLowerCase();

    if (lower.includes('price') || lower.includes('cost') || lower.includes('how much')) {
        return 'pricing_question';
    }
    if (lower.includes('book') || lower.includes('appointment') || lower.includes('schedule')) {
        return 'booking_inquiry';
    }
    if (lower.includes('cancel') || lower.includes('refund')) {
        return 'cancellation';
    }
    if (lower.includes('thank') || lower.includes('great') || lower.includes('excellent')) {
        return 'positive_feedback';
    }
    if (lower.includes('problem') || lower.includes('issue') || lower.includes('complaint')) {
        return 'complaint';
    }
    if (lower.includes('hello') || lower.includes('hi') || lower.includes('merhaba')) {
        return 'greeting';
    }

    return 'general_inquiry';
}

/**
 * Fallback: Simple sentiment classification
 */
function classifySentimentBasic(content: string): string {
    const lower = content.toLowerCase();

    const positiveWords = ['thank', 'great', 'excellent', 'amazing', 'perfect', 'love', 'happy'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'disappointed', 'angry', 'problem'];

    const positiveCount = positiveWords.filter((w) => lower.includes(w)).length;
    const negativeCount = negativeWords.filter((w) => lower.includes(w)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
}

// =================================================================
// Export
// =================================================================

export default {
    verify: verifyWebhook,
    process: processWebhook,
};
