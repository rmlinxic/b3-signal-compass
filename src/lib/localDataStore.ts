import {
  AssetWithSignal,
  Bar,
  SignalSide,
  SignalType,
  Setting,
} from '@/types/market';
import { LIQUID_POOL } from '@/lib/stockPool';
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
  sma200Period: number;
  squeezeThreshold: number;
  rsiOversold: number;
  rsiOverbought: number;
  updateInterval: number;
  dataProvider: string;
  brapiToken: string;
  confidenceWeights: {
    bandTouch: number;
    rsiConfluence: number;
    trendAlignment: number;
    smaCross: number;
  };
}

export const DEFAULT_SETTINGS: SettingsState = {
  bbPeriod: 20,
  bbStd: 2,
  rsiPeriod: 14,
  smaPeriod: 50,
  sma200Period: 200,
  squeezeThreshold: 0.07,
  rsiOversold: 45,
  rsiOverbought: 60,
  updateInterval: 30,
  dataProvider: 'yahoo',
  brapiToken: (import.meta.env.VITE_BRAPI_TOKEN as string | undefined) ?? '',
  confidenceWeights: {
    bandTouch: 30,
    rsiConfluence: 25,
    trendAlignment: 25,
    smaCross: 20,
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

// ---------------------------------------------------------------------------
// Calculos tecnicos
// ---------------------------------------------------------------------------

const calculateSMA = (closes: number[], period: number): number | null => {
  if (closes.length < period) return null;
  return closes.slice(-period).reduce((a, b) => a + b, 0) / period;
};

interface BBResult {
  upper: number;
  middle: number;
  lower: number;
  width: number;
}

const calculateBB = (
  closes: number[],
  period: number,
  stdMultiplier: number
): BBResult | null => {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  const middle = slice.reduce((a, b) => a + b, 0) / period;
  const variance =
    slice.reduce((acc, v) => acc + (v - middle) ** 2, 0) / period;
  const std = Math.sqrt(variance);
  const upper = middle + stdMultiplier * std;
  const lower = middle - stdMultiplier * std;
  return {
    upper,
    middle,
    lower,
    width: middle > 0 ? (upper - lower) / middle : 0,
  };
};

const calculateRSI = (closes: number[], period: number): number | null => {
  if (closes.length < period + 1) return null;

  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss -= changes[i];
  }
  avgGain /= period;
  avgLoss /= period;

  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] > 0 ? changes[i] : 0;
    const loss = changes[i] < 0 ? -changes[i] : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
};

const generateSwingSignal = (
  lastClose: number,
  bb: BBResult,
  sma50: number | null,
  sma200: number | null,
  rsi1d: number | null,
  settings: SettingsState
): { side: SignalSide; type: SignalType; confidence: number } => {
  const neutral = {
    side: 'neutral' as SignalSide,
    type: null as SignalType,
    confidence: 0,
  };
  if (rsi1d === null) return neutral;

  const isSqueeze = bb.width < settings.squeezeThreshold;

  if (isSqueeze) {
    if (lastClose > bb.upper && rsi1d > 50) {
      const rsiBon = Math.min((rsi1d - 50) / 50, 1) * 25;
      const trendBon = sma50 && lastClose > sma50 ? 25 : 10;
      const crossBon = sma50 && sma200 && sma50 > sma200 ? 20 : 0;
      return {
        side: 'buy',
        type: 'bb_breakout',
        confidence: Math.round(Math.min(30 + rsiBon + trendBon + crossBon, 100)),
      };
    }
    if (lastClose < bb.lower && rsi1d < 50) {
      const rsiBon = Math.min((50 - rsi1d) / 50, 1) * 25;
      const trendBon = sma50 && lastClose < sma50 ? 25 : 10;
      const crossBon = sma50 && sma200 && sma50 < sma200 ? 20 : 0;
      return {
        side: 'sell',
        type: 'bb_breakdown',
        confidence: Math.round(Math.min(30 + rsiBon + trendBon + crossBon, 100)),
      };
    }
  }

  if (lastClose <= bb.lower * 1.015 && rsi1d < settings.rsiOversold) {
    const bandScore = lastClose <= bb.lower ? 30 : 15;
    const rsiScore =
      Math.min((settings.rsiOversold - rsi1d) / settings.rsiOversold, 1) * 25;
    const trendScore = sma50 && lastClose > sma50 ? 25 : 10;
    const crossScore = sma50 && sma200 && sma50 > sma200 ? 20 : 0;
    return {
      side: 'buy',
      type: 'bb_bounce',
      confidence: Math.round(
        Math.min(bandScore + rsiScore + trendScore + crossScore, 100)
      ),
    };
  }

  if (lastClose >= bb.upper * 0.985 && rsi1d > settings.rsiOverbought) {
    const bandScore = lastClose >= bb.upper ? 30 : 15;
    const rsiScore =
      Math.min(
        (rsi1d - settings.rsiOverbought) / (100 - settings.rsiOverbought),
        1
      ) * 25;
    const trendScore = sma50 && lastClose < sma50 ? 25 : 10;
    const crossScore = sma50 && sma200 && sma50 < sma200 ? 20 : 0;
    return {
      side: 'sell',
      type: 'bb_rejection',
      confidence: Math.round(
        Math.min(bandScore + rsiScore + trendScore + crossScore, 100)
      ),
    };
  }

  return neutral;
};

const computeIndicators = (bars: Bar[], settings: SettingsState) => {
  const closes = bars.map((b) => b.close);
  const bb = calculateBB(closes, settings.bbPeriod, settings.bbStd);
  return {
    bb,
    sma50: calculateSMA(closes, settings.smaPeriod),
    sma200: calculateSMA(closes, settings.sma200Period),
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
    bb_width_1d: null,
    bb_upper_1d: null,
    bb_lower_1d: null,
    bb_middle_1d: null,
    is_squeeze: false,
    price_vs_sma50: null,
    price_vs_sma200: null,
    distance_to_sma50: null,
    rsi_1d: null,
    rsi_1wk: null,
    signal_side: 'neutral',
    signal_type: null,
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

const fetchQuote = async (ticker: string): Promise<YahooQuote | null> => {
  try {
    return await fetchYahooQuote(ticker);
  } catch (err) {
    console.warn(`[Yahoo] Cotacao falhou para ${ticker}:`, err);
    return null;
  }
};

const fetchBars = async (
  ticker: string,
  timeframe: '1d' | '1wk'
): Promise<Bar[]> => {
  try {
    return await fetchYahooHistoricalBars(ticker, timeframe);
  } catch (err) {
    console.warn(`[Yahoo] Historico ${timeframe} falhou para ${ticker}:`, err);
    return [];
  }
};

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

  const id = (asset as SupabaseAsset).id ?? base.id;

  const [quote, bars1d, bars1wk] = await Promise.all([
    fetchQuote(asset.ticker),
    fetchBars(asset.ticker, '1d'),
    fetchBars(asset.ticker, '1wk'),
  ]);

  const ind1d = computeIndicators(bars1d, settings);
  const ind1wk = computeIndicators(bars1wk, settings);

  const lastPrice =
    quote?.regularMarketPrice ?? ind1d.lastClose ?? base.last_price;

  const { bb, sma50, sma200, rsi } = ind1d;

  const signal =
    bb && lastPrice
      ? generateSwingSignal(lastPrice, bb, sma50, sma200, rsi, settings)
      : { side: 'neutral' as SignalSide, type: null as SignalType, confidence: 0 };

  const isSqueeze = bb ? bb.width < settings.squeezeThreshold : false;

  return {
    ...base,
    id,
    created_at: (asset as SupabaseAsset).created_at ?? base.created_at,
    updated_at: now,
    last_price: lastPrice,
    price_change_pct:
      quote?.regularMarketChangePercent ?? base.price_change_pct,
    volume: quote?.regularMarketVolume ?? base.volume,
    bb_width_1d: bb?.width ?? base.bb_width_1d,
    bb_upper_1d: bb?.upper ?? base.bb_upper_1d,
    bb_lower_1d: bb?.lower ?? base.bb_lower_1d,
    bb_middle_1d: bb?.middle ?? base.bb_middle_1d,
    is_squeeze: isSqueeze,
    price_vs_sma50:
      sma50 && lastPrice
        ? lastPrice > sma50
          ? 'above'
          : 'below'
        : base.price_vs_sma50,
    price_vs_sma200:
      sma200 && lastPrice
        ? lastPrice > sma200
          ? 'above'
          : 'below'
        : base.price_vs_sma200,
    distance_to_sma50:
      sma50 && lastPrice
        ? ((lastPrice - sma50) / sma50) * 100
        : base.distance_to_sma50,
    rsi_1d: rsi ?? base.rsi_1d,
    rsi_1wk: ind1wk.rsi ?? base.rsi_1wk,
    signal_side: signal.side,
    signal_type: signal.type,
    confidence: signal.confidence,
    last_updated: now,
  };
};

export const updateDashboardAssets = async (
  _provider: SettingsState['dataProvider']
): Promise<AssetWithSignal[]> => {
  const settings = getSettingsFromStorage();
  const now = new Date().toISOString();

  let supabaseAssets: SupabaseAsset[] = [];
  let useSupabase = false;
  try {
    supabaseAssets = await getActiveAssets();
    useSupabase = supabaseAssets.length > 0;
  } catch {
    console.warn('[Supabase] Falha ao carregar assets, usando localStorage');
  }

  const source = useSupabase ? supabaseAssets : getAssetsFromStorage();

  const updated = await Promise.all(
    source.map((asset) => computeAsset(asset, settings, now))
  );

  if (useSupabase) {
    saveSignalsToSupabase(updated).catch((err) =>
      console.warn('[Supabase] Falha ao salvar sinais:', err)
    );
  }

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

/**
 * Remove um ativo da lista de monitoramento pelo ticker.
 */
export const removeAsset = (ticker: string): AssetWithSignal[] => {
  const existing = getAssetsFromStorage();
  const updated = existing.filter(
    (a) => a.ticker !== ticker.toUpperCase()
  );
  localStorage.setItem(STORAGE_KEYS.assets, JSON.stringify(updated));
  return updated;
};

/**
 * Busca cotacao e recalcula indicadores para um unico ativo,
 * salvando o resultado no localStorage. Util apos adicionar um ativo.
 */
export const refreshSingleAsset = async (
  ticker: string
): Promise<AssetWithSignal[]> => {
  const settings = getSettingsFromStorage();
  const existing = getAssetsFromStorage();
  const now = new Date().toISOString();
  const norm = ticker.toUpperCase();
  const target = existing.find((a) => a.ticker === norm);
  if (!target) return existing;
  const refreshed = await computeAsset(target, settings, now);
  const next = existing.map((a) => (a.ticker === norm ? refreshed : a));
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

export interface StoredBarsPayload {
  timestamp: string;
  data: Bar[];
}

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
  } catch {
    return null;
  }
};

export const saveStoredBars = (a: string, t: string, data: unknown): void => {
  localStorage.setItem(getBarsKey(a, t), JSON.stringify(data));
};

export const saveCachedBars = (a: string, t: string, data: Bar[]): void => {
  saveStoredBars(a, t, { timestamp: new Date().toISOString(), data });
};
