import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../ui/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

/**
 * C/Buttons - Design System Component
 * Variants: Primary, Secondary, Ghost
 * States: default, hover, disabled
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, disabled, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none';
    
    const variants = {
      primary: 'bg-accent-primary text-white hover:bg-accent-hover active:bg-accent-hover shadow-premium-sm hover:shadow-premium-md',
      secondary: 'bg-white text-accent-primary border border-border-subtle hover:bg-bg-secondary hover:border-accent-primary shadow-premium-sm hover:shadow-premium-md',
      ghost: 'bg-transparent text-accent-primary hover:bg-accent-soft',
    };
    
    const sizes = {
      sm: 'px-3 py-2 text-sm rounded-[var(--radius-sm)] gap-1.5',
      md: 'px-5 py-3 text-[var(--text-button)] leading-[var(--line-button)] rounded-[var(--radius-md)] gap-2',
      lg: 'px-6 py-4 text-base rounded-[var(--radius-md)] gap-2.5',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
