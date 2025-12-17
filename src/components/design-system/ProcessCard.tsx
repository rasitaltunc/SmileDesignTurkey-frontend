import { ReactNode } from 'react';
import { cn } from '../ui/utils';

export interface ProcessCardProps {
  step: number;
  title: string;
  description: string;
  icon?: ReactNode;
  className?: string;
}

/**
 * C/Roadmap/Card - Design System Component
 */
export function ProcessCard({ step, title, description, icon, className }: ProcessCardProps) {
  return (
    <div className={cn('relative', className)}>
      <div className="bg-white rounded-[var(--radius-md)] p-6 border border-border-subtle shadow-premium-sm hover:shadow-premium-md transition-all duration-200 h-full">
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 bg-accent-soft rounded-full flex items-center justify-center mb-4 ring-4 ring-white shadow-premium-sm">
            {icon || (
              <span className="text-xl font-bold text-accent-primary">{step}</span>
            )}
          </div>
          
          <h3 className="text-text-primary font-semibold text-lg mb-3">
            {title}
          </h3>
          
          <p className="text-text-secondary text-sm leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
