import { Bar } from '@/types/market';

const CORS_PROXY = 'https://corsproxy.io/?';
const YF_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

const normalizeTicker = (ticker: string): string =>
  ticker.includes('.') ? ticker : `${ticker}.SA`;

const buildUrl = (ticker: string, params?: Record<string, string>): string => {
  const normalized = normalizeTicker(ticker);
  const url = new URL(`${YF_BASE}/${normalized}`);
  Object.entries(params ?? {}).forEach(([k, v]) => url.searchParams.set(k, v));
  return `${CORS_PROXY}${encodeURIComponent(url.toString())}`;
};

interface YFChartResult {
  meta: {
    symbol: string;
    regularMarketPrice?: number;
    regularMarketChangePercent?: number;
    regularMarketVolume?: number;
  };
  timestamp?: number[];
  indicators?: {
    quote?: Array<{
      open?: (number | null)[];
      high?: (number | null)[];
      low?: (number | null)[];
      close?: (number | null)[];
      volume?: (number | null)[];
    }>;
  };
}

interface YFResponse {
  chart?: {
    result?: YFChartResult[];
    error?: { description?: string } | null;
  };
}

export interface YahooQuote {
  symbol: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
}

export const fetchYahooQuote = async (ticker: string): Promise<YahooQuote> => {
  const url = buildUrl(ticker);
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`Yahoo Finance HTTP ${response.status} para ${ticker}.`);

  const payload = (await response.json()) as YFResponse;
  if (payload.chart?.error)
    throw new Error(
      `Yahoo Finance: ${payload.chart.error.description ?? 'erro desconhecido'}`
    );

  const result = payload.chart?.result?.[0];
  if (!result)
    throw new Error(`Yahoo Finance nao retornou dados para ${ticker}.`);

  return {
    symbol: ticker,
    regularMarketPrice: result.meta.regularMarketPrice,
    regularMarketChangePercent: result.meta.regularMarketChangePercent,
    regularMarketVolume: result.meta.regularMarketVolume,
  };
};

/**
 * Ranges usados para swing trade:
 *  1d  -> interval=1d,  range=1y  (~252 barras, suficiente para SMA200)
 *  1wk -> interval=1wk, range=2y  (~104 barras semanais para tendencia)
 *
 * Yahoo Finance suporta esses ranges sem restricao de plano.
 */
export const fetchYahooHistoricalBars = async (
  ticker: string,
  timeframe: '1d' | '1wk'
): Promise<Bar[]> => {
  const params: Record<string, string> =
    timeframe === '1d'
      ? { interval: '1d', range: '1y' }
      : { interval: '1wk', range: '2y' };

  const url = buildUrl(ticker, params);
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(
      `Yahoo Finance HTTP ${response.status} para ${ticker} (${timeframe}).`
    );

  const payload = (await response.json()) as YFResponse;
  if (payload.chart?.error)
    throw new Error(
      `Yahoo Finance: ${
        payload.chart.error.description ?? 'erro desconhecido'
      } [${ticker}]`
    );

  const result = payload.chart?.result?.[0];
  if (!result?.timestamp || !result.indicators?.quote?.[0])
    throw new Error(
      `Yahoo Finance nao retornou historico para ${ticker} (${timeframe}).`
    );

  const { timestamp } = result;
  const quote = result.indicators.quote[0];

  const bars: Bar[] = [];
  for (let i = 0; i < timestamp.length; i++) {
    const open = quote.open?.[i];
    const high = quote.high?.[i];
    const low = quote.low?.[i];
    const close = quote.close?.[i];
    const volume = quote.volume?.[i];
    if (open == null || high == null || low == null || close == null) continue;
    bars.push({
      id: `${ticker}-${timeframe}-${timestamp[i]}-${i}`,
      asset_id: ticker,
      timeframe,
      timestamp: new Date(timestamp[i] * 1000).toISOString(),
      open,
      high,
      low,
      close,
      volume: volume ?? 0,
      created_at: new Date().toISOString(),
    });
  }

  if (bars.length === 0)
    throw new Error(
      `Yahoo Finance retornou historico vazio para ${ticker} (${timeframe}).`
    );

  return bars;
};
