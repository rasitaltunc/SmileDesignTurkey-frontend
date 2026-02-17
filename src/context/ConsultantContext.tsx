import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

import { toast } from 'sonner';
import { useAutoReply } from '../hooks/useAutoReply';

// Types for the Consultant "Iron Man" System
type PatientType = 'analytical' | 'emotional' | 'price-sensitive' | 'urgent';

interface WhisperGuidance {
    id: string;
    type: PatientType;
    message: string;
    action?: string; // e.g., "Send Certificate", "Show Price"
    color: 'purple' | 'blue' | 'amber' | 'red';
}

interface ConsultantContextType {
    // AI Twin State
    isSleepMode: boolean;
    toggleSleepMode: () => void;
    autoReplyLogs: any[];

    // Whisper UI State
    activeGuidance: WhisperGuidance | null;
    analyzePatientInput: (text: string) => void;

    // Gamification State
    impactScore: number;
    addImpact: (points: number) => void;
    rank: { title: string; color: string; icon: string };
}

const ConsultantContext = createContext<ConsultantContextType | undefined>(undefined);

export function ConsultantProvider({ children }: { children: ReactNode }) {
    const [isSleepMode, setIsSleepMode] = useState(false);
    const [activeGuidance, setActiveGuidance] = useState<WhisperGuidance | null>(null);
    const [impactScore, setImpactScore] = useState(1250); // Starting score for demo



    // AI Twin Logic
    const { processMessage, replyLogs } = useAutoReply();


    // Mock "Whisper UI" Logic (Psychographic Analysis)
    const analyzePatientInput = (text: string) => {
        const lowerText = text.toLowerCase();
        let detectedType: PatientType | null = null;

        // 1. Detection: High Anxiety / Emotional
        if (lowerText.includes('worry') || lowerText.includes('scared') || lowerText.includes('pain') || lowerText.includes('horror')) {
            detectedType = 'emotional';
            setActiveGuidance({
                id: Date.now().toString(),
                type: 'emotional',
                message: "Patient signal: High Anxiety. Stop selling.",
                action: "Use Empathy Script & Show 'Pain-Free' Reviews",
                color: 'amber'
            });
        }

        // 2. Detection: Price Sensitive / Analytical
        else if (lowerText.includes('price') || lowerText.includes('cost') || lowerText.includes('hidden') || lowerText.includes('guarantee')) {
            detectedType = 'price-sensitive';
            setActiveGuidance({
                id: Date.now().toString(),
                type: 'price-sensitive',
                message: "Patient signal: Trust Deficit. They fear hidden costs.",
                action: "Send 'No Hidden Fee' Guarantee Certificate",
                color: 'blue'
            });
        }

        // 3. Detection: Urgent / Ready
        else if (lowerText.includes('book') || lowerText.includes('flight') || lowerText.includes('soon') || lowerText.includes('date')) {
            detectedType = 'urgent';
            setActiveGuidance({
                id: Date.now().toString(),
                type: 'urgent',
                message: "Patient signal: Ready to Buy.",
                action: "Send Signature Package Link Now",
                color: 'purple'
            });
        } else {
            setActiveGuidance(null);
        }

        // TRIGGER SLEEP MODE TWIN IF ACTIVE
        if (isSleepMode) {
            // In a real app, we'd pass the actual patient name
            processMessage("Ahmet Yılmaz", text);
        }
    };

    const toggleSleepMode = () => {
        setIsSleepMode(prev => {
            const newState = !prev;
            if (newState) {
                toast("🌙 Sleep Mode Activated", { description: "AI Twin is now handling incoming messages." });
            } else {
                toast("☀️ Welcome Back", { description: "You have control. AI Twin is standby." });
            }
            return newState;
        });
    };

    const addImpact = (points: number) => {
        setImpactScore(prev => prev + points);
    };

    const getConsultantRank = () => {
        if (impactScore > 5000) return { title: "Smile Architect", color: "text-amber-400", icon: "👑" };
        if (impactScore > 2500) return { title: "Life Changer", color: "text-purple-400", icon: "🌟" };
        if (impactScore > 1000) return { title: "Trust Engineer", color: "text-blue-400", icon: "🛡️" };
        return { title: "Consultant", color: "text-gray-400", icon: "👋" };
    };

    return (
        <ConsultantContext.Provider value={{
            isSleepMode,
            toggleSleepMode,
            activeGuidance,
            analyzePatientInput,
            impactScore,
            addImpact,

            rank: getConsultantRank(),
            autoReplyLogs: replyLogs
        }}>
            {children}
        </ConsultantContext.Provider>
    );
}

export function useConsultant() {
    const context = useContext(ConsultantContext);
    if (context === undefined) {
        throw new Error('useConsultant must be used within a ConsultantProvider');
    }
    return context;
}
