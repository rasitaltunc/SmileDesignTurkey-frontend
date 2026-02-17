/**
 * ConsultantDashboard - Main container for consultant experience
 * Part of: Model B++ - Smile Design Ultimate Ecosystem
 * Phase: 2 - Communication Lock
 */

import { useState } from 'react';
import ConsultantInbox from './ConsultantInbox';
import ConversationDetail from './ConversationDetail';
import type { ConsultantConversation } from '@/lib/consultant/consultantService';
import { MessageSquare, Sparkles } from 'lucide-react';

interface ConsultantDashboardProps {
    consultantId: string;
}

import { ConsultantProvider } from '../../context/ConsultantContext';
import { WhisperCard } from '../dashboard/WhisperCard';
import { TriageAssistant } from '../dashboard/TriageAssistant';
import { JarvisHeader } from './JarvisHeader';

export default function ConsultantDashboard({ consultantId }: ConsultantDashboardProps) {
    const [selectedConversation, setSelectedConversation] = useState<ConsultantConversation | null>(null);

    return (
        <ConsultantProvider>
            <WhisperCard />
            <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
                {/* Jarvis Header - The "Iron Man" HUD */}
                <div className="p-4 pb-0">
                    <JarvisHeader />
                </div>

                <div className="flex-1 flex overflow-hidden pb-4 px-4 gap-4">
                    {/* Inbox sidebar */}
                    <div className={`w-full md:w-[400px] lg:w-[450px] flex-shrink-0 flex flex-col bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 ${selectedConversation ? 'hidden md:flex' : 'flex'
                        }`}>
                        <ConsultantInbox
                            consultantId={consultantId}
                            onSelectConversation={setSelectedConversation}
                            selectedConversationId={selectedConversation?.id}
                        />
                        <div className="p-4 border-t border-gray-100 bg-gray-50/50 backdrop-blur-sm">
                            <TriageAssistant />
                        </div>
                    </div>

                    {/* Conversation detail */}
                    <div className={`flex-1 bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 ${!selectedConversation ? 'hidden md:flex md:items-center md:justify-center' : 'flex flex-col'}`}>
                        {selectedConversation ? (
                            <ConversationDetail
                                consultantId={consultantId}
                                conversation={selectedConversation}
                                onBack={() => setSelectedConversation(null)}
                            />
                        ) : (
                            <div className="text-center text-gray-400 p-8">
                                <div className="w-24 h-24 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                                    <MessageSquare className="w-10 h-10 text-purple-300" />
                                </div>
                                <h3 className="text-xl font-medium text-gray-600 mb-2">Ready to assist, Consultant</h3>
                                <p className="text-gray-400 max-w-sm mx-auto">
                                    Select a patient from the queue to active your support protocols.
                                </p>
                                <div className="mt-8 flex items-center justify-center gap-3 text-sm text-purple-600 bg-purple-50 py-2 px-4 rounded-full inline-flex">
                                    <Sparkles className="w-4 h-4" />
                                    <span>AI Prioritization Active</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </ConsultantProvider>
    );
}
