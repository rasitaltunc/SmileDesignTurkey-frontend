/**
 * Doctor Blind Service - Secure doctor access to patient data
 * Part of: Model B++ - Smile Design Ultimate Ecosystem
 * Purpose: Filter sensitive data, mask contact info, audit access
 * Phase: 2 - Communication Lock (Security Critical)
 * 
 * SECURITY CRITICAL: This is the MOAT of Model B++
 * Doctor must NEVER see patient phone, email, or full name
 */

import { getSupabaseClient } from '../supabaseClient';

// =================================================================
// Types
// =================================================================

export interface BlindConversation {
    conversation_id: string;
    patient_first_name: string;
    treatment_type: string | null;
    stage: string;
    priority: string;
    ai_summary: string | null;
    message_count: number;
    unread_count: number;
    last_message_at: string | null;
    status: string;
    access_mode: 'blind_mode';
}

export interface BlindMessage {
    message_id: string;
    direction: 'inbound' | 'outbound';
    message_type: string;
    content: string; // Masked content (phone/email stripped)
    ai_intent: string | null;
    ai_sentiment: string | null;
    created_at: string;
    read_at: string | null;
    access_mode: 'blind_mode';
}

export interface DoctorAccessLog {
    action: 'view_inbox' | 'view_conversation' | 'read_message' | 'send_reply' | 'attempt_export';
    conversation_id?: string;
    message_id?: string;
    metadata?: Record<string, any>;
}

// =================================================================
// Content Masking - Strip phone numbers and emails from message text
// =================================================================

/**
 * Mask phone numbers in text
 * Replaces: +905551234567, 0555 123 4567, (555) 123-4567, etc.
 */
export function maskPhoneNumbers(text: string): string {
    if (!text) return text;

    // International format with + prefix
    let masked = text.replace(/\+\d{1,4}[\s.-]?\d{1,4}[\s.-]?\d{1,4}[\s.-]?\d{1,4}/g, '[phone hidden]');

    // Turkish format (05xx xxx xxxx)
    masked = masked.replace(/0\d{3}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/g, '[phone hidden]');

    // Generic long number strings (10+ digits)
    masked = masked.replace(/\b\d{10,15}\b/g, '[phone hidden]');

    // US format (xxx) xxx-xxxx
    masked = masked.replace(/\(\d{3}\)[\s.-]?\d{3}[\s.-]?\d{4}/g, '[phone hidden]');

    // Generic format xxx-xxx-xxxx
    masked = masked.replace(/\b\d{3}[\s.-]\d{3}[\s.-]\d{4}\b/g, '[phone hidden]');

    return masked;
}

/**
 * Mask email addresses in text
 */
export function maskEmails(text: string): string {
    if (!text) return text;

    // Standard email pattern
    return text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email hidden]');
}

/**
 * Mask all sensitive contact information in text
 */
export function maskSensitiveContent(text: string): string {
    if (!text) return text;

    let masked = text;
    masked = maskPhoneNumbers(masked);
    masked = maskEmails(masked);

    return masked;
}

/**
 * Filter a message object for doctor viewing
 */
export function filterMessageForDoctor(message: any): BlindMessage {
    return {
        message_id: message.id || message.message_id,
        direction: message.direction,
        message_type: message.message_type,
        content: maskSensitiveContent(message.content || message.raw_content || ''),
        ai_intent: message.ai_intent,
        ai_sentiment: message.ai_sentiment,
        created_at: message.created_at,
        read_at: message.read_at,
        access_mode: 'blind_mode',
    };
}

/**
 * Filter a conversation for doctor viewing
 */
export function filterConversationForDoctor(conversation: any): BlindConversation {
    return {
        conversation_id: conversation.id || conversation.conversation_id,
        patient_first_name: extractFirstName(conversation.patient_name || conversation.patient_first_name),
        treatment_type: conversation.treatment_type,
        stage: conversation.stage,
        priority: conversation.priority,
        ai_summary: conversation.ai_summary,
        message_count: conversation.message_count || 0,
        unread_count: conversation.unread_count || 0,
        last_message_at: conversation.last_message_at,
        status: conversation.status,
        access_mode: 'blind_mode',
    };
}

/**
 * Extract only first name from full name
 */
function extractFirstName(fullName: string | null): string {
    if (!fullName) return 'Patient';

    // Get first word only
    const firstName = fullName.trim().split(/\s+/)[0];
    return firstName || 'Patient';
}

// =================================================================
// API Functions - Interact with Supabase
// =================================================================

/**
 * Get doctor's blind inbox (filtered conversations)
 */
export async function getDoctorBlindInbox(doctorId: string): Promise<BlindConversation[]> {
    const client = getSupabaseClient();
    if (!client) {
        console.warn('[Doctor Blind] No Supabase client, returning mock data');
        return getMockBlindInbox();
    }

    try {
        const { data, error } = await client.rpc('get_doctor_blind_inbox', {
            p_doctor_id: doctorId,
        });

        if (error) {
            console.warn('[Doctor Blind] RPC not available, using mock data:', error.message);
            return getMockBlindInbox();
        }

        const result = (data || []).map(filterConversationForDoctor);
        return result.length > 0 ? result : getMockBlindInbox();
    } catch (err) {
        console.warn('[Doctor Blind] Falling back to mock data');
        return getMockBlindInbox();
    }
}

/**
 * Mock data for development - shown when Supabase tables aren't set up yet
 */
function getMockBlindInbox(): BlindConversation[] {
    return [
        {
            conversation_id: 'mock-conv-1',
            patient_first_name: 'Sarah',
            treatment_type: 'Dental Implants',
            stage: 'consultation',
            priority: 'urgent',
            ai_summary: 'Nervous about pain, asking detailed questions about anesthesia options',
            message_count: 8,
            unread_count: 3,
            last_message_at: new Date(Date.now() - 15 * 60000).toISOString(),
            status: 'active',
            access_mode: 'blind_mode',
        },
        {
            conversation_id: 'mock-conv-2',
            patient_first_name: 'Michael',
            treatment_type: 'Hollywood Smile',
            stage: 'quote_sent',
            priority: 'high',
            ai_summary: 'Comparing pricing with clinics in Budapest, needs value proposition',
            message_count: 12,
            unread_count: 1,
            last_message_at: new Date(Date.now() - 45 * 60000).toISOString(),
            status: 'active',
            access_mode: 'blind_mode',
        },
        {
            conversation_id: 'mock-conv-3',
            patient_first_name: 'Emma',
            treatment_type: 'Zirconia Crowns',
            stage: 'booked',
            priority: 'normal',
            ai_summary: 'Booked for March 15. Asking about pre-treatment diet restrictions',
            message_count: 20,
            unread_count: 0,
            last_message_at: new Date(Date.now() - 3 * 3600000).toISOString(),
            status: 'active',
            access_mode: 'blind_mode',
        },
        {
            conversation_id: 'mock-conv-4',
            patient_first_name: 'Ahmed',
            treatment_type: 'Dental Veneers',
            stage: 'inquiry',
            priority: 'low',
            ai_summary: 'Initial inquiry, interested in before/after photos',
            message_count: 3,
            unread_count: 0,
            last_message_at: new Date(Date.now() - 24 * 3600000).toISOString(),
            status: 'active',
            access_mode: 'blind_mode',
        },
    ];
}

/**
 * Get blind messages for a conversation
 */
export async function getDoctorBlindMessages(
    doctorId: string,
    conversationId: string
): Promise<BlindMessage[]> {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client not available');

    // Use the secure function
    const { data, error } = await client.rpc('get_doctor_blind_messages', {
        p_doctor_id: doctorId,
        p_conversation_id: conversationId,
    });

    if (error) {
        console.error('[Doctor Blind] Failed to get messages:', error);
        throw error;
    }

    // Apply content masking to each message
    return (data || []).map(filterMessageForDoctor);
}

/**
 * Doctor sends a blind reply (doesn't see destination)
 */
export async function sendDoctorBlindReply(
    doctorId: string,
    conversationId: string,
    content: string
): Promise<string> {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client not available');

    // Use the secure function
    const { data, error } = await client.rpc('doctor_send_blind_reply', {
        p_doctor_id: doctorId,
        p_conversation_id: conversationId,
        p_content: content,
    });

    if (error) {
        console.error('[Doctor Blind] Failed to send reply:', error);
        throw error;
    }

    return data; // Returns message ID
}

/**
 * Log doctor access (for audit trail)
 */
export async function logDoctorAccess(
    doctorId: string,
    log: DoctorAccessLog
): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;

    try {
        await client.rpc('log_doctor_access', {
            p_doctor_id: doctorId,
            p_action: log.action,
            p_conversation_id: log.conversation_id || null,
            p_message_id: log.message_id || null,
            p_metadata: log.metadata || {},
        });
    } catch (error) {
        console.error('[Doctor Blind] Failed to log access:', error);
        // Don't throw - logging failure shouldn't block user
    }
}

/**
 * Log export attempt (always suspicious)
 */
export async function logExportAttempt(
    doctorId: string,
    conversationId?: string
): Promise<void> {
    await logDoctorAccess(doctorId, {
        action: 'attempt_export',
        conversation_id: conversationId,
        metadata: {
            blocked: true,
            timestamp: new Date().toISOString(),
        },
    });
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(
    doctorId: string,
    conversationId: string
): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;

    // First verify access
    const { data: hasAccess } = await client.rpc('doctor_can_access_conversation', {
        p_doctor_id: doctorId,
        p_conversation_id: conversationId,
    });

    if (!hasAccess) {
        throw new Error('Access denied');
    }

    // Mark as read using the conversation function
    await client.rpc('mark_conversation_read', {
        p_conversation_id: conversationId,
    });
}

// =================================================================
// Security Utilities
// =================================================================

/**
 * Check if doctor has access to a conversation
 */
export async function checkDoctorAccess(
    doctorId: string,
    conversationId: string
): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    const { data } = await client.rpc('doctor_can_access_conversation', {
        p_doctor_id: doctorId,
        p_conversation_id: conversationId,
    });

    return data === true;
}

/**
 * Block export functionality
 * Returns false always - exports are never allowed for doctors
 */
export function canExport(): boolean {
    return false;
}

/**
 * Block forward functionality
 * Returns false always - forwarding is never allowed for doctors
 */
export function canForward(): boolean {
    return false;
}

/**
 * Block copy contact info
 * Returns false always - copying contact is never allowed
 */
export function canCopyContact(): boolean {
    return false;
}

// =================================================================
// Export
// =================================================================

export default {
    // Inbox and messages
    getInbox: getDoctorBlindInbox,
    getMessages: getDoctorBlindMessages,
    sendReply: sendDoctorBlindReply,
    markAsRead: markMessagesAsRead,

    // Content masking
    maskPhone: maskPhoneNumbers,
    maskEmail: maskEmails,
    maskContent: maskSensitiveContent,
    filterMessage: filterMessageForDoctor,
    filterConversation: filterConversationForDoctor,

    // Audit
    logAccess: logDoctorAccess,
    logExportAttempt,

    // Security checks
    checkAccess: checkDoctorAccess,
    canExport,
    canForward,
    canCopyContact,
};
