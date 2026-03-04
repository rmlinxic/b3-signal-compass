import { useParams, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { SignalBadge } from '@/components/signals/SignalBadge';
import { SqueezeBadge } from '@/components/signals/SqueezeBadge';
import { ConfidenceMeter } from '@/components/signals/ConfidenceMeter';
import {
  getCachedBars,
  getDashboardAssets,
  saveCachedBars,
} from '@/lib/localDataStore';
import { fetchYahooHistoricalBars } from '@/lib/yahooFinanceClient';
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
  Area,
} from 'recharts';
import { useEffect, useMemo, useState } from 'react';
import type { Bar } from '@/types/market';
import { cn } from '@/lib/utils';
import { CandlestickChart } from '@/components/charts/CandlestickChart';

const AssetDetail = () => {
  const { ticker } = useParams<{ ticker: string }>();

  const assets = useMemo(() => getDashboardAssets(), []);
  const asset = assets.find((a) => a.ticker === ticker);

  const [bars15m, setBars15m] = useState<Bar[]>([]);
  const [bars1d, setBars1d] = useState<Bar[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!asset) return;

    const loadBars = async (timeframe: '15m' | '1d'): Promise<Bar[]> => {
      // Tenta cache primeiro (10 min de validade)
      const cached = getCachedBars(asset.id, timeframe, 10 * 60 * 1000);
      if (cached && cached.length > 0) return cached;

      const fetched = await fetchYahooHistoricalBars(asset.ticker, timeframe);
      saveCachedBars(asset.id, timeframe, fetched);
      return fetched;
    };

    setIsLoading(true);
    setErrorMessage(null);

    Promise.all([loadBars('15m'), loadBars('1d')])
      .then(([b15m, b1d]) => {
        setBars15m(b15m);
        setBars1d(b1d);
      })
      .catch((err) => {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Falha ao carregar dados do Yahoo Finance.'
        );
      })
      .finally(() => setIsLoading(false));
  }, [asset?.id, asset?.ticker]);

  // Calcula BB(20,2) + SMA100 para o grafico
  const buildChartData = (
    bars: Bar[],
    timeFmt: (ts: string) => string
  ) =>
    bars.map((bar, idx) => {
      const slice = bars.slice(Math.max(0, idx - 19), idx + 1);
      const closes = slice.map((b) => b.close);
      const sma20 = closes.reduce((a, b) => a + b, 0) / closes.length;
      const std = Math.sqrt(
        closes.reduce((acc, c) => acc + Math.pow(c - sma20, 2), 0) /
          closes.length
      );
      const sma100Slice = bars.slice(Math.max(0, idx - 99), idx + 1);
      const sma100 =
        sma100Slice.reduce((a, b) => a + b.close, 0) / sma100Slice.length;

      return {
        time: timeFmt(bar.timestamp),
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
        sma20,
        bbUpper: sma20 + 2 * std,
        bbLower: sma20 - 2 * std,
        sma100,
      };
    });

  const chartData15m = useMemo(
    () =>
      buildChartData(bars15m, (ts) =>
        new Date(ts).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        })
      ),
    [bars15m]
  );

  const chartData1d = useMemo(
    () =>
      buildChartData(bars1d, (ts) =>
        new Date(ts).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
        })
      ),
    [bars1d]
  );

  // RSI(14)
  const calculateRSI = (data: Bar[], period = 14) => {
    const out: { time: string; rsi: number }[] = [];
    for (let i = period; i < data.length; i++) {
      let gains = 0,
        losses = 0;
      for (let j = i - period + 1; j <= i; j++) {
        const ch = data[j].close - data[j - 1].close;
        if (ch > 0) gains += ch;
        else losses -= ch;
      }
      const avg = losses === 0 ? 100 : 100 - 100 / (1 + gains / losses);
      out.push({
        time: new Date(data[i].timestamp).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        rsi: avg,
      });
    }
    return out;
  };

  const calculateRSI1d = (data: Bar[], period = 14) => {
    const out: { time: string; rsi: number }[] = [];
    for (let i = period; i < data.length; i++) {
      let gains = 0,
        losses = 0;
      for (let j = i - period + 1; j <= i; j++) {
        const ch = data[j].close - data[j - 1].close;
        if (ch > 0) gains += ch;
        else losses -= ch;
      }
      const avg = losses === 0 ? 100 : 100 - 100 / (1 + gains / losses);
      out.push({
        time: new Date(data[i].timestamp).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
        }),
        rsi: avg,
      });
    }
    return out;
  };

  const rsiData15m = useMemo(() => calculateRSI(bars15m), [bars15m]);
  const rsiData1d = useMemo(() => calculateRSI1d(bars1d), [bars1d]);

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

  const generateRationale = () => {
    const reasons: string[] = [];
    if (asset.is_squeeze)
      reasons.push(
        `Detectado squeeze nas Bandas de Bollinger (BB Width: ${asset.bb_width_15m?.toFixed(4)})`
      );
    if (asset.price_vs_sma100_15m === 'above')
      reasons.push('Preço acima da SMA100 no timeframe de 15 minutos');
    else if (asset.price_vs_sma100_15m === 'below')
      reasons.push('Preço abaixo da SMA100 no timeframe de 15 minutos');
    if (asset.price_vs_sma100_1d === 'above')
      reasons.push('Tendência de alta no diário (acima da SMA100)');
    else if (asset.price_vs_sma100_1d === 'below')
      reasons.push('Tendência de baixa no diário (abaixo da SMA100)');
    const rsi = asset.rsi_15m ?? 50;
    if (rsi > 70)
      reasons.push(`RSI em zona de sobrecompra (${rsi.toFixed(1)})`);
    else if (rsi < 30)
      reasons.push(`RSI em zona de sobrevenda (${rsi.toFixed(1)})`);
    else if (rsi > 50)
      reasons.push(`RSI indicando momentum positivo (${rsi.toFixed(1)})`);
    else
      reasons.push(`RSI indicando momentum negativo (${rsi.toFixed(1)})`);
    return reasons;
  };

  const PriceChart = ({ data }: { data: typeof chartData15m }) => (
    <CandlestickChart data={data} height={420} />
  );

  const RSIChart = ({ data }: { data: { time: string; rsi: number }[] }) => (
    <div className="h-[150px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data.slice(-80)}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
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
            formatter={(v: number) => [v.toFixed(1), 'RSI']}
          />
          <ReferenceLine
            y={70}
            stroke="hsl(var(--signal-sell))"
            strokeDasharray="3 3"
          />
          <ReferenceLine
            y={30}
            stroke="hsl(var(--signal-buy))"
            strokeDasharray="3 3"
          />
          <ReferenceLine
            y={50}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="2 2"
          />
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
        {errorMessage && (
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {errorMessage}
          </div>
        )}

        {/* Header */}
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
                  asset.price_change_pct >= 0
                    ? 'text-signal-buy'
                    : 'text-signal-sell'
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

        {/* Metricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">Sinal</p>
              <SignalBadge side={asset.signal_side} confidence={asset.confidence} />
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

        {/* Graficos */}
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            Carregando gráficos...
          </div>
        ) : (
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
                  {chartData15m.length > 0 ? (
                    <PriceChart data={chartData15m} />
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Sem dados disponíveis para este período.
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">RSI (14)</CardTitle>
                </CardHeader>
                <CardContent>
                  {rsiData15m.length > 0 ? (
                    <RSIChart data={rsiData15m} />
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Dados insuficientes para RSI.
                    </p>
                  )}
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
                  {chartData1d.length > 0 ? (
                    <PriceChart data={chartData1d} />
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Sem dados disponíveis para este período.
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">RSI (14)</CardTitle>
                </CardHeader>
                <CardContent>
                  {rsiData1d.length > 0 ? (
                    <RSIChart data={rsiData1d} />
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Dados insuficientes para RSI.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Analise do Sinal */}
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
