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
 * Swing Trade fields:
 *  bb_width_1d / bb_upper_1d / bb_lower_1d / bb_middle_1d -> BB(20,2) diario
 *  price_vs_sma50 -> preco vs SMA50 diaria (tendencia de curto/medio prazo)
 *  price_vs_sma200 -> preco vs SMA200 diaria (tendencia macro)
 *  distance_to_sma50 -> distancia percentual ao SMA50
 *  rsi_1d -> RSI(14) diario
 *  rsi_1wk -> RSI(14) semanal (confirmacao de tendencia)
 *  signal_type -> tipo de setup detectado
 */
export interface AssetWithSignal extends Asset {
  last_price: number;
  price_change_pct: number;
  volume: number;
  bb_width_1d: number | null;
  bb_upper_1d: number | null;
  bb_lower_1d: number | null;
  bb_middle_1d: number | null;
  is_squeeze: boolean;
  price_vs_sma50: 'above' | 'below' | null;
  price_vs_sma200: 'above' | 'below' | null;
  distance_to_sma50: number | null;
  rsi_1d: number | null;
  rsi_1wk: number | null;
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
  rsiFilter: 'all' | 'overbought' | 'oversold';
  smaProximity: number | null;
}

export interface SortConfig {
  key: keyof AssetWithSignal;
  direction: 'asc' | 'desc';
}
