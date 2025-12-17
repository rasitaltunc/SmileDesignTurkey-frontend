import { useState, useEffect, ReactNode, MouseEvent } from 'react';
import { cn } from '../ui/utils';

// Animation intensity constant (0 = disabled, 1 = full effect)
export const ANIM_INTENSITY = 1.0;

interface ProfessionalCTAProps {
  children: ReactNode;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  onNavigate?: () => void;
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

export function ProfessionalCTA({
  children,
  onClick,
  onNavigate,
  className,
  disabled = false,
  'aria-label': ariaLabel,
}: ProfessionalCTAProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;

    // Fire onClick immediately (for analytics)
    onClick?.(e);

    // If reduced motion, navigate immediately
    if (prefersReducedMotion || ANIM_INTENSITY === 0) {
      onNavigate?.();
      return;
    }

    // Press feedback
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 150);

    // Transition effect
    setIsTransitioning(true);

    // Navigate after transition (180-250ms based on intensity)
    const transitionDuration = 180 + (ANIM_INTENSITY * 70); // 180-250ms
    setTimeout(() => {
      onNavigate?.();
      // Reset after navigation
      setTimeout(() => setIsTransitioning(false), 50);
    }, transitionDuration);
  };

  return (
    <>
      <style>{`
        .professional-cta {
          position: relative;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          will-change: transform, box-shadow;
        }
        
        .professional-cta:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08);
        }
        
        .professional-cta:active:not(:disabled) {
          transform: translateY(0);
        }
        
        .professional-cta.pressed {
          transform: scale(0.98);
        }
        
        .professional-cta.transitioning {
          opacity: 0.85;
          transition: opacity 200ms ease-out;
        }
        
        @media (prefers-reduced-motion: reduce) {
          .professional-cta {
            transition: none;
          }
          
          .professional-cta:hover:not(:disabled) {
            transform: none;
            box-shadow: none;
          }
          
          .professional-cta.transitioning {
            opacity: 1;
            filter: none;
            transition: none;
          }
        }
        
        /* Subtle, calm hover effect - no flash, no pulse */
        .professional-cta::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: inherit;
          background: linear-gradient(135deg, rgba(0, 0, 0, 0.02), rgba(0, 0, 0, 0.01));
          opacity: 0;
          transition: opacity 0.25s ease;
          pointer-events: none;
          z-index: -1;
        }
        
        .professional-cta:hover:not(:disabled)::before {
          opacity: 1;
        }
        
        @media (prefers-reduced-motion: reduce) {
          .professional-cta::before {
            display: none;
          }
        }
      `}</style>
      <button
        onClick={handleClick}
        disabled={disabled}
        className={cn(
          'professional-cta',
          isPressed && 'pressed',
          isTransitioning && 'transitioning',
          className
        )}
        aria-label={ariaLabel}
      >
        {children}
      </button>
    </>
  );
}

