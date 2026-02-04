import { cn } from '@/lib/utils';
import { SignalSide } from '@/types/market';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface SignalBadgeProps {
  side: SignalSide;
  confidence?: number;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

export function SignalBadge({ side, confidence, showIcon = true, size = 'md' }: SignalBadgeProps) {
  const icons = {
    buy: TrendingUp,
    sell: TrendingDown,
    neutral: Minus,
  };

  const labels = {
    buy: 'Compra',
    sell: 'Venda',
    neutral: 'Neutro',
  };

  const Icon = icons[side];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        side === 'buy' && 'bg-signal-buy/20 text-signal-buy border border-signal-buy/30',
        side === 'sell' && 'bg-signal-sell/20 text-signal-sell border border-signal-sell/30',
        side === 'neutral' && 'bg-signal-neutral/20 text-signal-neutral border border-signal-neutral/30'
      )}
    >
      {showIcon && <Icon className={cn(size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />}
      <span>{labels[side]}</span>
      {confidence !== undefined && confidence > 0 && (
        <span className="opacity-70">({confidence}%)</span>
      )}
    </div>
  );
}
