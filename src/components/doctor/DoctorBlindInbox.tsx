/**
 * DoctorBlindInbox - Secure inbox for doctors
 * Part of: Model B++ - Smile Design Ultimate Ecosystem
 * Purpose: Show conversations WITHOUT patient contact info
 * Phase: 2 - Communication Lock (Security Critical)
 * 
 * SECURITY: Doctor sees only first name, treatment, messages
 * NEVER: Phone, email, full name, address
 */

import { useState, useEffect, useCallback } from 'react';
import {
    Inbox,
    MessageSquare,
    Clock,
    AlertCircle,
    RefreshCw,
    ChevronRight,
    User,
    Sparkles,
    Shield
} from 'lucide-react';
import {
    getDoctorBlindInbox,
    logDoctorAccess,
    type BlindConversation,
} from '@/lib/doctor';

interface DoctorBlindInboxProps {
    doctorId: string;
    onSelectConversation: (conversationId: string) => void;
    selectedConversationId?: string;
}

export default function DoctorBlindInbox({
    doctorId,
    onSelectConversation,
    selectedConversationId,
}: DoctorBlindInboxProps) {
    const [conversations, setConversations] = useState<BlindConversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const loadConversations = useCallback(async () => {
        try {
            const data = await getDoctorBlindInbox(doctorId);
            setConversations(data);
            setError(null);
        } catch (err) {
            console.error('Failed to load inbox:', err);
            setError('Failed to load conversations');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [doctorId]);

    useEffect(() => {
        loadConversations();

        // Log inbox view
        logDoctorAccess(doctorId, { action: 'view_inbox' });

        // Auto-refresh every 30 seconds
        const interval = setInterval(loadConversations, 30000);
        return () => clearInterval(interval);
    }, [doctorId, loadConversations]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadConversations();
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'high':
                return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'normal':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'low':
                return 'bg-gray-100 text-gray-600 border-gray-200';
            default:
                return 'bg-gray-100 text-gray-600 border-gray-200';
        }
    };

    const getStageLabel = (stage: string) => {
        const labels: Record<string, string> = {
            inquiry: '📩 Inquiry',
            consultation: '🗓️ Consultation',
            quote_sent: '💰 Quote Sent',
            booked: '✅ Booked',
            travel: '✈️ Travel',
            treatment: '🦷 Treatment',
            followup: '📞 Follow-up',
        };
        return labels[stage] || stage;
    };

    const formatTimeAgo = (timestamp: string | null) => {
        if (!timestamp) return 'No messages';

        const diff = Date.now() - new Date(timestamp).getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center gap-2">
                    <Inbox className="w-5 h-5 text-blue-600" />
                    <h2 className="font-semibold text-gray-900">Patient Messages</h2>
                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                        {conversations.length}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {/* Security Badge */}
                    <div className="flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                        <Shield className="w-3 h-3" />
                        <span>Blind Mode</span>
                    </div>

                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Error state */}
            {error && (
                <div className="p-4 bg-red-50 border-b border-red-200">
                    <div className="flex items-center gap-2 text-red-700">
                        <AlertCircle className="w-4 h-4" />
                        <span>{error}</span>
                    </div>
                </div>
            )}

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                        <MessageSquare className="w-12 h-12 mb-2 text-gray-300" />
                        <p>No conversations assigned</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {conversations.map((conv) => (
                            <button
                                key={conv.conversation_id}
                                onClick={() => onSelectConversation(conv.conversation_id)}
                                className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${selectedConversationId === conv.conversation_id
                                        ? 'bg-blue-50 border-l-4 border-blue-600'
                                        : ''
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    {/* Patient info (BLIND) */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            {/* First name only - NO full name */}
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                                    {conv.patient_first_name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-medium text-gray-900">
                                                    {conv.patient_first_name}
                                                </span>
                                            </div>

                                            {/* Unread badge */}
                                            {conv.unread_count > 0 && (
                                                <span className="px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                                                    {conv.unread_count}
                                                </span>
                                            )}
                                        </div>

                                        {/* Treatment type */}
                                        {conv.treatment_type && (
                                            <p className="text-sm text-gray-600 truncate">
                                                {conv.treatment_type}
                                            </p>
                                        )}

                                        {/* AI Summary preview */}
                                        {conv.ai_summary && (
                                            <p className="text-xs text-gray-500 truncate mt-1 flex items-center gap-1">
                                                <Sparkles className="w-3 h-3 text-purple-400" />
                                                {conv.ai_summary.substring(0, 60)}...
                                            </p>
                                        )}
                                    </div>

                                    {/* Right side info */}
                                    <div className="flex flex-col items-end gap-1">
                                        {/* Time */}
                                        <span className="text-xs text-gray-500 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatTimeAgo(conv.last_message_at)}
                                        </span>

                                        {/* Priority badge */}
                                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getPriorityColor(conv.priority)}`}>
                                            {conv.priority}
                                        </span>

                                        {/* Stage */}
                                        <span className="text-xs text-gray-500">
                                            {getStageLabel(conv.stage)}
                                        </span>
                                    </div>

                                    <ChevronRight className="w-4 h-4 text-gray-400 self-center" />
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer - Security notice */}
            <div className="p-3 bg-gray-50 border-t border-gray-200 text-center">
                <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                    <Shield className="w-3 h-3" />
                    Contact information protected for patient privacy
                </p>
            </div>
        </div>
    );
}
