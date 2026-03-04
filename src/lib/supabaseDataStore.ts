/**
 * Camada de acesso ao Supabase.
 * Todos os usuários compartilham os mesmos ativos e sinais.
 *
 * Estratégia:
 *  - Supabase é a fonte primária (dados compartilhados)
 *  - localStorage é cache offline (fallback quando Supabase não está disponível)
 */
import { supabase } from '@/integrations/supabase/client';
import { AssetWithSignal } from '@/types/market';

const getTodayBRT = (): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(
    new Date()
  );

// ─── Verificação de atualização diária (global, via Supabase) ─────────────────

/**
 * Verifica se a lista de ativos no Supabase é de um dia anterior.
 * O PRIMEIRO usuário que abrir o app hoje dispara a atualização para todos.
 */
export const isAssetListStaleToday = async (): Promise<boolean> => {
  try {
    const { data } = await supabase
      .from('assets')
      .select('updated_at')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return true;

    const lastBRT = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
    }).format(new Date(data.updated_at));

    return lastBRT !== getTodayBRT();
  } catch {
    // Se não conseguir verificar, assume atualizado (evita loop de atualização)
    return false;
  }
};

// ─── Ativos ────────────────────────────────────────────────────────────────

export interface SupabaseAsset {
  id: string;
  ticker: string;
  name: string;
  type: 'stock' | 'etf';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Substitui a lista de ações monitoradas no Supabase.
 * Marca as antigas como inativas e faz upsert das novas como ativas.
 */
export const upsertAssetList = async (
  stocks: Array<{ ticker: string; name: string; type: 'stock' | 'etf' }>
): Promise<SupabaseAsset[]> => {
  // Desativa todas as ações atuais (ETFs não são afetados por ora)
  await supabase
    .from('assets')
    .update({ is_active: false })
    .eq('type', 'stock')
    .eq('is_active', true);

  // Upsert: atualiza existentes + insere novas (unique: ticker)
  const rows = stocks.map((s) => ({
    ticker: s.ticker,
    name: s.name,
    type: s.type,
    is_active: true,
  }));

  const { data, error } = await supabase
    .from('assets')
    .upsert(rows, { onConflict: 'ticker' })
    .select('id, ticker, name, type, is_active, created_at, updated_at');

  if (error) throw new Error(`Supabase upsertAssetList: ${error.message}`);
  return (data ?? []) as SupabaseAsset[];
};

/** Retorna todos os ativos ativos do Supabase */
export const getActiveAssets = async (): Promise<SupabaseAsset[]> => {
  const { data, error } = await supabase
    .from('assets')
    .select('id, ticker, name, type, is_active, created_at, updated_at')
    .eq('is_active', true)
    .order('ticker');

  if (error) throw new Error(`Supabase getActiveAssets: ${error.message}`);
  return (data ?? []) as SupabaseAsset[];
};

// ─── Sinais ─────────────────────────────────────────────────────────────────

/**
 * Retorna o último sinal computado por ativo (Map<asset_id, signal>).
 * Leitura é pública (RLS allows SELECT for all).
 */
export const getLatestSignalMap = async (
  assetIds: string[]
): Promise<Map<string, Record<string, unknown>>> => {
  if (assetIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('signals')
    .select(
      'id, asset_id, side, confidence, is_squeeze, price_vs_sma100_15m, price_vs_sma100_1d, distance_to_sma100, rsi_15m, rsi_1d, bb_width_15m, rationale_json, created_at'
    )
    .in('asset_id', assetIds)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Supabase getLatestSignalMap: ${error.message}`);

  const map = new Map<string, Record<string, unknown>>();
  for (const signal of data ?? []) {
    if (!map.has(signal.asset_id)) {
      map.set(signal.asset_id, signal as Record<string, unknown>);
    }
  }
  return map;
};

/**
 * Salva os sinais computados no Supabase.
 * Somente ativos com UUID válido do Supabase são enviados.
 */
export const saveSignalsToSupabase = async (
  assets: AssetWithSignal[]
): Promise<void> => {
  // Filtra IDs locais falsos (ex: 'local-stock-0')
  const valid = assets.filter((a) => /^[0-9a-f-]{36}$/.test(a.id));
  if (valid.length === 0) return;

  const rows = valid.map((a) => ({
    asset_id: a.id,
    side: a.signal_side,
    confidence: a.confidence,
    is_squeeze: a.is_squeeze,
    price_vs_sma100_15m: a.price_vs_sma100_15m,
    price_vs_sma100_1d: a.price_vs_sma100_1d,
    distance_to_sma100: a.distance_to_sma100,
    rsi_15m: a.rsi_15m,
    rsi_1d: a.rsi_1d,
    bb_width_15m: a.bb_width_15m,
    rationale_json: {
      last_price: a.last_price,
      price_change_pct: a.price_change_pct,
      volume: a.volume,
      last_updated: a.last_updated,
    },
  }));

  const { error } = await supabase.from('signals').insert(rows);
  if (error) {
    console.warn('[Supabase] Erro ao salvar sinais:', error.message);
  }
};

// ─── Montagem do AssetWithSignal ─────────────────────────────────────────────────

/**
 * Combina a lista de ativos do Supabase com seus últimos sinais
 * em objetos AssetWithSignal prontos para o dashboard.
 */
export const buildAssetsWithSignals = (
  assets: SupabaseAsset[],
  signalMap: Map<string, Record<string, unknown>>
): AssetWithSignal[] =>
  assets.map((asset) => {
    const signal = signalMap.get(asset.id);
    const rationale = (signal?.rationale_json ?? {}) as Record<string, unknown>;

    return {
      id: asset.id,
      ticker: asset.ticker,
      name: asset.name,
      type: asset.type,
      is_active: asset.is_active,
      created_at: asset.created_at,
      updated_at: asset.updated_at,
      last_price: (rationale.last_price as number) ?? 0,
      price_change_pct: (rationale.price_change_pct as number) ?? 0,
      volume: (rationale.volume as number) ?? 0,
      bb_width_15m: (signal?.bb_width_15m as number | null) ?? null,
      is_squeeze: (signal?.is_squeeze as boolean) ?? false,
      price_vs_sma100_15m:
        (signal?.price_vs_sma100_15m as 'above' | 'below') ?? null,
      price_vs_sma100_1d:
        (signal?.price_vs_sma100_1d as 'above' | 'below') ?? null,
      distance_to_sma100: (signal?.distance_to_sma100 as number | null) ?? null,
      rsi_15m: (signal?.rsi_15m as number | null) ?? null,
      rsi_1d: (signal?.rsi_1d as number | null) ?? null,
      signal_side:
        ((signal?.side as 'buy' | 'sell' | 'neutral') ?? 'neutral'),
      confidence: (signal?.confidence as number) ?? 0,
      last_updated:
        (rationale.last_updated as string) ?? asset.updated_at,
    };
  });
