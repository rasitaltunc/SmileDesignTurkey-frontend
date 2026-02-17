/**
 * PatientCardCompact - Inbox item with rich context
 * Part of: Model B++ - Smile Design Ultimate Ecosystem
 * Phase: 2 - Communication Lock
 * 
 * Not just: "Patient name, message"
 * BUT: "Sarah (nervous, first-timer) needs reassurance"
 */

import { Clock, AlertTriangle, TrendingUp, Sparkles } from 'lucide-react';
import type { ConsultantConversation } from '@/lib/consultant/consultantService';

interface PatientCardCompactProps {
    conversation: ConsultantConversation;
    isSelected: boolean;
    onClick: () => void;
}

export default function PatientCardCompact({
    conversation: conv,
    isSelected,
    onClick,
}: PatientCardCompactProps) {
    const getPriorityStyles = () => {
        switch (conv.priority) {
            case 'urgent':
                return {
                    border: 'border-l-4 border-l-red-500',
                    bg: conv.isOverdue ? 'bg-red-50' : 'bg-white',
                    badge: 'bg-red-100 text-red-700',
                };
            case 'high':
                return {
                    border: 'border-l-4 border-l-orange-500',
                    bg: 'bg-white',
                    badge: 'bg-orange-100 text-orange-700',
                };
            case 'medium':
                return {
                    border: 'border-l-4 border-l-yellow-500',
                    bg: 'bg-white',
                    badge: 'bg-yellow-100 text-yellow-700',
                };
            default:
                return {
                    border: 'border-l-4 border-l-green-500',
                    bg: 'bg-white',
                    badge: 'bg-green-100 text-green-700',
                };
        }
    };

    const styles = getPriorityStyles();

    const formatTimeAgo = (timestamp: string) => {
        const diff = Date.now() - new Date(timestamp).getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    const getEmotionEmoji = (emotion: string) => {
        const emojis: Record<string, string> = {
            excited: '🤩',
            nervous: '😰',
            skeptical: '🤔',
            impatient: '😤',
            hopeful: '🙏',
            frustrated: '😣',
            neutral: '😐',
        };
        return emojis[emotion] || '😐';
    };

    const getJourneyBadge = (stage: string) => {
        const badges: Record<string, { emoji: string; label: string; color: string }> = {
            curious: { emoji: '🔍', label: 'Curious', color: 'bg-blue-100 text-blue-700' },
            researching: { emoji: '📚', label: 'Researching', color: 'bg-indigo-100 text-indigo-700' },
            comparing: { emoji: '⚖️', label: 'Comparing', color: 'bg-purple-100 text-purple-700' },
            decided: { emoji: '✅', label: 'Ready!', color: 'bg-green-100 text-green-700' },
            booked: { emoji: '📅', label: 'Booked', color: 'bg-emerald-100 text-emerald-700' },
        };
        return badges[stage] || { emoji: '📩', label: 'New', color: 'bg-gray-100 text-gray-700' };
    };

    const journeyBadge = getJourneyBadge(conv.journeyStage);

    return (
        <button
            onClick={onClick}
            className={`w-full text-left rounded-xl shadow-sm hover:shadow-md transition-all ${styles.border} ${styles.bg} ${isSelected ? 'ring-2 ring-purple-500 ring-offset-2' : ''
                }`}
        >
            <div className="p-4">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar with persona */}
                        <div className="relative">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-lg font-semibold">
                                {conv.patientFirstName.charAt(0).toUpperCase()}
                            </div>
                            {/* Emotion overlay */}
                            <span className="absolute -bottom-1 -right-1 text-lg">
                                {getEmotionEmoji(conv.emotionalState)}
                            </span>
                        </div>

                        <div className="min-w-0">
                            {/* Name + persona */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-gray-900">{conv.patientFirstName}</span>
                                <span className="text-sm" title={conv.patientPersona.suggestedApproach}>
                                    {conv.patientPersona.emoji} {conv.patientPersona.label}
                                </span>
                            </div>

                            {/* Journey stage badge */}
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${journeyBadge.color}`}>
                                    {journeyBadge.emoji} {journeyBadge.label}
                                </span>
                                {conv.bookingProbability >= 0.7 && (
                                    <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                                        <TrendingUp className="w-3 h-3" />
                                        {Math.round(conv.bookingProbability * 100)}% likely
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right side: time and unread */}
                    <div className="flex flex-col items-end gap-1">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTimeAgo(conv.lastMessageAt)}
                        </span>
                        {conv.unreadCount > 0 && (
                            <span className="px-2 py-0.5 bg-purple-600 text-white text-xs font-bold rounded-full">
                                {conv.unreadCount}
                            </span>
                        )}
                    </div>
                </div>

                {/* Last message preview */}
                <p className="text-sm text-gray-600 line-clamp-2 mb-3 ml-15 pl-15">
                    {conv.lastMessage}
                </p>

                {/* AI insights row */}
                <div className="flex items-center justify-between gap-2">
                    {/* AI summary */}
                    <div className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full min-w-0">
                        <Sparkles className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{conv.aiSummary}</span>
                    </div>

                    {/* SLA indicator */}
                    <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${conv.isOverdue
                            ? 'bg-red-100 text-red-700'
                            : conv.priority === 'urgent'
                                ? 'bg-red-50 text-red-600'
                                : 'bg-gray-100 text-gray-600'
                        }`}>
                        {conv.isOverdue ? (
                            <>
                                <AlertTriangle className="w-3 h-3" />
                                <span>Overdue!</span>
                            </>
                        ) : (
                            <>
                                <Clock className="w-3 h-3" />
                                <span>{conv.slaRemaining} left</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Priority reason (if notable) */}
                {conv.priority !== 'low' && conv.priorityReason && (
                    <div className="mt-2 text-xs text-gray-500 italic border-t border-gray-100 pt-2">
                        💡 {conv.priorityReason}
                    </div>
                )}
            </div>
        </button>
    );
}
