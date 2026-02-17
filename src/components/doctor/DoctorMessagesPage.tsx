/**
 * DoctorMessagesPage - Main doctor messaging interface
 * Part of: Model B++ - Smile Design Ultimate Ecosystem
 * Purpose: Container for doctor blind mode messaging
 * Phase: 2 - Communication Lock
 */

import { useState } from 'react';
import DoctorBlindInbox from '@/components/doctor/DoctorBlindInbox';
import BlindConversationView from '@/components/doctor/BlindConversationView';
import { Shield, MessageSquare } from 'lucide-react';

interface DoctorMessagesPageProps {
    doctorId: string;
}

interface SelectedConversation {
    id: string;
    patientFirstName: string;
    treatmentType?: string;
}

export default function DoctorMessagesPage({ doctorId }: DoctorMessagesPageProps) {
    const [selectedConversation, setSelectedConversation] = useState<SelectedConversation | null>(null);

    const handleSelectConversation = (conversationId: string) => {
        // In a real app, you'd fetch conversation details
        // For now, we'll just set the ID and let the view handle it
        setSelectedConversation({
            id: conversationId,
            patientFirstName: 'Patient', // Will be loaded by the component
            treatmentType: undefined,
        });
    };

    const handleBack = () => {
        setSelectedConversation(null);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-6xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <MessageSquare className="w-6 h-6 text-blue-600" />
                            <h1 className="text-xl font-semibold text-gray-900">Patient Messages</h1>
                        </div>

                        {/* Security indicator */}
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
                            <Shield className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-700">Blind Mode Active</span>
                        </div>
                    </div>

                    {/* Security notice */}
                    <p className="mt-2 text-sm text-gray-500">
                        Patient contact information is protected. All messages are routed through the platform.
                    </p>
                </div>
            </header>

            {/* Main content */}
            <main className="max-w-6xl mx-auto px-4 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-180px)]">
                    {/* Inbox (1/3 width on desktop) */}
                    <div className={`lg:col-span-1 ${selectedConversation ? 'hidden lg:block' : ''}`}>
                        <DoctorBlindInbox
                            doctorId={doctorId}
                            onSelectConversation={handleSelectConversation}
                            selectedConversationId={selectedConversation?.id}
                        />
                    </div>

                    {/* Conversation view (2/3 width on desktop) */}
                    <div className={`lg:col-span-2 ${!selectedConversation ? 'hidden lg:flex lg:items-center lg:justify-center' : ''}`}>
                        {selectedConversation ? (
                            <BlindConversationView
                                doctorId={doctorId}
                                conversationId={selectedConversation.id}
                                patientFirstName={selectedConversation.patientFirstName}
                                treatmentType={selectedConversation.treatmentType}
                                onBack={handleBack}
                            />
                        ) : (
                            <div className="text-center text-gray-500">
                                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                <p className="text-lg font-medium">Select a conversation</p>
                                <p className="text-sm">Choose a patient from the inbox to view messages</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
