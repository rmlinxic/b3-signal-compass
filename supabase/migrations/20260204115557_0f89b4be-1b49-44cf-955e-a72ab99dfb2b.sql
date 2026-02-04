-- Criar enum para tipos de ativos
CREATE TYPE asset_type AS ENUM ('stock', 'etf');

-- Criar enum para timeframes
CREATE TYPE timeframe_type AS ENUM ('15m', '1d');

-- Criar enum para sinais
CREATE TYPE signal_side AS ENUM ('buy', 'sell', 'neutral');

-- Tabela de ativos
CREATE TABLE public.assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type asset_type NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de barras OHLCV
CREATE TABLE public.bars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  timeframe timeframe_type NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  open DECIMAL(18, 6) NOT NULL,
  high DECIMAL(18, 6) NOT NULL,
  low DECIMAL(18, 6) NOT NULL,
  close DECIMAL(18, 6) NOT NULL,
  volume BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(asset_id, timeframe, timestamp)
);

-- Tabela de indicadores calculados
CREATE TABLE public.indicators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  timeframe timeframe_type NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  bb_upper DECIMAL(18, 6),
  bb_middle DECIMAL(18, 6),
  bb_lower DECIMAL(18, 6),
  bb_width DECIMAL(18, 6),
  sma100 DECIMAL(18, 6),
  rsi14 DECIMAL(8, 4),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(asset_id, timeframe, timestamp)
);

-- Tabela de sinais gerados
CREATE TABLE public.signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  side signal_side NOT NULL,
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  is_squeeze BOOLEAN NOT NULL DEFAULT false,
  price_vs_sma100_15m TEXT,
  price_vs_sma100_1d TEXT,
  distance_to_sma100 DECIMAL(8, 4),
  rsi_15m DECIMAL(8, 4),
  rsi_1d DECIMAL(8, 4),
  bb_width_15m DECIMAL(18, 6),
  rationale_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de configurações
CREATE TABLE public.settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_bars_asset_timeframe ON public.bars(asset_id, timeframe, timestamp DESC);
CREATE INDEX idx_indicators_asset_timeframe ON public.indicators(asset_id, timeframe, timestamp DESC);
CREATE INDEX idx_signals_asset_timestamp ON public.signals(asset_id, timestamp DESC);
CREATE INDEX idx_assets_ticker ON public.assets(ticker);
CREATE INDEX idx_assets_type ON public.assets(type);

-- Enable RLS
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Policies para leitura pública (dados são públicos)
CREATE POLICY "Anyone can read assets" ON public.assets FOR SELECT USING (true);
CREATE POLICY "Anyone can read bars" ON public.bars FOR SELECT USING (true);
CREATE POLICY "Anyone can read indicators" ON public.indicators FOR SELECT USING (true);
CREATE POLICY "Anyone can read signals" ON public.signals FOR SELECT USING (true);
CREATE POLICY "Anyone can read settings" ON public.settings FOR SELECT USING (true);

-- Policies para inserção/atualização (apenas via service role)
CREATE POLICY "Service role can manage assets" ON public.assets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage bars" ON public.bars FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage indicators" ON public.indicators FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage signals" ON public.signals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir configurações padrão
INSERT INTO public.settings (key, value, description) VALUES
  ('bb_period', '20', 'Período das Bandas de Bollinger'),
  ('bb_std', '2', 'Desvio padrão das Bandas de Bollinger'),
  ('rsi_period', '14', 'Período do RSI'),
  ('sma_period', '100', 'Período da SMA'),
  ('squeeze_threshold', '0.05', 'Limiar de BB Width para squeeze'),
  ('squeeze_percentile', '10', 'Percentil para detecção de squeeze'),
  ('update_interval', '5', 'Intervalo de atualização em minutos'),
  ('confidence_weights', '{"squeeze": 25, "sma_cross": 25, "rsi": 25, "bb_expansion": 25}', 'Pesos para cálculo de confiança');