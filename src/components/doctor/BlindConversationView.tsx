/**
 * BlindConversationView - View messages without contact info
 * Part of: Model B++ - Smile Design Ultimate Ecosystem
 * Purpose: Display conversation with sensitive data masked
 * Phase: 2 - Communication Lock (Security Critical)
 * 
 * SECURITY: All phone numbers and emails in message content are masked
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
    ArrowLeft,
    Send,
    Shield,
    User,
    Bot,
    Clock,
    AlertCircle,
    Sparkles,
    CheckCheck,
    Ban
} from 'lucide-react';
import {
    getDoctorBlindMessages,
    sendDoctorBlindReply,
    markMessagesAsRead,
    logExportAttempt,
    canExport,
    type BlindMessage,
} from '@/lib/doctor';
import { toast } from '@/lib/toast';

interface BlindConversationViewProps {
    doctorId: string;
    conversationId: string;
    patientFirstName: string;
    treatmentType?: string;
    onBack: () => void;
}

export default function BlindConversationView({
    doctorId,
    conversationId,
    patientFirstName,
    treatmentType,
    onBack,
}: BlindConversationViewProps) {
    const [messages, setMessages] = useState<BlindMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const loadMessages = useCallback(async () => {
        try {
            const data = await getDoctorBlindMessages(doctorId, conversationId);
            setMessages(data);
            setError(null);

            // Mark as read
            await markMessagesAsRead(doctorId, conversationId);
        } catch (err) {
            console.error('Failed to load messages:', err);
            setError('Failed to load messages');
        } finally {
            setLoading(false);
        }
    }, [doctorId, conversationId]);

    useEffect(() => {
        loadMessages();

        // Auto-refresh every 10 seconds
        const interval = setInterval(loadMessages, 10000);
        return () => clearInterval(interval);
    }, [loadMessages]);

    useEffect(() => {
        // Scroll to bottom when messages change
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendReply = async () => {
        if (!replyText.trim() || sending) return;

        setSending(true);
        try {
            await sendDoctorBlindReply(doctorId, conversationId, replyText.trim());
            setReplyText('');
            toast.success('Reply sent');
            await loadMessages();
        } catch (err) {
            console.error('Failed to send reply:', err);
            toast.error('Failed to send reply');
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendReply();
        }
    };

    // Block export attempt
    const handleExportAttempt = () => {
        logExportAttempt(doctorId, conversationId);
        toast.error('Export is not available for patient privacy');
    };

    const formatTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatDate = (timestamp: string) => {
        return new Date(timestamp).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        });
    };

    const getSentimentColor = (sentiment: string | null) => {
        switch (sentiment) {
            case 'positive':
                return 'text-green-600';
            case 'negative':
                return 'text-red-600';
            default:
                return 'text-gray-500';
        }
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
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-white/50 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>

                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-medium">
                        {patientFirstName.charAt(0).toUpperCase()}
                    </div>

                    <div>
                        <h2 className="font-semibold text-gray-900">{patientFirstName}</h2>
                        {treatmentType && (
                            <p className="text-sm text-gray-600">{treatmentType}</p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Security Badge */}
                    <div className="flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                        <Shield className="w-3 h-3" />
                        <span>Blind Mode</span>
                    </div>

                    {/* Export button (always disabled) */}
                    <button
                        onClick={handleExportAttempt}
                        className="p-2 text-gray-300 cursor-not-allowed"
                        title="Export disabled for patient privacy"
                    >
                        <Ban className="w-4 h-4" />
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

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                        <p>No messages yet</p>
                    </div>
                ) : (
                    <>
                        {messages.map((msg, index) => {
                            // Check if we need a date separator
                            const showDateSeparator = index === 0 ||
                                formatDate(msg.created_at) !== formatDate(messages[index - 1].created_at);

                            return (
                                <div key={msg.message_id}>
                                    {/* Date separator */}
                                    {showDateSeparator && (
                                        <div className="flex items-center justify-center my-4">
                                            <span className="px-3 py-1 text-xs text-gray-500 bg-white rounded-full shadow-sm">
                                                {formatDate(msg.created_at)}
                                            </span>
                                        </div>
                                    )}

                                    {/* Message bubble */}
                                    <div
                                        className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'
                                            }`}
                                    >
                                        <div
                                            className={`max-w-[70%] rounded-2xl p-3 ${msg.direction === 'outbound'
                                                    ? 'bg-blue-600 text-white rounded-br-none'
                                                    : 'bg-white text-gray-900 rounded-bl-none shadow-sm border border-gray-100'
                                                }`}
                                        >
                                            {/* Sender indicator */}
                                            {msg.direction === 'inbound' && (
                                                <div className="flex items-center gap-1 mb-1">
                                                    <User className="w-3 h-3 text-gray-400" />
                                                    <span className="text-xs text-gray-500">{patientFirstName}</span>
                                                </div>
                                            )}

                                            {/* Message content (already masked by service) */}
                                            <p className={`text-sm whitespace-pre-wrap ${msg.direction === 'outbound' ? 'text-white' : 'text-gray-900'
                                                }`}>
                                                {msg.content}
                                            </p>

                                            {/* Message footer */}
                                            <div className={`flex items-center justify-between gap-2 mt-2 ${msg.direction === 'outbound' ? 'text-blue-100' : 'text-gray-400'
                                                }`}>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <Clock className="w-3 h-3" />
                                                    <span>{formatTime(msg.created_at)}</span>

                                                    {/* AI intent badge (inbound only) */}
                                                    {msg.direction === 'inbound' && msg.ai_intent && (
                                                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px]">
                                                            <Sparkles className="w-2.5 h-2.5" />
                                                            {msg.ai_intent.replace(/_/g, ' ')}
                                                        </span>
                                                    )}

                                                    {/* Sentiment indicator */}
                                                    {msg.direction === 'inbound' && msg.ai_sentiment && (
                                                        <span className={`text-[10px] ${getSentimentColor(msg.ai_sentiment)}`}>
                                                            {msg.ai_sentiment === 'positive' && '😊'}
                                                            {msg.ai_sentiment === 'negative' && '😔'}
                                                            {msg.ai_sentiment === 'neutral' && '😐'}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Delivery status (outbound only) */}
                                                {msg.direction === 'outbound' && (
                                                    <CheckCheck className="w-3.5 h-3.5" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Reply composer */}
            <div className="p-4 border-t border-gray-200 bg-white">
                <div className="flex items-end gap-2">
                    <div className="flex-1 relative">
                        <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type your response..."
                            rows={2}
                            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                    </div>

                    <button
                        onClick={handleSendReply}
                        disabled={!replyText.trim() || sending}
                        className={`p-3 rounded-xl transition-all ${replyText.trim() && !sending
                                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                    >
                        {sending ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                    </button>
                </div>

                {/* Security notice */}
                <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Your response will be delivered via the platform. Patient contact info is protected.
                </p>
            </div>
        </div>
    );
}
