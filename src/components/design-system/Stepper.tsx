import { cn } from '../ui/utils';

export interface StepperProps {
  currentStep: 1 | 2 | 3 | 4 | 5;
  totalSteps?: 5;
  className?: string;
}

/**
 * C/Stepper - Design System Component
 * Variants: 1of5, 2of5, 3of5, 4of5, 5of5
 */
export function Stepper({ currentStep, totalSteps = 5, className }: StepperProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {Array.from({ length: totalSteps }).map((_, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isCompleted = stepNumber < currentStep;
        
        return (
          <div key={stepNumber} className="flex items-center gap-2">
            <div
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold transition-all duration-200',
                isCompleted && 'bg-success text-white',
                isActive && 'bg-accent-primary text-white ring-4 ring-accent-soft',
                !isActive && !isCompleted && 'bg-bg-secondary text-text-tertiary'
              )}
            >
              {isCompleted ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                stepNumber
              )}
            </div>
            {stepNumber < totalSteps && (
              <div
                className={cn(
                  'w-8 h-0.5 transition-all duration-200',
                  isCompleted ? 'bg-success' : 'bg-border-subtle'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
