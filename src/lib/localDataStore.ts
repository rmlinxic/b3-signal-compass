import { AssetWithSignal, Bar, SignalSide, Setting } from '@/types/market';
import { topETFs, topStocks } from '@/lib/mockData';
import {
  fetchBrapiHistoricalBars,
  fetchBrapiQuotes,
} from '@/lib/brapiClient';

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
  dataProvider: 'brapi',
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

const generateSignal = (
  isSqueeze: boolean,
  rsi15m: number,
  distanceToSma: number
): {
  side: SignalSide;
  confidence: number;
} => {
  let signalSide: SignalSide = 'neutral';
  let confidence = 0;

  if (isSqueeze && rsi15m > 50 && distanceToSma > 0) {
    signalSide = 'buy';
    confidence = Math.floor(50 + Math.random() * 50);
  } else if (isSqueeze && rsi15m < 50 && distanceToSma < 0) {
    signalSide = 'sell';
    confidence = Math.floor(50 + Math.random() * 50);
  } else if (Math.random() > 0.7) {
    signalSide = Math.random() > 0.5 ? 'buy' : 'sell';
    confidence = Math.floor(20 + Math.random() * 40);
  }

  return { side: signalSide, confidence };
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
  return {
    bbWidth: bb?.width ?? null,
    sma100,
    rsi,
    lastClose,
  };
};

const createAssetWithSignal = (
  ticker: string,
  name: string,
  type: 'stock' | 'etf',
  index: number
): AssetWithSignal => {
  const basePrice = 10 + Math.random() * 90;
  const priceChange = (Math.random() - 0.5) * 10;
  const volume = Math.floor(Math.random() * 50000000) + 1000000;
  const bbWidth = Math.random() * 0.15;
  const isSqueeze = bbWidth < getSettingsFromStorage().squeezeThreshold;
  const rsi15m = 20 + Math.random() * 60;
  const rsi1d = 25 + Math.random() * 50;
  const distanceToSma = (Math.random() - 0.5) * 10;
  const signal = generateSignal(isSqueeze, rsi15m, distanceToSma);
  const now = new Date().toISOString();

  return {
    id: `local-${type}-${index}`,
    ticker,
    name,
    type,
    is_active: true,
    created_at: now,
    updated_at: now,
    last_price: parseFloat(basePrice.toFixed(2)),
    price_change_pct: parseFloat(priceChange.toFixed(2)),
    volume,
    bb_width_15m: parseFloat(bbWidth.toFixed(4)),
    is_squeeze: isSqueeze,
    price_vs_sma100_15m: distanceToSma > 0 ? 'above' : 'below',
    price_vs_sma100_1d: Math.random() > 0.5 ? 'above' : 'below',
    distance_to_sma100: parseFloat(distanceToSma.toFixed(2)),
    rsi_15m: parseFloat(rsi15m.toFixed(2)),
    rsi_1d: parseFloat(rsi1d.toFixed(2)),
    signal_side: signal.side,
    confidence: signal.confidence,
    last_updated: now,
  };
};

const seedAssets = (): AssetWithSignal[] => {
  const stocks = topStocks.map((asset, index) =>
    createAssetWithSignal(asset.ticker, asset.name, 'stock', index)
  );
  const etfs = topETFs.map((asset, index) =>
    createAssetWithSignal(asset.ticker, asset.name, 'etf', index + stocks.length)
  );
  const allAssets = [...stocks, ...etfs];
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

const simulateDashboardAssets = (): AssetWithSignal[] => {
  const settings = getSettingsFromStorage();
  const updated = getAssetsFromStorage().map((asset) => {
    const drift = (Math.random() - 0.5) * 0.03;
    const nextPrice = toNumber(asset.last_price * (1 + drift), 0.5, 9999);
    const priceChangePct = drift * 100;
    const nextVolume = Math.max(
      10000,
      Math.floor(asset.volume * (0.8 + Math.random() * 0.4))
    );
    const bbWidth = toNumber(Math.random() * 0.12, 0.01, 0.2);
    const isSqueeze = bbWidth < settings.squeezeThreshold;
    const distanceToSma = parseFloat(((Math.random() - 0.5) * 10).toFixed(2));
    const rsi15m = toNumber(20 + Math.random() * 60, 10, 90);
    const rsi1d = toNumber(25 + Math.random() * 50, 10, 90);
    const signal = generateSignal(isSqueeze, rsi15m, distanceToSma);

    return {
      ...asset,
      last_price: parseFloat(nextPrice.toFixed(2)),
      price_change_pct: parseFloat(priceChangePct.toFixed(2)),
      volume: nextVolume,
      bb_width_15m: parseFloat(bbWidth.toFixed(4)),
      is_squeeze: isSqueeze,
      price_vs_sma100_15m: distanceToSma > 0 ? 'above' : 'below',
      price_vs_sma100_1d: Math.random() > 0.5 ? 'above' : 'below',
      distance_to_sma100: distanceToSma,
      rsi_15m: parseFloat(rsi15m.toFixed(2)),
      rsi_1d: parseFloat(rsi1d.toFixed(2)),
      signal_side: signal.side,
      confidence: signal.confidence,
      last_updated: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });

  localStorage.setItem(STORAGE_KEYS.assets, JSON.stringify(updated));
  return updated;
};

export const updateDashboardAssets = async (
  provider: SettingsState['dataProvider']
): Promise<AssetWithSignal[]> => {
  if (provider !== 'brapi') {
    return simulateDashboardAssets();
  }

  try {
    const assets = getAssetsFromStorage();
    const settings = getSettingsFromStorage();
    const tickers = assets.map((asset) => asset.ticker);
    const quotes = await fetchBrapiQuotes(tickers);
    const now = new Date().toISOString();

    if (quotes.length === 0) {
      throw new Error('A BRAPI não retornou dados para os ativos solicitados.');
    }

    const updated = await Promise.all(
      assets.map(async (asset) => {
        const quote = quotes.find((item) => item.symbol === asset.ticker);
        if (!quote) return asset;

        const [bars15m, bars1d] = await Promise.all([
          fetchBrapiHistoricalBars(asset.ticker, '15m'),
          fetchBrapiHistoricalBars(asset.ticker, '1d'),
        ]);

        const indicators15m = computeIndicators(bars15m, settings);
        const indicators1d = computeIndicators(bars1d, settings);

        const lastPrice =
          quote.regularMarketPrice ??
          indicators15m.lastClose ??
          asset.last_price;
        const distanceToSma =
          indicators15m.sma100 && lastPrice
            ? ((lastPrice - indicators15m.sma100) / indicators15m.sma100) * 100
            : null;
        const isSqueeze =
          indicators15m.bbWidth !== null
            ? indicators15m.bbWidth < settings.squeezeThreshold
            : false;
        const rsi15m = indicators15m.rsi ?? asset.rsi_15m ?? 50;
        const signal = generateSignal(
          isSqueeze,
          rsi15m,
          distanceToSma ?? 0
        );

        return {
          ...asset,
          last_price: lastPrice,
          price_change_pct:
            quote.regularMarketChangePercent ?? asset.price_change_pct,
          volume: quote.regularMarketVolume ?? asset.volume,
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
          rsi_15m: indicators15m.rsi ?? asset.rsi_15m,
          rsi_1d: indicators1d.rsi ?? asset.rsi_1d,
          signal_side: signal.side,
          confidence: signal.confidence,
          last_updated: now,
          updated_at: now,
        };
      })
    );

    localStorage.setItem(STORAGE_KEYS.assets, JSON.stringify(updated));
    return updated;
  } catch {
    throw new Error('Falha de comunicação com a API da BRAPI.');
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
  const alreadyExists = existing.some(
    (asset) => asset.ticker === normalizedTicker
  );

  if (alreadyExists) return existing;

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

export const getStoredBars = (
  assetId: string,
  timeframe: string
): string | null => localStorage.getItem(getBarsKey(assetId, timeframe));

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
    if (Number.isNaN(cachedAt)) return null;
    if (Date.now() - cachedAt > maxAgeMs) return null;
    return parsed.data;
  } catch {
    return null;
  }
};

export const saveStoredBars = (
  assetId: string,
  timeframe: string,
  data: unknown
): void => {
  localStorage.setItem(getBarsKey(assetId, timeframe), JSON.stringify(data));
};

export const saveCachedBars = (
  assetId: string,
  timeframe: string,
  data: Bar[]
): void => {
  const payload: StoredBarsPayload = {
    timestamp: new Date().toISOString(),
    data,
  };
  saveStoredBars(assetId, timeframe, payload);
};
