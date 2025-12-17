import { useEffect, useState, useRef, ReactNode } from 'react';
import { cn } from '../ui/utils';

interface PageTransitionProps {
  children: ReactNode;
  currentPath: string;
}

export function PageTransition({ children, currentPath }: PageTransitionProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayChildren, setDisplayChildren] = useState(children);
  const prevPathRef = useRef<string>(currentPath);
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

  useEffect(() => {
    if (prevPathRef.current !== currentPath) {
      if (prefersReducedMotion) {
        // No animation, just update
        setDisplayChildren(children);
        prevPathRef.current = currentPath;
        return;
      }

      setIsTransitioning(true);
      
      // Fade out + slight slide
      setTimeout(() => {
        setDisplayChildren(children);
        prevPathRef.current = currentPath;
        
        // Fade in + slide back
        setTimeout(() => {
          setIsTransitioning(false);
        }, 50);
      }, 150);
    } else {
      setDisplayChildren(children);
    }
  }, [currentPath, children, prefersReducedMotion]);

  return (
    <>
      <style>{`
        .page-transition-wrapper {
          transition: opacity 150ms ease-out, transform 150ms ease-out;
        }
        
        .page-transition-exit {
          opacity: 0;
          transform: translateY(10px);
        }
        
        .page-transition-enter {
          opacity: 1;
          transform: translateY(0);
          animation: page-fade-slide-in 200ms ease-in forwards;
        }
        
        @keyframes page-fade-slide-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @media (prefers-reduced-motion: reduce) {
          .page-transition-wrapper,
          .page-transition-exit,
          .page-transition-enter {
            transition: none;
            animation: none;
            transform: none;
            opacity: 1;
          }
        }
      `}</style>
      <div
        className={cn(
          'page-transition-wrapper',
          isTransitioning && 'page-transition-exit',
          !isTransitioning && 'page-transition-enter'
        )}
        style={{ minHeight: '100vh' }}
      >
        {displayChildren}
      </div>
    </>
  );
}

