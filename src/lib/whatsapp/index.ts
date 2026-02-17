/**
 * WhatsApp Module Index - Unified exports
 * Part of: Model B++ - Smile Design Ultimate Ecosystem
 * Purpose: Central export for all WhatsApp functionality
 */

// Configuration
export {
    getWhatsAppConfig,
    isMockMode,
    logWhatsApp,
    generateMockMessageId,
    generateMockConversationId,
    MOCK_PATIENTS,
    MOCK_MESSAGES,
    MOCK_RESPONSES,
    type WhatsAppMode,
    type WhatsAppConfig,
} from './mockWhatsAppConfig';

// Webhook Handler
export {
    verifyWebhook,
    processWebhook,
    type WhatsAppWebhookPayload,
    type WebhookEntry,
    type WebhookChange,
    type WebhookMessage,
    type WebhookStatus,
    type ProcessedMessage,
    type WebhookResult,
} from './webhookHandler';

// Message Sender
export {
    sendTextMessage,
    sendTemplateMessage,
    sendImageMessage,
    sendDocumentMessage,
    sendWelcomeMessage,
    sendTreatmentPlanReady,
    sendAppointmentReminder,
    isServiceWindowActive,
    type SendMessageOptions,
    type SendTextOptions,
    type SendTemplateOptions,
    type SendMediaOptions,
    type MessageResponse,
} from './messageSender';

// Message Simulator (for development/testing)
export {
    simulatePatientMessage,
    simulateAIResponse,
    simulateDoctorResponse,
    simulatePatientJourney,
    seedDemoConversations,
    type SimulatedMessage,
    type PatientJourneyStep,
} from './messageSimulator';

// =================================================================
// Convenience re-exports as default
// =================================================================

import mockConfig from './mockWhatsAppConfig';
import webhookHandler from './webhookHandler';
import messageSender from './messageSender';
import messageSimulator from './messageSimulator';

export default {
    config: mockConfig,
    webhook: webhookHandler,
    sender: messageSender,
    simulator: messageSimulator,
};
