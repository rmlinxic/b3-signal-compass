import { AssetWithSignal } from '@/types/market';
import { TrendingUp, TrendingDown, Zap, BarChart3 } from 'lucide-react';

interface DashboardStatsProps {
  assets: AssetWithSignal[];
}

export function DashboardStats({ assets }: DashboardStatsProps) {
  const buySignals = assets.filter((a) => a.signal_side === 'buy').length;
  const sellSignals = assets.filter((a) => a.signal_side === 'sell').length;

  // Contagem por tipo de setup de swing trade
  const bounceCount = assets.filter((a) => a.signal_type === 'bb_bounce').length;
  const breakoutCount = assets.filter(
    (a) => a.signal_type === 'bb_breakout' || a.signal_type === 'bb_breakdown'
  ).length;

  const stats = [
    {
      label: 'Compra (Bounce/Breakout)',
      value: buySignals,
      icon: TrendingUp,
      color: 'text-signal-buy',
      bgColor: 'bg-signal-buy/10',
      borderColor: 'border-signal-buy/20',
    },
    {
      label: 'Venda / Cautela',
      value: sellSignals,
      icon: TrendingDown,
      color: 'text-signal-sell',
      bgColor: 'bg-signal-sell/10',
      borderColor: 'border-signal-sell/20',
    },
    {
      label: 'Bounce na Banda',
      value: bounceCount,
      icon: Zap,
      color: 'text-squeeze',
      bgColor: 'bg-squeeze/10',
      borderColor: 'border-squeeze/20',
    },
    {
      label: 'Rompimento BB',
      value: breakoutCount,
      icon: BarChart3,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className={`rounded-lg border ${stat.borderColor} ${stat.bgColor} p-4`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                <p className={`text-2xl font-bold font-mono ${stat.color}`}>
                  {stat.value}
                </p>
              </div>
              <Icon className={`h-8 w-8 ${stat.color} opacity-50`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
