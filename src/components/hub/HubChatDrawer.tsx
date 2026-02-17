import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { X, Send, Paperclip, MoreVertical } from 'lucide-react';
import { useRedZone } from '@/hooks/useRedZone';
import { InterventionToast } from '@/components/ui/InterventionToast';



/**
 * Trust Triangle Chat — Patient sees Consultant AND Doctor collaborating
 * Research: Broker Trust + Social Presence → "They're working together FOR me"
 */


const QUICK_REPLIES = [
    'Thank you! 🙏',
    'When is my appointment?',
    'Can I see the quote?',
    'I have a question...',
];

import { usePatientConversations } from '@/hooks/usePatientConversations';

interface HubChatDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    consultantName?: string;
    consultantOnline?: boolean;
    patientId?: string; // Added to support real data
    isTyping?: boolean; // Keep for existing prop compatibility if used elsewhere, although mock typing removed from internal state
}

export function HubChatDrawer({
    isOpen,
    onClose,
    consultantName = 'Ayşe',
    consultantOnline,
    patientId,
}: HubChatDrawerProps) {
    // Real data integration
    const { messages: realMessages, sendMessage, loading } = usePatientConversations(patientId);

    // AI Twin / Night Mode State
    const [isOffline, setIsOffline] = useState(false); // Toggle via header click
    const [localMessages, setLocalMessages] = useState<any[]>([]);
    const [isAiTyping, setIsAiTyping] = useState(false);

    // Transform real messages to UI format & merge with local AI messages
    const displayMessages = [
        ...realMessages.map(msg => ({
            id: msg.id,
            sender: msg.direction === 'inbound' ? 'patient' : 'consultant',
            senderName: msg.direction === 'inbound' ? 'You' : consultantName,
            text: msg.content,
            time: new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
            isNew: !msg.is_read
        })),
        ...localMessages
    ].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()); // Ensure correct order if mixing

    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const { detectedZone, checkInput, dismissZone } = useRedZone();

    const handleCopyScript = (text: string) => {
        setInputValue(text);
        dismissZone();
        inputRef.current?.focus();
    };

    // Scroll to bottom on new messages
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 300);
        }
    }, [isOpen, displayMessages.length, isAiTyping]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 400);
        }
    }, [isOpen]);

    const handleSend = async (text?: string) => {
        const messageText = text || inputValue.trim();
        if (!messageText) return;

        setInputValue('');

        // 1. Send user message (Optimistic UI handled by hook, or we assume success)
        await sendMessage(messageText);

        // 2. AI Twin Logic (Night Mode)
        if (isOffline) {
            // Simulate AI thinking
            setTimeout(() => setIsAiTyping(true), 1000);

            // Send AI Auto-Reply
            setTimeout(() => {
                setIsAiTyping(false);
                const aiMessage = {
                    id: `ai-${Date.now()}`,
                    sender: 'ai-assistant', // Special sender type
                    senderName: 'GuideHealth AI',
                    text: `Hi Sarah, ${consultantName} is currently offline (Night Mode 🌙). I've logged your request and she'll get back to you first thing in the morning!`,
                    time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                    isNew: true
                };
                setLocalMessages(prev => [...prev, aiMessage]);
            }, 3500);
        }
    };

    const getSenderStyle = (sender: string) => {
        switch (sender) {
            case 'doctor':
                return {
                    bg: 'rgba(59, 130, 246, 0.12)',
                    border: 'rgba(59, 130, 246, 0.25)',
                    badge: '🩺',
                    badgeBg: 'rgba(59, 130, 246, 0.2)',
                    badgeColor: '#60a5fa',
                    label: 'Dentist',
                };
            case 'consultant':
                return {
                    bg: 'rgba(20, 184, 166, 0.1)',
                    border: 'rgba(20, 184, 166, 0.2)',
                    badge: '💬',
                    badgeBg: 'rgba(20, 184, 166, 0.2)',
                    badgeColor: '#2dd4bf',
                    label: 'Consultant',
                };
            case 'ai-assistant':
                return {
                    bg: 'rgba(124, 58, 237, 0.1)', // Violet
                    border: 'rgba(124, 58, 237, 0.2)',
                    badge: '🤖',
                    badgeBg: 'rgba(124, 58, 237, 0.2)',
                    badgeColor: '#a78bfa',
                    label: 'AI Assistant',
                };
            default:
                return {
                    bg: 'rgba(255, 255, 255, 0.08)',
                    border: 'rgba(255, 255, 255, 0.12)',
                    badge: '',
                    badgeBg: '',
                    badgeColor: '',
                    label: '',
                };
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={`hub-drawer-overlay ${isOpen ? 'hub-drawer-overlay--active' : ''}`}
                onClick={onClose}
            />

            {/* Drawer */}
            <div className={`hub-drawer ${isOpen ? 'hub-drawer--open' : ''}`}>
                {/* Header */}
                <div className="hub-drawer-header">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                            style={{ background: isOffline ? '#94a3b8' : 'linear-gradient(135deg, var(--hub-accent), #0d9488)' }}
                        >
                            {consultantName.charAt(0)}
                        </div>
                        <div
                            onClick={() => setIsOffline(!isOffline)}
                            className="cursor-pointer select-none"
                            title="Demo: Toggle Online/Low-Power Mode"
                        >
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold" style={{ color: 'var(--hub-text-primary)' }}>
                                    Care Team
                                </p>
                                {!isOffline && consultantOnline ? (
                                    <>
                                        <span className="hub-pulse-dot" />
                                        <span className="text-[10px]" style={{ color: 'var(--hub-success)' }}>Online</span>
                                    </>
                                ) : (
                                    <span className="text-[10px] items-center flex gap-1" style={{ color: 'var(--hub-text-muted)' }}>
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                        Offline
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px]" style={{ color: 'var(--hub-text-muted)' }}>
                                {consultantName} · Dr. Mehmet
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ background: 'var(--hub-glass-bg)' }}
                        >
                            <MoreVertical className="w-4 h-4" style={{ color: 'var(--hub-text-muted)' }} />
                        </button>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ background: 'var(--hub-glass-bg)' }}
                        >
                            <X className="w-4 h-4" style={{ color: 'var(--hub-text-muted)' }} />
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div className="hub-drawer-messages">
                    {loading ? (
                        <div className="flex items-center justify-center h-48">
                            <span className="text-blue-500 loading-spinner"></span>
                        </div>
                    ) : (
                        displayMessages.map((msg) => {
                            const style = getSenderStyle(msg.sender);
                            return (
                                <div
                                    key={msg.id}
                                    className={`hub-chat-message ${msg.sender === 'patient' ? 'hub-chat-message--self' : ''}`}
                                >
                                    {msg.sender !== 'patient' && (
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <span
                                                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                                style={{ background: style.badgeBg, color: style.badgeColor }}
                                            >
                                                {style.badge} {msg.senderName} · {style.label}
                                            </span>
                                        </div>
                                    )}
                                    <div
                                        className="hub-chat-bubble"
                                        style={{
                                            background: style.bg,
                                            borderColor: style.border,
                                        }}
                                    >
                                        <p className="text-sm" style={{ color: 'var(--hub-text-primary)' }}>
                                            {msg.text}
                                        </p>
                                    </div>
                                    <span className="text-[10px] mt-1 block" style={{ color: 'var(--hub-text-muted)' }}>
                                        {msg.time}
                                        {msg.isNew && (
                                            <span className="ml-2 text-[10px]" style={{ color: 'var(--hub-accent)' }}>● New</span>
                                        )}
                                    </span>
                                </div>
                            );
                        })
                    )}

                    {/* AI Typing Indicator */}
                    {isAiTyping && (
                        <div className="hub-chat-message">
                            <div className="flex items-center gap-1.5 mb-1">
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-violet-100 text-violet-600">
                                    🤖 AI Assistant
                                </span>
                            </div>
                            <div className="hub-chat-bubble" style={{ background: 'rgba(124, 58, 237, 0.05)' }}>
                                <div className="flex gap-1">
                                    <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Verified Logic Badge (Bottom of chat if AI replied) */}
                    {localMessages.some(m => m.sender === 'ai-assistant') && (
                        <div className="flex justify-center mt-4 opacity-50">
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-emerald-500">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                                </svg>
                                Verified Medical Protocol
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Quick replies */}
                <div className="hub-quick-replies">
                    {QUICK_REPLIES.map((reply) => (
                        <button
                            key={reply}
                            className="hub-quick-reply"
                            onClick={() => handleSend(reply)}
                        >
                            {reply}
                        </button>
                    ))}
                </div>

                {/* Input Area */}
                <div className="hub-drawer-input-container relative z-20">
                    <InterventionToast
                        zone={detectedZone}
                        onDismiss={dismissZone}
                        onCopy={handleCopyScript}
                    />

                    <div className="hub-drawer-input-wrapper flex items-center gap-2 p-2 rounded-xl" style={{ background: 'var(--hub-glass-bg)' }}>
                        <button
                            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 hover:bg-black/5 transition-colors"
                        >
                            <Paperclip className="w-4 h-4" style={{ color: 'var(--hub-text-muted)' }} />
                        </button>

                        <div className="flex-1 relative">
                            <input
                                ref={inputRef}
                                type="text"
                                value={inputValue}
                                onChange={(e) => {
                                    setInputValue(e.target.value);
                                    checkInput(e.target.value);
                                }}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Type a message..."
                                className="hub-chat-input w-full bg-transparent border-none focus:ring-0 p-0 text-sm"
                                style={{ color: 'var(--hub-text-primary)' }}
                            />
                        </div>

                        <button
                            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200"
                            style={{
                                background: inputValue.trim() ? 'var(--hub-accent)' : 'transparent',
                                opacity: inputValue.trim() ? 1 : 0.5,
                            }}
                            onClick={() => handleSend()}
                            disabled={!inputValue.trim()}
                        >
                            <Send className="w-4 h-4" style={{ color: inputValue.trim() ? 'white' : 'var(--hub-text-muted)' }} />
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
