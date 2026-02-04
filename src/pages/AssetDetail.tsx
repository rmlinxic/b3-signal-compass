import { useParams, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { SignalBadge } from '@/components/signals/SignalBadge';
import { SqueezeBadge } from '@/components/signals/SqueezeBadge';
import { ConfidenceMeter } from '@/components/signals/ConfidenceMeter';
import { generateMockDashboardData, generateMockBars } from '@/lib/mockData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Clock,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Line,
  Bar as RechartsBar,
  Area,
} from 'recharts';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

const AssetDetail = () => {
  const { ticker } = useParams<{ ticker: string }>();

  // Find asset data
  const assets = useMemo(() => generateMockDashboardData(), []);
  const asset = assets.find((a) => a.ticker === ticker);

  // Generate mock bar data
  const bars15m = useMemo(
    () => generateMockBars(asset?.id || '', '15m', 100),
    [asset?.id]
  );
  const bars1d = useMemo(
    () => generateMockBars(asset?.id || '', '1d', 100),
    [asset?.id]
  );

  // Calculate Bollinger Bands and SMA100 for chart display
  const chartData15m = useMemo(() => {
    const smaWindow = 20;
    const bbStd = 2;

    return bars15m.map((bar, idx) => {
      const slice = bars15m.slice(Math.max(0, idx - smaWindow + 1), idx + 1);
      const closes = slice.map((b) => b.close);
      const sma20 = closes.reduce((a, b) => a + b, 0) / closes.length;
      const std = Math.sqrt(
        closes.reduce((acc, c) => acc + Math.pow(c - sma20, 2), 0) / closes.length
      );

      const sma100Slice = bars15m.slice(Math.max(0, idx - 99), idx + 1);
      const sma100 =
        sma100Slice.reduce((a, b) => a + b.close, 0) / sma100Slice.length;

      return {
        time: new Date(bar.timestamp).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
        sma20,
        bbUpper: sma20 + bbStd * std,
        bbLower: sma20 - bbStd * std,
        sma100,
      };
    });
  }, [bars15m]);

  const chartData1d = useMemo(() => {
    const smaWindow = 20;
    const bbStd = 2;

    return bars1d.map((bar, idx) => {
      const slice = bars1d.slice(Math.max(0, idx - smaWindow + 1), idx + 1);
      const closes = slice.map((b) => b.close);
      const sma20 = closes.reduce((a, b) => a + b, 0) / closes.length;
      const std = Math.sqrt(
        closes.reduce((acc, c) => acc + Math.pow(c - sma20, 2), 0) / closes.length
      );

      const sma100Slice = bars1d.slice(Math.max(0, idx - 99), idx + 1);
      const sma100 =
        sma100Slice.reduce((a, b) => a + b.close, 0) / sma100Slice.length;

      return {
        time: new Date(bar.timestamp).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
        }),
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
        sma20,
        bbUpper: sma20 + bbStd * std,
        bbLower: sma20 - bbStd * std,
        sma100,
      };
    });
  }, [bars1d]);

  // RSI calculation helper
  const calculateRSI = (data: typeof bars15m, period = 14) => {
    const rsiData: { time: string; rsi: number }[] = [];

    for (let i = period; i < data.length; i++) {
      let gains = 0;
      let losses = 0;

      for (let j = i - period + 1; j <= i; j++) {
        const change = data[j].close - data[j - 1].close;
        if (change > 0) gains += change;
        else losses -= change;
      }

      const avgGain = gains / period;
      const avgLoss = losses / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsi = 100 - 100 / (1 + rs);

      rsiData.push({
        time: new Date(data[i].timestamp).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        rsi,
      });
    }

    return rsiData;
  };

  const rsiData15m = useMemo(() => calculateRSI(bars15m), [bars15m]);
  const rsiData1d = useMemo(
    () =>
      bars1d.slice(14).map((bar, idx) => ({
        time: new Date(bar.timestamp).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
        }),
        rsi: calculateRSI(bars1d, 14)[idx]?.rsi || 50,
      })),
    [bars1d]
  );

  if (!asset) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <h1 className="text-2xl font-bold">Ativo não encontrado</h1>
          <p className="text-muted-foreground">
            O ticker "{ticker}" não foi encontrado.
          </p>
          <Button asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Dashboard
            </Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  // Generate signal rationale
  const generateRationale = () => {
    const reasons: string[] = [];

    if (asset.is_squeeze) {
      reasons.push(
        `Detectado squeeze nas Bandas de Bollinger (BB Width: ${asset.bb_width_15m?.toFixed(4)})`
      );
    }

    if (asset.price_vs_sma100_15m === 'above') {
      reasons.push('Preço acima da SMA100 no timeframe de 15 minutos');
    } else if (asset.price_vs_sma100_15m === 'below') {
      reasons.push('Preço abaixo da SMA100 no timeframe de 15 minutos');
    }

    if (asset.price_vs_sma100_1d === 'above') {
      reasons.push('Tendência de alta no diário (acima da SMA100)');
    } else if (asset.price_vs_sma100_1d === 'below') {
      reasons.push('Tendência de baixa no diário (abaixo da SMA100)');
    }

    if ((asset.rsi_15m ?? 50) > 70) {
      reasons.push(`RSI em zona de sobrecompra (${asset.rsi_15m?.toFixed(1)})`);
    } else if ((asset.rsi_15m ?? 50) < 30) {
      reasons.push(`RSI em zona de sobrevenda (${asset.rsi_15m?.toFixed(1)})`);
    } else if ((asset.rsi_15m ?? 50) > 50) {
      reasons.push(`RSI indicando momentum positivo (${asset.rsi_15m?.toFixed(1)})`);
    } else {
      reasons.push(`RSI indicando momentum negativo (${asset.rsi_15m?.toFixed(1)})`);
    }

    return reasons;
  };

  const PriceChart = ({
    data,
    timeframe,
  }: {
    data: typeof chartData15m;
    timeframe: string;
  }) => (
    <div className="h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data.slice(-50)} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="time"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
          />
          <YAxis
            domain={['auto', 'auto']}
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            tickFormatter={(v) => `R$${v.toFixed(0)}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
          />
          {/* Bollinger Bands Area */}
          <Area
            dataKey="bbUpper"
            stroke="hsl(var(--chart-bb))"
            strokeWidth={1}
            fill="hsl(var(--chart-bb))"
            fillOpacity={0.1}
            dot={false}
          />
          <Area
            dataKey="bbLower"
            stroke="hsl(var(--chart-bb))"
            strokeWidth={1}
            fill="hsl(var(--background))"
            fillOpacity={1}
            dot={false}
          />
          {/* SMA20 (BB Middle) */}
          <Line
            dataKey="sma20"
            stroke="hsl(var(--chart-bb))"
            strokeWidth={1}
            dot={false}
            strokeDasharray="3 3"
          />
          {/* SMA100 */}
          <Line
            dataKey="sma100"
            stroke="hsl(var(--chart-sma))"
            strokeWidth={2}
            dot={false}
          />
          {/* Candlesticks approximation using bars */}
          <RechartsBar
            dataKey="close"
            fill="hsl(var(--chart-candle-up))"
            opacity={0.8}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );

  const RSIChart = ({
    data,
  }: {
    data: { time: string; rsi: number }[];
  }) => (
    <div className="h-[150px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data.slice(-50)} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="time"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
          />
          <YAxis
            domain={[0, 100]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            ticks={[30, 50, 70]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
          />
          <ReferenceLine y={70} stroke="hsl(var(--signal-sell))" strokeDasharray="3 3" />
          <ReferenceLine y={30} stroke="hsl(var(--signal-buy))" strokeDasharray="3 3" />
          <ReferenceLine y={50} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 2" />
          <Area
            dataKey="rsi"
            stroke="hsl(var(--chart-rsi))"
            fill="hsl(var(--chart-rsi))"
            fillOpacity={0.2}
            strokeWidth={2}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <MainLayout>
      <div className="space-y-6 animate-slide-up">
        {/* Back button and header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold font-mono">{asset.ticker}</h1>
                <span
                  className={cn(
                    'text-xs px-2 py-0.5 rounded uppercase',
                    asset.type === 'stock'
                      ? 'bg-primary/20 text-primary'
                      : 'bg-accent/20 text-accent'
                  )}
                >
                  {asset.type === 'stock' ? 'Ação' : 'ETF'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{asset.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-2xl font-bold font-mono">
                R$ {asset.last_price.toFixed(2)}
              </p>
              <p
                className={cn(
                  'text-sm font-medium flex items-center justify-end gap-1',
                  asset.price_change_pct >= 0 ? 'text-signal-buy' : 'text-signal-sell'
                )}
              >
                {asset.price_change_pct >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {asset.price_change_pct >= 0 ? '+' : ''}
                {asset.price_change_pct.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">Sinal</p>
              <SignalBadge
                side={asset.signal_side}
                confidence={asset.confidence}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">Squeeze</p>
              <SqueezeBadge isActive={asset.is_squeeze} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">Confiança</p>
              <ConfidenceMeter value={asset.confidence} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">RSI 15m</p>
              <p
                className={cn(
                  'text-lg font-bold font-mono',
                  (asset.rsi_15m ?? 50) > 70 && 'text-signal-sell',
                  (asset.rsi_15m ?? 50) < 30 && 'text-signal-buy'
                )}
              >
                {asset.rsi_15m?.toFixed(1) ?? '—'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">SMA100 15m</p>
              <div className="flex items-center gap-1">
                {asset.price_vs_sma100_15m === 'above' ? (
                  <ChevronUp className="h-4 w-4 text-signal-buy" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-signal-sell" />
                )}
                <span
                  className={cn(
                    'text-sm font-medium',
                    asset.price_vs_sma100_15m === 'above'
                      ? 'text-signal-buy'
                      : 'text-signal-sell'
                  )}
                >
                  {asset.price_vs_sma100_15m === 'above' ? 'Acima' : 'Abaixo'}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({asset.distance_to_sma100?.toFixed(1)}%)
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">BB Width</p>
              <p className="text-lg font-bold font-mono">
                {asset.bb_width_15m?.toFixed(4) ?? '—'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="15m" className="space-y-4">
          <TabsList>
            <TabsTrigger value="15m" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              15 Minutos
            </TabsTrigger>
            <TabsTrigger value="1d" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Diário
            </TabsTrigger>
          </TabsList>

          <TabsContent value="15m" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Preço com Bollinger Bands (20, 2) e SMA100
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PriceChart data={chartData15m} timeframe="15m" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">RSI (14)</CardTitle>
              </CardHeader>
              <CardContent>
                <RSIChart data={rsiData15m} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="1d" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Preço com Bollinger Bands (20, 2) e SMA100
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PriceChart data={chartData1d} timeframe="1d" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">RSI (14)</CardTitle>
              </CardHeader>
              <CardContent>
                <RSIChart data={rsiData1d} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Signal Rationale */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Análise do Sinal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <SignalBadge
                  side={asset.signal_side}
                  confidence={asset.confidence}
                />
                <span className="text-sm text-muted-foreground">
                  {asset.signal_side === 'buy'
                    ? 'Indicativo de potencial entrada comprada'
                    : asset.signal_side === 'sell'
                    ? 'Indicativo de potencial entrada vendida'
                    : 'Sem sinal claro no momento'}
                </span>
              </div>

              <div className="border-t border-border pt-4">
                <h4 className="text-sm font-medium mb-2">Racional:</h4>
                <ul className="space-y-2">
                  {generateRationale().map((reason, idx) => (
                    <li
                      key={idx}
                      className="text-sm text-muted-foreground flex items-start gap-2"
                    >
                      <span className="text-primary mt-1">•</span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default AssetDetail;
