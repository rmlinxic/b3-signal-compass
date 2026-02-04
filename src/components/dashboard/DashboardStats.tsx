import { AssetWithSignal } from '@/types/market';
import { TrendingUp, TrendingDown, Zap, Activity } from 'lucide-react';

interface DashboardStatsProps {
  assets: AssetWithSignal[];
}

export function DashboardStats({ assets }: DashboardStatsProps) {
  const buySignals = assets.filter((a) => a.signal_side === 'buy').length;
  const sellSignals = assets.filter((a) => a.signal_side === 'sell').length;
  const squeezeCount = assets.filter((a) => a.is_squeeze).length;
  const avgConfidence =
    assets.length > 0
      ? Math.round(assets.reduce((acc, a) => acc + a.confidence, 0) / assets.length)
      : 0;

  const stats = [
    {
      label: 'Sinais de Compra',
      value: buySignals,
      icon: TrendingUp,
      color: 'text-signal-buy',
      bgColor: 'bg-signal-buy/10',
      borderColor: 'border-signal-buy/20',
    },
    {
      label: 'Sinais de Venda',
      value: sellSignals,
      icon: TrendingDown,
      color: 'text-signal-sell',
      bgColor: 'bg-signal-sell/10',
      borderColor: 'border-signal-sell/20',
    },
    {
      label: 'Em Squeeze',
      value: squeezeCount,
      icon: Zap,
      color: 'text-squeeze',
      bgColor: 'bg-squeeze/10',
      borderColor: 'border-squeeze/20',
    },
    {
      label: 'Confiança Média',
      value: `${avgConfidence}%`,
      icon: Activity,
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
