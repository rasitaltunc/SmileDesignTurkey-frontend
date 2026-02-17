import React, { useState } from 'react';
import {
    X,
    MessageCircle,
    FileText,
    Calendar,
    Bell,
    CheckCheck,
    AlertCircle,
} from 'lucide-react';

interface Notification {
    id: number;
    type: 'message' | 'document' | 'appointment' | 'system';
    title: string;
    description: string;
    time: string;
    isRead: boolean;
    group: 'today' | 'yesterday' | 'earlier';
}

const MOCK_NOTIFICATIONS: Notification[] = [
    {
        id: 1,
        type: 'message',
        title: 'New message from Ayşe',
        description: "I've prepared your Signature Package quote!",
        time: '11:30 AM',
        isRead: false,
        group: 'today',
    },
    {
        id: 2,
        type: 'document',
        title: 'Quote ready for review',
        description: 'Hollywood Smile — Signature Package',
        time: '11:28 AM',
        isRead: false,
        group: 'today',
    },
    {
        id: 3,
        type: 'message',
        title: 'Dr. Mehmet reviewed your X-ray',
        description: 'Treatment plan: 20 porcelain veneers (E-max)',
        time: '10:15 AM',
        isRead: false,
        group: 'today',
    },
    {
        id: 4,
        type: 'appointment',
        title: 'Video call scheduled',
        description: 'Final consultation — Mar 14, 2026 at 14:00',
        time: 'Yesterday',
        isRead: true,
        group: 'yesterday',
    },
    {
        id: 5,
        type: 'system',
        title: 'Welcome to GuideHealth!',
        description: 'Your profile has been created. Explore your hub.',
        time: '2 days ago',
        isRead: true,
        group: 'earlier',
    },
    {
        id: 6,
        type: 'document',
        title: 'X-ray uploaded successfully',
        description: 'Panoramic X-ray received and forwarded to doctor',
        time: '3 days ago',
        isRead: true,
        group: 'earlier',
    },
];

const ICON_MAP = {
    message: MessageCircle,
    document: FileText,
    appointment: Calendar,
    system: AlertCircle,
};

const ICON_COLORS = {
    message: { bg: 'rgba(20, 184, 166, 0.15)', color: 'var(--hub-accent)' },
    document: { bg: 'rgba(59, 130, 246, 0.15)', color: 'var(--hub-info)' },
    appointment: { bg: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' },
    system: { bg: 'rgba(245, 158, 11, 0.15)', color: 'var(--hub-warning)' },
};

interface NotificationCenterProps {
    isOpen: boolean;
    onClose: () => void;
    onNotificationCountChange?: (count: number) => void;
}

export function NotificationCenter({
    isOpen,
    onClose,
    onNotificationCountChange,
}: NotificationCenterProps) {
    const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const markAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        onNotificationCountChange?.(0);
    };

    const grouped = {
        today: notifications.filter(n => n.group === 'today'),
        yesterday: notifications.filter(n => n.group === 'yesterday'),
        earlier: notifications.filter(n => n.group === 'earlier'),
    };

    const renderNotification = (notification: Notification) => {
        const IconComponent = ICON_MAP[notification.type];
        const iconStyle = ICON_COLORS[notification.type];

        return (
            <div
                key={notification.id}
                className="hub-notification-item"
                style={{
                    background: notification.isRead ? 'transparent' : 'rgba(20, 184, 166, 0.04)',
                }}
            >
                <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: iconStyle.bg }}
                >
                    <IconComponent className="w-4 h-4" style={{ color: iconStyle.color }} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <p
                            className="text-sm truncate"
                            style={{
                                color: 'var(--hub-text-primary)',
                                fontWeight: notification.isRead ? 400 : 600,
                            }}
                        >
                            {notification.title}
                        </p>
                        {!notification.isRead && (
                            <span
                                className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                                style={{ background: 'var(--hub-accent)' }}
                            />
                        )}
                    </div>
                    <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--hub-text-secondary)' }}>
                        {notification.description}
                    </p>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--hub-text-muted)' }}>
                        {notification.time}
                    </p>
                </div>
            </div>
        );
    };

    const renderGroup = (title: string, items: Notification[]) => {
        if (items.length === 0) return null;
        return (
            <div key={title} className="mb-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider px-4 mb-2" style={{ color: 'var(--hub-text-muted)' }}>
                    {title}
                </p>
                <div className="flex flex-col gap-1">
                    {items.map(renderNotification)}
                </div>
            </div>
        );
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={`hub-drawer-overlay ${isOpen ? 'hub-drawer-overlay--active' : ''}`}
                onClick={onClose}
            />

            {/* Panel */}
            <div className={`hub-notification-panel ${isOpen ? 'hub-notification-panel--open' : ''}`}>
                {/* Header */}
                <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--hub-glass-border)' }}>
                    <div className="flex items-center gap-2">
                        <Bell className="w-5 h-5" style={{ color: 'var(--hub-accent)' }} />
                        <h3 className="text-base font-bold" style={{ color: 'var(--hub-text-primary)' }}>
                            Notifications
                        </h3>
                        {unreadCount > 0 && (
                            <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                                style={{ background: 'var(--hub-accent)' }}
                            >
                                {unreadCount}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
                                className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg"
                                style={{
                                    color: 'var(--hub-accent)',
                                    background: 'rgba(20, 184, 166, 0.1)',
                                }}
                            >
                                <CheckCheck className="w-3 h-3" />
                                Mark all read
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ background: 'var(--hub-glass-bg)' }}
                        >
                            <X className="w-4 h-4" style={{ color: 'var(--hub-text-muted)' }} />
                        </button>
                    </div>
                </div>

                {/* Notification list */}
                <div className="hub-notification-list">
                    {renderGroup('Today', grouped.today)}
                    {renderGroup('Yesterday', grouped.yesterday)}
                    {renderGroup('Earlier', grouped.earlier)}
                </div>
            </div>
        </>
    );
}
