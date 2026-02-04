export type AssetType = 'stock' | 'etf';
export type Timeframe = '15m' | '1d';
export type SignalSide = 'buy' | 'sell' | 'neutral';

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
  sma100: number | null;
  rsi14: number | null;
  created_at: string;
}

export interface Signal {
  id: string;
  asset_id: string;
  timestamp: string;
  side: SignalSide;
  confidence: number;
  is_squeeze: boolean;
  price_vs_sma100_15m: string | null;
  price_vs_sma100_1d: string | null;
  distance_to_sma100: number | null;
  rsi_15m: number | null;
  rsi_1d: number | null;
  bb_width_15m: number | null;
  rationale_json: SignalRationale | null;
  created_at: string;
}

export interface SignalRationale {
  squeeze_detected: boolean;
  sma_cross_direction: 'up' | 'down' | 'none';
  rsi_condition: string;
  bb_expansion: boolean;
  details: string[];
}

export interface AssetWithSignal extends Asset {
  last_price: number;
  price_change_pct: number;
  volume: number;
  bb_width_15m: number | null;
  is_squeeze: boolean;
  price_vs_sma100_15m: 'above' | 'below' | null;
  price_vs_sma100_1d: 'above' | 'below' | null;
  distance_to_sma100: number | null;
  rsi_15m: number | null;
  rsi_1d: number | null;
  signal_side: SignalSide;
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
