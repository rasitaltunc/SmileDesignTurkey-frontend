import { Star } from 'lucide-react';
import { cn } from '../ui/utils';

export interface ReviewCardProps {
  name: string;
  location: string;
  rating: number;
  review: string;
  image?: string;
  treatment?: string;
  className?: string;
}

/**
 * C/Social/ReviewCard - Design System Component
 */
export function ReviewCard({
  name,
  location,
  rating,
  review,
  image,
  treatment,
  className
}: ReviewCardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-[var(--radius-md)] p-6 border border-border-subtle shadow-premium-sm hover:shadow-premium-md transition-shadow duration-200',
        className
      )}
    >
      <div className="flex items-center gap-4 mb-4">
        {image && (
          <img
            src={image}
            alt={name}
            className="w-12 h-12 rounded-full object-cover"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-text-primary">{name}</div>
          <div className="text-sm text-text-secondary">{location}</div>
        </div>
      </div>

      <div className="flex gap-0.5 mb-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star
            key={index}
            className={cn(
              'w-4 h-4',
              index < rating ? 'text-warning fill-warning' : 'text-border-subtle'
            )}
          />
        ))}
      </div>

      <p className="text-text-secondary text-sm leading-relaxed mb-3">
        "{review}"
      </p>

      {treatment && (
        <div className="text-xs text-text-tertiary font-medium uppercase tracking-wide">
          {treatment}
        </div>
      )}
    </div>
  );
}
