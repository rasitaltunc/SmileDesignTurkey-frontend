import { ReactNode } from 'react';
import { cn } from '../ui/utils';
import { Shield, Award, Clock } from 'lucide-react';
import { ReviewCard } from './ReviewCard';

export interface TrustStageProps {
  mediaUrl?: string;
  mediaAlt?: string;
  showBadges?: boolean;
  showReviews?: boolean;
  className?: string;
}

/**
 * TrustStage - Hero Section Component
 * Right side of split hero with media, trust badges, and review carousel
 */
export function TrustStage({
  mediaUrl = 'https://images.unsplash.com/photo-1758202292826-c40e172eed1c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpY2FsJTIwY2xpbmljJTIwbW9kZXJufGVufDF8fHx8MTc2NTc2NjI4MHww&ixlib=rb-4.1.0&q=80&w=1080',
  mediaAlt = 'Premium medical facility',
  showBadges = true,
  showReviews = true,
  className
}: TrustStageProps) {
  return (
    <div className={cn('relative space-y-6', className)}>
      {/* Main Media */}
      <div className="relative rounded-[var(--radius-xl)] overflow-hidden shadow-premium-lg">
        <img
          src={mediaUrl}
          alt={mediaAlt}
          className="w-full h-[500px] object-cover"
        />
        
        {/* Overlay gradient for better badge visibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
      </div>

      {showBadges && (
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 px-4 py-3 bg-white rounded-[var(--radius-md)] shadow-premium-md border border-border-subtle">
            <Shield className="w-5 h-5 text-success" />
            <div>
              <div className="text-xs text-text-tertiary font-medium uppercase tracking-wide">Certified</div>
              <div className="text-sm font-semibold text-text-primary">ISO 9001</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 px-4 py-3 bg-white rounded-[var(--radius-md)] shadow-premium-md border border-border-subtle">
            <Award className="w-5 h-5 text-warning" />
            <div>
              <div className="text-xs text-text-tertiary font-medium uppercase tracking-wide">Rated</div>
              <div className="text-sm font-semibold text-text-primary">4.9/5.0</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 px-4 py-3 bg-white rounded-[var(--radius-md)] shadow-premium-md border border-border-subtle">
            <Clock className="w-5 h-5 text-accent-primary" />
            <div>
              <div className="text-xs text-text-tertiary font-medium uppercase tracking-wide">Response</div>
              <div className="text-sm font-semibold text-text-primary">24-48h</div>
            </div>
          </div>
        </div>
      )}

      {showReviews && (
        <div className="grid grid-cols-1 gap-4">
          <ReviewCard
            name="Sarah M."
            location="United Kingdom"
            rating={5}
            review="The entire process was seamless. I felt supported every step of the way."
            treatment="Smile Makeover"
          />
        </div>
      )}
    </div>
  );
}
