import { Bar } from '@/types/market';

const BRAPI_BASE_URL = 'https://brapi.dev/api';
const SETTINGS_STORAGE_KEY = 'b3.settings';

const getStoredBrapiToken = (): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { brapiToken?: string };
    const token = parsed?.brapiToken?.trim();
    return token || undefined;
  } catch {
    return undefined;
  }
};

const getBrapiToken = (): string | undefined =>
  getStoredBrapiToken() ??
  (import.meta.env.VITE_BRAPI_TOKEN as string | undefined);

const BRAPI_CHUNK_SIZE = 20;

const normalizeTicker = (ticker: string) =>
  ticker.includes('.') ? ticker : `${ticker}.SA`;

const buildUrl = (path: string, params?: Record<string, string>) => {
  const url = new URL(`${BRAPI_BASE_URL}${path}`);
  const token = getBrapiToken();
  if (token) url.searchParams.set('token', token);
  Object.entries(params ?? {}).forEach(([k, v]) => url.searchParams.set(k, v));
  return url.toString();
};

const parseBrapiError = async (response: Response): Promise<string> => {
  let message = `Falha ao comunicar com a BRAPI (HTTP ${response.status}).`;
  try {
    const payload = await response.json();
    const detail =
      payload?.message || payload?.error || payload?.errors?.[0]?.message;
    if (detail) message = `BRAPI: ${detail}`;
  } catch {
    // ignore
  }
  if (response.status === 401 || response.status === 403) {
    message =
      'Token BRAPI ausente ou inválido. Configure em VITE_BRAPI_TOKEN ou nas Configurações.';
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
  if (!getBrapiToken())
    throw new Error(
      'Token BRAPI ausente. Configure em VITE_BRAPI_TOKEN ou nas Configurações.'
    );

  const chunks: string[][] = [];
  for (let i = 0; i < tickers.length; i += BRAPI_CHUNK_SIZE)
    chunks.push(tickers.slice(i, i + BRAPI_CHUNK_SIZE));

  const responses = await Promise.all(
    chunks.map(async (chunk) => {
      const normalized = chunk.map(normalizeTicker);
      const path = `/quote/${encodeURIComponent(normalized.join(','))}`;
      const response = await fetch(buildUrl(path));
      if (!response.ok) throw new Error(await parseBrapiError(response));
      const payload = (await response.json()) as BrapiQuoteResponse;
      return payload.results ?? [];
    })
  );

  return responses.flat();
};

export const fetchBrapiHistoricalBars = async (
  ticker: string,
  timeframe: '15m' | '1d'
): Promise<Bar[]> => {
  if (!getBrapiToken())
    throw new Error(
      'Token BRAPI ausente. Configure em VITE_BRAPI_TOKEN ou nas Configurações.'
    );

  /**
   * Ranges suportados pelo plano gratuito da BRAPI:
   *  15m -> '1d'  (dados intraday do dia atual)
   *  1d  -> '6mo' (plano gratuito suporta até 6 meses; '1y' é pago)
   *
   * 6mo = ~126 pregões, suficiente para SMA100 (100 barras necessárias).
   */
  const params =
    timeframe === '15m'
      ? { range: '1d', interval: '15m' }
      : { range: '6mo', interval: '1d' };

  const candidates = ticker.includes('.')
    ? [ticker]
    : [ticker, normalizeTicker(ticker)];

  let lastError =
    'BRAPI não retornou dados históricos para a solicitação.';

  for (const candidate of candidates) {
    const response = await fetch(buildUrl(`/quote/${candidate}`, params));
    if (!response.ok) {
      lastError = await parseBrapiError(response);
      continue;
    }
    const payload = (await response.json()) as BrapiHistoricalResponse;
    const result = payload.results?.[0];
    if (!result?.historicalDataPrice?.length) {
      lastError = 'BRAPI não retornou dados históricos para a solicitação.';
      continue;
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
  }

  throw new Error(lastError);
};
