/**
 * AI Router - Intelligent Message Processing
 * Part of: Model B++ - Smile Design Ultimate Ecosystem
 * Phase: 2 - Communication Lock
 * 
 * CREATIVE VERSION:
 * Not just "classify intent" but "understand the human"
 * Not just "respond with template" but "respond with soul"
 * 
 * Patient should feel UNDERSTOOD, not PROCESSED.
 */

// Supabase client will be used in future GPT-4 integration
// import { getSupabaseClient } from '../supabaseClient';

// =================================================================
// Types - Rich Patient Understanding
// =================================================================

export interface PatientProfile {
    // Basic analysis
    intent: string;
    sentiment: string;
    urgency: 'low' | 'medium' | 'high' | 'urgent';

    // Emotional understanding
    emotionalState: EmotionalState;
    anxietyLevel: 'calm' | 'slightly_anxious' | 'anxious' | 'very_anxious';

    // Communication style
    communicationStyle: 'formal' | 'casual' | 'friendly' | 'professional';
    preferredLanguage: string;

    // Patient journey context
    journeyStage: 'curious' | 'researching' | 'comparing' | 'decided' | 'booked';
    pricesSensitivity: 'low' | 'medium' | 'high';

    // Routing recommendation
    routing: RoutingDecision;

    // Suggested response
    suggestedResponse: SuggestedResponse;

    // Confidence
    confidence: number; // 0-1
}

export interface EmotionalState {
    primary: 'excited' | 'nervous' | 'skeptical' | 'impatient' | 'hopeful' | 'frustrated' | 'neutral';
    secondary?: string;
    triggers: string[]; // What might have caused this emotion
    needs: string[]; // What patient needs emotionally
}

export interface RoutingDecision {
    destination: 'ai_auto' | 'consultant' | 'doctor' | 'escalate';
    reason: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    suggestedConsultantType?: string; // "empathetic", "professional", "fast"
    estimatedResponseTime: string;
}

export interface SuggestedResponse {
    text: string;
    tone: 'warm' | 'professional' | 'reassuring' | 'enthusiastic' | 'empathetic';
    includeEmoji: boolean;
    followUpQuestions: string[];
    attachments?: {
        type: 'image' | 'document' | 'link';
        url?: string;
        description: string;
    }[];
}

// =================================================================
// Intent Categories - Rich Classification
// =================================================================

export const INTENTS = {
    // Information seeking
    PRICING_INQUIRY: 'pricing_inquiry',
    TREATMENT_QUESTION: 'treatment_question',
    PROCEDURE_DURATION: 'procedure_duration',
    RECOVERY_TIME: 'recovery_time',
    COMPARISON: 'comparison_request',

    // Booking journey
    BOOKING_INQUIRY: 'booking_inquiry',
    SCHEDULE_REQUEST: 'schedule_request',
    AVAILABILITY_CHECK: 'availability_check',
    CONFIRMATION_REQUEST: 'confirmation_request',

    // Support
    COMPLAINT: 'complaint',
    URGENT_MEDICAL: 'urgent_medical',
    PAYMENT_ISSUE: 'payment_issue',
    TRAVEL_HELP: 'travel_assistance',

    // Relationship
    GREETING: 'greeting',
    THANK_YOU: 'gratitude',
    POSITIVE_FEEDBACK: 'positive_feedback',
    REFERRAL: 'referral_intention',

    // Uncertainty
    HESITATION: 'hesitation',
    FEAR_EXPRESSION: 'fear_expression',
    SKEPTICISM: 'skepticism',

    // Unknown
    GENERAL: 'general_inquiry',
} as const;

// =================================================================
// Emotion Detection Patterns
// =================================================================

const EMOTION_PATTERNS = {
    excited: [
        'can\'t wait', 'excited', 'looking forward', 'finally', 'dream come true',
        'so happy', 'let\'s do this', 'ready for', 'sabırsızlanıyorum', 'heyecanlıyım'
    ],
    nervous: [
        'scared', 'afraid', 'nervous', 'worried', 'anxious', 'what if',
        'is it safe', 'does it hurt', 'korkuyorum', 'endişeliyim', 'acır mı'
    ],
    skeptical: [
        'seems too', 'how do i know', 'is this real', 'scam', 'trust',
        'reviews say', 'other clinics', 'güvenilir mi', 'gerçek mi'
    ],
    impatient: [
        'when', 'how long', 'still waiting', 'no response', 'urgent',
        'quick', 'hurry', 'asap', 'hala cevap yok', 'acil'
    ],
    hopeful: [
        'hope', 'wish', 'maybe', 'could you', 'would love', 'dreaming',
        'always wanted', 'umarım', 'hep isterdim'
    ],
    frustrated: [
        'frustrated', 'disappointed', 'annoyed', 'keep asking', 'already told',
        'this is the third', 'problems', 'sinirli', 'hayal kırıklığı'
    ],
};

const ANXIETY_INDICATORS = {
    high: ['terrified', 'very scared', 'panic', 'can\'t sleep', 'nightmares'],
    medium: ['worried', 'nervous', 'anxious', 'concerned', 'unsure'],
    low: ['wondering', 'curious', 'interested', 'thinking about'],
};

// =================================================================
// Core AI Functions
// =================================================================

/**
 * Analyze a patient message with emotional intelligence
 * Returns rich understanding, not just classification
 */
export async function analyzeMessage(
    content: string,
    conversationHistory?: string[],
    patientMetadata?: Record<string, any>
): Promise<PatientProfile> {
    // 1. Detect language
    const language = detectLanguage(content);

    // 2. Classify intent
    const intent = classifyIntent(content);

    // 3. Analyze sentiment
    const sentiment = analyzeSentiment(content);

    // 4. Detect emotional state with depth
    const emotionalState = detectEmotionalState(content, conversationHistory);

    // 5. Assess anxiety level (important for medical context)
    const anxietyLevel = assessAnxietyLevel(content, emotionalState);

    // 6. Determine communication style preference
    const communicationStyle = detectCommunicationStyle(content);

    // 7. Identify journey stage
    const journeyStage = identifyJourneyStage(content, patientMetadata);

    // 8. Detect price sensitivity
    const priceSensitivity = detectPriceSensitivity(content);

    // 9. Determine urgency
    const urgency = determineUrgency(content, intent, emotionalState);

    // 10. Make routing decision
    const routing = makeRoutingDecision(intent, emotionalState, urgency, anxietyLevel);

    // 11. Generate suggested response with empathy
    const suggestedResponse = generateSuggestedResponse(
        content, intent, emotionalState, communicationStyle, language
    );

    return {
        intent,
        sentiment,
        urgency,
        emotionalState,
        anxietyLevel,
        communicationStyle,
        preferredLanguage: language,
        journeyStage,
        pricesSensitivity: priceSensitivity,
        routing,
        suggestedResponse,
        confidence: calculateConfidence(content, intent, emotionalState),
    };
}

// =================================================================
// Detection Functions
// =================================================================

function detectLanguage(text: string): string {
    const turkishChars = /[çğıöşüÇĞİÖŞÜ]/;
    const arabicChars = /[\u0600-\u06FF]/;
    const germanChars = /[äöüßÄÖÜ]/;

    if (turkishChars.test(text)) return 'tr';
    if (arabicChars.test(text)) return 'ar';
    if (germanChars.test(text)) return 'de';

    // Check common words
    const lower = text.toLowerCase();
    if (lower.includes('merhaba') || lower.includes('teşekkür') || lower.includes('ederim')) return 'tr';
    if (lower.includes('guten') || lower.includes('danke') || lower.includes('bitte')) return 'de';
    if (lower.includes('bonjour') || lower.includes('merci') || lower.includes('s\'il')) return 'fr';

    return 'en';
}

function classifyIntent(text: string): string {
    const lower = text.toLowerCase();

    // Price/cost questions
    if (lower.match(/price|cost|how much|fiyat|ücret|kaç|euro|dollar|pound|\$|€|£/)) {
        return INTENTS.PRICING_INQUIRY;
    }

    // Booking
    if (lower.match(/book|appointment|schedule|reserve|randevu|rezerv|tarih|when can/)) {
        return INTENTS.BOOKING_INQUIRY;
    }

    // Treatment questions
    if (lower.match(/what is|how does|procedure|treatment|tedavi|nasıl|nedir/)) {
        return INTENTS.TREATMENT_QUESTION;
    }

    // Duration
    if (lower.match(/how long|duration|days|time|süre|gün|hafta|kaç gün/)) {
        return INTENTS.PROCEDURE_DURATION;
    }

    // Recovery
    if (lower.match(/recovery|heal|after|pain|ağrı|iyileşme|sonra/)) {
        return INTENTS.RECOVERY_TIME;
    }

    // Fear
    if (lower.match(/scared|afraid|nervous|fear|kork|endişe|acı|hurt/)) {
        return INTENTS.FEAR_EXPRESSION;
    }

    // Comparison
    if (lower.match(/other clinic|compare|better than|elsewhere|başka|karşılaştır/)) {
        return INTENTS.COMPARISON;
    }

    // Complaint
    if (lower.match(/complaint|problem|issue|disappointed|sorun|şikayet|memnun değil/)) {
        return INTENTS.COMPLAINT;
    }

    // Urgent medical
    if (lower.match(/emergency|bleeding|severe pain|urgent|acil|kanama|şiddetli ağrı/)) {
        return INTENTS.URGENT_MEDICAL;
    }

    // Gratitude
    if (lower.match(/thank|thanks|grateful|teşekkür|sağol|eyvallah/)) {
        return INTENTS.THANK_YOU;
    }

    // Greeting
    if (lower.match(/^(hi|hello|hey|merhaba|selam|good morning|good evening)/)) {
        return INTENTS.GREETING;
    }

    return INTENTS.GENERAL;
}

function analyzeSentiment(text: string): string {
    const lower = text.toLowerCase();

    const positiveWords = [
        'thank', 'great', 'love', 'excellent', 'happy', 'excited', 'amazing',
        'perfect', 'wonderful', 'teşekkür', 'harika', 'mükemmel', 'çok güzel'
    ];

    const negativeWords = [
        'bad', 'terrible', 'hate', 'disappointed', 'angry', 'frustrated',
        'worst', 'kötü', 'berbat', 'sinirli', 'memnun değil'
    ];

    const positiveCount = positiveWords.filter(w => lower.includes(w)).length;
    const negativeCount = negativeWords.filter(w => lower.includes(w)).length;

    if (positiveCount > negativeCount + 1) return 'very_positive';
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount + 1) return 'very_negative';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
}

function detectEmotionalState(
    text: string,
    _history?: string[]
): EmotionalState {
    const lower = text.toLowerCase();

    // Check each emotion pattern
    let primaryEmotion: EmotionalState['primary'] = 'neutral';
    let maxMatches = 0;

    for (const [emotion, patterns] of Object.entries(EMOTION_PATTERNS)) {
        const matches = patterns.filter(p => lower.includes(p)).length;
        if (matches > maxMatches) {
            maxMatches = matches;
            primaryEmotion = emotion as EmotionalState['primary'];
        }
    }

    // Determine triggers and needs based on emotion
    const triggers: string[] = [];
    const needs: string[] = [];

    switch (primaryEmotion) {
        case 'nervous':
            triggers.push('Medical procedure anxiety', 'Unknown outcomes');
            needs.push('Reassurance', 'Detailed information', 'Success stories');
            break;
        case 'skeptical':
            triggers.push('Past experiences', 'Online research');
            needs.push('Social proof', 'Credentials', 'Transparent communication');
            break;
        case 'impatient':
            triggers.push('Waiting for response', 'Time sensitivity');
            needs.push('Quick response', 'Clear timeline', 'Immediate action');
            break;
        case 'excited':
            triggers.push('Decision made', 'Positive expectations');
            needs.push('Validation', 'Clear next steps', 'Enthusiasm matching');
            break;
        case 'frustrated':
            triggers.push('Poor experience', 'Unmet expectations');
            needs.push('Acknowledgment', 'Solution', 'Escalation');
            break;
        case 'hopeful':
            triggers.push('Life improvement desire', 'Confidence seeking');
            needs.push('Encouragement', 'Realistic expectations', 'Support');
            break;
        default:
            needs.push('Information', 'Clear communication');
    }

    return {
        primary: primaryEmotion,
        triggers,
        needs,
    };
}

function assessAnxietyLevel(
    text: string,
    emotionalState: EmotionalState
): PatientProfile['anxietyLevel'] {
    const lower = text.toLowerCase();

    // Check high anxiety indicators
    if (ANXIETY_INDICATORS.high.some(w => lower.includes(w))) {
        return 'very_anxious';
    }

    // Check medium anxiety
    if (ANXIETY_INDICATORS.medium.some(w => lower.includes(w))) {
        return 'anxious';
    }

    // Nervous emotion often indicates anxiety
    if (emotionalState.primary === 'nervous') {
        return 'anxious';
    }

    // Check low anxiety/curiosity
    if (ANXIETY_INDICATORS.low.some(w => lower.includes(w))) {
        return 'slightly_anxious';
    }

    return 'calm';
}

function detectCommunicationStyle(text: string): PatientProfile['communicationStyle'] {
    // Formal indicators
    const formalPatterns = /dear|sir|madam|respectfully|kindly|sayın|saygılarımla/i;
    if (formalPatterns.test(text)) return 'formal';

    // Casual indicators - escape special regex characters
    const casualPatterns = /hey|yo|sup|what's up|haha|lol|:\)|:D|😊|👋/;
    if (casualPatterns.test(text)) return 'casual';

    // Friendly but professional
    if (text.includes('!') || text.includes('😊') || text.includes('🙏')) {
        return 'friendly';
    }

    return 'professional';
}

function identifyJourneyStage(
    text: string,
    metadata?: Record<string, any>
): PatientProfile['journeyStage'] {
    const lower = text.toLowerCase();

    if (lower.match(/just wondering|curious|considering|düşünüyorum/)) return 'curious';
    if (lower.match(/comparing|research|looking at|araştırıyorum/)) return 'researching';
    if (lower.match(/better than|choose between|which one|hangisi/)) return 'comparing';
    if (lower.match(/want to book|ready|let's do|karar verdim/)) return 'decided';
    if (metadata?.hasBooking) return 'booked';

    return 'researching';
}

function detectPriceSensitivity(text: string): PatientProfile['pricesSensitivity'] {
    const lower = text.toLowerCase();

    if (lower.match(/cheapest|discount|budget|too expensive|pahalı|indirim/)) {
        return 'high';
    }
    if (lower.match(/price|cost|how much|fiyat|kaç/)) {
        return 'medium';
    }
    return 'low';
}

function determineUrgency(
    text: string,
    intent: string,
    emotionalState: EmotionalState
): PatientProfile['urgency'] {
    // Urgent medical is always urgent
    if (intent === INTENTS.URGENT_MEDICAL) return 'urgent';

    // Complaints are high priority
    if (intent === INTENTS.COMPLAINT) return 'high';

    // Frustrated patients need quick response
    if (emotionalState.primary === 'frustrated' || emotionalState.primary === 'impatient') {
        return 'high';
    }

    // Very anxious patients need attention
    const lower = text.toLowerCase();
    if (lower.match(/urgent|asap|immediately|acil|hemen/)) return 'high';

    // Booking inquiries are medium priority
    if (intent === INTENTS.BOOKING_INQUIRY) return 'medium';

    return 'low';
}

// =================================================================
// Routing Intelligence
// =================================================================

function makeRoutingDecision(
    intent: string,
    emotionalState: EmotionalState,
    _urgency: PatientProfile['urgency'],
    anxietyLevel: PatientProfile['anxietyLevel']
): RoutingDecision {
    // Urgent medical = immediate escalation
    if (intent === INTENTS.URGENT_MEDICAL) {
        return {
            destination: 'escalate',
            reason: 'Medical emergency requires immediate human attention',
            priority: 'urgent',
            estimatedResponseTime: 'Immediately',
        };
    }

    // Complaints = senior consultant
    if (intent === INTENTS.COMPLAINT) {
        return {
            destination: 'consultant',
            reason: 'Complaint handling requires human empathy and problem-solving',
            priority: 'high',
            suggestedConsultantType: 'senior',
            estimatedResponseTime: 'Within 15 minutes',
        };
    }

    // Very anxious patients = empathetic consultant
    if (anxietyLevel === 'very_anxious') {
        return {
            destination: 'consultant',
            reason: 'High anxiety patient needs human reassurance',
            priority: 'high',
            suggestedConsultantType: 'empathetic',
            estimatedResponseTime: 'Within 10 minutes',
        };
    }

    // Frustrated patients = fast consultant
    if (emotionalState.primary === 'frustrated' || emotionalState.primary === 'impatient') {
        return {
            destination: 'consultant',
            reason: 'Patient frustration requires immediate human attention',
            priority: 'high',
            suggestedConsultantType: 'fast',
            estimatedResponseTime: 'Within 5 minutes',
        };
    }

    // Treatment questions = may need doctor
    if (intent === INTENTS.TREATMENT_QUESTION) {
        return {
            destination: 'ai_auto',
            reason: 'AI can handle general treatment questions with option to escalate',
            priority: 'normal',
            estimatedResponseTime: 'Within 30 seconds',
        };
    }

    // Simple inquiries = AI handles
    if ([INTENTS.GREETING, INTENTS.PRICING_INQUIRY, INTENTS.GENERAL].includes(intent as any)) {
        return {
            destination: 'ai_auto',
            reason: 'Standard inquiry that AI can handle effectively',
            priority: 'normal',
            estimatedResponseTime: 'Within 30 seconds',
        };
    }

    // Default = consultant
    return {
        destination: 'consultant',
        reason: 'Complex inquiry requiring human judgment',
        priority: 'normal',
        suggestedConsultantType: 'professional',
        estimatedResponseTime: 'Within 30 minutes',
    };
}

// =================================================================
// Response Generation with Soul
// =================================================================

function generateSuggestedResponse(
    _originalMessage: string,
    intent: string,
    emotionalState: EmotionalState,
    style: PatientProfile['communicationStyle'],
    language: string
): SuggestedResponse {
    // Determine appropriate tone based on emotional state
    let tone: SuggestedResponse['tone'] = 'professional';

    if (emotionalState.primary === 'nervous' || emotionalState.primary === 'hopeful') {
        tone = 'reassuring';
    } else if (emotionalState.primary === 'excited') {
        tone = 'enthusiastic';
    } else if (emotionalState.primary === 'frustrated' || emotionalState.primary === 'skeptical') {
        tone = 'empathetic';
    } else if (style === 'casual' || style === 'friendly') {
        tone = 'warm';
    }

    // Generate response based on intent and emotion
    const response = getResponseForIntent(intent, emotionalState, tone, language);

    return {
        text: response.text,
        tone,
        includeEmoji: style === 'casual' || style === 'friendly',
        followUpQuestions: response.followUps,
        attachments: response.attachments,
    };
}

function getResponseForIntent(
    intent: string,
    emotionalState: EmotionalState,
    _tone: SuggestedResponse['tone'],
    language: string
): { text: string; followUps: string[]; attachments?: any[] } {
    // English responses (TR would be similar structure)
    const isEnglish = language === 'en';

    switch (intent) {
        case INTENTS.GREETING:
            return {
                text: isEnglish
                    ? `Hello! 👋 Welcome to Smile Design Turkey! I'm here to help you start your journey to a beautiful smile. How can I assist you today?`
                    : `Merhaba! 👋 Smile Design Turkey'e hoş geldiniz! Size güzel bir gülüş yolculuğuna başlamanızda yardımcı olmak için buradayım. Bugün size nasıl yardımcı olabilirim?`,
                followUps: isEnglish
                    ? ['What treatment are you interested in?', 'Have you had a consultation before?']
                    : ['Hangi tedaviyle ilgileniyorsunuz?', 'Daha önce danışmanlık aldınız mı?'],
            };

        case INTENTS.PRICING_INQUIRY:
            const priceIntro = emotionalState.primary === 'nervous'
                ? (isEnglish
                    ? `I understand getting clear pricing is important for your decision. Let me help you understand our transparent pricing:`
                    : `Karar vermeniz için net fiyatlandırmanın önemli olduğunu anlıyorum. Şeffaf fiyatlandırmamızı size açıklayayım:`)
                : (isEnglish
                    ? `Great question! Here's how our pricing works:`
                    : `Harika bir soru! Fiyatlandırmamız şöyle çalışıyor:`);

            return {
                text: priceIntro + (isEnglish
                    ? `\n\n💰 Our prices include:\n• All clinical treatments\n• 4-5 star hotel accommodation\n• VIP airport transfers\n• Dedicated personal consultant\n\nTo give you an accurate quote, could you share which treatment you're interested in?`
                    : `\n\n💰 Fiyatlarımıza dahil olan:\n• Tüm klinik tedaviler\n• 4-5 yıldızlı otel konaklaması\n• VIP havaalanı transferleri\n• Özel kişisel danışman\n\nSize doğru bir fiyat teklifi verebilmem için hangi tedaviyle ilgilendiğinizi paylaşır mısınız?`),
                followUps: isEnglish
                    ? ['Which treatment are you considering?', 'Do you have dental X-rays we can review?']
                    : ['Hangi tedaviyi düşünüyorsunuz?', 'İnceleyebileceğimiz diş röntgeniniz var mı?'],
            };

        case INTENTS.FEAR_EXPRESSION:
            return {
                text: isEnglish
                    ? `I completely understand - it's normal to feel nervous about dental procedures! 🤗\n\nLet me reassure you:\n• Our doctors have 15+ years of experience\n• We use the latest painless techniques\n• 98% of patients rate their experience as "comfortable"\n• Your personal consultant will be with you every step\n\nWould you like to speak with Sarah? She specializes in helping nervous patients feel at ease. She's helped over 200 patients just like you! 💙`
                    : `Sizi tamamen anlıyorum - diş işlemleri konusunda gergin hissetmek çok normal! 🤗\n\nSizi rahatlatayım:\n• Doktorlarımız 15+ yıllık deneyime sahip\n• En son ağrısız teknikleri kullanıyoruz\n• Hastaların %98'i deneyimlerini "rahat" olarak değerlendiriyor\n• Kişisel danışmanınız her adımda yanınızda olacak\n\nEmpatik danışmanımız Sarah ile konuşmak ister misiniz? Sizin gibi 200'den fazla hastaya yardımcı oldu! 💙`,
                followUps: isEnglish
                    ? ['Would you like to talk to a patient who had the same concerns?', 'Can I share some success stories with you?']
                    : ['Aynı endişeleri yaşamış bir hastayla konuşmak ister misiniz?', 'Sizinle bazı başarı hikayeleri paylaşabilir miyim?'],
            };

        case INTENTS.BOOKING_INQUIRY:
            const bookingIntro = emotionalState.primary === 'excited'
                ? (isEnglish
                    ? `Amazing! I love your enthusiasm! 🎉 Let's get you booked:`
                    : `Harika! Heyecanınızı seviyorum! 🎉 Hadi sizi randevuya alalım:`)
                : (isEnglish
                    ? `Great decision! Here's how the booking process works:`
                    : `Harika karar! Rezervasyon süreci şöyle işliyor:`);

            return {
                text: bookingIntro + (isEnglish
                    ? `\n\n📋 **Your Journey:**\n1. Share your photos/X-rays\n2. Receive personalized treatment plan (24-48h)\n3. Confirm dates & small deposit\n4. We arrange flights, hotel, everything!\n5. Arrive, get treated, smile home! ✨\n\nReady to start? Just send your photos and our team will prepare your plan!`
                    : `\n\n📋 **Yolculuğunuz:**\n1. Fotoğraf/röntgenlerinizi paylaşın\n2. Kişiselleştirilmiş tedavi planı alın (24-48 saat)\n3. Tarihleri & küçük depozitoyu onaylayın\n4. Uçuşlar, otel, her şeyi biz ayarlayız!\n5. Gelin, tedavi olun, gülümseyerek eve dönün! ✨\n\nBaşlamaya hazır mısınız? Fotoğraflarınızı gönderin, ekibimiz planınızı hazırlasın!`),
                followUps: isEnglish
                    ? ['What dates work best for you?', 'Do you have photos ready to share?']
                    : ['Hangi tarihler size uygun?', 'Paylaşmaya hazır fotoğraflarınız var mı?'],
                attachments: [{
                    type: 'document' as const,
                    description: 'Treatment Guide PDF',
                }],
            };

        case INTENTS.COMPLAINT:
            return {
                text: isEnglish
                    ? `I'm truly sorry to hear you're having an issue. 🙏 Your experience matters deeply to us.\n\nI'm escalating this to our senior patient relations team right now. Someone will personally reach out to you within 15 minutes.\n\nIn the meantime, could you share more details about what happened? I want to make sure we address this properly.`
                    : `Bir sorun yaşadığınızı duyduğuma gerçekten üzüldüm. 🙏 Deneyiminiz bizim için çok önemli.\n\nBunu hemen kıdemli hasta ilişkileri ekibimize iletiyorum. 15 dakika içinde biri size şahsen ulaşacak.\n\nBu arada, ne olduğu hakkında daha fazla ayrıntı paylaşabilir misiniz? Bunu düzgün bir şekilde ele aldığımızdan emin olmak istiyorum.`,
                followUps: isEnglish
                    ? ['What happened exactly?', 'When did this occur?', 'How can we make this right?']
                    : ['Tam olarak ne oldu?', 'Bu ne zaman gerçekleşti?', 'Bunu nasıl düzeltebiliriz?'],
            };

        default:
            return {
                text: isEnglish
                    ? `Thank you for reaching out! 😊 I'm here to help you with anything related to your dental journey.\n\nCould you tell me a bit more about what you're looking for? Whether it's treatment information, pricing, or just some questions - I'm all ears!`
                    : `Ulaştığınız için teşekkürler! 😊 Diş yolculuğunuzla ilgili her konuda size yardımcı olmak için buradayım.\n\nNe aradığınız hakkında biraz daha bilgi verebilir misiniz? Tedavi bilgisi, fiyatlandırma veya sadece birkaç soru olsun - sizi dinliyorum!`,
                followUps: isEnglish
                    ? ['What treatment are you interested in?', 'Is this your first dental tourism experience?']
                    : ['Hangi tedaviyle ilgileniyorsunuz?', 'Bu ilk diş turizmi deneyiminiz mi?'],
            };
    }
}

function calculateConfidence(
    text: string,
    intent: string,
    emotionalState: EmotionalState
): number {
    let confidence = 0.7; // Base confidence

    // Longer messages give more context
    if (text.length > 100) confidence += 0.1;

    // Clear intent patterns increase confidence
    if (intent !== INTENTS.GENERAL) confidence += 0.1;

    // Non-neutral emotion increases confidence
    if (emotionalState.primary !== 'neutral') confidence += 0.05;

    return Math.min(confidence, 0.95);
}

// =================================================================
// Export
// =================================================================

export default {
    analyzeMessage,
    INTENTS,
};
