import { useState, useCallback } from 'react';

export type ZoneType = 'COST' | 'STIGMA' | 'DECISION' | 'DISTANCE' | 'AUTHORITY';

export interface RedZone {
    type: ZoneType;
    label: string;
    trigger: string;
    tactic: string;
    script: string;
    color: 'amber' | 'red' | 'blue' | 'purple' | 'emerald';
}

const ZONES: Record<ZoneType, Omit<RedZone, 'type' | 'trigger'>> = {
    COST: {
        label: 'Price Resistance',
        tactic: 'Value Framing',
        script: "I understand that price is a significant factor. However, this isn't just a cost; it's a lifetime investment in your confidence. Our package includes VIP service and guaranteed results.",
        color: 'amber',
    },
    STIGMA: {
        label: 'Trust & Anxiety',
        tactic: 'Authority & Empathy',
        script: "It's completely normal to feel anxious. Dr. Mehmet has over 15 years of experience and is a member of the European Academy of Esthetic Dentistry. We prioritize your health above all else.",
        color: 'red',
    },
    DECISION: {
        label: 'Decision Paralysis',
        tactic: 'Social Proof & Support',
        script: "It's great that you want to discuss this with your family. Would it help if I prepared a personalized video explaining the procedure for them?",
        color: 'blue',
    },
    DISTANCE: {
        label: 'Distance & logistics',
        tactic: 'Comfort & Ease',
        script: "The distance might seem far, but we handle everything. From your VIP airport transfer to your hotel stay, your journey will feel more like a holiday than a dental trip.",
        color: 'purple',
    },
    AUTHORITY: {
        label: 'Authority Validation',
        tactic: 'Credential Proof',
        script: "Dr. Mehmet is ISO certified and uses only FDA-approved materials. You can see his credentials and patient reviews directly in the profile I sent.",
        color: 'emerald',
    },
};

const KEYWORDS: Record<string, ZoneType> = {
    // Cost
    'expensive': 'COST',
    'price': 'COST',
    'cost': 'COST',
    'budget': 'COST',
    'discount': 'COST',
    'pahalı': 'COST',
    'fiyat': 'COST',
    'bütçe': 'COST',
    'indirim': 'COST',

    // Stigma / Fear
    'afraid': 'STIGMA',
    'scared': 'STIGMA',
    'pain': 'STIGMA',
    'hurt': 'STIGMA',
    'risk': 'STIGMA',
    'turkey teeth': 'STIGMA',
    'korkuyorum': 'STIGMA',
    'acı': 'STIGMA',
    'tehlikeli': 'STIGMA',

    // Decision
    'spouse': 'DECISION',
    'husband': 'DECISION',
    'wife': 'DECISION',
    'family': 'DECISION',
    'think about it': 'DECISION',
    'decide': 'DECISION',
    'eşim': 'DECISION',
    'kocam': 'DECISION',
    'karım': 'DECISION',
    'ailem': 'DECISION',
    'düşüneceğim': 'DECISION',

    // Distance
    'far': 'DISTANCE',
    'distance': 'DISTANCE',
    'travel': 'DISTANCE',
    'flight': 'DISTANCE',
    'uzak': 'DISTANCE',
    'yol': 'DISTANCE',
    'git gel': 'DISTANCE',

    // Authority
    'doctor': 'AUTHORITY',
    'surgeon': 'AUTHORITY',
    'expert': 'AUTHORITY',
    'diploma': 'AUTHORITY',
    'certificate': 'AUTHORITY',
    'doktor': 'AUTHORITY',
    'uzman': 'AUTHORITY',
};

export function useRedZone() {
    const [detectedZone, setDetectedZone] = useState<RedZone | null>(null);

    const checkInput = useCallback((text: string) => {
        if (!text) {
            setDetectedZone(null);
            return;
        }

        const lowerText = text.toLowerCase();

        // Find the first matching keyword
        const foundKeyword = Object.keys(KEYWORDS).find(keyword =>
            lowerText.includes(keyword.toLowerCase())
        );

        if (foundKeyword) {
            const zoneType = KEYWORDS[foundKeyword];
            const zoneConfig = ZONES[zoneType];

            // Only update if it's a new detection or different zone
            if (!detectedZone || detectedZone.type !== zoneType) {
                setDetectedZone({
                    type: zoneType,
                    trigger: foundKeyword,
                    ...zoneConfig,
                });
            }
        } else {
            setDetectedZone(null);
        }
    }, [detectedZone]);

    const dismissZone = useCallback(() => {
        setDetectedZone(null);
    }, []);

    return {
        detectedZone,
        checkInput,
        dismissZone
    };
}
