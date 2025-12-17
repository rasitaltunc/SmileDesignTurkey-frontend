import { ReactNode } from 'react';
import { cn } from '../ui/utils';
import { Check } from 'lucide-react';

export interface ChoiceCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * C/Card/ChoiceCard - Design System Component
 * States: default, hover, selected, disabled
 */
export function ChoiceCard({
  title,
  description,
  icon,
  selected = false,
  disabled = false,
  onClick,
  className
}: ChoiceCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative w-full p-5 text-left rounded-[var(--radius-md)] border-2 transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2',
        !selected && !disabled && 'bg-white border-border-subtle hover:border-accent-primary hover:shadow-premium-md',
        selected && 'bg-accent-soft border-accent-primary shadow-premium-md',
        disabled && 'bg-bg-secondary border-border-subtle opacity-50 cursor-not-allowed',
        className
      )}
    >
      {selected && (
        <div className="absolute top-4 right-4 w-6 h-6 bg-accent-primary rounded-full flex items-center justify-center">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}
      
      <div className="flex items-start gap-4">
        {icon && (
          <div className={cn(
            'flex-shrink-0 w-12 h-12 rounded-[var(--radius-sm)] flex items-center justify-center transition-colors duration-200',
            selected ? 'bg-white text-accent-primary' : 'bg-bg-secondary text-text-secondary'
          )}>
            {icon}
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className={cn(
            'font-semibold text-base mb-1',
            selected ? 'text-accent-primary' : 'text-text-primary'
          )}>
            {title}
          </div>
          {description && (
            <div className="text-sm text-text-secondary leading-relaxed">
              {description}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
