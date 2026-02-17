/**
 * ConversationDetail - Full conversation view with AI assistance
 * Part of: Model B++ - Smile Design Ultimate Ecosystem
 * Phase: 2 - Communication Lock
 * 
 * CREATIVE VERSION:
 * AI suggests responses, templates are contextualized,
 * Doctor assignment routes through blind mode
 */

import { useState, useEffect, useRef } from 'react';
import {
    ArrowLeft,
    Send,
    Sparkles,
    UserPlus,
    Clock,
    Copy,
    Check,
    ChevronDown,
    ChevronUp,
    AlertTriangle,
    Stethoscope,
    MessageSquare,
} from 'lucide-react';
import type { ConsultantConversation, ResponseTemplate } from '@/lib/consultant/consultantService';
import { getSuggestedTemplates, assignToDoctor } from '@/lib/consultant/consultantService';
import { useConsultant } from '@/context/ConsultantContext';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { toast } from '@/lib/toast';

interface Message {
    id: string;
    direction: 'inbound' | 'outbound';
    content: string;
    created_at: string;
    ai_intent?: string;
    ai_sentiment?: string;
}

interface ConversationDetailProps {
    consultantId: string;
    conversation: ConsultantConversation;
    onBack: () => void;
}

export default function ConversationDetail({
    consultantId,
    conversation,
    onBack,
}: ConversationDetailProps) {
    const { analyzePatientInput } = useConsultant();
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [replyText, setReplyText] = useState('');
    const [sending, setSending] = useState(false);
    const [showTemplates, setShowTemplates] = useState(true);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [showDoctorAssign, setShowDoctorAssign] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Get suggested templates based on patient state
    const suggestedTemplates = getSuggestedTemplates(
        conversation.emotionalState,
        conversation.journeyStage,
        '' // intent from last message
    );

    useEffect(() => {
        loadMessages();
    }, [conversation.id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    async function loadMessages() {
        const client = getSupabaseClient();
        if (!client) return;

        setLoading(true);
        try {
            const { data } = await client
                .from('messages')
                .select('id, direction, content, created_at, ai_intent, ai_sentiment')
                .eq('conversation_id', conversation.id)
                .order('created_at', { ascending: true });

            if (data && data.length > 0) {
                // Analyze the last inbound message for Whisper UI
                const lastInbound = [...data].reverse().find(m => m.direction === 'inbound');
                if (lastInbound) {
                    analyzePatientInput(lastInbound.content);
                }
            }

            setMessages(data || []);
        } catch (error) {
            console.error('Failed to load messages:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSendReply() {
        if (!replyText.trim() || sending) return;

        const client = getSupabaseClient();
        if (!client) return;

        setSending(true);
        try {
            // Store message
            await client.from('messages').insert({
                conversation_id: conversation.id,
                direction: 'outbound',
                content: replyText.trim(),
                sender_id: consultantId,
                sender_type: 'consultant',
                channel: 'whatsapp',
            });

            setReplyText('');
            await loadMessages();
            toast.success('Message sent! 🚀');
        } catch (error) {
            console.error('Failed to send:', error);
            toast.error('Failed to send message');
        } finally {
            setSending(false);
        }
    }

    function handleUseTemplate(template: ResponseTemplate) {
        setReplyText(template.text);
        toast.success(`Template applied: ${template.name}`);
    }

    function handleCopyTemplate(template: ResponseTemplate) {
        navigator.clipboard.writeText(template.text);
        setCopiedId(template.id);
        setTimeout(() => setCopiedId(null), 2000);
    }

    async function handleAssignDoctor(doctorId: string) {
        const success = await assignToDoctor(conversation.id, doctorId, consultantId);
        if (success) {
            toast.success('Patient assigned to doctor! 👨‍⚕️');
            setShowDoctorAssign(false);
        } else {
            toast.error('Failed to assign doctor');
        }
    }

    function formatTime(timestamp: string) {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    function formatDate(timestamp: string) {
        return new Date(timestamp).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        });
    }

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

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold">
                                    {conversation.patientFirstName.charAt(0)}
                                </div>
                                <span className="absolute -bottom-1 -right-1 text-lg">
                                    {getEmotionEmoji(conversation.emotionalState)}
                                </span>
                            </div>

                            <div>
                                <h2 className="font-semibold text-lg">{conversation.patientFirstName}</h2>
                                <div className="flex items-center gap-2 text-sm text-white/80">
                                    <span>{conversation.patientPersona.emoji} {conversation.patientPersona.label}</span>
                                    <span>•</span>
                                    <span>{conversation.treatmentType || 'General inquiry'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Doctor assignment button */}
                        <button
                            onClick={() => setShowDoctorAssign(!showDoctorAssign)}
                            className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm"
                        >
                            <Stethoscope className="w-4 h-4" />
                            <span>Assign Doctor</span>
                        </button>
                    </div>
                </div>

                {/* AI Context bar */}
                <div className="mt-3 flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1 px-2 py-1 bg-white/10 rounded-full">
                        <Sparkles className="w-3 h-3" />
                        <span>{conversation.aiSummary}</span>
                    </div>
                    {conversation.bookingProbability >= 0.6 && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-full">
                            <span>🎯 {Math.round(conversation.bookingProbability * 100)}% booking chance</span>
                        </div>
                    )}
                    {conversation.isOverdue && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-red-500/30 rounded-full">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Overdue - respond ASAP!</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Doctor assignment panel */}
            {showDoctorAssign && (
                <div className="bg-blue-50 border-b border-blue-200 p-4">
                    <h3 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                        <UserPlus className="w-4 h-4" />
                        Assign to Doctor (Blind Mode)
                    </h3>
                    <p className="text-sm text-blue-700 mb-3">
                        Doctor will see the case but not patient contact info.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {/* Placeholder - would load from database */}
                        <button
                            onClick={() => handleAssignDoctor('dr-ahmet-id')}
                            className="px-3 py-2 bg-white border border-blue-300 rounded-lg hover:bg-blue-100 text-sm font-medium"
                        >
                            👨‍⚕️ Dr. Ahmet (Implants)
                        </button>
                        <button
                            onClick={() => handleAssignDoctor('dr-mehmet-id')}
                            className="px-3 py-2 bg-white border border-blue-300 rounded-lg hover:bg-blue-100 text-sm font-medium"
                        >
                            👨‍⚕️ Dr. Mehmet (Veneers)
                        </button>
                    </div>
                </div>
            )}

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
                {loading ? (
                    <div className="flex items-center justify-center h-32">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center text-gray-500 py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                            <MessageSquare className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="font-medium">No messages yet</p>
                        <p className="text-sm text-gray-400">Start the conversation with a template</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => {
                        const showDate = idx === 0 ||
                            formatDate(msg.created_at) !== formatDate(messages[idx - 1].created_at);

                        return (
                            <div key={msg.id}>
                                {showDate && (
                                    <div className="flex justify-center my-4">
                                        <span className="px-3 py-1 text-xs text-gray-500 bg-white rounded-full shadow-sm">
                                            {formatDate(msg.created_at)}
                                        </span>
                                    </div>
                                )}

                                <div className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[70%] rounded-2xl p-3 ${msg.direction === 'outbound'
                                        ? 'bg-purple-600 text-white rounded-br-none'
                                        : 'bg-white text-gray-900 rounded-bl-none shadow-sm border border-gray-100'
                                        }`}>
                                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                        <div className={`flex items-center justify-between gap-2 mt-2 text-xs ${msg.direction === 'outbound' ? 'text-purple-200' : 'text-gray-400'
                                            }`}>
                                            <span>{formatTime(msg.created_at)}</span>
                                            {msg.direction === 'inbound' && msg.ai_intent && (
                                                <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px]">
                                                    {msg.ai_intent.replace(/_/g, ' ')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Template suggestions (collapsible) */}
            <div className="border-t border-gray-200 bg-white">
                <button
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="w-full flex items-center justify-between p-3 text-sm font-medium text-purple-700 hover:bg-purple-50"
                >
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        <span>AI Suggested Responses ({suggestedTemplates.length})</span>
                    </div>
                    {showTemplates ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>

                {showTemplates && suggestedTemplates.length > 0 && (
                    <div className="px-3 pb-3 space-y-2">
                        {suggestedTemplates.map(template => (
                            <div
                                key={template.id}
                                className="p-3 bg-purple-50 rounded-lg border border-purple-100"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-purple-900">{template.name}</span>
                                    <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                                        {Math.round(template.successRate * 100)}% success
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 line-clamp-2 mb-2">{template.text}</p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleUseTemplate(template)}
                                        className="flex-1 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
                                    >
                                        Use Template
                                    </button>
                                    <button
                                        onClick={() => handleCopyTemplate(template)}
                                        className="px-3 py-1.5 border border-purple-300 text-purple-700 text-sm rounded-lg hover:bg-purple-100"
                                    >
                                        {copiedId === template.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Reply composer */}
            <div className="p-4 border-t border-gray-200 bg-white">
                {/* AI suggestion banner */}
                {conversation.aiSuggestedResponse && (
                    <div className="mb-3 p-3 bg-purple-50 rounded-xl border border-purple-200 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-bold text-purple-800 mb-2">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>AI SUGGESTION ({conversation.emotionalState?.toUpperCase() || 'NEUTRAL'})</span>
                        </div>
                        <p className="text-sm text-gray-800 leading-relaxed mb-2">{conversation.aiSuggestedResponse}</p>
                        <button
                            onClick={() => setReplyText(conversation.aiSuggestedResponse)}
                            className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-purple-700 transition"
                        >
                            Use this suggestion
                        </button>
                    </div>
                )}

                <div className="flex items-end gap-2">
                    <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendReply();
                            }
                        }}
                        placeholder={`Reply to ${conversation.patientFirstName}...`}
                        rows={3}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />

                    <button
                        onClick={handleSendReply}
                        disabled={!replyText.trim() || sending}
                        className={`p-3 rounded-xl transition-all ${replyText.trim() && !sending
                            ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg'
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

                <div className="mt-3 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1">
                        <Clock className="w-3.5 h-3.5 text-gray-500" />
                        <span>Patient Persona Strategy:</span>
                    </div>
                    <p className="text-xs text-gray-600 leading-snug">
                        {conversation.patientPersona.suggestedApproach}
                    </p>
                </div>
            </div>
        </div>
    );
}
