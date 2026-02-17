import React from 'react';

interface HubCardProps {
    icon: React.ReactNode;
    title: string;
    description?: string;
    badge?: string | number;
    badgeType?: 'success' | 'warning' | 'info' | 'new';
    accent?: boolean;
    onClick?: () => void;
    className?: string;
    children?: React.ReactNode;
}

/**
 * HubCard — Glassmorphism card with icon, title, optional badge
 * Supports hover glow, press animation, and notification indicators
 */
export function HubCard({
    icon,
    title,
    description,
    badge,
    badgeType = 'info',
    accent = false,
    onClick,
    className = '',
    children,
}: HubCardProps) {
    const Tag = onClick ? 'button' : 'div';

    return (
        <Tag
            className={`hub-glass ${accent ? 'hub-glass--accent' : ''} p-5 text-left w-full ${className}`}
            onClick={onClick}
            type={onClick ? 'button' : undefined}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'var(--hub-accent-soft)' }}
                >
                    {icon}
                </div>
                {badge !== undefined && badge !== null && (
                    <span className={`hub-badge hub-badge--${badgeType}`}>
                        {badge}
                    </span>
                )}
            </div>
            <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--hub-text-primary)' }}>
                {title}
            </h3>
            {description && (
                <p className="text-xs leading-relaxed" style={{ color: 'var(--hub-text-secondary)' }}>
                    {description}
                </p>
            )}
            {children}
        </Tag>
    );
}
