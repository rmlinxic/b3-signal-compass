import { AssetWithSignal, Bar, SignalSide, Setting } from '@/types/market';
import { LIQUID_POOL } from '@/lib/stockPool';
import { fetchBrapiHistoricalBars, fetchBrapiQuotes } from '@/lib/brapiClient';
import {
  fetchYahooQuote,
  fetchYahooHistoricalBars,
  YahooQuote,
} from '@/lib/yahooFinanceClient';
import {
  getActiveAssets,
  saveSignalsToSupabase,
  SupabaseAsset,
} from '@/lib/supabaseDataStore';

const STORAGE_KEYS = {
  assets: 'b3.assets',
  settings: 'b3.settings',
  bars: 'b3.bars',
};

export interface SettingsState {
  bbPeriod: number;
  bbStd: number;
  rsiPeriod: number;
  smaPeriod: number;
  squeezeThreshold: number;
  squeezePercentile: number;
  updateInterval: number;
  dataProvider: string;
  brapiToken: string;
  confidenceWeights: {
    squeeze: number;
    smaCross: number;
    rsi: number;
    bbExpansion: number;
  };
}

export const DEFAULT_SETTINGS: SettingsState = {
  bbPeriod: 20,
  bbStd: 2,
  rsiPeriod: 14,
  smaPeriod: 100,
  squeezeThreshold: 0.05,
  squeezePercentile: 10,
  updateInterval: 15,
  dataProvider: 'yahoo',
  brapiToken: (import.meta.env.VITE_BRAPI_TOKEN as string | undefined) ?? '',
  confidenceWeights: {
    squeeze: 25,
    smaCross: 25,
    rsi: 25,
    bbExpansion: 25,
  },
};

const toNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
export { toNumber };

const getSettingsFromStorage = (): SettingsState => {
  const raw = localStorage.getItem(STORAGE_KEYS.settings);
  if (!raw) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } as SettingsState;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const getSettings = (): SettingsState => getSettingsFromStorage();
export const saveSettings = (settings: SettingsState): void => {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
};
export const resetSettings = (): SettingsState => {
  saveSettings(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
};

/**
 * Gera sinal de compra/venda/neutro com base nos indicadores calculados.
 *
 * Critérios:
 *  - COMPRA:  squeeze + RSI 15m > 50 + preço acima da SMA100
 *  - VENDA:   squeeze + RSI 15m < 50 + preço abaixo da SMA100
 *  - NEUTRO:  qualquer outro caso
 *
 * Pontuação de confiança (0–100), 4 pilares de 0–25 pts cada:
 *  1. Squeeze detectado              → +25 pts (obrigatório)
 *  2. Força RSI 15m                  → |RSI-50| / 40 * 25
 *  3. Distância percentual da SMA100 → min(|dist|, 5%) / 5% * 25
 *  4. Alinhamento RSI 1d             → mesma direção do 15m
 */
const generateSignal = (
  isSqueeze: boolean,
  rsi15m: number,
  distanceToSma: number,
  rsi1d: number | null = null
): { side: SignalSide; confidence: number } => {
  if (!isSqueeze) return { side: 'neutral', confidence: 0 };

  const bullish = rsi15m > 50 && distanceToSma > 0;
  const bearish = rsi15m < 50 && distanceToSma < 0;
  if (!bullish && !bearish) return { side: 'neutral', confidence: 0 };

  const side: SignalSide = bullish ? 'buy' : 'sell';

  let score = 25; // pilar 1: squeeze
  score += (Math.min(Math.abs(rsi15m - 50), 40) / 40) * 25; // pilar 2
  score += (Math.min(Math.abs(distanceToSma), 5) / 5) * 25; // pilar 3
  if (rsi1d !== null) {
    const aligned = bullish ? rsi1d > 50 : rsi1d < 50;
    if (aligned) score += (Math.min(Math.abs(rsi1d - 50), 40) / 40) * 25; // pilar 4
  }

  return { side, confidence: Math.round(Math.min(score, 100)) };
};

const calculateSMA = (closes: number[], period: number): number | null => {
  if (closes.length < period) return null;
  return closes.slice(-period).reduce((a, b) => a + b, 0) / period;
};

const calculateBB = (
  closes: number[],
  period: number,
  stdMultiplier: number
): { width: number } | null => {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  const middle = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((acc, v) => acc + Math.pow(v - middle, 2), 0) / period;
  const std = Math.sqrt(variance);
  const upper = middle + stdMultiplier * std;
  const lower = middle - stdMultiplier * std;
  return { width: middle > 0 ? (upper - lower) / middle : 0 };
};

const calculateRSI = (closes: number[], period: number): number | null => {
  if (closes.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
};

const computeIndicators = (bars: Bar[], settings: SettingsState) => {
  const closes = bars.map((b) => b.close);
  return {
    bbWidth: calculateBB(closes, settings.bbPeriod, settings.bbStd)?.width ?? null,
    sma100: calculateSMA(closes, settings.smaPeriod),
    rsi: calculateRSI(closes, settings.rsiPeriod),
    lastClose: closes.length > 0 ? closes[closes.length - 1] : null,
  };
};

export const createAssetWithSignal = (
  ticker: string,
  name: string,
  type: 'stock' | 'etf',
  index: number
): AssetWithSignal => {
  const now = new Date().toISOString();
  return {
    id: `local-${type}-${index}`,
    ticker,
    name,
    type,
    is_active: true,
    created_at: now,
    updated_at: now,
    last_price: 0,
    price_change_pct: 0,
    volume: 0,
    bb_width_15m: null,
    is_squeeze: false,
    price_vs_sma100_15m: null,
    price_vs_sma100_1d: null,
    distance_to_sma100: null,
    rsi_15m: null,
    rsi_1d: null,
    signal_side: 'neutral',
    confidence: 0,
    last_updated: now,
  };
};

const seedAssets = (): AssetWithSignal[] => {
  const all = LIQUID_POOL.map((s, i) =>
    createAssetWithSignal(s.ticker, s.name, s.type, i)
  );
  localStorage.setItem(STORAGE_KEYS.assets, JSON.stringify(all));
  return all;
};

const getAssetsFromStorage = (): AssetWithSignal[] => {
  const raw = localStorage.getItem(STORAGE_KEYS.assets);
  if (!raw) return seedAssets();
  try {
    const parsed = JSON.parse(raw) as AssetWithSignal[];
    return parsed.length === 0 ? seedAssets() : parsed;
  } catch {
    return seedAssets();
  }
};

export const getDashboardAssets = (): AssetWithSignal[] => getAssetsFromStorage();

export const replaceMonitoredAssets = (
  stocks: Array<{ ticker: string; name: string; type: 'stock' | 'etf' }>
): AssetWithSignal[] => {
  const newAssets = stocks.map((s, i) =>
    createAssetWithSignal(s.ticker, s.name, s.type, i)
  );
  localStorage.setItem(STORAGE_KEYS.assets, JSON.stringify(newAssets));
  return newAssets;
};

// ─── Fetch helpers (Yahoo → BRAPI fallback) ───────────────────────────────────

const fetchQuoteWithFallback = async (
  ticker: string
): Promise<YahooQuote | null> => {
  try {
    return await fetchYahooQuote(ticker);
  } catch {
    try {
      const results = await fetchBrapiQuotes([ticker]);
      const q = results[0];
      if (!q) return null;
      return {
        symbol: q.symbol,
        regularMarketPrice: q.regularMarketPrice,
        regularMarketChangePercent: q.regularMarketChangePercent,
        regularMarketVolume: q.regularMarketVolume,
      };
    } catch {
      return null;
    }
  }
};

const fetchBarsWithFallback = async (
  ticker: string,
  timeframe: '15m' | '1d'
): Promise<Bar[]> => {
  try {
    return await fetchYahooHistoricalBars(ticker, timeframe);
  } catch {
    try {
      return await fetchBrapiHistoricalBars(ticker, timeframe);
    } catch {
      return [];
    }
  }
};

// ─── Compute de indicadores e sinais por ativo ───────────────────────────────

const computeAsset = async (
  asset: AssetWithSignal | SupabaseAsset,
  settings: SettingsState,
  now: string
): Promise<AssetWithSignal> => {
  const base: AssetWithSignal =
    'last_price' in asset
      ? (asset as AssetWithSignal)
      : createAssetWithSignal(
          (asset as SupabaseAsset).ticker,
          (asset as SupabaseAsset).name,
          (asset as SupabaseAsset).type,
          0
        );

  // Preserve Supabase UUID if available
  const id = (asset as SupabaseAsset).id ?? base.id;

  const [quote, bars15m, bars1d] = await Promise.all([
    fetchQuoteWithFallback(asset.ticker),
    fetchBarsWithFallback(asset.ticker, '15m'),
    fetchBarsWithFallback(asset.ticker, '1d'),
  ]);

  const ind15m = computeIndicators(bars15m, settings);
  const ind1d = computeIndicators(bars1d, settings);

  const lastPrice =
    quote?.regularMarketPrice ?? ind15m.lastClose ?? base.last_price;

  const distanceToSma =
    ind15m.sma100 && lastPrice
      ? ((lastPrice - ind15m.sma100) / ind15m.sma100) * 100
      : base.distance_to_sma100 ?? null;

  const isSqueeze =
    ind15m.bbWidth !== null
      ? ind15m.bbWidth < settings.squeezeThreshold
      : false;

  const rsi15m = ind15m.rsi ?? base.rsi_15m ?? 50;
  const rsi1d = ind1d.rsi ?? base.rsi_1d ?? null;
  const signal = generateSignal(isSqueeze, rsi15m, distanceToSma ?? 0, rsi1d);

  return {
    ...base,
    id,
    created_at: (asset as SupabaseAsset).created_at ?? base.created_at,
    updated_at: (asset as SupabaseAsset).updated_at ?? base.updated_at,
    last_price: lastPrice,
    price_change_pct:
      quote?.regularMarketChangePercent ?? base.price_change_pct,
    volume: quote?.regularMarketVolume ?? base.volume,
    bb_width_15m: ind15m.bbWidth ?? base.bb_width_15m,
    is_squeeze: isSqueeze,
    price_vs_sma100_15m:
      ind15m.sma100 && lastPrice
        ? lastPrice > ind15m.sma100
          ? 'above'
          : 'below'
        : base.price_vs_sma100_15m,
    price_vs_sma100_1d:
      ind1d.sma100 && lastPrice
        ? lastPrice > ind1d.sma100
          ? 'above'
          : 'below'
        : base.price_vs_sma100_1d,
    distance_to_sma100: distanceToSma ?? base.distance_to_sma100,
    rsi_15m: rsi15m,
    rsi_1d: rsi1d,
    signal_side: signal.side,
    confidence: signal.confidence,
    last_updated: now,
    updated_at: now,
  };
};

// ─── updateDashboardAssets ────────────────────────────────────────────────────

export const updateDashboardAssets = async (
  _provider: SettingsState['dataProvider']
): Promise<AssetWithSignal[]> => {
  const settings = getSettingsFromStorage();
  const now = new Date().toISOString();

  // 1. Tenta carregar ativos do Supabase (compartilhado)
  let supabaseAssets: SupabaseAsset[] = [];
  let useSupabase = false;
  try {
    supabaseAssets = await getActiveAssets();
    useSupabase = supabaseAssets.length > 0;
  } catch {
    console.warn('[Supabase] Falha ao carregar assets, usando localStorage');
  }

  const source = useSupabase ? supabaseAssets : getAssetsFromStorage();

  // 2. Computa indicadores e sinais para cada ativo
  const updated = await Promise.all(
    source.map((asset) => computeAsset(asset, settings, now))
  );

  // 3. Salva sinais no Supabase (visível para todos os usuários)
  if (useSupabase) {
    saveSignalsToSupabase(updated).catch((err) =>
      console.warn('[Supabase] Falha ao salvar sinais:', err)
    );
  }

  // 4. Salva no localStorage como cache offline
  localStorage.setItem(STORAGE_KEYS.assets, JSON.stringify(updated));
  return updated;
};

export const refreshDashboardAssets = (
  provider: SettingsState['dataProvider']
): Promise<AssetWithSignal[]> => updateDashboardAssets(provider);

export const addAsset = (
  ticker: string,
  name: string,
  type: 'stock' | 'etf'
): AssetWithSignal[] => {
  const existing = getAssetsFromStorage();
  const norm = ticker.toUpperCase();
  if (existing.some((a) => a.ticker === norm)) return existing;
  const next = [
    ...existing,
    createAssetWithSignal(norm, name, type, existing.length),
  ];
  localStorage.setItem(STORAGE_KEYS.assets, JSON.stringify(next));
  return next;
};

export const importAssets = (
  rows: Array<{ ticker: string; name: string; type: 'stock' | 'etf' }>
): AssetWithSignal[] => {
  let updated = getAssetsFromStorage();
  rows.forEach((r) => {
    updated = addAsset(r.ticker, r.name, r.type);
  });
  return updated;
};

export const seedTopAssets = (): AssetWithSignal[] => seedAssets();

export const getSettingsEntries = (): Setting[] => {
  const settings = getSettingsFromStorage();
  const now = new Date().toISOString();
  return Object.entries(settings).map(([key, value]) => ({
    id: `setting-${key}`,
    key,
    value,
    description: null,
    created_at: now,
    updated_at: now,
  }));
};

const getBarsKey = (a: string, t: string) => `${STORAGE_KEYS.bars}.${a}.${t}`;

export interface StoredBarsPayload { timestamp: string; data: Bar[] }

export const getStoredBars = (a: string, t: string): string | null =>
  localStorage.getItem(getBarsKey(a, t));

export const getCachedBars = (
  assetId: string,
  timeframe: string,
  maxAgeMs: number
): Bar[] | null => {
  const stored = getStoredBars(assetId, timeframe);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored) as StoredBarsPayload | Bar[];
    if (Array.isArray(parsed)) return parsed;
    const cachedAt = new Date(parsed.timestamp).getTime();
    if (Number.isNaN(cachedAt) || Date.now() - cachedAt > maxAgeMs) return null;
    return parsed.data;
  } catch { return null; }
};

export const saveStoredBars = (a: string, t: string, data: unknown): void => {
  localStorage.setItem(getBarsKey(a, t), JSON.stringify(data));
};

export const saveCachedBars = (a: string, t: string, data: Bar[]): void => {
  saveStoredBars(a, t, { timestamp: new Date().toISOString(), data });
};
