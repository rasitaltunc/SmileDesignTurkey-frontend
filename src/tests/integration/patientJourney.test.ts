/**
 * Integration Tests - Complete Patient Journey
 * Part of: Model B++ - Smile Design Ultimate Ecosystem
 * Phase: 2 - Verification
 * 
 * Tests the COMPLETE flow:
 * Patient → AI Analysis → Routing → Consultant → Doctor (Blind) → Response → Patient
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { analyzeMessage, INTENTS } from '@/lib/ai/aiRouter';
import { calculatePriorityScore, getPatientPersona, getSuggestedTemplates } from '@/lib/consultant/consultantService';
import { filterMessageForDoctor, maskPhoneInContent, maskEmailInContent } from '@/lib/doctor/doctorBlindService';

// =================================================================
// Test Data - Real Patient Scenarios
// =================================================================

const TEST_PATIENTS = {
    nervous_sarah: {
        name: 'Sarah',
        age: 32,
        country: 'Germany',
        message: "Hi, I'm really scared about getting dental implants. I've heard horror stories online. What if something goes wrong? Does it hurt a lot?",
        expected: {
            emotionalState: 'nervous',
            anxietyLevel: 'anxious',
            intent: INTENTS.FEAR_EXPRESSION,
            routingDestination: 'consultant',
            suggestedConsultantType: 'empathetic',
        },
    },

    price_focused_mike: {
        name: 'Mike',
        age: 45,
        country: 'UK',
        message: "How much do veneers cost? I've been quoted £15,000 in London. What's your pricing? Any payment plans?",
        expected: {
            emotionalState: 'neutral',
            intent: INTENTS.PRICING_INQUIRY,
            priceSensitivity: 'high',
            routingDestination: 'ai_auto',
        },
    },

    decided_lisa: {
        name: 'Lisa',
        age: 28,
        country: 'France',
        message: "I've done my research and I'm ready to book! When is the earliest available date? I want full smile makeover.",
        expected: {
            emotionalState: 'excited',
            journeyStage: 'decided',
            intent: INTENTS.BOOKING_INQUIRY,
            routingDestination: 'ai_auto',
            priority: 'medium',
        },
    },

    frustrated_ahmed: {
        name: 'Ahmed',
        age: 55,
        country: 'Saudi Arabia',
        message: "I've been waiting 2 days for a response! This is the third time I'm asking. When will someone call me back? Very disappointed!",
        expected: {
            emotionalState: 'frustrated',
            intent: INTENTS.COMPLAINT,
            routingDestination: 'consultant',
            priority: 'high',
            suggestedConsultantType: 'senior',
        },
    },

    emergency_case: {
        name: 'John',
        age: 40,
        country: 'USA',
        message: "URGENT! I had my procedure yesterday and now there's severe bleeding and pain. I can't reach anyone! Please help!",
        expected: {
            emotionalState: 'frustrated',
            intent: INTENTS.URGENT_MEDICAL,
            routingDestination: 'escalate',
            priority: 'urgent',
        },
    },
};

// =================================================================
// Test 1: AI Router - Emotional Intelligence
// =================================================================

describe('AI Router - Emotional Intelligence', () => {
    describe('Nervous Patient Detection', () => {
        it('should detect nervous emotional state from fear expressions', async () => {
            const analysis = await analyzeMessage(TEST_PATIENTS.nervous_sarah.message);

            expect(analysis.emotionalState.primary).toBe('nervous');
            expect(analysis.anxietyLevel).toMatch(/anxious|very_anxious/);
            expect(analysis.intent).toBe(INTENTS.FEAR_EXPRESSION);
        });

        it('should identify emotional needs for nervous patients', async () => {
            const analysis = await analyzeMessage(TEST_PATIENTS.nervous_sarah.message);

            expect(analysis.emotionalState.needs).toContain('Reassurance');
            expect(analysis.emotionalState.triggers).toContain('Medical procedure anxiety');
        });

        it('should route nervous patients to empathetic consultant', async () => {
            const analysis = await analyzeMessage(TEST_PATIENTS.nervous_sarah.message);

            expect(analysis.routing.destination).toBe('consultant');
            expect(analysis.routing.suggestedConsultantType).toBe('empathetic');
        });
    });

    describe('Price-Focused Patient Detection', () => {
        it('should detect pricing intent', async () => {
            const analysis = await analyzeMessage(TEST_PATIENTS.price_focused_mike.message);

            expect(analysis.intent).toBe(INTENTS.PRICING_INQUIRY);
            expect(analysis.pricesSensitivity).toBe('high');
        });

        it('should route pricing inquiries to AI auto', async () => {
            const analysis = await analyzeMessage(TEST_PATIENTS.price_focused_mike.message);

            expect(analysis.routing.destination).toBe('ai_auto');
        });
    });

    describe('Decided Patient Detection', () => {
        it('should detect booking intent and excited state', async () => {
            const analysis = await analyzeMessage(TEST_PATIENTS.decided_lisa.message);

            expect(analysis.intent).toBe(INTENTS.BOOKING_INQUIRY);
            expect(analysis.journeyStage).toBe('decided');
        });

        it('should generate enthusiastic response for excited patients', async () => {
            const analysis = await analyzeMessage(TEST_PATIENTS.decided_lisa.message);

            expect(analysis.suggestedResponse.tone).toBe('enthusiastic');
        });
    });

    describe('Frustrated Patient Detection', () => {
        it('should detect frustrated emotional state', async () => {
            const analysis = await analyzeMessage(TEST_PATIENTS.frustrated_ahmed.message);

            expect(analysis.emotionalState.primary).toBe('frustrated');
            expect(analysis.intent).toBe(INTENTS.COMPLAINT);
        });

        it('should route complaints to senior consultant with high priority', async () => {
            const analysis = await analyzeMessage(TEST_PATIENTS.frustrated_ahmed.message);

            expect(analysis.routing.destination).toBe('consultant');
            expect(analysis.routing.priority).toBe('high');
        });
    });

    describe('Emergency Detection', () => {
        it('should detect urgent medical intent', async () => {
            const analysis = await analyzeMessage(TEST_PATIENTS.emergency_case.message);

            expect(analysis.intent).toBe(INTENTS.URGENT_MEDICAL);
            expect(analysis.urgency).toBe('urgent');
        });

        it('should immediately escalate emergencies', async () => {
            const analysis = await analyzeMessage(TEST_PATIENTS.emergency_case.message);

            expect(analysis.routing.destination).toBe('escalate');
            expect(analysis.routing.priority).toBe('urgent');
        });
    });
});

// =================================================================
// Test 2: Consultant Priority Scoring
// =================================================================

describe('Consultant Priority Scoring', () => {
    it('should calculate high priority for very anxious patients', () => {
        const result = calculatePriorityScore(
            'nervous',
            'very_anxious',
            'researching',
            new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
            2,
            false
        );

        expect(result.priority).toBe('high');
        expect(result.score).toBeGreaterThan(50);
    });

    it('should calculate urgent priority for escalated conversations', () => {
        const result = calculatePriorityScore(
            'frustrated',
            'anxious',
            'researching',
            new Date(),
            5,
            true // escalated
        );

        expect(result.priority).toBe('urgent');
        expect(result.reason).toContain('Escalated');
    });

    it('should lower priority for calm, booked patients', () => {
        const result = calculatePriorityScore(
            'neutral',
            'calm',
            'booked',
            new Date(Date.now() - 5 * 60 * 1000), // 5 min ago
            1,
            false
        );

        expect(result.priority).toBe('low');
        expect(result.score).toBeLessThan(30);
    });

    it('should increase priority for long wait times', () => {
        const result = calculatePriorityScore(
            'neutral',
            'calm',
            'researching',
            new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
            1,
            false
        );

        expect(result.score).toBeGreaterThan(50);
        expect(result.reason).toContain('Waiting');
    });
});

// =================================================================
// Test 3: Patient Persona Detection
// =================================================================

describe('Patient Persona Detection', () => {
    it('should identify nervous first-timer persona', () => {
        const persona = getPatientPersona('nervous', 'very_anxious', 'curious', false);

        expect(persona.type).toBe('nervous_first_timer');
        expect(persona.emoji).toBe('😰');
        expect(persona.suggestedApproach).toContain('reassuring');
    });

    it('should identify ready-to-book persona', () => {
        const persona = getPatientPersona('excited', 'calm', 'decided', false);

        expect(persona.type).toBe('ready_to_book');
        expect(persona.emoji).toBe('✅');
        expect(persona.suggestedApproach).toContain('fast');
    });

    it('should identify returning patient persona', () => {
        const persona = getPatientPersona('neutral', 'calm', 'researching', true);

        expect(persona.type).toBe('returning_patient');
        expect(persona.emoji).toBe('🔄');
    });
});

// =================================================================
// Test 4: Template Suggestions
// =================================================================

describe('Template Suggestions', () => {
    it('should suggest reassurance template for nervous patients', () => {
        const templates = getSuggestedTemplates('nervous', 'researching', INTENTS.FEAR_EXPRESSION);

        expect(templates.length).toBeGreaterThan(0);
        expect(templates[0].category).toBe('reassurance');
        expect(templates[0].successRate).toBeGreaterThan(0.9);
    });

    it('should suggest pricing template for price inquiries', () => {
        const templates = getSuggestedTemplates('neutral', 'comparing', INTENTS.PRICING_INQUIRY);

        expect(templates.some(t => t.category === 'pricing')).toBe(true);
    });

    it('should suggest booking template for decided patients', () => {
        const templates = getSuggestedTemplates('excited', 'decided', INTENTS.BOOKING_INQUIRY);

        expect(templates.some(t => t.category === 'booking')).toBe(true);
    });
});

// =================================================================
// Test 5: Doctor Blind Mode - Security Enforcement
// =================================================================

describe('Doctor Blind Mode - Security', () => {
    describe('Phone Masking', () => {
        it('should mask international phone numbers', () => {
            const content = "Call me at +49 123 456 7890 for more info";
            const masked = maskPhoneInContent(content);

            expect(masked).not.toContain('+49');
            expect(masked).not.toContain('7890');
            expect(masked).toContain('[PHONE HIDDEN]');
        });

        it('should mask multiple phone formats', () => {
            const content = "Numbers: +1-555-123-4567, 05321234567, (212) 555-1234";
            const masked = maskPhoneInContent(content);

            expect(masked).not.toContain('555');
            expect(masked.match(/\[PHONE HIDDEN\]/g)?.length).toBeGreaterThanOrEqual(2);
        });

        it('should not mask treatment costs that look like numbers', () => {
            const content = "Treatment cost is €5000";
            const masked = maskPhoneInContent(content);

            expect(masked).toContain('€5000');
        });
    });

    describe('Email Masking', () => {
        it('should mask email addresses', () => {
            const content = "Email me at patient@gmail.com please";
            const masked = maskEmailInContent(content);

            expect(masked).not.toContain('patient@gmail.com');
            expect(masked).toContain('[EMAIL HIDDEN]');
        });

        it('should mask multiple emails', () => {
            const content = "Contact: john@test.com or jane@company.org";
            const masked = maskEmailInContent(content);

            expect(masked).not.toContain('@');
            expect(masked.match(/\[EMAIL HIDDEN\]/g)?.length).toBe(2);
        });
    });

    describe('Message Filtering for Doctor', () => {
        it('should filter sensitive data from messages', () => {
            const message = {
                id: 'msg-123',
                content: "My number is +90 532 123 4567 and email is test@mail.com",
                direction: 'inbound' as const,
                ai_intent: 'booking_inquiry',
                ai_sentiment: 'positive',
                wa_message_id: 'wamid_12345',
                created_at: new Date().toISOString(),
            };

            const filtered = filterMessageForDoctor(message);

            // Should have filtered content
            expect(filtered.content).not.toContain('+90');
            expect(filtered.content).not.toContain('test@mail.com');

            // Should NOT expose WhatsApp ID
            expect(filtered).not.toHaveProperty('wa_message_id');

            // Should keep AI insights
            expect(filtered.ai_intent).toBe('booking_inquiry');
            expect(filtered.ai_sentiment).toBe('positive');
        });
    });
});

// =================================================================
// Test 6: Complete Patient Journey
// =================================================================

describe('Complete Patient Journey', () => {
    it('should handle nervous patient journey end-to-end', async () => {
        // Step 1: Patient sends message
        const patientMessage = TEST_PATIENTS.nervous_sarah.message;

        // Step 2: AI analyzes
        const analysis = await analyzeMessage(patientMessage);
        expect(analysis.emotionalState.primary).toBe('nervous');

        // Step 3: Priority calculated
        const priority = calculatePriorityScore(
            analysis.emotionalState.primary,
            analysis.anxietyLevel,
            analysis.journeyStage,
            new Date(),
            1,
            false
        );
        expect(priority.priority).toMatch(/high|urgent/);

        // Step 4: Persona detected
        const persona = getPatientPersona(
            analysis.emotionalState.primary,
            analysis.anxietyLevel,
            analysis.journeyStage,
            false
        );
        expect(persona.type).toBe('nervous_first_timer');

        // Step 5: Templates suggested
        const templates = getSuggestedTemplates(
            analysis.emotionalState.primary,
            analysis.journeyStage,
            analysis.intent
        );
        expect(templates.length).toBeGreaterThan(0);
        expect(templates[0].category).toBe('reassurance');

        // Step 6: If assigned to doctor, blind mode enforces
        const blindMessage = filterMessageForDoctor({
            id: 'test',
            content: patientMessage + " My number is +49 123 456 7890",
            direction: 'inbound',
            ai_intent: analysis.intent,
            ai_sentiment: analysis.sentiment,
            created_at: new Date().toISOString(),
        });
        expect(blindMessage.content).not.toContain('+49');

        // JOURNEY COMPLETE: Patient understood, routed correctly, doctor can't see contact
    });

    it('should handle emergency escalation journey', async () => {
        // Step 1: Emergency message
        const analysis = await analyzeMessage(TEST_PATIENTS.emergency_case.message);

        // Step 2: Immediate escalation
        expect(analysis.routing.destination).toBe('escalate');
        expect(analysis.routing.priority).toBe('urgent');
        expect(analysis.routing.estimatedResponseTime).toBe('Immediately');

        // This patient should NEVER be routed to AI auto or low priority
        expect(analysis.routing.destination).not.toBe('ai_auto');
        expect(analysis.urgency).toBe('urgent');
    });
});

// =================================================================
// Test 7: Language Detection
// =================================================================

describe('Language Detection', () => {
    it('should detect Turkish messages', async () => {
        const analysis = await analyzeMessage("Merhaba, diş implantı hakkında bilgi almak istiyorum");
        expect(analysis.preferredLanguage).toBe('tr');
    });

    it('should detect German messages', async () => {
        const analysis = await analyzeMessage("Guten Tag, ich möchte mehr über Zahnimplantate erfahren");
        expect(analysis.preferredLanguage).toBe('de');
    });

    it('should detect English messages', async () => {
        const analysis = await analyzeMessage("Hello, I want to learn about dental implants");
        expect(analysis.preferredLanguage).toBe('en');
    });

    it('should generate response in patient language', async () => {
        const trAnalysis = await analyzeMessage("Merhaba, fiyatları öğrenmek istiyorum");
        expect(trAnalysis.suggestedResponse.text).toMatch(/Merhaba|Hoş geldiniz/);
    });
});

// =================================================================
// Summary
// =================================================================

describe('Phase 2 Integration Summary', () => {
    it('all components should work together', async () => {
        // This is the "smoke test" - if this passes, the system works
        const journeys = Object.values(TEST_PATIENTS);

        for (const patient of journeys) {
            const analysis = await analyzeMessage(patient.message);

            // Every message should get analyzed
            expect(analysis.intent).toBeDefined();
            expect(analysis.emotionalState).toBeDefined();
            expect(analysis.routing).toBeDefined();
            expect(analysis.suggestedResponse).toBeDefined();

            // Priority should be calculated
            const priority = calculatePriorityScore(
                analysis.emotionalState.primary,
                analysis.anxietyLevel,
                analysis.journeyStage,
                new Date(),
                1,
                false
            );
            expect(['low', 'medium', 'high', 'urgent']).toContain(priority.priority);

            // Persona should be assigned
            const persona = getPatientPersona(
                analysis.emotionalState.primary,
                analysis.anxietyLevel,
                analysis.journeyStage,
                false
            );
            expect(persona.type).toBeDefined();
            expect(persona.suggestedApproach).toBeDefined();
        }

        console.log('✅ All patient journeys processed successfully');
        console.log(`✅ ${journeys.length} patients tested`);
        console.log('✅ Phase 2 integration: VERIFIED');
    });
});
