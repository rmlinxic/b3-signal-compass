import { getSettings } from './localDataStore';
import { LIQUID_POOL, PoolStock } from './stockPool';

export type MonitoredStock = PoolStock;

const DAILY_INIT_KEY = 'b3.dailyInit.v2';

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

// ─── BRAPI quote/list ──────────────────────────────────────────────────────

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

// ─── Entry point público ──────────────────────────────────────────────────────

/**
 * Busca o ranking top 50 por volume do dia:
 * 1. Tenta BRAPI quote/list (dados do dia anterior, ordenados por volume)
 * 2. Fallback: pool curado das ações mais líquidas da B3
 *
 * Salva em localStorage com a data atual (fuso BRT) para evitar
 * chamadas repetidas no mesmo dia.
 */
export const fetchDailyTop50 = async (): Promise<MonitoredStock[]> => {
  try {
    const result = await fetchTop50ByVolumeFromBrapi();
    saveDailyCache(result);
    console.info(
      `[DailyInit] Top 50 por volume obtidos via BRAPI (${getTodayBRT()})`
    );
    return result;
  } catch (err) {
    console.warn(
      '[DailyInit] BRAPI quote/list falhou, usando pool curado:',
      err
    );
    const fallback = LIQUID_POOL.slice(0, 50);
    saveDailyCache(fallback);
    return fallback;
  }
};

export { LIQUID_POOL };
