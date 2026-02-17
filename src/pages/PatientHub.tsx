import React, { useState, useEffect } from 'react';
import {
    MessageCircle,
    FileText,
    Phone,
    MapPin,
    Star,
    ClipboardList,
    Bell,
    ChevronRight,
    Heart,
    Users,
    Shield,
    LogOut,
} from 'lucide-react';
import { AmbientBackground } from '../components/hub/AmbientBackground';
import { HubCard } from '../components/hub/HubCard';
import { ActivityFeed } from '../components/hub/ActivityFeed';
import { TreatmentTimeline } from '../components/hub/TreatmentTimeline';
import { HubChatDrawer } from '../components/hub/HubChatDrawer';
import { HubDocuments } from '../components/hub/HubDocuments';
import { NotificationCenter } from '../components/hub/NotificationCenter';
import { SmartGallery } from '../components/hub/SmartGallery';
import { PackageSelector } from '../components/hub/PackageSelector';
import { TrustPack } from '../components/trust/TrustPack';
import { ProofStrip } from '../components/trust/ProofStrip';
import { getPatientPortalData } from '@/lib/patientPortal'; // Real data
import '../styles/hub.css';

// ── Mock patient data (will be replaced by Supabase) ──
const MOCK_PATIENT = {
    firstName: 'Sarah',
    treatmentType: 'Hollywood Smile',
    consultantName: 'Ayşe',
    consultantOnline: true,
    unreadMessages: 3,
    documentsCount: 4,
    nextAppointment: 'March 18, 2026 · 14:00',
    treatmentStage: 'Quote Approved',
    communityCount: 2847,
};

/**
 * PatientHub — The immersive patient environment
 * 
 * This is NOT a webpage. This is a space.
 * The patient should feel like they're INSIDE something — warm, alive, connected.
 * 
 * Phase B: Interactive Core
 * - TreatmentTimeline: Visual journey stepper
 * - HubChatDrawer: Trust Triangle group chat (patient + consultant + doctor)
 * - NotificationCenter: Grouped notification panel
 * - SmartGallery: AI-personalized Before/After gallery
 */
export default function PatientHub() {
    const [patientData, setPatientData] = useState<any>(MOCK_PATIENT);
    const [communityCount, setCommunityCount] = useState(0);
    const [greeting, setGreeting] = useState('');
    const [chatOpen, setChatOpen] = useState(false);
    const [docsOpen, setDocsOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(3); // Start with some unread for effect, then sync

    // Hydrate with Real Data
    useEffect(() => {
        async function loadPatient() {
            try {
                const data = await getPatientPortalData();
                if (data) {
                    setPatientData(prev => ({
                        ...prev,
                        firstName: data.name?.split(' ')[0] || 'Guest',
                        treatmentType: data.treatment_type || 'Smile Makeover',
                        patientId: data.patient_id, // Important for chat
                        leadStatus: data.lead_status || 'new', // Journey sync
                    }));
                }
            } catch (err) {
                console.error('Failed to load patient data:', err);
            }
        }
        loadPatient();
    }, []);

    // Animate community counter on mount
    useEffect(() => {
        const target = MOCK_PATIENT.communityCount;
        const duration = 2000;
        const startTime = Date.now();

        const tick = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out quad
            const eased = 1 - (1 - progress) * (1 - progress);
            setCommunityCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
    }, []);

    // Time-based greeting
    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good morning');
        else if (hour < 18) setGreeting('Good afternoon');
        else setGreeting('Good evening');
    }, []);

    const openChat = () => setChatOpen(true);

    // ── Phase C: "Alive" Interactivity Cues ──

    // 1. Simulated "Consultant is typing..."
    const [isConsultantTyping, setIsConsultantTyping] = useState(false);
    useEffect(() => {
        if (chatOpen) {
            // Wait 1.5s after opening, then type for 4s
            // Only simulate if no real typing status (future)
            const startTimeout = setTimeout(() => setIsConsultantTyping(true), 1500);
            const stopTimeout = setTimeout(() => setIsConsultantTyping(false), 5500);
            return () => {
                clearTimeout(startTimeout);
                clearTimeout(stopTimeout);
            };
        } else {
            setIsConsultantTyping(false);
        }
    }, [chatOpen]);

    // 2. Simulated "Clinical Review" Notification (triggers once after 15s)
    useEffect(() => {
        const hasTriggered = sessionStorage.getItem('hub_notification_triggered');
        if (!hasTriggered) {
            const timeout = setTimeout(() => {
                setUnreadCount(prev => prev + 1);
                // We could also show a toast here if we had a toast system wired up for hub
                // For now, the bell icon badge update is the subtle cue
                sessionStorage.setItem('hub_notification_triggered', 'true');
            }, 15000);
            return () => clearTimeout(timeout);
        }
    }, []);

    return (
        <div style={{ position: 'relative', minHeight: '100vh' }}>
            {/* Ambient animated background */}
            <AmbientBackground />

            {/* Content layer */}
            <div className="hub-content">
                {/* ── Top Bar ── */}
                <div className="hub-enter hub-enter--d1 flex items-center justify-between mb-8">
                    <div>
                        <p className="text-xs font-medium mb-1" style={{ color: 'var(--hub-text-muted)' }}>
                            {greeting}
                        </p>
                        <h1 className="text-2xl font-bold hub-shimmer">
                            {patientData.firstName}
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            className="w-10 h-10 rounded-xl flex items-center justify-center relative"
                            style={{ background: 'var(--hub-glass-bg)', border: '1px solid var(--hub-glass-border)' }}
                            title="Notifications"
                            onClick={() => setNotificationsOpen(true)}
                        >
                            <Bell className="w-5 h-5" style={{ color: 'var(--hub-text-secondary)' }} />
                            {unreadCount > 0 && (
                                <span
                                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                                    style={{ background: 'var(--hub-accent)' }}
                                >
                                    {unreadCount}
                                </span>
                            )}
                        </button>
                        <button
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ background: 'var(--hub-glass-bg)', border: '1px solid var(--hub-glass-border)' }}
                            title="Logout"
                        >
                            <LogOut className="w-5 h-5" style={{ color: 'var(--hub-text-secondary)' }} />
                        </button>
                    </div>
                </div>

                {/* ── Consultant Status Card ── */}
                <div className="hub-enter hub-enter--d2 hub-glass hub-glass--accent p-4 mb-6 flex items-center gap-4">
                    <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                        style={{
                            background: 'linear-gradient(135deg, var(--hub-accent), #0d9488)',
                        }}
                    >
                        {MOCK_PATIENT.consultantName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-semibold" style={{ color: 'var(--hub-text-primary)' }}>
                                {MOCK_PATIENT.consultantName}
                            </p>
                            {MOCK_PATIENT.consultantOnline && (
                                <span className="hub-pulse-dot" />
                            )}
                            <span className="text-xs" style={{ color: 'var(--hub-success)' }}>
                                Online
                            </span>
                        </div>
                        <p className="text-xs" style={{ color: 'var(--hub-text-secondary)' }}>
                            Your personal health consultant
                        </p>
                    </div>
                    <button
                        className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold text-white flex items-center gap-1.5"
                        style={{ background: 'var(--hub-accent)' }}
                        onClick={openChat}
                    >
                        <MessageCircle className="w-4 h-4" />
                        Chat
                    </button>
                </div>

                {/* ── Treatment Timeline (Phase B) ── */}
                <div className="hub-enter hub-enter--d3 mb-6">
                    <TreatmentTimeline
                        treatmentName={patientData.treatmentType}
                        currentStage={patientData.leadStatus} // Real sync
                    />
                </div>

                {/* ── Quick Actions ── */}
                <div className="hub-enter hub-enter--d4 mb-6">
                    <p className="text-xs font-medium mb-3" style={{ color: 'var(--hub-text-muted)' }}>
                        QUICK ACTIONS
                    </p>
                    <div className="hub-actions-grid">
                        <HubCard
                            icon={<MessageCircle className="w-5 h-5" style={{ color: 'var(--hub-accent)' }} />}
                            title="Messages"
                            description="Chat with your care team"
                            badge={unreadCount}
                            badgeType="new"
                            onClick={openChat}
                        />
                        <HubCard
                            icon={<ClipboardList className="w-5 h-5" style={{ color: 'var(--hub-accent)' }} />}
                            title="Treatment Plan"
                            description="View your personalized plan"
                            onClick={() => { }}
                        />
                        <HubCard
                            icon={<FileText className="w-5 h-5" style={{ color: 'var(--hub-accent)' }} />}
                            title="Documents"
                            description="X-rays, quotes & reports"
                            badge={MOCK_PATIENT.documentsCount}
                            badgeType="info"
                            onClick={() => setDocsOpen(true)}
                        />
                        <HubCard
                            icon={<Phone className="w-5 h-5" style={{ color: 'var(--hub-accent)' }} />}
                            title="Call Consultant"
                            description="One-tap video or voice call"
                            onClick={() => { }}
                        />
                        <HubCard
                            icon={<MapPin className="w-5 h-5" style={{ color: 'var(--hub-accent)' }} />}
                            title="Travel & Stay"
                            description="Flights, hotels & transfers"
                            onClick={() => { }}
                        />
                        <HubCard
                            icon={<Star className="w-5 h-5" style={{ color: 'var(--hub-accent)' }} />}
                            title="Leave a Review"
                            description="Share your experience"
                            onClick={() => { }}
                        />
                    </div>
                </div>

                {/* ── Activity Feed ── */}
                <div className="hub-enter hub-enter--d5 mb-6">
                    <ActivityFeed />
                </div>

                {/* ── Smart Before/After Gallery (Phase B) ── */}
                <div className="hub-enter hub-enter--d6 mb-6">
                    <SmartGallery treatmentType={MOCK_PATIENT.treatmentType} />
                </div>

                {/* ── Package Selector (Phase C — Goldilocks) ── */}
                <div className="hub-enter hub-enter--d7 mb-6">
                    <PackageSelector treatmentType={MOCK_PATIENT.treatmentType} />
                </div>

                {/* ── Proof Elements (Phase C) ── */}
                <div className="hub-enter hub-enter--d7 mb-8">
                    <ProofStrip />
                </div>

                {/* ── Community Trust Strip ── */}
                <div className="hub-enter hub-enter--d8 hub-glass p-5 mb-6 text-center">
                    <div className="flex items-center justify-center gap-3 mb-3">
                        <div className="flex -space-x-2">
                            {['bg-blue-500', 'bg-purple-500', 'bg-teal-500', 'bg-amber-500', 'bg-pink-500'].map((bg, i) => (
                                <div
                                    key={i}
                                    className={`w-7 h-7 rounded-full ${bg} border-2 flex items-center justify-center text-white text-[10px] font-bold`}
                                    style={{ borderColor: 'var(--hub-bg-mid)' }}
                                >
                                    {String.fromCharCode(65 + i)}
                                </div>
                            ))}
                        </div>
                        <p className="text-sm font-medium" style={{ color: 'var(--hub-text-primary)' }}>
                            +<span className="hub-counter">{communityCount.toLocaleString()}</span> patients
                        </p>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--hub-text-secondary)' }}>
                        joined the GuideHealth community and transformed their smiles
                    </p>
                    <div className="flex items-center justify-center gap-4 mt-3">
                        <div className="flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5" style={{ color: 'var(--hub-accent)' }} />
                            <span className="text-xs" style={{ color: 'var(--hub-text-muted)' }}>JCI Accredited</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Heart className="w-3.5 h-3.5" style={{ color: '#f43f5e' }} />
                            <span className="text-xs" style={{ color: 'var(--hub-text-muted)' }}>98% Satisfaction</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" style={{ color: 'var(--hub-info)' }} />
                            <span className="text-xs" style={{ color: 'var(--hub-text-muted)' }}>50+ Countries</span>
                        </div>
                    </div>
                </div>

                {/* ── Next Appointment ── */}
                {MOCK_PATIENT.nextAppointment && (
                    <div className="hub-enter hub-enter--d8 hub-glass hub-glass--accent p-4 mb-8">
                        <div className="flex items-center gap-3">
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ background: 'rgba(59, 130, 246, 0.15)' }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                    <line x1="16" y1="2" x2="16" y2="6" />
                                    <line x1="8" y1="2" x2="8" y2="6" />
                                    <line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--hub-text-muted)' }}>
                                    NEXT APPOINTMENT
                                </p>
                                <p className="text-sm font-semibold" style={{ color: 'var(--hub-text-primary)' }}>
                                    {MOCK_PATIENT.nextAppointment}
                                </p>
                            </div>
                            <ChevronRight className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--hub-text-muted)' }} />
                        </div>
                    </div>
                )}

                {/* ── Trust Pack (Phase C) ── */}
                <div className="hub-enter hub-enter--d8 mb-8">
                    <TrustPack />
                </div>

                {/* ── Footer ── */}
                <div className="hub-enter hub-enter--d8 text-center pb-8">
                    <p className="text-xs" style={{ color: 'var(--hub-text-muted)' }}>
                        GuideHealth · Your smile journey, one step at a time
                    </p>
                </div>
            </div>

            {/* ── Phase B Overlays ── */}
            <HubChatDrawer
                isOpen={chatOpen}
                onClose={() => setChatOpen(false)}
                consultantName={patientData.consultantName}
                consultantOnline={patientData.consultantOnline}
                patientId={patientData.patientId} // Real data connection
                isTyping={isConsultantTyping}
            />
            <NotificationCenter
                isOpen={notificationsOpen}
                onClose={() => setNotificationsOpen(false)}
                onNotificationCountChange={setUnreadCount}
            />
            <HubDocuments
                isOpen={docsOpen}
                onClose={() => setDocsOpen(false)}
            />
        </div>
    );
}
