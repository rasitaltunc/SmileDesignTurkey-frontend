import React from 'react';
import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useClinicOccupancy } from '../../hooks/useClinicOccupancy';

export const ClinicPulseWidget = () => {
    const { occupancy } = useClinicOccupancy();

    const getStrategyText = () => {
        switch (occupancy.mode) {
            case 'SCARCITY':
                return "STRATEGY: Be the Prize. No discounts. Use scarcity.";
            case 'OPPORTUNITY':
                return "STRATEGY: Open for Business. Offer specials. Close fast.";
            default:
                return "STRATEGY: Standard Protocol. Build value.";
        }
    };

    const getIcon = () => {
        switch (occupancy.mode) {
            case 'SCARCITY':
                return <TrendingUp className="w-4 h-4" />;
            case 'OPPORTUNITY':
                return <TrendingDown className="w-4 h-4" />;
            default:
                return <Minus className="w-4 h-4" />;
        }
    };

    return (
        <div className="group relative flex items-center gap-3 px-4 py-2 bg-white/5 backdrop-blur-md rounded-full border border-white/10 hover:border-white/20 transition-all cursor-help">
            {/* Pulse Animation */}
            <div className="relative flex items-center justify-center w-4 h-4">
                <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${occupancy.color.replace('text-', 'bg-')} ${occupancy.pulseSpeed}`}></span>
                <Activity className={`relative w-4 h-4 ${occupancy.color}`} />
            </div>

            {/* Stats */}
            <div className="flex flex-col">
                <span className="text-xs font-medium text-white/90 uppercase tracking-wider flex items-center gap-1.5">
                    Clinic Pulse
                    <span className={`text-[10px] font-bold ${occupancy.color}`}>
                        {occupancy.rate}%
                    </span>
                </span>
            </div>

            {/* Tooltip (The Strategy Whisper) */}
            <div className="absolute top-full right-0 mt-3 w-64 p-3 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all z-50 pointer-events-none">
                <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg bg-white/5 ${occupancy.color}`}>
                        {getIcon()}
                    </div>
                    <div>
                        <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${occupancy.color}`}>
                            {occupancy.label}
                        </p>
                        <p className="text-xs text-gray-300 leading-relaxed font-medium">
                            {getStrategyText()}
                        </p>
                    </div>
                </div>
                {/* Connector */}
                <div className="absolute -top-1 right-6 w-2 h-2 bg-gray-900 border-t border-l border-white/10 rotate-45 transform"></div>
            </div>
        </div>
    );
};
