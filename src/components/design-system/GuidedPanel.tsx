import { ReactNode } from 'react';
import { cn } from '../ui/utils';
import { Stepper } from './Stepper';
import { TrustBadge } from './TrustBadge';
import { Shield, Clock, Lock } from 'lucide-react';

export interface GuidedPanelProps {
  currentStep?: 1 | 2 | 3 | 4 | 5;
  showStepper?: boolean;
  headline: string;
  subheadline?: string;
  children?: ReactNode;
  showTrustLine?: boolean;
  className?: string;
}

/**
 * GuidedPanel - Hero Section Component
 * Left side of split hero with stepper, headline, and CTAs
 */
export function GuidedPanel({
  currentStep = 1,
  showStepper = true,
  headline,
  subheadline,
  children,
  showTrustLine = true,
  className
}: GuidedPanelProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {showStepper && (
        <div>
          <Stepper currentStep={currentStep} />
        </div>
      )}

      <div className="space-y-4">
        <h1 className="text-text-primary">
          {headline}
        </h1>
        
        {subheadline && (
          <p className="text-text-secondary text-lg leading-relaxed">
            {subheadline}
          </p>
        )}
      </div>

      {children && (
        <div className="space-y-4">
          {children}
        </div>
      )}

      {showTrustLine && (
        <div className="flex flex-wrap gap-4 pt-2">
          <TrustBadge
            icon={<Clock className="w-3.5 h-3.5" />}
            text="2 minutes"
            variant="default"
          />
          <TrustBadge
            icon={<Shield className="w-3.5 h-3.5" />}
            text="No spam"
            variant="default"
          />
          <TrustBadge
            icon={<Lock className="w-3.5 h-3.5" />}
            text="Data stays private"
            variant="accent"
          />
        </div>
      )}
    </div>
  );
}
