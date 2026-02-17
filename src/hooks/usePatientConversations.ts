import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { toast } from 'sonner';

export interface PatientMessage {
    id: string;
    content: string;
    created_at: string;
    direction: 'inbound' | 'outbound';
    message_type: 'text' | 'image' | 'document' | 'template';
    media_url?: string;
    is_read: boolean;
    sender_name?: string; // For UI display
    sender_role?: 'patient' | 'consultant' | 'doctor' | 'system';
}

export function usePatientConversations(patientId: string | undefined) {
    const [messages, setMessages] = useState<PatientMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [conversationId, setConversationId] = useState<string | null>(null);

    // 1. Fetch Conversation ID for this patient
    const fetchConversation = useCallback(async () => {
        if (!patientId) return;
        const supabase = getSupabaseClient();
        if (!supabase) return;

        try {
            // Get the active conversation for this patient
            const { data, error } = await supabase
                .from('conversations')
                .select('id')
                .eq('patient_id', patientId)
                .order('last_message_at', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching conversation:', error);
                return;
            }

            if (data) {
                setConversationId(data.id);
            }
        } catch (err) {
            console.error('Error in fetchConversation:', err);
        }
    }, [patientId]);

    // 2. Load Messages
    const loadMessages = useCallback(async () => {
        if (!conversationId) return;
        const supabase = getSupabaseClient();
        if (!supabase) return;

        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true }); // Oldest first for chat

            if (error) throw error;

            // Transform to UI format
            const formattedMessages: PatientMessage[] = data.map(msg => ({
                id: msg.id,
                content: msg.content,
                created_at: msg.created_at,
                direction: msg.direction,
                message_type: msg.message_type,
                media_url: msg.media_url,
                is_read: msg.wa_status === 'read',
                // Determine sender role based on direction
                sender_role: msg.direction === 'inbound' ? 'patient' : 'consultant', // Default to consultant, refined below
                sender_name: msg.direction === 'inbound' ? 'You' : 'Consultant',
            }));

            setMessages(formattedMessages);
            setLoading(false);
        } catch (err) {
            console.error('Error loading messages:', err);
            toast.error('Failed to load chat history');
        }
    }, [conversationId]);

    // 3. Subscribe to Realtime Changes
    useEffect(() => {
        if (!conversationId) return;
        const supabase = getSupabaseClient();
        if (!supabase) return;

        const channel = supabase
            .channel(`patient_chat_${conversationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${conversationId}`,
                },
                (payload) => {
                    const newMsg = payload.new as any;
                    const formattedMsg: PatientMessage = {
                        id: newMsg.id,
                        content: newMsg.content,
                        created_at: newMsg.created_at,
                        direction: newMsg.direction,
                        message_type: newMsg.message_type,
                        media_url: newMsg.media_url,
                        is_read: newMsg.wa_status === 'read',
                        sender_role: newMsg.direction === 'inbound' ? 'patient' : 'consultant',
                        sender_name: newMsg.direction === 'inbound' ? 'You' : 'Consultant',
                    };
                    setMessages(prev => [...prev, formattedMsg]);

                    // Specific toast if it's an incoming message (from doctor/consultant)
                    if (newMsg.direction === 'outbound') {
                        // Optional: Play sound or show toast
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [conversationId]);

    // Init
    useEffect(() => {
        fetchConversation();
    }, [fetchConversation]);

    useEffect(() => {
        if (conversationId) {
            loadMessages();
        }
    }, [conversationId, loadMessages]);

    // 4. Demo Mode Bypass
    useEffect(() => {
        if (import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true') {
            setLoading(false);
            setConversationId('demo-conv-123');
            setMessages([
                {
                    id: '1',
                    content: "Hi Sarah! 👋 Welcome to GuideHealth. I'm Ayşe, your personal health consultant. I'll be with you every step of the way.",
                    created_at: new Date(Date.now() - 86400000).toISOString(),
                    direction: 'outbound',
                    message_type: 'text',
                    is_read: true,
                    sender_role: 'consultant',
                    sender_name: 'Ayşe'
                },
                {
                    id: '2',
                    content: "Hi Ayşe! Thanks. I'm a bit nervous about the whole process honestly.",
                    created_at: new Date(Date.now() - 86340000).toISOString(),
                    direction: 'inbound',
                    message_type: 'text',
                    is_read: true,
                    sender_role: 'patient',
                    sender_name: 'You'
                },
                {
                    id: '3',
                    content: "That's completely normal, Sarah. Over 2,800 patients have trusted us and 98% rate their experience 5 stars. Let me share your X-ray with Dr. Mehmet — he's one of our top specialists.",
                    created_at: new Date(Date.now() - 86300000).toISOString(),
                    direction: 'outbound',
                    message_type: 'text',
                    is_read: true,
                    sender_role: 'consultant',
                    sender_name: 'Ayşe'
                },
                {
                    id: '4',
                    content: "Hello Sarah, I've reviewed your panoramic X-ray. Your teeth structure is excellent for a Hollywood Smile. I'd recommend 20 porcelain veneers — E-max brand for the most natural result. 🦷",
                    created_at: new Date(Date.now() - 82000000).toISOString(),
                    direction: 'outbound',
                    message_type: 'text',
                    is_read: true,
                    sender_role: 'doctor',
                    sender_name: 'Dr. Mehmet'
                },
                {
                    id: '7',
                    content: "I've prepared your Signature Package quote — includes hotel, VIP transfer, and all treatment costs. I sent it to your Documents tab! 📋",
                    created_at: new Date(Date.now() - 3600000).toISOString(),
                    direction: 'outbound',
                    message_type: 'text',
                    is_read: false,
                    sender_role: 'consultant',
                    sender_name: 'Ayşe'
                }
            ]);
        }
    }, []);

    // Send Message Function
    const sendMessage = async (text: string) => {
        // DEMO MODE
        if (import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true') {
            console.log('Demo Mode: Sending message:', text);
            // Add optimistic message to efficient local state or just let the caller handle it?
            // The caller (HubChatDrawer) doesn't use the returned state for optimistic UI yet, 
            // but it DOES fetch fresh messages.
            // For demo, we should probably update the local messages state here to simulate a send?
            // Actually HubChatDrawer handles UI update via its own optimistic logic or re-fetch.
            // We'll just return success.
            return;
        }

        if (!conversationId || !patientId) return;
        const supabase = getSupabaseClient();
        if (!supabase) return;

        try {
            const { error } = await supabase
                .from('messages')
                .insert({
                    conversation_id: conversationId,
                    patient_id: patientId,
                    direction: 'inbound', // Patient sending to system
                    channel: 'whatsapp', // Treating hub chat as WA channel for now for consistency
                    message_type: 'text',
                    content: text,
                    wa_status: 'sent'
                });

            if (error) throw error;
        } catch (err) {
            console.error('Error sending message:', err);
            toast.error('Failed to send message');
        }
    };

    return { messages, loading, sendMessage, conversationId };
}
