import { ReactNode } from 'react';
import { cn } from '../ui/utils';

export interface TrustBadgeProps {
  icon: ReactNode;
  text: string;
  variant?: 'default' | 'success' | 'accent';
  className?: string;
}

/**
 * C/Trust/Badge - Design System Component
 */
export function TrustBadge({ icon, text, variant = 'default', className }: TrustBadgeProps) {
  const variants = {
    default: 'bg-bg-secondary text-text-primary border-border-subtle',
    success: 'bg-green-50 text-green-700 border-green-200',
    accent: 'bg-accent-soft text-accent-primary border-accent-primary/20',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] border text-sm font-medium',
        variants[variant],
        className
      )}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span>{text}</span>
    </div>
  );
}
