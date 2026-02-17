/**
 * Mock WhatsApp Service Configuration
 * Part of: Model B++ - Smile Design Ultimate Ecosystem
 * Purpose: Development/testing without 360Dialog spending
 * Strategy: Build same system, mock API, flip switch when ready
 */

// =================================================================
// Configuration
// =================================================================

export type WhatsAppMode = 'MOCK' | 'PRODUCTION';

export interface WhatsAppConfig {
    mode: WhatsAppMode;
    apiKey: string;
    phoneNumberId: string;
    businessAccountId: string;
    webhookVerifyToken: string;
    apiBaseUrl: string;
}

/**
 * Get current WhatsApp configuration
 * In MOCK mode: Uses fake credentials, all operations simulated
 * In PRODUCTION mode: Uses real 360Dialog credentials
 */
export function getWhatsAppConfig(): WhatsAppConfig {
    const mode = (process.env.VITE_WHATSAPP_MODE || 'MOCK') as WhatsAppMode;

    if (mode === 'PRODUCTION') {
        return {
            mode: 'PRODUCTION',
            apiKey: process.env.VITE_WHATSAPP_API_KEY || '',
            phoneNumberId: process.env.VITE_WHATSAPP_PHONE_ID || '',
            businessAccountId: process.env.VITE_WHATSAPP_BUSINESS_ID || '',
            webhookVerifyToken: process.env.VITE_WHATSAPP_WEBHOOK_TOKEN || '',
            apiBaseUrl: 'https://waba.360dialog.io/v1',
        };
    }

    // MOCK mode - safe defaults
    return {
        mode: 'MOCK',
        apiKey: 'mock_api_key_smiledesign_2026',
        phoneNumberId: 'mock_phone_905550000000',
        businessAccountId: 'mock_business_smiledesign',
        webhookVerifyToken: 'mock_webhook_verify_token',
        apiBaseUrl: 'http://localhost:3000/api/mock-whatsapp',
    };
}

/**
 * Check if running in mock mode
 */
export function isMockMode(): boolean {
    return getWhatsAppConfig().mode === 'MOCK';
}

/**
 * Log message based on mode
 */
export function logWhatsApp(message: string, data?: any): void {
    const config = getWhatsAppConfig();
    const prefix = config.mode === 'MOCK' ? '🧪 [MOCK WA]' : '📱 [WA]';

    if (data) {
        console.log(`${prefix} ${message}`, data);
    } else {
        console.log(`${prefix} ${message}`);
    }
}

// =================================================================
// Mock Data Generators
// =================================================================

/**
 * Generate a mock WhatsApp message ID
 */
export function generateMockMessageId(): string {
    return `wamid.mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a mock conversation ID
 */
export function generateMockConversationId(): string {
    return `mock_conv_${Date.now()}`;
}

// =================================================================
// Sample Patient Data (for testing)
// =================================================================

export const MOCK_PATIENTS = [
    {
        phone: '+905551234567',
        name: 'Mehmet Yılmaz',
        language: 'tr',
        interest: 'dental_implant',
    },
    {
        phone: '+447701234567',
        name: 'Sarah Johnson',
        language: 'en',
        interest: 'hollywood_smile',
    },
    {
        phone: '+491761234567',
        name: 'Klaus Mueller',
        language: 'de',
        interest: 'hair_transplant',
    },
    {
        phone: '+33612345678',
        name: 'Marie Dubois',
        language: 'fr',
        interest: 'rhinoplasty',
    },
    {
        phone: '+971501234567',
        name: 'Ahmed Al-Rashid',
        language: 'ar',
        interest: 'dental_veneer',
    },
];

export const MOCK_MESSAGES = [
    // Booking inquiries
    { text: 'Hello, I want to get dental implants. How much does it cost?', intent: 'pricing_question' },
    { text: 'Merhaba, Hollywood smile yaptırmak istiyorum', intent: 'booking_inquiry' },
    { text: 'I saw your reviews on Google. Are you available next month?', intent: 'booking_inquiry' },

    // Treatment questions
    { text: 'How long does the hair transplant procedure take?', intent: 'treatment_question' },
    { text: 'Is there any pain during the veneer procedure?', intent: 'treatment_question' },
    { text: 'What is the recovery time for rhinoplasty?', intent: 'treatment_question' },

    // Pricing questions
    { text: 'Can you send me a price list?', intent: 'pricing_question' },
    { text: 'Do you accept insurance?', intent: 'insurance_question' },
    { text: 'Is there a discount for multiple procedures?', intent: 'pricing_question' },

    // Follow-ups
    { text: 'I received the treatment plan. Everything looks good!', intent: 'positive_feedback' },
    { text: 'When should I arrive in Istanbul?', intent: 'travel_question' },
    { text: 'Can you help me book a hotel?', intent: 'accommodation_question' },

    // Complaints
    { text: "I've been waiting for a response for 2 days", intent: 'complaint' },
    { text: 'The price seems higher than other clinics', intent: 'complaint' },

    // Greetings
    { text: 'Merhaba', intent: 'greeting' },
    { text: 'Hi there!', intent: 'greeting' },
    { text: 'Good morning', intent: 'greeting' },
];

// =================================================================
// Mock Response Templates
// =================================================================

export const MOCK_RESPONSES: Record<string, string> = {
    greeting: `Hello! 👋 Welcome to SmileDesign Turkey!

I'm here to help you with your dental/aesthetic journey. How can I assist you today?`,

    pricing_question: `Thank you for your interest! 💰

Our prices vary based on your specific needs. To give you an accurate quote, could you please:

1. Tell us which treatment you're interested in
2. Share any dental X-rays or photos (if available)

A specialist will review and send you a personalized treatment plan within 24 hours! 🦷`,

    booking_inquiry: `Great choice! 🎉

We'd love to help you book your treatment. Here's how it works:

1️⃣ Send us photos/X-rays
2️⃣ Receive your treatment plan (24-48h)
3️⃣ Confirm dates & make deposit
4️⃣ We handle flights + hotel
5️⃣ Treatment in Istanbul!

Ready to start? Send us your photos! 📸`,

    treatment_question: `Great question! Let me get our specialist to answer this in detail.

In the meantime, you can:
• Browse our before/after gallery: smiledesignturkey.com/gallery
• Read patient reviews: smiledesignturkey.com/reviews

A doctor will respond within 2 hours! 👨‍⚕️`,

    positive_feedback: `That's wonderful to hear! 😊

We're excited to help you achieve your dream smile!

Next steps:
1. Confirm your travel dates
2. Make the deposit (secures your spot)
3. We'll send you all the details

Any questions? I'm here to help! 🦷✨`,

    complaint: `I apologize for any inconvenience! 😔

Your concern is important to us. Let me escalate this to our senior team immediately.

Someone will contact you within the next 30 minutes to resolve this.

Thank you for your patience! 🙏`,

    default: `Thank you for your message! 📩

A member of our team will respond shortly. In the meantime, feel free to:
• Browse our website: smiledesignturkey.com
• Check our Instagram: @smiledesignturkey

Response time: Usually within 2 hours! ⏰`,
};

// =================================================================
// Export
// =================================================================

export default {
    getConfig: getWhatsAppConfig,
    isMock: isMockMode,
    log: logWhatsApp,
    generateMessageId: generateMockMessageId,
    generateConversationId: generateMockConversationId,
    patients: MOCK_PATIENTS,
    messages: MOCK_MESSAGES,
    responses: MOCK_RESPONSES,
};
