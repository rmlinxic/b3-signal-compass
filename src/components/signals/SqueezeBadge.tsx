import { cn } from '@/lib/utils';
import { Zap } from 'lucide-react';

interface SqueezeBadgeProps {
  isActive: boolean;
  size?: 'sm' | 'md';
}

export function SqueezeBadge({ isActive, size = 'md' }: SqueezeBadgeProps) {
  if (!isActive) {
    return (
      <span className={cn(
        'text-muted-foreground',
        size === 'sm' ? 'text-xs' : 'text-sm'
      )}>
        —
      </span>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-md font-medium animate-pulse-glow',
        'bg-squeeze/20 text-squeeze border border-squeeze/30',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
      )}
    >
      <Zap className={cn(size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />
      <span>SQUEEZE</span>
    </div>
  );
}
