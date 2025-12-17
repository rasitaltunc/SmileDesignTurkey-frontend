import { useEffect, useRef, useState, ReactNode } from 'react';
import { cn } from '../ui/utils';

interface RevealOnScrollProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
}

export function RevealOnScroll({ 
  children, 
  className,
  delay = 0,
  direction = 'up'
}: RevealOnScrollProps) {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              setIsVisible(true);
            }, delay);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [delay]);

  const directionClasses = {
    up: 'reveal-from-bottom',
    down: 'reveal-from-top',
    left: 'reveal-from-right',
    right: 'reveal-from-left',
  };

  return (
    <>
      <style>{`
        .reveal-container {
          opacity: 0;
          transition: opacity 600ms ease-out, transform 600ms ease-out;
        }
        
        .reveal-container.revealed {
          opacity: 1;
          transform: translate(0, 0);
        }
        
        .reveal-from-bottom {
          transform: translateY(30px);
        }
        
        .reveal-from-top {
          transform: translateY(-30px);
        }
        
        .reveal-from-left {
          transform: translateX(-30px);
        }
        
        .reveal-from-right {
          transform: translateX(30px);
        }
      `}</style>
      <div
        ref={elementRef}
        className={cn(
          'reveal-container',
          directionClasses[direction],
          isVisible && 'revealed',
          className
        )}
      >
        {children}
      </div>
    </>
  );
}

