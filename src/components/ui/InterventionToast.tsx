import React, { useEffect, useState } from 'react';
import { Copy, X, Zap, Shield, Heart, MapPin, BadgeCheck } from 'lucide-react';
import { RedZone } from '../../hooks/useRedZone';
import { XPBurst } from './XPBurst';

interface InterventionToastProps {
    zone: RedZone | null;
    onDismiss: () => void;
    onCopy: (text: string) => void;
}

export function InterventionToast({ zone, onDismiss, onCopy }: InterventionToastProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [showXP, setShowXP] = useState(false);

    useEffect(() => {
        if (zone) {
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    }, [zone]);

    const handleCopy = () => {
        if (zone) {
            onCopy(zone.script);
            setShowXP(true);
            // Don't auto-dismiss toast immediately, let them see the success
        }
    };

    if (!zone || !isVisible) return (
        <>
            {showXP && (
                <XPBurst
                    amount={10}
                    label="Trust Score"
                    onComplete={() => setShowXP(false)}
                />
            )}
        </>
    );

    const getIcon = () => {
        switch (zone.type) {
            case 'COST': return <Zap className="w-4 h-4" />;
            case 'STIGMA': return <Shield className="w-4 h-4" />;
            case 'DECISION': return <Heart className="w-4 h-4" />;
            case 'DISTANCE': return <MapPin className="w-4 h-4" />;
            case 'AUTHORITY': return <BadgeCheck className="w-4 h-4" />;
            default: return <Zap className="w-4 h-4" />;
        }
    };

    const getColors = () => {
        switch (zone.type) {
            case 'COST': return 'bg-amber-50 border-amber-200 text-amber-900';
            case 'STIGMA': return 'bg-red-50 border-red-200 text-red-900';
            case 'DECISION': return 'bg-blue-50 border-blue-200 text-blue-900';
            case 'DISTANCE': return 'bg-purple-50 border-purple-200 text-purple-900';
            case 'AUTHORITY': return 'bg-emerald-50 border-emerald-200 text-emerald-900';
            default: return 'bg-gray-50 border-gray-200 text-gray-900';
        }
    };

    const getButtonColors = () => {
        switch (zone.type) {
            case 'COST': return 'hover:bg-amber-100 text-amber-700';
            case 'STIGMA': return 'hover:bg-red-100 text-red-700';
            case 'DECISION': return 'hover:bg-blue-100 text-blue-700';
            case 'DISTANCE': return 'hover:bg-purple-100 text-purple-700';
            case 'AUTHORITY': return 'hover:bg-emerald-100 text-emerald-700';
            default: return 'hover:bg-gray-100 text-gray-700';
        }
    };

    return (
        <>
            <div className={`
        absolute bottom-full mb-2 left-0 right-0 z-50
        transform transition-all duration-300 ease-out origin-bottom
        ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-2 opacity-0 scale-95'}
        `}>
                <div className={`
            rounded-lg border shadow-lg backdrop-blur-sm p-3
            ${getColors()}
        `}>
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                {getIcon()}
                                <span className="text-xs font-bold uppercase tracking-wider">
                                    {zone.label} Detected
                                </span>
                            </div>

                            <p className="text-xs opacity-90 mb-2 font-medium">
                                💡 Tactic: {zone.tactic}
                            </p>

                            <div className="bg-white/60 rounded p-2 text-xs italic opacity-90 leading-relaxed border border-black/5">
                                "{zone.script}"
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <button
                                onClick={onDismiss}
                                className={`p-1.5 rounded-md transition-colors ${getButtonColors()}`}
                                title="Dismiss"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={handleCopy}
                                className={`p-1.5 rounded-md transition-colors ${getButtonColors()}`}
                                title="Copy Script"
                            >
                                <Copy className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Triangle pointer */}
                <div className={`
            absolute left-8 -bottom-1.5 w-3 h-3 rotate-45 border-b border-r
            ${getColors().split(' ')[0]} ${getColors().split(' ')[1]}
        `} />
            </div>

            {showXP && (
                <XPBurst
                    amount={10}
                    label="Trust Score"
                    onComplete={() => setShowXP(false)}
                />
            )}
        </>
    );
}
