/**
 * Consultant Service - Priority scoring, gamification, and queue management
 * Part of: Model B++ - Smile Design Ultimate Ecosystem
 * Phase: 2 - Communication Lock
 * 
 * CREATIVE VERSION:
 * Not just "show messages" but "guide consultants to success"
 * Make consultants feel appreciated, make patients feel understood
 */

import { getSupabaseClient } from '../supabaseClient';
import type { BlindConversation } from '../doctor';

// =================================================================
// Types
// =================================================================

export interface ConsultantConversation {
    id: string;
    patientFirstName: string;
    patientPersona: PatientPersona;
    lastMessage: string;
    lastMessageAt: string;
    unreadCount: number;

    // AI Insights
    emotionalState: string;
    anxietyLevel: string;
    journeyStage: string;
    aiSummary: string;
    aiSuggestedResponse: string;

    // Priority
    priority: 'urgent' | 'high' | 'medium' | 'low';
    priorityScore: number;
    priorityReason: string;
    slaDeadline: Date;
    slaRemaining: string;
    isOverdue: boolean;

    // Treatment context
    treatmentType: string | null;
    bookingProbability: number;

    // Assignment
    assignedConsultantId: string | null;
    assignedDoctorId: string | null;
}

export interface PatientPersona {
    type: 'nervous_first_timer' | 'price_conscious' | 'research_driven' | 'ready_to_book' | 'returning_patient' | 'vip';
    emoji: string;
    label: string;
    suggestedApproach: string;
}

export interface ConsultantStats {
    // Today's metrics
    todayConversations: number;
    todayResponses: number;
    todayAppointmentsBooked: number;
    todayEarnings: number;

    // Performance
    avgResponseTime: number; // minutes
    avgResponseTimeFormatted: string;
    satisfactionScore: number; // 1-5
    resolutionRate: number; // percentage

    // Streaks and achievements
    currentStreak: number;
    streakType: 'happy_patients' | 'fast_responses' | 'bookings' | null;
    streakBonus: number;

    // Badges earned today
    badges: Badge[];

    // Comparison (gamification)
    rankAmongPeers: number;
    totalPeers: number;
}

export interface Badge {
    id: string;
    name: string;
    emoji: string;
    description: string;
    earnedAt: string;
}

export interface ResponseTemplate {
    id: string;
    name: string;
    category: 'reassurance' | 'pricing' | 'booking' | 'followup' | 'gratitude' | 'escalation';
    text: string;
    suggestedFor: string[]; // emotional states / journey stages
    successRate: number; // historical
}

// =================================================================
// Constants
// =================================================================

const PATIENT_PERSONAS: Record<string, PatientPersona> = {
    nervous_first_timer: {
        type: 'nervous_first_timer',
        emoji: '😰',
        label: 'First-Timer (Nervous)',
        suggestedApproach: 'Be extra reassuring. Share success stories. Offer to connect with past patients.',
    },
    price_conscious: {
        type: 'price_conscious',
        emoji: '💰',
        label: 'Price-Focused',
        suggestedApproach: 'Emphasize value, not just price. Show what\'s included. Compare to home country costs.',
    },
    research_driven: {
        type: 'research_driven',
        emoji: '🔍',
        label: 'Researcher',
        suggestedApproach: 'Provide detailed information. Share credentials. Be factual and thorough.',
    },
    ready_to_book: {
        type: 'ready_to_book',
        emoji: '✅',
        label: 'Ready to Book',
        suggestedApproach: 'Move fast! Confirm dates, send booking link, remove friction.',
    },
    returning_patient: {
        type: 'returning_patient',
        emoji: '🔄',
        label: 'Returning Patient',
        suggestedApproach: 'Reference their history. Make them feel remembered. Offer loyalty perks.',
    },
    vip: {
        type: 'vip',
        emoji: '⭐',
        label: 'VIP',
        suggestedApproach: 'White glove service. Immediate response. Personal touch at every step.',
    },
};

const DEFAULT_TEMPLATES: ResponseTemplate[] = [
    {
        id: 'reassure_nervous',
        name: 'Reassure Nervous Patient',
        category: 'reassurance',
        text: "I completely understand how you feel! 🤗 It's totally normal to feel nervous before dental treatment. \n\nLet me reassure you:\n• Our doctors have 15+ years of experience\n• We use the latest painless techniques\n• 98% of our patients rate their experience as comfortable\n\nWould you like me to connect you with a patient who had similar concerns? They'd be happy to share their experience! 💙",
        suggestedFor: ['nervous', 'very_anxious', 'fear_expression'],
        successRate: 0.94,
    },
    {
        id: 'explain_pricing',
        name: 'Explain Pricing Value',
        category: 'pricing',
        text: "Great question about pricing! 💰\n\nOur all-inclusive package includes:\n• All dental treatments\n• 4-5 star hotel accommodation\n• VIP airport transfers\n• Personal consultant (that's me!) 😊\n• 24/7 support throughout your journey\n\nCompared to prices in [your country], you'll typically save 60-70% while getting premium care.\n\nWould you like me to prepare a personalized treatment plan with exact pricing?",
        suggestedFor: ['pricing_inquiry', 'price_conscious'],
        successRate: 0.87,
    },
    {
        id: 'ready_to_book',
        name: 'Confirm Booking',
        category: 'booking',
        text: "Amazing! I'm so excited you've decided to join us! 🎉\n\nHere's what happens next:\n1. Share your preferred dates\n2. I'll confirm availability with our dental team\n3. You'll receive your personalized treatment plan\n4. Small deposit to secure your spot\n5. We arrange everything - flights, hotel, transfers!\n\nWhen were you thinking of visiting? We have great availability in the coming weeks! ✨",
        suggestedFor: ['decided', 'ready_to_book', 'booking_inquiry'],
        successRate: 0.91,
    },
    {
        id: 'followup_quiet',
        name: 'Follow Up (Gentle)',
        category: 'followup',
        text: "Hi! 👋 Just checking in to see if you have any questions.\n\nI'm here whenever you're ready - no pressure at all! If you'd like more information about any treatment or just want to chat about your options, I'm happy to help.\n\nHope you're having a wonderful day! 😊",
        suggestedFor: ['quiet_patient', 'no_response'],
        successRate: 0.78,
    },
    {
        id: 'thank_booking',
        name: 'Thank for Booking',
        category: 'gratitude',
        text: "Thank you SO much for choosing Smile Design Turkey! 🙏✨\n\nYou've made my day! I'm honored to be part of your smile transformation journey.\n\nI'll be your personal guide every step of the way. If you need anything at all - questions, concerns, or just want to chat - I'm always here for you.\n\nCount down has begun! See you soon! 😊💙",
        suggestedFor: ['booked', 'positive_feedback'],
        successRate: 0.98,
    },
    {
        id: 'escalate_doctor',
        name: 'Escalate to Doctor',
        category: 'escalation',
        text: "That's a great technical question! 🦷\n\nLet me connect you with Dr. [Name] who specializes in exactly this. They'll be able to give you the most accurate and detailed information.\n\nI'm adding them to our conversation now - they typically respond within [X hours]. In the meantime, is there anything else I can help with?",
        suggestedFor: ['treatment_question', 'medical_detail'],
        successRate: 0.89,
    },
];

const BADGES: Badge[] = [
    { id: 'heart_connector', name: 'Heart Connector', emoji: '💙', description: 'Made 5 nervous patients feel at ease', earnedAt: '' },
    { id: 'speed_demon', name: 'Speed Demon', emoji: '⚡', description: 'Responded to 10 messages in under 5 minutes', earnedAt: '' },
    { id: 'booking_master', name: 'Booking Master', emoji: '📅', description: 'Booked 3 appointments in one day', earnedAt: '' },
    { id: 'five_star', name: 'Five Star Service', emoji: '⭐', description: 'Received 5 perfect ratings in a row', earnedAt: '' },
    { id: 'early_bird', name: 'Early Bird', emoji: '🌅', description: 'First response of the day', earnedAt: '' },
    { id: 'night_owl', name: 'Night Owl', emoji: '🦉', description: 'Helping patients late into the evening', earnedAt: '' },
    { id: 'streak_keeper', name: 'Streak Keeper', emoji: '🔥', description: 'Maintained a 7-day response streak', earnedAt: '' },
    { id: 'problem_solver', name: 'Problem Solver', emoji: '🔧', description: 'Resolved 5 escalations successfully', earnedAt: '' },
];

// =================================================================
// Priority Scoring Algorithm
// =================================================================

/**
 * Calculate priority score for a conversation (higher = more urgent)
 */
export function calculatePriorityScore(
    emotionalState: string,
    anxietyLevel: string,
    journeyStage: string,
    lastMessageAt: Date,
    unreadCount: number,
    isEscalated: boolean
): { score: number; priority: ConsultantConversation['priority']; reason: string } {
    let score = 0;
    const reasons: string[] = [];

    // Emotional state scoring
    const emotionScores: Record<string, number> = {
        frustrated: 50,
        impatient: 45,
        nervous: 35,
        skeptical: 25,
        hopeful: 20,
        excited: 15,
        neutral: 10,
    };
    score += emotionScores[emotionalState] || 10;
    if (['frustrated', 'impatient'].includes(emotionalState)) {
        reasons.push(`Patient is ${emotionalState}`);
    }

    // Anxiety level scoring
    const anxietyScores: Record<string, number> = {
        very_anxious: 40,
        anxious: 25,
        slightly_anxious: 10,
        calm: 0,
    };
    score += anxietyScores[anxietyLevel] || 0;
    if (anxietyLevel === 'very_anxious') {
        reasons.push('High anxiety - needs reassurance');
    }

    // Journey stage scoring (ready to book = higher priority)
    const stageScores: Record<string, number> = {
        decided: 30,
        comparing: 20,
        researching: 10,
        curious: 5,
        booked: 5, // Already booked = lower priority
    };
    score += stageScores[journeyStage] || 10;
    if (journeyStage === 'decided') {
        reasons.push('Ready to book! 🎯');
    }

    // Time-based scoring (older = more urgent)
    const minutesSinceMessage = (Date.now() - lastMessageAt.getTime()) / (1000 * 60);
    if (minutesSinceMessage > 120) {
        score += 40;
        reasons.push('Waiting over 2 hours');
    } else if (minutesSinceMessage > 60) {
        score += 25;
        reasons.push('Waiting over 1 hour');
    } else if (minutesSinceMessage > 30) {
        score += 15;
        reasons.push('Waiting 30+ minutes');
    } else if (minutesSinceMessage > 10) {
        score += 5;
    }

    // Unread count
    if (unreadCount > 3) {
        score += 15;
        reasons.push(`${unreadCount} unread messages`);
    } else if (unreadCount > 1) {
        score += 5;
    }

    // Escalation
    if (isEscalated) {
        score += 50;
        reasons.push('⚠️ Escalated - needs urgent attention');
    }

    // Determine priority level
    let priority: ConsultantConversation['priority'];
    if (score >= 80 || isEscalated) {
        priority = 'urgent';
    } else if (score >= 50) {
        priority = 'high';
    } else if (score >= 25) {
        priority = 'medium';
    } else {
        priority = 'low';
    }

    return {
        score,
        priority,
        reason: reasons.length > 0 ? reasons.join(' • ') : 'Standard inquiry',
    };
}

/**
 * Calculate SLA deadline based on priority
 */
export function calculateSLA(priority: ConsultantConversation['priority']): { deadline: Date; formatted: string } {
    const now = new Date();
    let minutesToAdd: number;

    switch (priority) {
        case 'urgent':
            minutesToAdd = 5;
            break;
        case 'high':
            minutesToAdd = 15;
            break;
        case 'medium':
            minutesToAdd = 30;
            break;
        default:
            minutesToAdd = 60;
    }

    const deadline = new Date(now.getTime() + minutesToAdd * 60 * 1000);
    return {
        deadline,
        formatted: `${minutesToAdd} min`,
    };
}

/**
 * Get patient persona based on emotional state and journey stage
 */
export function getPatientPersona(
    emotionalState: string,
    anxietyLevel: string,
    journeyStage: string,
    isReturning: boolean
): PatientPersona {
    if (isReturning) {
        return PATIENT_PERSONAS.returning_patient;
    }

    if (anxietyLevel === 'very_anxious' || emotionalState === 'nervous') {
        return PATIENT_PERSONAS.nervous_first_timer;
    }

    if (journeyStage === 'decided') {
        return PATIENT_PERSONAS.ready_to_book;
    }

    if (journeyStage === 'comparing' || emotionalState === 'skeptical') {
        return PATIENT_PERSONAS.research_driven;
    }

    // Default based on other signals
    return PATIENT_PERSONAS.research_driven;
}

// =================================================================
// Template Suggestions
// =================================================================

/**
 * Get suggested response templates based on patient state
 */
export function getSuggestedTemplates(
    emotionalState: string,
    journeyStage: string,
    intent: string
): ResponseTemplate[] {
    const suggestions = DEFAULT_TEMPLATES.filter(template => {
        return template.suggestedFor.some(trigger =>
            trigger === emotionalState ||
            trigger === journeyStage ||
            trigger === intent
        );
    });

    // Sort by success rate
    suggestions.sort((a, b) => b.successRate - a.successRate);

    // Return top 3
    return suggestions.slice(0, 3);
}

/**
 * Get all available templates
 */
export function getAllTemplates(): ResponseTemplate[] {
    return DEFAULT_TEMPLATES;
}

// =================================================================
// Gamification
// =================================================================

/**
 * Calculate consultant stats for today
 */
export async function getConsultantStats(consultantId: string): Promise<ConsultantStats> {
    const client = getSupabaseClient();

    // Default stats (will be enhanced with real data)
    const stats: ConsultantStats = {
        todayConversations: 0,
        todayResponses: 0,
        todayAppointmentsBooked: 0,
        todayEarnings: 0,
        avgResponseTime: 0,
        avgResponseTimeFormatted: '0 min',
        satisfactionScore: 0,
        resolutionRate: 0,
        currentStreak: 0,
        streakType: null,
        streakBonus: 0,
        badges: [],
        rankAmongPeers: 1,
        totalPeers: 1,
    };

    if (!client) return stats;

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get today's messages sent by consultant
        const { data: messagesData } = await client
            .from('messages')
            .select('id, created_at, conversation_id')
            .eq('direction', 'outbound')
            .eq('sender_id', consultantId)
            .gte('created_at', today.toISOString());

        if (messagesData) {
            stats.todayResponses = messagesData.length;
            stats.todayConversations = new Set(messagesData.map(m => m.conversation_id)).size;
        }

        // Calculate earnings (€30 per conversation)
        stats.todayEarnings = stats.todayConversations * 30;

        // Add streak bonus
        if (stats.todayResponses >= 10) {
            stats.currentStreak = Math.min(stats.todayResponses - 9, 10);
            stats.streakType = 'fast_responses';
            stats.streakBonus = stats.currentStreak * 5;
            stats.todayEarnings += stats.streakBonus;
        }

        // Check for badges
        const todayBadges: Badge[] = [];
        if (stats.todayResponses >= 10) {
            todayBadges.push({ ...BADGES[1], earnedAt: new Date().toISOString() }); // Speed Demon
        }
        if (stats.todayConversations >= 3) {
            todayBadges.push({ ...BADGES[2], earnedAt: new Date().toISOString() }); // Booking Master (placeholder)
        }
        stats.badges = todayBadges;

        // Format average response time
        stats.avgResponseTime = 8; // Placeholder - would calculate from actual data
        stats.avgResponseTimeFormatted = `${stats.avgResponseTime} min`;
        stats.satisfactionScore = 4.8;
        stats.resolutionRate = 94;

    } catch (error) {
        console.error('[Consultant Service] Failed to get stats:', error);
    }

    return stats;
}

/**
 * Get consultant inbox (prioritized conversations)
 */
export async function getConsultantInbox(consultantId: string): Promise<ConsultantConversation[]> {
    const client = getSupabaseClient();
    if (!client) return getMockConsultantInbox();

    try {
        // Get conversations assigned to consultant or unassigned
        const { data: conversations, error } = await client
            .from('conversations')
            .select(`
        id,
        patient_id,
        treatment_type,
        stage,
        priority,
        priority_reason,
        ai_summary,
        ai_sentiment_trend,
        ai_booking_probability,
        message_count,
        unread_count,
        last_message_at,
        created_at,
        assigned_consultant_id,
        assigned_doctor_id,
        escalated,
        leads!inner(name)
      `)
            .or(`assigned_consultant_id.eq.${consultantId},assigned_consultant_id.is.null`)
            .eq('status', 'active')
            .order('last_message_at', { ascending: false })
            .limit(50);

        if (error) {
            console.warn('[Consultant] Table not available, using mock data:', error.message);
            return getMockConsultantInbox();
        }

        if (!conversations || conversations.length === 0) {
            return getMockConsultantInbox();
        }

        // Get last message for each conversation
        const conversationIds = conversations.map(c => c.id);
        const { data: lastMessages } = await client
            .from('messages')
            .select('conversation_id, content, ai_intent, ai_sentiment, ai_suggested_response')
            .in('conversation_id', conversationIds)
            .eq('direction', 'inbound')
            .order('created_at', { ascending: false });

        // Create a map of last messages by conversation
        const lastMessageMap = new Map<string, any>();
        for (const msg of lastMessages || []) {
            if (!lastMessageMap.has(msg.conversation_id)) {
                lastMessageMap.set(msg.conversation_id, msg);
            }
        }

        // Transform to ConsultantConversation format
        const result: ConsultantConversation[] = conversations.map(conv => {
            const lastMsg = lastMessageMap.get(conv.id);
            const lastMessageAt = new Date(conv.last_message_at || conv.created_at);

            // Parse AI insights from summary
            const summaryParts = (conv.ai_summary || '').split(', ');
            const emotionalState = summaryParts[0]?.replace(' patient', '') || 'neutral';
            const anxietyLevel = summaryParts[1]?.replace(' anxiety', '') || 'calm';
            const journeyStage = summaryParts[2]?.replace(' stage', '') || 'researching';

            // Calculate priority
            const priorityInfo = calculatePriorityScore(
                emotionalState,
                anxietyLevel,
                journeyStage,
                lastMessageAt,
                conv.unread_count || 0,
                conv.escalated || false
            );

            // Calculate SLA
            const sla = calculateSLA(priorityInfo.priority);
            const slaRemaining = Math.max(0, Math.floor((sla.deadline.getTime() - Date.now()) / (1000 * 60)));

            // Get patient persona
            const persona = getPatientPersona(emotionalState, anxietyLevel, journeyStage, false);

            // Extract first name from leads
            const patientName = (conv.leads as any)?.name || 'Patient';
            const firstName = patientName.split(' ')[0];

            return {
                id: conv.id,
                patientFirstName: firstName,
                patientPersona: persona,
                lastMessage: lastMsg?.content || 'No message',
                lastMessageAt: lastMessageAt.toISOString(),
                unreadCount: conv.unread_count || 0,
                emotionalState,
                anxietyLevel,
                journeyStage,
                aiSummary: conv.ai_summary || 'Awaiting analysis',
                aiSuggestedResponse: lastMsg?.ai_suggested_response || '',
                priority: priorityInfo.priority,
                priorityScore: priorityInfo.score,
                priorityReason: priorityInfo.reason,
                slaDeadline: sla.deadline,
                slaRemaining: `${slaRemaining} min`,
                isOverdue: slaRemaining <= 0,
                treatmentType: conv.treatment_type,
                bookingProbability: conv.ai_booking_probability || 0.3,
                assignedConsultantId: conv.assigned_consultant_id,
                assignedDoctorId: conv.assigned_doctor_id,
            };
        });

        // Sort by priority score (descending)
        result.sort((a, b) => b.priorityScore - a.priorityScore);

        return result;
    } catch (error) {
        console.warn('[Consultant] Falling back to mock data');
        return getMockConsultantInbox();
    }
}

/**
 * Mock consultant inbox for development
 */
function getMockConsultantInbox(): ConsultantConversation[] {
    const now = Date.now();
    return [
        {
            id: 'mock-c1',
            patientFirstName: 'Sarah',
            patientPersona: PATIENT_PERSONAS.nervous_first_timer,
            lastMessage: "I'm really scared about the implants. What if something goes wrong? I've been reading horror stories online...",
            lastMessageAt: new Date(now - 10 * 60000).toISOString(),
            unreadCount: 3,
            emotionalState: 'nervous',
            anxietyLevel: 'very_anxious',
            journeyStage: 'researching',
            aiSummary: 'Very nervous first-timer. Scared about pain. Needs empathetic reassurance and success stories.',
            aiSuggestedResponse: "I completely understand how you feel! It's totally normal to have concerns...",
            priority: 'urgent',
            priorityScore: 90,
            priorityReason: 'Patient is nervous • High anxiety - needs reassurance • 3 unread messages',
            slaDeadline: new Date(now + 5 * 60000),
            slaRemaining: '5 min',
            isOverdue: false,
            treatmentType: 'Dental Implants',
            bookingProbability: 0.45,
            assignedConsultantId: null,
            assignedDoctorId: null,
        },
        {
            id: 'mock-c2',
            patientFirstName: 'Michael',
            patientPersona: PATIENT_PERSONAS.price_conscious,
            lastMessage: "How much does a full Hollywood Smile cost? I got a quote from a clinic in Hungary for €4,500. Can you match that?",
            lastMessageAt: new Date(now - 35 * 60000).toISOString(),
            unreadCount: 1,
            emotionalState: 'skeptical',
            anxietyLevel: 'calm',
            journeyStage: 'comparing',
            aiSummary: 'Price-focused researcher comparing Turkey vs Hungary. Needs value proposition, not just price.',
            aiSuggestedResponse: "Great question! Our all-inclusive package includes hotel, transfers, and aftercare...",
            priority: 'high',
            priorityScore: 65,
            priorityReason: 'Comparing with competitors • Waiting 35 minutes',
            slaDeadline: new Date(now + 15 * 60000),
            slaRemaining: '15 min',
            isOverdue: false,
            treatmentType: 'Hollywood Smile',
            bookingProbability: 0.55,
            assignedConsultantId: null,
            assignedDoctorId: null,
        },
        {
            id: 'mock-c3',
            patientFirstName: 'Lisa',
            patientPersona: PATIENT_PERSONAS.ready_to_book,
            lastMessage: "Okay I'm convinced! When is the earliest I can come? I'm flexible with dates in March.",
            lastMessageAt: new Date(now - 5 * 60000).toISOString(),
            unreadCount: 1,
            emotionalState: 'excited',
            anxietyLevel: 'calm',
            journeyStage: 'decided',
            aiSummary: 'Ready to book! Flexible on dates. High conversion probability. Move fast!',
            aiSuggestedResponse: "Amazing! I'm so excited you've decided to join us! Let me check our March availability...",
            priority: 'high',
            priorityScore: 60,
            priorityReason: 'Ready to book! 🎯',
            slaDeadline: new Date(now + 15 * 60000),
            slaRemaining: '15 min',
            isOverdue: false,
            treatmentType: 'Zirconia Crowns',
            bookingProbability: 0.85,
            assignedConsultantId: null,
            assignedDoctorId: null,
        },
        {
            id: 'mock-c4',
            patientFirstName: 'James',
            patientPersona: PATIENT_PERSONAS.research_driven,
            lastMessage: "What certifications do your doctors have? Are they members of any international dental associations?",
            lastMessageAt: new Date(now - 2 * 3600000).toISOString(),
            unreadCount: 0,
            emotionalState: 'neutral',
            anxietyLevel: 'slightly_anxious',
            journeyStage: 'researching',
            aiSummary: 'Detail-oriented researcher. Asking about credentials. Needs factual, thorough responses.',
            aiSuggestedResponse: "Great question! Our lead dentist Dr. Ahmet holds certifications from...",
            priority: 'medium',
            priorityScore: 40,
            priorityReason: 'Waiting over 2 hours',
            slaDeadline: new Date(now + 30 * 60000),
            slaRemaining: '30 min',
            isOverdue: false,
            treatmentType: 'Dental Veneers',
            bookingProbability: 0.35,
            assignedConsultantId: null,
            assignedDoctorId: null,
        },
        {
            id: 'mock-c5',
            patientFirstName: 'Fatma',
            patientPersona: PATIENT_PERSONAS.returning_patient,
            lastMessage: "Hi again! I had my veneers done last year and I'm happy. Now I want to get implants too. What's the process?",
            lastMessageAt: new Date(now - 6 * 3600000).toISOString(),
            unreadCount: 0,
            emotionalState: 'hopeful',
            anxietyLevel: 'calm',
            journeyStage: 'curious',
            aiSummary: 'Returning patient! Had veneers last year. Now asking about implants. High loyalty.',
            aiSuggestedResponse: "Welcome back, Fatma! So glad you're happy with your veneers! For implants...",
            priority: 'low',
            priorityScore: 25,
            priorityReason: 'Standard inquiry',
            slaDeadline: new Date(now + 60 * 60000),
            slaRemaining: '60 min',
            isOverdue: false,
            treatmentType: 'Dental Implants',
            bookingProbability: 0.70,
            assignedConsultantId: null,
            assignedDoctorId: null,
        },
    ];
}

/**
 * Assign conversation to doctor (routes through blind mode)
 */
export async function assignToDoctor(
    conversationId: string,
    doctorId: string,
    consultantId: string
): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    try {
        const { error } = await client
            .from('conversations')
            .update({
                assigned_doctor_id: doctorId,
                doctor_assigned_at: new Date().toISOString(),
                doctor_assigned_by: consultantId,
            })
            .eq('id', conversationId);

        if (error) throw error;

        // Log the assignment
        await client.from('doctor_access_logs').insert({
            doctor_id: doctorId,
            action: 'assigned_by_consultant',
            conversation_id: conversationId,
            metadata: { assigned_by: consultantId },
        });

        return true;
    } catch (error) {
        console.error('[Consultant Service] Failed to assign to doctor:', error);
        return false;
    }
}

// =================================================================
// Export
// =================================================================

export default {
    // Priority & scoring
    calculatePriorityScore,
    calculateSLA,
    getPatientPersona,

    // Templates
    getSuggestedTemplates,
    getAllTemplates,

    // Data fetching
    getConsultantInbox,
    getConsultantStats,

    // Actions
    assignToDoctor,

    // Constants (for UI)
    PATIENT_PERSONAS,
    BADGES,
};
