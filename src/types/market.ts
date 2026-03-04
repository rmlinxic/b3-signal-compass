export type AssetType = 'stock' | 'etf';
export type Timeframe = '1d' | '1wk';
export type SignalSide = 'buy' | 'sell' | 'neutral';
export type SignalType =
  | 'bb_bounce'
  | 'bb_breakout'
  | 'bb_rejection'
  | 'bb_breakdown'
  | null;

export interface Asset {
  id: string;
  ticker: string;
  name: string;
  type: AssetType;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Bar {
  id: string;
  asset_id: string;
  timeframe: Timeframe;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  created_at: string;
}

export interface Indicator {
  id: string;
  asset_id: string;
  timeframe: Timeframe;
  timestamp: string;
  bb_upper: number | null;
  bb_middle: number | null;
  bb_lower: number | null;
  bb_width: number | null;
  sma50: number | null;
  sma200: number | null;
  rsi14: number | null;
  created_at: string;
}

export interface Signal {
  id: string;
  asset_id: string;
  timestamp: string;
  side: SignalSide;
  signal_type: SignalType;
  confidence: number;
  is_squeeze: boolean;
  price_vs_sma50: string | null;
  price_vs_sma200: string | null;
  distance_to_sma50: number | null;
  rsi_1d: number | null;
  rsi_1wk: number | null;
  bb_width_1d: number | null;
  created_at: string;
}

/**
 * Swing Trade — todos os campos sao baseados em dados diarios (1d) e semanais (1wk).
 * Nenhum campo intraday existe neste modelo.
 */
export interface AssetWithSignal extends Asset {
  last_price: number;
  price_change_pct: number;
  volume: number;
  // Bollinger Bands (20,2) diario
  bb_width_1d: number | null;
  bb_upper_1d: number | null;
  bb_lower_1d: number | null;
  bb_middle_1d: number | null;
  // Squeeze: BB width abaixo do limiar configurado
  is_squeeze: boolean;
  // Tendencia via SMAs
  price_vs_sma50: 'above' | 'below' | null;
  price_vs_sma200: 'above' | 'below' | null;
  distance_to_sma50: number | null;
  // RSI
  rsi_1d: number | null;
  rsi_1wk: number | null;
  // Sinal
  signal_side: SignalSide;
  signal_type: SignalType;
  confidence: number;
  last_updated: string;
}

export interface Setting {
  id: string;
  key: string;
  value: string | number | object;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardFilters {
  assetType: AssetType | 'all';
  squeezeOnly: boolean;
  signalSide: SignalSide | 'all';
  signalType: SignalType | 'all';
  rsiFilter: 'all' | 'overbought' | 'oversold';
  smaProximity: number | null;
}

export interface SortConfig {
  key: keyof AssetWithSignal;
  direction: 'asc' | 'desc';
}
