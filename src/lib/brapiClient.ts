import { Bar } from '@/types/market';

const BRAPI_BASE_URL = 'https://brapi.dev/api';
const BRAPI_TOKEN = import.meta.env.VITE_BRAPI_TOKEN as string | undefined;

const BRAPI_CHUNK_SIZE = 20;

const buildUrl = (path: string, params?: Record<string, string>) => {
  const url = new URL(`${BRAPI_BASE_URL}${path}`);
  if (BRAPI_TOKEN) {
    url.searchParams.set('token', BRAPI_TOKEN);
  }
  Object.entries(params ?? {}).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url.toString();
};

const parseBrapiError = async (response: Response) => {
  let message = `Falha ao comunicar com a BRAPI (HTTP ${response.status}).`;
  try {
    const payload = await response.json();
    const detail =
      payload?.message ||
      payload?.error ||
      payload?.errors?.[0]?.message;
    if (detail) {
      message = `Falha ao comunicar com a BRAPI: ${detail}`;
    }
  } catch {
    // ignore parse errors
  }
  if (response.status === 401 || response.status === 403) {
    message = 'Token da BRAPI ausente ou inválido. Configure VITE_BRAPI_TOKEN.';
  }
  return message;
};

export interface BrapiQuote {
  symbol: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
}

interface BrapiQuoteResponse {
  results?: BrapiQuote[];
}

interface BrapiHistoricalResponse {
  results?: Array<{
    symbol: string;
    historicalDataPrice?: Array<{
      date: number;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }>;
  }>;
}

export const fetchBrapiQuotes = async (
  tickers: string[]
): Promise<BrapiQuote[]> => {
  if (tickers.length === 0) return [];
  const chunks: string[][] = [];
  for (let i = 0; i < tickers.length; i += BRAPI_CHUNK_SIZE) {
    chunks.push(tickers.slice(i, i + BRAPI_CHUNK_SIZE));
  }

  const responses = await Promise.all(
    chunks.map(async (chunk) => {
      const path = `/quote/${encodeURIComponent(chunk.join(','))}`;
      const response = await fetch(buildUrl(path));
      if (!response.ok) {
        throw new Error(await parseBrapiError(response));
      }
      const payload = (await response.json()) as BrapiQuoteResponse;
      if (!payload.results || payload.results.length === 0) {
        throw new Error('A BRAPI não retornou dados para a solicitação.');
      }
      return payload.results;
    })
  );

  return responses.flat();
};

export const fetchBrapiHistoricalBars = async (
  ticker: string,
  timeframe: '15m' | '1d'
): Promise<Bar[]> => {
  const params =
    timeframe === '15m'
      ? { range: '1d', interval: '15m' }
      : { range: '1y', interval: '1d' };
  const response = await fetch(buildUrl(`/quote/${ticker}`, params));
  if (!response.ok) {
    throw new Error(await parseBrapiError(response));
  }
  const payload = (await response.json()) as BrapiHistoricalResponse;
  const result = payload.results?.[0];
  if (!result?.historicalDataPrice || result.historicalDataPrice.length === 0) {
    throw new Error('A BRAPI não retornou dados históricos para a solicitação.');
  }

  return result.historicalDataPrice.map((item, idx) => ({
    id: `${ticker}-${timeframe}-${item.date}-${idx}`,
    asset_id: ticker,
    timeframe,
    timestamp: new Date(item.date * 1000).toISOString(),
    open: item.open,
    high: item.high,
    low: item.low,
    close: item.close,
    volume: item.volume,
    created_at: new Date().toISOString(),
  }));
};
