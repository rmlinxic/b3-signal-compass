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
  Calendar,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { CandlestickChart } from '@/components/charts/CandlestickChart';
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

const SIGNAL_TYPE_DESC: Record<
  string,
  { label: string; desc: string; color: string }
> = {
  bb_bounce: {
    label: 'Bounce na Banda Inferior',
    desc: 'Preco tocou a banda inferior com RSI em sobrevenda. Setup de reversao: entrada proxima a banda inferior, alvo na media (SMA20), stop abaixo da minima recente.',
    color: 'text-signal-buy',
  },
  bb_breakout: {
    label: 'Rompimento de Squeeze Altista',
    desc: 'As bandas estavam contraidas (baixa volatilidade) e o preco rompeu acima da banda superior. Sinal de inicio de tendencia forte de alta.',
    color: 'text-signal-buy',
  },
  bb_rejection: {
    label: 'Rejeicao na Banda Superior',
    desc: 'Preco tocou a banda superior com RSI em sobrecompra. Sinal de possivel reversao ou pausada de alta. Considere reducao de posicao ou stop ajustado.',
    color: 'text-signal-sell',
  },
  bb_breakdown: {
    label: 'Rompimento de Squeeze Baixista',
    desc: 'As bandas estavam contraidas e o preco rompeu abaixo da banda inferior com RSI fraco. Sinal de inicio de tendencia de queda.',
    color: 'text-signal-sell',
  },
};

// ---------------------------------------------------------------------------
// Helpers de calculo — isolados fora do componente para evitar re-criacao
// ---------------------------------------------------------------------------

/**
 * Constroi a serie de dados para o grafico de preco.
 * Inclui BB(20,2), SMA20 (media central da BB), SMA50 e SMA200.
 */
const buildChartData = (
  bars: Bar[],
  timeFmt: (ts: string) => string
) =>
  bars.map((bar, idx) => {
    const closes = bars.slice(0, idx + 1).map((b) => b.close);

    // BB(20,2)
    const bbSlice = closes.slice(-20);
    const sma20 =
      bbSlice.length > 0
        ? bbSlice.reduce((a, b) => a + b, 0) / bbSlice.length
        : bar.close;
    const std =
      bbSlice.length > 1
        ? Math.sqrt(
            bbSlice.reduce((acc, c) => acc + (c - sma20) ** 2, 0) /
              bbSlice.length
          )
        : 0;

    // SMA50
    const s50 = closes.slice(-50);
    const sma50 = s50.length >= 50 ? s50.reduce((a, b) => a + b, 0) / 50 : null;

    // SMA200
    const s200 = closes.slice(-200);
    const sma200 =
      s200.length >= 200 ? s200.reduce((a, b) => a + b, 0) / 200 : null;

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
      sma50,
      sma200,
    };
  });

/**
 * RSI de Wilder — identico ao TradingView.
 *
 * 1. Calcula todas as variacoes barra a barra.
 * 2. Seed com media simples dos primeiros `period` movimentos.
 * 3. Suavizacao de Wilder:
 *      avgGain = (avgGain * (period-1) + gain) / period
 *      avgLoss = (avgLoss * (period-1) + loss) / period
 * 4. RSI = 100 - 100 / (1 + avgGain/avgLoss)
 *
 * Retorna a serie completa de {time, rsi} a partir da barra `period`.
 */
const calcRSI = (
  bars: Bar[],
  timeFmt: (ts: string) => string,
  period = 14
): { time: string; rsi: number }[] => {
  const out: { time: string; rsi: number }[] = [];
  if (bars.length < period + 1) return out;

  // Variacoes barra a barra
  const changes: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    changes.push(bars[i].close - bars[i - 1].close);
  }

  // Seed: media simples dos primeiros `period` movimentos
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss -= changes[i];
  }
  avgGain /= period;
  avgLoss /= period;

  // Primeiro valor RSI (barra no indice `period`)
  const firstRsi =
    avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  out.push({ time: timeFmt(bars[period].timestamp), rsi: firstRsi });

  // Suavizacao de Wilder para as barras restantes
  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] > 0 ? changes[i] : 0;
    const loss = changes[i] < 0 ? -changes[i] : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    out.push({ time: timeFmt(bars[i + 1].timestamp), rsi });
  }

  return out;
};

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

const AssetDetail = () => {
  const { ticker } = useParams<{ ticker: string }>();

  const assets = useMemo(() => getDashboardAssets(), []);
  const asset = assets.find((a) => a.ticker === ticker);

  const [bars1d, setBars1d] = useState<Bar[]>([]);
  const [bars1wk, setBars1wk] = useState<Bar[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!asset) return;

    const load = async (tf: '1d' | '1wk'): Promise<Bar[]> => {
      const cached = getCachedBars(asset.id, tf, 30 * 60 * 1000);
      if (cached && cached.length > 0) return cached;
      const fetched = await fetchYahooHistoricalBars(asset.ticker, tf);
      saveCachedBars(asset.id, tf, fetched);
      return fetched;
    };

    setIsLoading(true);
    setErrorMessage(null);

    Promise.all([load('1d'), load('1wk')])
      .then(([d, w]) => {
        setBars1d(d);
        setBars1wk(w);
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

  const fmtDay = (ts: string) =>
    new Date(ts).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });
  const fmtWeek = (ts: string) =>
    new Date(ts).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });

  const chartData1d = useMemo(
    () => buildChartData(bars1d, fmtDay),
    [bars1d]
  );
  const chartData1wk = useMemo(
    () => buildChartData(bars1wk, fmtWeek),
    [bars1wk]
  );
  const rsiData1d = useMemo(() => calcRSI(bars1d, fmtDay), [bars1d]);
  const rsiData1wk = useMemo(() => calcRSI(bars1wk, fmtWeek), [bars1wk]);

  if (!asset) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <h1 className="text-2xl font-bold">Ativo nao encontrado</h1>
          <p className="text-muted-foreground">
            O ticker "{ticker}" nao foi encontrado.
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

  const signalInfo = asset.signal_type
    ? SIGNAL_TYPE_DESC[asset.signal_type]
    : null;

  const PriceChart = ({ data }: { data: ReturnType<typeof buildChartData> }) => (
    <CandlestickChart data={data} height={420} />
  );

  const RSIChart = ({ data }: { data: { time: string; rsi: number }[] }) => (
    <div className="h-[160px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data.slice(-120)}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <XAxis
            dataKey="time"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 100]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            ticks={[30, 45, 60, 70]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
            formatter={(v: number) => [v.toFixed(1), 'RSI(14)']}
          />
          <ReferenceLine
            y={60}
            stroke="hsl(var(--signal-sell))"
            strokeDasharray="3 3"
            strokeOpacity={0.7}
            label={{ value: '60', position: 'right', fontSize: 9, fill: 'hsl(var(--signal-sell))' }}
          />
          <ReferenceLine
            y={45}
            stroke="hsl(var(--signal-buy))"
            strokeDasharray="3 3"
            strokeOpacity={0.7}
            label={{ value: '45', position: 'right', fontSize: 9, fill: 'hsl(var(--signal-buy))' }}
          />
          <ReferenceLine
            y={50}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="2 2"
            strokeOpacity={0.3}
          />
          <Area
            dataKey="rsi"
            stroke="hsl(var(--chart-rsi))"
            fill="hsl(var(--chart-rsi))"
            fillOpacity={0.2}
            strokeWidth={2}
            dot={false}
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
                  {asset.type === 'stock' ? 'Acao' : 'ETF'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{asset.name}</p>
            </div>
          </div>
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

        {/* Metricas de Swing Trade */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">Sinal</p>
              <SignalBadge side={asset.signal_side} confidence={asset.confidence} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">Setup</p>
              {asset.signal_type && signalInfo ? (
                <span className={cn('text-xs font-semibold', signalInfo.color)}>
                  {signalInfo.label}
                </span>
              ) : (
                <SqueezeBadge isActive={asset.is_squeeze} />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">Confianca</p>
              <ConfidenceMeter value={asset.confidence} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">RSI (D)</p>
              <p
                className={cn(
                  'text-lg font-bold font-mono',
                  (asset.rsi_1d ?? 50) > 60 && 'text-signal-sell',
                  (asset.rsi_1d ?? 50) < 45 && 'text-signal-buy'
                )}
              >
                {asset.rsi_1d?.toFixed(1) ?? '—'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">RSI (S)</p>
              <p
                className={cn(
                  'text-lg font-bold font-mono',
                  (asset.rsi_1wk ?? 50) > 60 && 'text-signal-sell',
                  (asset.rsi_1wk ?? 50) < 45 && 'text-signal-buy'
                )}
              >
                {asset.rsi_1wk?.toFixed(1) ?? '—'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">vs SMA50</p>
              <div className="flex items-center gap-1">
                {asset.price_vs_sma50 === 'above' ? (
                  <ChevronUp className="h-4 w-4 text-signal-buy" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-signal-sell" />
                )}
                <span
                  className={cn(
                    'text-sm font-medium',
                    asset.price_vs_sma50 === 'above'
                      ? 'text-signal-buy'
                      : 'text-signal-sell'
                  )}
                >
                  {asset.price_vs_sma50 === 'above' ? 'Acima' : 'Abaixo'}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({asset.distance_to_sma50?.toFixed(1)}%)
                </span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">vs SMA200</p>
              <div className="flex items-center gap-1">
                {asset.price_vs_sma200 === 'above' ? (
                  <ChevronUp className="h-4 w-4 text-signal-buy" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-signal-sell" />
                )}
                <span
                  className={cn(
                    'text-sm font-medium',
                    asset.price_vs_sma200 === 'above'
                      ? 'text-signal-buy'
                      : 'text-signal-sell'
                  )}
                >
                  {asset.price_vs_sma200 === 'above' ? 'Acima' : 'Abaixo'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Graficos */}
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
            Carregando graficos...
          </div>
        ) : (
          <Tabs defaultValue="1d" className="space-y-4">
            <TabsList>
              <TabsTrigger value="1d" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Diario
              </TabsTrigger>
              <TabsTrigger value="1wk" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Semanal
              </TabsTrigger>
            </TabsList>

            <TabsContent value="1d" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    Preco | BB(20,2) | SMA50 | SMA200
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {chartData1d.length > 0 ? (
                    <PriceChart data={chartData1d} />
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Sem dados disponiveis.
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    RSI(14) Diario &mdash; Sobrevenda &lt;45 | Sobrecompra &gt;60
                  </CardTitle>
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

            <TabsContent value="1wk" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    Preco Semanal | BB(20,2) | SMA50 | SMA200
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {chartData1wk.length > 0 ? (
                    <PriceChart data={chartData1wk} />
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Sem dados disponiveis.
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">RSI(14) Semanal</CardTitle>
                </CardHeader>
                <CardContent>
                  {rsiData1wk.length > 0 ? (
                    <RSIChart data={rsiData1wk} />
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

        {/* Analise do Setup */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Analise do Setup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <SignalBadge
                  side={asset.signal_side}
                  confidence={asset.confidence}
                />
                {signalInfo && (
                  <span
                    className={cn('text-sm font-medium', signalInfo.color)}
                  >
                    {signalInfo.label}
                  </span>
                )}
              </div>

              {signalInfo && (
                <div className="rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
                  {signalInfo.desc}
                </div>
              )}

              <div className="border-t border-border pt-4">
                <h4 className="text-sm font-medium mb-2">
                  Condicoes identificadas:
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">&bull;</span>
                    BB Width: {asset.bb_width_1d?.toFixed(4) ?? 'N/A'}
                    {asset.is_squeeze && (
                      <span className="ml-1 text-yellow-400 font-medium">
                        (squeeze ativo)
                      </span>
                    )}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">&bull;</span>
                    RSI Diario: {asset.rsi_1d?.toFixed(1) ?? 'N/A'}
                    {(asset.rsi_1d ?? 50) < 45 &&
                      ' — Sobrevenda (favoravel a compra)'}
                    {(asset.rsi_1d ?? 50) > 60 &&
                      ' — Sobrecompra (favoravel a venda/saida)'}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">&bull;</span>
                    RSI Semanal: {asset.rsi_1wk?.toFixed(1) ?? 'N/A'}{' '}
                    (confirmacao de tendencia)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">&bull;</span>
                    Posicao vs SMA50:{' '}
                    {asset.price_vs_sma50 === 'above' ? 'Acima' : 'Abaixo'}
                    {asset.distance_to_sma50 !== null &&
                      ` (${
                        asset.distance_to_sma50 >= 0 ? '+' : ''
                      }${asset.distance_to_sma50.toFixed(1)}%)`}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">&bull;</span>
                    Posicao vs SMA200:{' '}
                    {asset.price_vs_sma200 === 'above'
                      ? 'Acima (tendencia macro altista)'
                      : 'Abaixo (tendencia macro baixista)'}
                  </li>
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
