
import { useConsultant } from '../../context/ConsultantContext';
import { AlertTriangle, ShieldCheck, Heart, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function WhisperCard() {
    const { activeGuidance } = useConsultant();

    if (!activeGuidance) return null;

    const styles = {
        emotional: {
            border: 'border-amber-500/50',
            bg: 'bg-amber-500/10',
            icon: Heart,
            title: 'Empathy Required',
            text: 'text-amber-200'
        },
        'price-sensitive': {
            border: 'border-blue-500/50',
            bg: 'bg-blue-500/10',
            icon: ShieldCheck,
            title: 'Build Trust',
            text: 'text-blue-200'
        },
        urgent: {
            border: 'border-purple-500/50',
            bg: 'bg-purple-500/10',
            icon: Zap,
            title: 'Close The Deal',
            text: 'text-purple-200'
        },
        analytical: {
            border: 'border-emerald-500/50',
            bg: 'bg-emerald-500/10',
            icon: AlertTriangle, // Placeholder
            title: 'Data Required',
            text: 'text-emerald-200'
        }
    };

    const currentStyle = styles[activeGuidance.type as keyof typeof styles] || styles.emotional;
    const Icon = currentStyle.icon;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={`fixed right-4 bottom-32 w-80 max-w-[calc(100vw-2rem)] p-4 rounded-xl backdrop-blur-md border ${currentStyle.border} ${currentStyle.bg} shadow-2xl z-50`}
            >
                <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg bg-black/20 ${currentStyle.text}`}>
                        <Icon className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className={`text-sm font-bold ${currentStyle.text} mb-1`}>
                            Whisper UI: {currentStyle.title}
                        </h4>
                        <p className="text-xs text-gray-300 mb-2">
                            {activeGuidance.message}
                        </p>
                        {activeGuidance.action && (
                            <div className="mt-2 text-xs font-semibold bg-white/10 px-2 py-1 rounded border border-white/10 inline-block text-white">
                                💡 Action: {activeGuidance.action}
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
