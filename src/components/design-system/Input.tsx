import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../ui/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

/**
 * C/Form/Input - Design System Component
 * States: default, focus, error
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-text-secondary text-xs font-medium uppercase tracking-wide mb-2">
            {label}
          </label>
        )}
        
        <input
          ref={ref}
          className={cn(
            'w-full px-4 py-3 bg-white border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-tertiary transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent',
            error && 'border-error focus:ring-error',
            !error && 'border-border-subtle hover:border-accent-primary',
            props.disabled && 'bg-bg-secondary cursor-not-allowed opacity-60',
            className
          )}
          {...props}
        />
        
        {error && (
          <p className="mt-2 text-sm text-error">{error}</p>
        )}
        
        {helperText && !error && (
          <p className="mt-2 text-sm text-text-tertiary">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
