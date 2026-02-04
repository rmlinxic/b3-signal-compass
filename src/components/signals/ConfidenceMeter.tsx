import { cn } from '@/lib/utils';

interface ConfidenceMeterProps {
  value: number;
  size?: 'sm' | 'md';
}

export function ConfidenceMeter({ value, size = 'md' }: ConfidenceMeterProps) {
  const getColor = (v: number) => {
    if (v >= 70) return 'bg-signal-buy';
    if (v >= 40) return 'bg-squeeze';
    return 'bg-signal-sell';
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          'relative overflow-hidden rounded-full bg-muted',
          size === 'sm' ? 'h-1.5 w-12' : 'h-2 w-16'
        )}
      >
        <div
          className={cn('h-full transition-all duration-500', getColor(value))}
          style={{ width: `${value}%` }}
        />
      </div>
      <span
        className={cn(
          'font-mono tabular-nums',
          size === 'sm' ? 'text-xs' : 'text-sm',
          value >= 70 && 'text-signal-buy',
          value >= 40 && value < 70 && 'text-squeeze',
          value < 40 && 'text-signal-sell'
        )}
      >
        {value}
      </span>
    </div>
  );
}
