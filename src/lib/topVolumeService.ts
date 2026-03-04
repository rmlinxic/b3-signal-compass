import { getSettings } from './localDataStore';
import { LIQUID_POOL, PoolStock } from './stockPool';

export type MonitoredStock = PoolStock;

const DAILY_INIT_KEY = 'b3.dailyInit.v2';
const CORS_PROXY = 'https://corsproxy.io/?';

interface DailyInitCache {
  date: string;
  stocks: MonitoredStock[];
}

/** Retorna a data atual no fuso de Brasília (UTC-3), formato YYYY-MM-DD */
const getTodayBRT = (): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(
    new Date()
  );

export const isFirstAccessToday = (): boolean => {
  const stored = localStorage.getItem(DAILY_INIT_KEY);
  if (!stored) return true;
  try {
    const data = JSON.parse(stored) as DailyInitCache;
    return data.date !== getTodayBRT();
  } catch {
    return true;
  }
};

const saveDailyCache = (stocks: MonitoredStock[]): void => {
  const payload: DailyInitCache = { date: getTodayBRT(), stocks };
  localStorage.setItem(DAILY_INIT_KEY, JSON.stringify(payload));
};

export const getCachedDailyStocks = (): MonitoredStock[] | null => {
  const stored = localStorage.getItem(DAILY_INIT_KEY);
  if (!stored) return null;
  try {
    const data = JSON.parse(stored) as DailyInitCache;
    if (data.date !== getTodayBRT()) return null;
    return data.stocks;
  } catch {
    return null;
  }
};

// ─── Fonte 1: Yahoo Finance Screener ────────────────────────────────────────

interface YFScreenerQuote {
  symbol: string;
  shortName?: string;
  longName?: string;
  regularMarketVolume?: number;
}

interface YFScreenerResponse {
  finance?: {
    result?: Array<{
      quotes?: YFScreenerQuote[];
    }>;
    error?: { description?: string } | null;
  };
}

/**
 * Busca top 50 ações com maior volume no dia via Yahoo Finance Screener.
 * Usa o screener pré-definido 'day_volume_leaders_br' (bolsa brasileira).
 */
const fetchTop50FromYahooScreener = async (): Promise<MonitoredStock[]> => {
  const url =
    'https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved' +
    '?count=50&scrIds=day_volume_leaders_br&start=0';

  const response = await fetch(`${CORS_PROXY}${encodeURIComponent(url)}`);
  if (!response.ok)
    throw new Error(`Yahoo screener retornou HTTP ${response.status}`);

  const payload = (await response.json()) as YFScreenerResponse;

  if (payload.finance?.error)
    throw new Error(
      `Yahoo screener erro: ${
        payload.finance.error.description ?? 'desconhecido'
      }`
    );

  const quotes = payload.finance?.result?.[0]?.quotes ?? [];
  if (quotes.length === 0)
    throw new Error('Yahoo screener retornou lista vazia.');

  return quotes.slice(0, 50).map((q) => ({
    // Remove sufixo .SA para padronizar com o restante do sistema
    ticker: q.symbol.replace(/\.SA$/i, ''),
    name: q.longName ?? q.shortName ?? q.symbol,
    type: 'stock' as const,
  }));
};

// ─── Fonte 2: BRAPI quote/list ───────────────────────────────────────────────

interface BrapiListStock {
  stock: string;
  name: string;
  volume?: number;
}
interface BrapiListResponse {
  stocks?: BrapiListStock[];
}

const fetchTop50ByVolumeFromBrapi = async (): Promise<MonitoredStock[]> => {
  const settings = getSettings();
  const token =
    settings.brapiToken ||
    (import.meta.env.VITE_BRAPI_TOKEN as string | undefined);
  if (!token) throw new Error('Token BRAPI não configurado.');

  const url = new URL('https://brapi.dev/api/quote/list');
  url.searchParams.set('token', token);
  url.searchParams.set('sortBy', 'volume');
  url.searchParams.set('sortOrder', 'desc');
  url.searchParams.set('limit', '50');
  url.searchParams.set('type', 'stock');

  const response = await fetch(url.toString());
  if (!response.ok)
    throw new Error(`BRAPI quote/list retornou HTTP ${response.status}`);

  const payload = (await response.json()) as BrapiListResponse;
  const stocks = payload.stocks ?? [];
  if (stocks.length === 0)
    throw new Error('BRAPI quote/list retornou lista vazia.');

  return stocks.slice(0, 50).map((s) => ({
    ticker: s.stock,
    name: s.name || s.stock,
    type: 'stock' as const,
  }));
};

// ─── Entry point público ─────────────────────────────────────────────────────

/**
 * Busca o ranking top 50 por volume do dia.
 * Ordem de prioridade:
 *   1. Yahoo Finance Screener (day_volume_leaders_br) — sem API key
 *   2. BRAPI quote/list (sortBy=volume)              — requer token BRAPI
 *   3. Pool curado LIQUID_POOL                        — sempre disponível
 */
export const fetchDailyTop50 = async (): Promise<MonitoredStock[]> => {
  // Fonte 1: Yahoo Finance Screener
  try {
    const result = await fetchTop50FromYahooScreener();
    saveDailyCache(result);
    console.info(
      `[DailyInit] Top 50 via Yahoo Finance Screener (${getTodayBRT()})`
    );
    return result;
  } catch (yahooErr) {
    console.warn('[DailyInit] Yahoo screener falhou:', yahooErr);
  }

  // Fonte 2: BRAPI quote/list
  try {
    const result = await fetchTop50ByVolumeFromBrapi();
    saveDailyCache(result);
    console.info(`[DailyInit] Top 50 via BRAPI (${getTodayBRT()})`);
    return result;
  } catch (brapiErr) {
    console.warn('[DailyInit] BRAPI também falhou:', brapiErr);
  }

  // Fonte 3: Pool curado (sempre disponível)
  console.info('[DailyInit] Usando pool curado como fallback.');
  const fallback = LIQUID_POOL.slice(0, 50);
  saveDailyCache(fallback);
  return fallback;
};

export { LIQUID_POOL };
