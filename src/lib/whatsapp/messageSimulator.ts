/**
 * Message Simulator - Test patient journeys without 360Dialog
 * Part of: Model B++ - Smile Design Ultimate Ecosystem
 * Purpose: Simulate patient-doctor conversations for development/demo
 */

import { getSupabaseClient } from '../supabaseClient';
import {
    isMockMode,
    logWhatsApp,
    generateMockMessageId,
    MOCK_PATIENTS,
    MOCK_MESSAGES,
    MOCK_RESPONSES,
} from './mockWhatsAppConfig';

// =================================================================
// Types
// =================================================================

export interface SimulatedMessage {
    id: string;
    patient_id: string;
    conversation_id: string;
    direction: 'inbound' | 'outbound';
    content: string;
    message_type: string;
    created_at: string;
}

export interface PatientJourneyStep {
    action: 'patient_message' | 'ai_response' | 'consultant_assignment' | 'doctor_response';
    delay_ms: number;
    content?: string;
    intent?: string;
}

// =================================================================
// Core Simulator Functions
// =================================================================

/**
 * Simulate a patient sending a message
 */
export async function simulatePatientMessage(
    patientPhone: string,
    messageText: string,
    options?: { patientName?: string; intent?: string }
): Promise<SimulatedMessage | null> {
    if (!isMockMode()) {
        console.warn('[Simulator] Not in MOCK mode, skipping simulation');
        return null;
    }

    const client = getSupabaseClient();
    if (!client) return null;

    logWhatsApp(`Simulating patient message from ${patientPhone}`, { text: messageText });

    // 1. Get or create patient
    const patientId = await getOrCreateMockPatient(patientPhone, options?.patientName);
    if (!patientId) return null;

    // 2. Get or create conversation
    const { data: convData } = await client.rpc('get_or_create_conversation', {
        p_patient_id: patientId,
        p_channel: 'whatsapp',
    });
    const conversationId = convData;

    // 3. Store message
    const { data: msgData, error } = await client
        .from('messages')
        .insert({
            patient_id: patientId,
            conversation_id: conversationId,
            direction: 'inbound',
            channel: 'whatsapp',
            message_type: 'text',
            content: messageText,
            wa_message_id: generateMockMessageId(),
            wa_status: 'delivered',
            ai_intent: options?.intent || classifyIntent(messageText),
            ai_sentiment: classifySentiment(messageText),
            ai_processed: true,
            ai_confidence: 0.85,
        })
        .select()
        .single();

    if (error) {
        console.error('[Simulator] Failed to store message:', error);
        return null;
    }

    logWhatsApp(`Message stored with ID: ${msgData.id}`);

    return {
        id: msgData.id,
        patient_id: patientId,
        conversation_id: conversationId,
        direction: 'inbound',
        content: messageText,
        message_type: 'text',
        created_at: msgData.created_at,
    };
}

/**
 * Simulate an automatic AI response
 */
export async function simulateAIResponse(
    conversationId: string,
    patientId: string,
    intent: string
): Promise<SimulatedMessage | null> {
    if (!isMockMode()) return null;

    const client = getSupabaseClient();
    if (!client) return null;

    // Get response based on intent
    const responseText = MOCK_RESPONSES[intent] || MOCK_RESPONSES.default;

    logWhatsApp(`Simulating AI response for intent: ${intent}`);

    const { data: msgData, error } = await client
        .from('messages')
        .insert({
            patient_id: patientId,
            conversation_id: conversationId,
            direction: 'outbound',
            channel: 'whatsapp',
            message_type: 'text',
            content: responseText,
            wa_message_id: generateMockMessageId(),
            wa_status: 'sent',
            routed_to: 'ai',
        })
        .select()
        .single();

    if (error) {
        console.error('[Simulator] Failed to store AI response:', error);
        return null;
    }

    return {
        id: msgData.id,
        patient_id: patientId,
        conversation_id: conversationId,
        direction: 'outbound',
        content: responseText,
        message_type: 'text',
        created_at: msgData.created_at,
    };
}

/**
 * Simulate a doctor response (blind mode)
 */
export async function simulateDoctorResponse(
    conversationId: string,
    patientId: string,
    doctorId: string,
    responseText: string
): Promise<SimulatedMessage | null> {
    if (!isMockMode()) return null;

    const client = getSupabaseClient();
    if (!client) return null;

    logWhatsApp(`Simulating doctor response from ${doctorId}`);

    const { data: msgData, error } = await client
        .from('messages')
        .insert({
            patient_id: patientId,
            doctor_id: doctorId,
            conversation_id: conversationId,
            direction: 'outbound',
            channel: 'whatsapp',
            message_type: 'text',
            content: responseText,
            wa_message_id: generateMockMessageId(),
            wa_status: 'sent',
            routed_to: 'doctor',
        })
        .select()
        .single();

    if (error) {
        console.error('[Simulator] Failed to store doctor response:', error);
        return null;
    }

    return {
        id: msgData.id,
        patient_id: patientId,
        conversation_id: conversationId,
        direction: 'outbound',
        content: responseText,
        message_type: 'text',
        created_at: msgData.created_at,
    };
}

/**
 * Run a complete patient journey simulation
 */
export async function simulatePatientJourney(
    patientIndex: number = 0,
    journeySteps?: PatientJourneyStep[]
): Promise<void> {
    if (!isMockMode()) {
        console.warn('[Simulator] Not in MOCK mode, skipping journey simulation');
        return;
    }

    const patient = MOCK_PATIENTS[patientIndex % MOCK_PATIENTS.length];
    logWhatsApp(`Starting journey simulation for: ${patient.name}`);

    // Default journey if not provided
    const steps: PatientJourneyStep[] = journeySteps || [
        { action: 'patient_message', delay_ms: 0, content: 'Hello, I want information about dental implants' },
        { action: 'ai_response', delay_ms: 1000 },
        { action: 'patient_message', delay_ms: 3000, content: 'How much does it cost?' },
        { action: 'ai_response', delay_ms: 1000 },
        { action: 'patient_message', delay_ms: 3000, content: 'Great, I want to book for next month' },
        { action: 'ai_response', delay_ms: 1000 },
    ];

    let currentConversationId: string | null = null;
    let currentPatientId: string | null = null;
    let lastIntent = 'general_inquiry';

    for (const step of steps) {
        await sleep(step.delay_ms);

        switch (step.action) {
            case 'patient_message':
                const msg = await simulatePatientMessage(
                    patient.phone,
                    step.content || getRandomMessage(),
                    { patientName: patient.name }
                );
                if (msg) {
                    currentConversationId = msg.conversation_id;
                    currentPatientId = msg.patient_id;
                    lastIntent = classifyIntent(msg.content);
                }
                break;

            case 'ai_response':
                if (currentConversationId && currentPatientId) {
                    await simulateAIResponse(currentConversationId, currentPatientId, lastIntent);
                }
                break;

            case 'doctor_response':
                if (currentConversationId && currentPatientId) {
                    await simulateDoctorResponse(
                        currentConversationId,
                        currentPatientId,
                        'mock_doctor_id',
                        step.content || 'Thank you for contacting us. I will review your case.'
                    );
                }
                break;
        }
    }

    logWhatsApp(`Journey simulation complete for: ${patient.name}`);
}

/**
 * Seed database with sample conversations (for demo)
 */
export async function seedDemoConversations(count: number = 5): Promise<void> {
    if (!isMockMode()) {
        console.warn('[Simulator] Not in MOCK mode, skipping demo seeding');
        return;
    }

    logWhatsApp(`Seeding ${count} demo conversations...`);

    for (let i = 0; i < count; i++) {
        const patient = MOCK_PATIENTS[i % MOCK_PATIENTS.length];
        const messages = getRandomMessages(3 + Math.floor(Math.random() * 4));

        for (const messageText of messages) {
            await simulatePatientMessage(patient.phone, messageText, { patientName: patient.name });
            await sleep(100);
        }

        logWhatsApp(`Seeded conversation ${i + 1}/${count} for ${patient.name}`);
    }

    logWhatsApp('Demo seeding complete!');
}

// =================================================================
// Helper Functions
// =================================================================

async function getOrCreateMockPatient(phone: string, name?: string): Promise<string | null> {
    const client = getSupabaseClient();
    if (!client) return null;

    const normalizedPhone = phone.replace(/\D/g, '');

    // Try to find existing
    const { data: existing } = await client
        .from('leads')
        .select('id')
        .eq('phone', normalizedPhone)
        .single();

    if (existing) return existing.id;

    // Create new
    const { data: newLead, error } = await client
        .from('leads')
        .insert({
            phone: normalizedPhone,
            name: name || 'Mock Patient',
            source: 'whatsapp',
            status: 'new',
        })
        .select()
        .single();

    if (error) {
        console.error('[Simulator] Failed to create mock patient:', error);
        return null;
    }

    return newLead.id;
}

function classifyIntent(content: string): string {
    const lower = content.toLowerCase();

    if (lower.includes('price') || lower.includes('cost') || lower.includes('how much')) {
        return 'pricing_question';
    }
    if (lower.includes('book') || lower.includes('appointment') || lower.includes('want to')) {
        return 'booking_inquiry';
    }
    if (lower.includes('how long') || lower.includes('recovery') || lower.includes('procedure')) {
        return 'treatment_question';
    }
    if (lower.includes('thank') || lower.includes('great') || lower.includes('good')) {
        return 'positive_feedback';
    }
    if (lower.includes('wait') || lower.includes('problem') || lower.includes('expensive')) {
        return 'complaint';
    }
    if (lower.match(/^(hi|hello|merhaba|hey|good\s)/i)) {
        return 'greeting';
    }

    return 'general_inquiry';
}

function classifySentiment(content: string): string {
    const lower = content.toLowerCase();
    const positiveWords = ['thank', 'great', 'good', 'excellent', 'love', 'happy', 'excited'];
    const negativeWords = ['problem', 'wait', 'expensive', 'bad', 'disappointed', 'angry'];

    const positiveCount = positiveWords.filter((w) => lower.includes(w)).length;
    const negativeCount = negativeWords.filter((w) => lower.includes(w)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
}

function getRandomMessage(): string {
    return MOCK_MESSAGES[Math.floor(Math.random() * MOCK_MESSAGES.length)].text;
}

function getRandomMessages(count: number): string[] {
    const shuffled = [...MOCK_MESSAGES].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count).map((m) => m.text);
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// =================================================================
// Export
// =================================================================

export default {
    simulatePatientMessage,
    simulateAIResponse,
    simulateDoctorResponse,
    simulatePatientJourney,
    seedDemoConversations,
};
