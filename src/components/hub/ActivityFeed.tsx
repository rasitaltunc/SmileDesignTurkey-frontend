import React from 'react';
import {
    FileText,
    MessageCircle,
    Star,
    Receipt,
    Stethoscope,
    Calendar,
    Upload,
    CheckCircle,
} from 'lucide-react';

interface ActivityItem {
    id: string;
    type: 'message' | 'document' | 'review' | 'quote' | 'doctor' | 'appointment' | 'upload' | 'milestone';
    title: string;
    description: string;
    time: string;
    isNew?: boolean;
}

const ACTIVITY_ICONS: Record<ActivityItem['type'], React.ReactNode> = {
    message: <MessageCircle className="w-3 h-3" style={{ color: 'var(--hub-accent)' }} />,
    document: <FileText className="w-3 h-3" style={{ color: 'var(--hub-info)' }} />,
    review: <Star className="w-3 h-3" style={{ color: 'var(--hub-warning)' }} />,
    quote: <Receipt className="w-3 h-3" style={{ color: 'var(--hub-success)' }} />,
    doctor: <Stethoscope className="w-3 h-3" style={{ color: '#c084fc' }} />,
    appointment: <Calendar className="w-3 h-3" style={{ color: 'var(--hub-info)' }} />,
    upload: <Upload className="w-3 h-3" style={{ color: 'var(--hub-text-secondary)' }} />,
    milestone: <CheckCircle className="w-3 h-3" style={{ color: 'var(--hub-success)' }} />,
};

const DOT_COLORS: Record<ActivityItem['type'], string> = {
    message: 'var(--hub-accent)',
    document: 'var(--hub-info)',
    review: 'var(--hub-warning)',
    quote: 'var(--hub-success)',
    doctor: '#c084fc',
    appointment: 'var(--hub-info)',
    upload: 'var(--hub-text-muted)',
    milestone: 'var(--hub-success)',
};

/** Mock activity data — will be replaced by real Supabase data */
const MOCK_ACTIVITIES: ActivityItem[] = [
    {
        id: '1',
        type: 'doctor',
        title: 'Dr. Mehmet reviewed your X-ray',
        description: 'Your panoramic X-ray has been evaluated. Treatment plan updated.',
        time: '2h ago',
        isNew: true,
    },
    {
        id: '2',
        type: 'quote',
        title: 'Your treatment quote is ready',
        description: 'Hollywood Smile package — click to view detailed pricing.',
        time: '5h ago',
        isNew: true,
    },
    {
        id: '3',
        type: 'message',
        title: 'New message from your consultant',
        description: 'Ayşe: "Great news! I found available dates for your preferred week."',
        time: '1d ago',
    },
    {
        id: '4',
        type: 'appointment',
        title: 'Consultation scheduled',
        description: 'Video call with Dr. Mehmet — March 18, 2026 at 14:00 (Turkey time)',
        time: '2d ago',
    },
    {
        id: '5',
        type: 'milestone',
        title: 'Profile completed',
        description: 'All required documents uploaded. You\'re ready for the next step!',
        time: '3d ago',
    },
];

export function ActivityFeed() {
    return (
        <div className="hub-glass p-5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--hub-text-primary)' }}>
                    Recent Activity
                </h3>
                <span className="hub-badge hub-badge--new">
                    {MOCK_ACTIVITIES.filter(a => a.isNew).length} new
                </span>
            </div>

            <div className="space-y-4">
                {MOCK_ACTIVITIES.map((activity, idx) => (
                    <div
                        key={activity.id}
                        className={`hub-feed-item hub-enter hub-enter--d${idx + 1}`}
                    >
                        <div
                            className="hub-feed-dot"
                            style={{ background: DOT_COLORS[activity.type] }}
                        >
                            {ACTIVITY_ICONS[activity.type]}
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-0.5">
                                <p className="text-xs font-medium" style={{ color: 'var(--hub-text-primary)' }}>
                                    {activity.title}
                                </p>
                                {activity.isNew && (
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--hub-accent)' }} />
                                )}
                            </div>
                            <p className="text-xs leading-relaxed" style={{ color: 'var(--hub-text-secondary)' }}>
                                {activity.description}
                            </p>
                            <p className="text-xs mt-1" style={{ color: 'var(--hub-text-muted)' }}>
                                {activity.time}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
