import React from 'react';
import { Moon, Sparkles, MessageSquare } from 'lucide-react';
import { useConsultant } from '../../context/ConsultantContext';

export const SleepModeIndicator = () => {
    const { isSleepMode } = useConsultant();

    if (!isSleepMode) return null;

    return (
        <div className="flex items-center gap-3 px-4 py-2 bg-indigo-900/40 backdrop-blur-md rounded-full border border-indigo-500/30 animate-pulse-slow">
            <div className="relative">
                <Moon className="w-4 h-4 text-indigo-300" />
                <Sparkles className="w-2 h-2 text-yellow-200 absolute -top-1 -right-1 animate-ping" />
            </div>
            <div className="flex flex-col">
                <span className="text-xs font-bold text-indigo-100 uppercase tracking-widest flex items-center gap-1.5">
                    AI Twin Active
                </span>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></div>
        </div>
    );
};
