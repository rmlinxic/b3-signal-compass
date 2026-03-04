import { AssetWithSignal, Bar, SignalSide, Setting } from '@/types/market';
import { LIQUID_POOL } from '@/lib/stockPool';
import {
  fetchBrapiHistoricalBars,
  fetchBrapiQuotes,
} from '@/lib/brapiClient';
import {
  fetchYahooQuote,
  fetchYahooHistoricalBars,
  YahooQuote,
} from '@/lib/yahooFinanceClient';

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
 *  - NEUTRO:  qualquer outro caso (squeeze sem confirmação, ou sem squeeze)
 *
 * Pontuação de confiança (0–100), sumário dos 4 pilares (0–25 cada):
 *  1. Squeeze detectado              → +25 pts (condição obrigatória)
 *  2. Força do RSI 15m               → |RSI-50| / 40 * 25
 *  3. Distância percentual da SMA100 → min(|dist|, 5%) / 5% * 25
 *  4. Alinhamento do RSI 1d          → mesma direção do 15m: |RSI1d-50|/40*25
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

  // Pilar 1: squeeze (base)
  let score = 25;

  // Pilar 2: força RSI 15m (distância até 40pts do centro)
  score += (Math.min(Math.abs(rsi15m - 50), 40) / 40) * 25;

  // Pilar 3: distância da SMA100 (até 5% = pontuação máxima)
  score += (Math.min(Math.abs(distanceToSma), 5) / 5) * 25;

  // Pilar 4: alinhamento RSI 1d (só pontua se confirma direção)
  if (rsi1d !== null) {
    const aligned = bullish ? rsi1d > 50 : rsi1d < 50;
    if (aligned) {
      score += (Math.min(Math.abs(rsi1d - 50), 40) / 40) * 25;
    }
  }

  return { side, confidence: Math.round(Math.min(score, 100)) };
};

const calculateSMA = (closes: number[], period: number): number | null => {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
};

const calculateBB = (
  closes: number[],
  period: number,
  stdMultiplier: number
): { upper: number; middle: number; lower: number; width: number } | null => {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  const middle = slice.reduce((a, b) => a + b, 0) / period;
  const variance =
    slice.reduce((acc, val) => acc + Math.pow(val - middle, 2), 0) / period;
  const std = Math.sqrt(variance);
  const upper = middle + stdMultiplier * std;
  const lower = middle - stdMultiplier * std;
  const width = middle > 0 ? (upper - lower) / middle : 0;
  return { upper, middle, lower, width };
};

const calculateRSI = (closes: number[], period: number): number | null => {
  if (closes.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
};

const computeIndicators = (
  bars: Bar[],
  settings: SettingsState
): {
  bbWidth: number | null;
  sma100: number | null;
  rsi: number | null;
  lastClose: number | null;
} => {
  const closes = bars.map((bar) => bar.close);
  const lastClose = closes.length > 0 ? closes[closes.length - 1] : null;
  const bb = calculateBB(closes, settings.bbPeriod, settings.bbStd);
  const sma100 = calculateSMA(closes, settings.smaPeriod);
  const rsi = calculateRSI(closes, settings.rsiPeriod);
  return { bbWidth: bb?.width ?? null, sma100, rsi, lastClose };
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
  const allAssets = LIQUID_POOL.map((stock, index) =>
    createAssetWithSignal(stock.ticker, stock.name, stock.type, index)
  );
  localStorage.setItem(STORAGE_KEYS.assets, JSON.stringify(allAssets));
  return allAssets;
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
  const newAssets = stocks.map((stock, index) =>
    createAssetWithSignal(stock.ticker, stock.name, stock.type, index)
  );
  localStorage.setItem(STORAGE_KEYS.assets, JSON.stringify(newAssets));
  return newAssets;
};

// Busca cotação: Yahoo Finance primeiro, BRAPI como fallback
const fetchQuoteWithFallback = async (
  ticker: string
): Promise<YahooQuote | null> => {
  try {
    return await fetchYahooQuote(ticker);
  } catch (yahooErr) {
    console.warn(`[Yahoo] Falha para ${ticker}:`, yahooErr);
    try {
      const results = await fetchBrapiQuotes([ticker]);
      const quote = results[0];
      if (!quote) return null;
      return {
        symbol: quote.symbol,
        regularMarketPrice: quote.regularMarketPrice,
        regularMarketChangePercent: quote.regularMarketChangePercent,
        regularMarketVolume: quote.regularMarketVolume,
      };
    } catch (brapiErr) {
      console.warn(`[BRAPI] Fallback também falhou para ${ticker}:`, brapiErr);
      return null;
    }
  }
};

// Busca histórico: Yahoo Finance primeiro, BRAPI como fallback
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

export const updateDashboardAssets = async (
  provider: SettingsState['dataProvider']
): Promise<AssetWithSignal[]> => {
  const assets = getAssetsFromStorage();
  const settings = getSettingsFromStorage();
  const now = new Date().toISOString();

  // 'mock' mantido apenas como modo de desenvolvimento
  if (provider === 'mock') {
    return assets.map((asset) => ({
      ...asset,
      last_updated: now,
      updated_at: now,
    }));
  }

  try {
    const updated = await Promise.all(
      assets.map(async (asset) => {
        const [quote, bars15m, bars1d] = await Promise.all([
          fetchQuoteWithFallback(asset.ticker),
          fetchBarsWithFallback(asset.ticker, '15m'),
          fetchBarsWithFallback(asset.ticker, '1d'),
        ]);

        const indicators15m = computeIndicators(bars15m, settings);
        const indicators1d = computeIndicators(bars1d, settings);

        const lastPrice =
          quote?.regularMarketPrice ??
          indicators15m.lastClose ??
          asset.last_price;

        const distanceToSma =
          indicators15m.sma100 && lastPrice
            ? ((lastPrice - indicators15m.sma100) / indicators15m.sma100) * 100
            : asset.distance_to_sma100 ?? null;

        const isSqueeze =
          indicators15m.bbWidth !== null
            ? indicators15m.bbWidth < settings.squeezeThreshold
            : false;

        const rsi15m = indicators15m.rsi ?? asset.rsi_15m ?? 50;
        const rsi1d = indicators1d.rsi ?? asset.rsi_1d ?? null;

        const signal = generateSignal(
          isSqueeze,
          rsi15m,
          distanceToSma ?? 0,
          rsi1d
        );

        return {
          ...asset,
          last_price: lastPrice,
          price_change_pct:
            quote?.regularMarketChangePercent ?? asset.price_change_pct,
          volume: quote?.regularMarketVolume ?? asset.volume,
          bb_width_15m: indicators15m.bbWidth ?? asset.bb_width_15m,
          is_squeeze: isSqueeze,
          price_vs_sma100_15m:
            indicators15m.sma100 && lastPrice
              ? lastPrice > indicators15m.sma100
                ? 'above'
                : 'below'
              : asset.price_vs_sma100_15m,
          price_vs_sma100_1d:
            indicators1d.sma100 && lastPrice
              ? lastPrice > indicators1d.sma100
                ? 'above'
                : 'below'
              : asset.price_vs_sma100_1d,
          distance_to_sma100: distanceToSma ?? asset.distance_to_sma100,
          rsi_15m: rsi15m,
          rsi_1d: rsi1d,
          signal_side: signal.side,
          confidence: signal.confidence,
          last_updated: now,
          updated_at: now,
        };
      })
    );

    localStorage.setItem(STORAGE_KEYS.assets, JSON.stringify(updated));
    return updated;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Falha ao buscar dados de mercado.';
    throw new Error(message);
  }
};

export const refreshDashboardAssets = async (
  provider: SettingsState['dataProvider']
): Promise<AssetWithSignal[]> => updateDashboardAssets(provider);

export const addAsset = (
  ticker: string,
  name: string,
  type: 'stock' | 'etf'
): AssetWithSignal[] => {
  const existing = getAssetsFromStorage();
  const normalizedTicker = ticker.toUpperCase();
  if (existing.some((a) => a.ticker === normalizedTicker)) return existing;
  const newAsset = createAssetWithSignal(
    normalizedTicker,
    name,
    type,
    existing.length + 1
  );
  const next = [...existing, newAsset];
  localStorage.setItem(STORAGE_KEYS.assets, JSON.stringify(next));
  return next;
};

export const importAssets = (
  rows: Array<{ ticker: string; name: string; type: 'stock' | 'etf' }>
): AssetWithSignal[] => {
  let updated = getAssetsFromStorage();
  rows.forEach((row) => {
    updated = addAsset(row.ticker, row.name, row.type);
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

const getBarsKey = (assetId: string, timeframe: string) =>
  `${STORAGE_KEYS.bars}.${assetId}.${timeframe}`;

export interface StoredBarsPayload {
  timestamp: string;
  data: Bar[];
}

export const getStoredBars = (assetId: string, timeframe: string): string | null =>
  localStorage.getItem(getBarsKey(assetId, timeframe));

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

export const saveStoredBars = (assetId: string, timeframe: string, data: unknown): void => {
  localStorage.setItem(getBarsKey(assetId, timeframe), JSON.stringify(data));
};

export const saveCachedBars = (assetId: string, timeframe: string, data: Bar[]): void => {
  const payload: StoredBarsPayload = { timestamp: new Date().toISOString(), data };
  saveStoredBars(assetId, timeframe, payload);
};

// ─── toNumber export para uso externo (compat) ────────────────────────────────
export { toNumber };
