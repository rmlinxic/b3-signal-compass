import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OHLCVBar {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Indicator {
  bb_upper: number;
  bb_middle: number;
  bb_lower: number;
  bb_width: number;
  sma100: number;
  rsi14: number;
}

// Calculate Simple Moving Average
function calculateSMA(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

// Calculate Bollinger Bands
function calculateBB(closes: number[], period = 20, stdMultiplier = 2): {
  upper: number;
  middle: number;
  lower: number;
  width: number;
} | null {
  if (closes.length < period) return null;
  
  const slice = closes.slice(-period);
  const middle = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((acc, val) => acc + Math.pow(val - middle, 2), 0) / period;
  const std = Math.sqrt(variance);
  
  const upper = middle + stdMultiplier * std;
  const lower = middle - stdMultiplier * std;
  const width = middle > 0 ? (upper - lower) / middle : 0;
  
  return { upper, middle, lower, width };
}

// Calculate RSI
function calculateRSI(closes: number[], period = 14): number | null {
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
  return 100 - (100 / (1 + rs));
}

// Calculate all indicators for a set of bars
function calculateIndicators(bars: OHLCVBar[]): Indicator | null {
  if (bars.length < 100) return null;
  
  const closes = bars.map(b => b.close);
  
  const bb = calculateBB(closes, 20, 2);
  const sma100 = calculateSMA(closes, 100);
  const rsi14 = calculateRSI(closes, 14);
  
  if (!bb || sma100 === null || rsi14 === null) return null;
  
  return {
    bb_upper: bb.upper,
    bb_middle: bb.middle,
    bb_lower: bb.lower,
    bb_width: bb.width,
    sma100,
    rsi14,
  };
}

// Generate signal based on indicators
function generateSignal(
  indicators15m: Indicator,
  indicators1d: Indicator | null,
  lastPrice: number,
  squeezeThreshold = 0.05
): {
  side: 'buy' | 'sell' | 'neutral';
  confidence: number;
  isSqueeze: boolean;
  rationale: Record<string, unknown>;
} {
  const isSqueeze = indicators15m.bb_width < squeezeThreshold;
  const priceAboveSma15m = lastPrice > indicators15m.sma100;
  const priceAboveSma1d = indicators1d ? lastPrice > indicators1d.sma100 : null;
  const rsi15m = indicators15m.rsi14;
  const rsi1d = indicators1d?.rsi14 ?? 50;
  
  let side: 'buy' | 'sell' | 'neutral' = 'neutral';
  let confidence = 0;
  const rationale: Record<string, unknown> = {
    squeeze_detected: isSqueeze,
    sma_cross_direction: 'none',
    rsi_condition: '',
    bb_expansion: false,
    details: [] as string[],
  };
  
  // Buy signal logic
  if (isSqueeze && priceAboveSma15m && rsi15m > 50 && rsi1d < 70) {
    side = 'buy';
    confidence = 25; // Base for squeeze
    
    (rationale.details as string[]).push('Squeeze detectado');
    rationale.sma_cross_direction = 'up';
    
    if (priceAboveSma15m) {
      confidence += 25;
      (rationale.details as string[]).push('Preço acima da SMA100 15m');
    }
    
    if (priceAboveSma1d) {
      confidence += 15;
      (rationale.details as string[]).push('Tendência de alta no diário');
    }
    
    if (rsi15m > 50 && rsi15m < 70) {
      confidence += 20;
      rationale.rsi_condition = 'bullish_momentum';
      (rationale.details as string[]).push('RSI em zona de momentum positivo');
    }
    
    if (indicators15m.bb_width > squeezeThreshold) {
      confidence += 15;
      rationale.bb_expansion = true;
      (rationale.details as string[]).push('Expansão das Bandas de Bollinger');
    }
  }
  // Sell signal logic
  else if (isSqueeze && !priceAboveSma15m && rsi15m < 50 && rsi1d > 30) {
    side = 'sell';
    confidence = 25; // Base for squeeze
    
    (rationale.details as string[]).push('Squeeze detectado');
    rationale.sma_cross_direction = 'down';
    
    if (!priceAboveSma15m) {
      confidence += 25;
      (rationale.details as string[]).push('Preço abaixo da SMA100 15m');
    }
    
    if (!priceAboveSma1d) {
      confidence += 15;
      (rationale.details as string[]).push('Tendência de baixa no diário');
    }
    
    if (rsi15m < 50 && rsi15m > 30) {
      confidence += 20;
      rationale.rsi_condition = 'bearish_momentum';
      (rationale.details as string[]).push('RSI em zona de momentum negativo');
    }
  }
  
  return { side, confidence: Math.min(confidence, 100), isSqueeze, rationale };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    
    if (action === 'calculate-indicators') {
      // Get asset_id from query params
      const assetId = url.searchParams.get('asset_id');
      const timeframe = url.searchParams.get('timeframe') as '15m' | '1d';
      
      if (!assetId || !timeframe) {
        return new Response(
          JSON.stringify({ error: 'asset_id and timeframe are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Fetch bars for the asset
      const { data: bars, error: barsError } = await supabase
        .from('bars')
        .select('*')
        .eq('asset_id', assetId)
        .eq('timeframe', timeframe)
        .order('timestamp', { ascending: true })
        .limit(200);
      
      if (barsError) {
        throw new Error(`Error fetching bars: ${barsError.message}`);
      }
      
      if (!bars || bars.length < 100) {
        return new Response(
          JSON.stringify({ error: 'Not enough data to calculate indicators' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Calculate indicators
      const ohlcvBars: OHLCVBar[] = bars.map(b => ({
        timestamp: b.timestamp,
        open: parseFloat(b.open),
        high: parseFloat(b.high),
        low: parseFloat(b.low),
        close: parseFloat(b.close),
        volume: parseInt(b.volume),
      }));
      
      const indicators = calculateIndicators(ohlcvBars);
      
      if (!indicators) {
        return new Response(
          JSON.stringify({ error: 'Failed to calculate indicators' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const lastBar = ohlcvBars[ohlcvBars.length - 1];
      
      // Insert or update indicators
      const { error: upsertError } = await supabase
        .from('indicators')
        .upsert({
          asset_id: assetId,
          timeframe,
          timestamp: lastBar.timestamp,
          bb_upper: indicators.bb_upper,
          bb_middle: indicators.bb_middle,
          bb_lower: indicators.bb_lower,
          bb_width: indicators.bb_width,
          sma100: indicators.sma100,
          rsi14: indicators.rsi14,
        }, {
          onConflict: 'asset_id,timeframe,timestamp',
        });
      
      if (upsertError) {
        throw new Error(`Error upserting indicators: ${upsertError.message}`);
      }
      
      return new Response(
        JSON.stringify({ success: true, indicators }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (action === 'generate-signals') {
      // Fetch all active assets
      const { data: assets, error: assetsError } = await supabase
        .from('assets')
        .select('id, ticker')
        .eq('is_active', true);
      
      if (assetsError) {
        throw new Error(`Error fetching assets: ${assetsError.message}`);
      }
      
      const signals = [];
      
      for (const asset of assets || []) {
        // Fetch latest indicators for 15m
        const { data: indicators15m } = await supabase
          .from('indicators')
          .select('*')
          .eq('asset_id', asset.id)
          .eq('timeframe', '15m')
          .order('timestamp', { ascending: false })
          .limit(1)
          .single();
        
        // Fetch latest indicators for 1d
        const { data: indicators1d } = await supabase
          .from('indicators')
          .select('*')
          .eq('asset_id', asset.id)
          .eq('timeframe', '1d')
          .order('timestamp', { ascending: false })
          .limit(1)
          .single();
        
        // Fetch latest bar for current price
        const { data: lastBar } = await supabase
          .from('bars')
          .select('close')
          .eq('asset_id', asset.id)
          .eq('timeframe', '15m')
          .order('timestamp', { ascending: false })
          .limit(1)
          .single();
        
        if (!indicators15m || !lastBar) continue;
        
        const signal = generateSignal(
          {
            bb_upper: parseFloat(indicators15m.bb_upper),
            bb_middle: parseFloat(indicators15m.bb_middle),
            bb_lower: parseFloat(indicators15m.bb_lower),
            bb_width: parseFloat(indicators15m.bb_width),
            sma100: parseFloat(indicators15m.sma100),
            rsi14: parseFloat(indicators15m.rsi14),
          },
          indicators1d ? {
            bb_upper: parseFloat(indicators1d.bb_upper),
            bb_middle: parseFloat(indicators1d.bb_middle),
            bb_lower: parseFloat(indicators1d.bb_lower),
            bb_width: parseFloat(indicators1d.bb_width),
            sma100: parseFloat(indicators1d.sma100),
            rsi14: parseFloat(indicators1d.rsi14),
          } : null,
          parseFloat(lastBar.close)
        );
        
        // Insert signal
        const distanceToSma = indicators15m.sma100 
          ? ((parseFloat(lastBar.close) - parseFloat(indicators15m.sma100)) / parseFloat(indicators15m.sma100)) * 100
          : null;
        
        const { error: signalError } = await supabase
          .from('signals')
          .insert({
            asset_id: asset.id,
            side: signal.side,
            confidence: signal.confidence,
            is_squeeze: signal.isSqueeze,
            price_vs_sma100_15m: parseFloat(lastBar.close) > parseFloat(indicators15m.sma100) ? 'above' : 'below',
            price_vs_sma100_1d: indicators1d 
              ? parseFloat(lastBar.close) > parseFloat(indicators1d.sma100) ? 'above' : 'below'
              : null,
            distance_to_sma100: distanceToSma,
            rsi_15m: parseFloat(indicators15m.rsi14),
            rsi_1d: indicators1d ? parseFloat(indicators1d.rsi14) : null,
            bb_width_15m: parseFloat(indicators15m.bb_width),
            rationale_json: signal.rationale,
          });
        
        if (!signalError) {
          signals.push({ ticker: asset.ticker, ...signal });
        }
      }
      
      return new Response(
        JSON.stringify({ success: true, signals_generated: signals.length, signals }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: 'Unknown action. Use: calculate-indicators or generate-signals' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: unknown) {
    console.error('Error in market-data function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
