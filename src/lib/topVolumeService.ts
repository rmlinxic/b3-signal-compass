import { getSettings } from './localDataStore';

const DAILY_INIT_KEY = 'b3.dailyInit.v2';

export interface MonitoredStock {
  ticker: string;
  name: string;
  type: 'stock' | 'etf';
}

interface DailyInitCache {
  date: string;
  stocks: MonitoredStock[];
}

/** Retorna a data atual no fuso de Brasília (UTC-3), formato YYYY-MM-DD */
const getTodayBRT = (): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(
    new Date()
  );

export const isFirstAccessToday = (): boolean => {
  const stored = localStorage.getItem(DAILY_INIT_KEY);
  if (!stored) return true;
  try {
    const data = JSON.parse(stored) as DailyInitCache;
    return data.date !== getTodayBRT();
  } catch {
    return true;
  }
};

const saveDailyCache = (stocks: MonitoredStock[]): void => {
  const payload: DailyInitCache = { date: getTodayBRT(), stocks };
  localStorage.setItem(DAILY_INIT_KEY, JSON.stringify(payload));
};

export const getCachedDailyStocks = (): MonitoredStock[] | null => {
  const stored = localStorage.getItem(DAILY_INIT_KEY);
  if (!stored) return null;
  try {
    const data = JSON.parse(stored) as DailyInitCache;
    if (data.date !== getTodayBRT()) return null;
    return data.stocks;
  } catch {
    return null;
  }
};

// ─── BRAPI quote/list ──────────────────────────────────────────────────────

interface BrapiListStock {
  stock: string;
  name: string;
  volume?: number;
}
interface BrapiListResponse {
  stocks?: BrapiListStock[];
}

const fetchTop50ByVolumeFromBrapi = async (): Promise<MonitoredStock[]> => {
  const settings = getSettings();
  const token =
    settings.brapiToken ||
    (import.meta.env.VITE_BRAPI_TOKEN as string | undefined);
  if (!token) throw new Error('Token BRAPI não configurado.');

  const url = new URL('https://brapi.dev/api/quote/list');
  url.searchParams.set('token', token);
  url.searchParams.set('sortBy', 'volume');
  url.searchParams.set('sortOrder', 'desc');
  url.searchParams.set('limit', '50');
  url.searchParams.set('type', 'stock');

  const response = await fetch(url.toString());
  if (!response.ok)
    throw new Error(`BRAPI quote/list retornou HTTP ${response.status}`);

  const payload = (await response.json()) as BrapiListResponse;
  const stocks = payload.stocks ?? [];
  if (stocks.length === 0)
    throw new Error('BRAPI quote/list retornou lista vazia.');

  return stocks.slice(0, 50).map((s) => ({
    ticker: s.stock,
    name: s.name || s.stock,
    type: 'stock' as const,
  }));
};

// ─── Pool curado de ações líquidas da B3 (fallback) ──────────────────────────

export const LIQUID_POOL: MonitoredStock[] = [
  { ticker: 'PETR4', name: 'Petrobras PN', type: 'stock' },
  { ticker: 'VALE3', name: 'Vale ON', type: 'stock' },
  { ticker: 'ITUB4', name: 'Itaú Unibanco PN', type: 'stock' },
  { ticker: 'BBDC4', name: 'Bradesco PN', type: 'stock' },
  { ticker: 'ABEV3', name: 'Ambev ON', type: 'stock' },
  { ticker: 'WEGE3', name: 'WEG ON', type: 'stock' },
  { ticker: 'RENT3', name: 'Localiza ON', type: 'stock' },
  { ticker: 'SUZB3', name: 'Suzano ON', type: 'stock' },
  { ticker: 'GGBR4', name: 'Gerdau PN', type: 'stock' },
  { ticker: 'EMBR3', name: 'Embraer ON', type: 'stock' },
  { ticker: 'HAPV3', name: 'Hapvida ON', type: 'stock' },
  { ticker: 'RDOR3', name: "Rede D'Or ON", type: 'stock' },
  { ticker: 'MGLU3', name: 'Magazine Luiza ON', type: 'stock' },
  { ticker: 'VBBR3', name: 'Vibra Energia ON', type: 'stock' },
  { ticker: 'CSAN3', name: 'Cosan ON', type: 'stock' },
  { ticker: 'RAIL3', name: 'Rumo ON', type: 'stock' },
  { ticker: 'ELET3', name: 'Eletrobras ON', type: 'stock' },
  { ticker: 'SBSP3', name: 'Sabesp ON', type: 'stock' },
  { ticker: 'CMIG4', name: 'Cemig PN', type: 'stock' },
  { ticker: 'BBAS3', name: 'Banco do Brasil ON', type: 'stock' },
  { ticker: 'SANB11', name: 'Santander Brasil UNT', type: 'stock' },
  { ticker: 'ITSA4', name: 'Itaúsa PN', type: 'stock' },
  { ticker: 'PRIO3', name: 'PRIO ON', type: 'stock' },
  { ticker: 'BRAV3', name: 'Brava Energia ON', type: 'stock' },
  { ticker: 'UGPA3', name: 'Ultrapar ON', type: 'stock' },
  { ticker: 'LREN3', name: 'Lojas Renner ON', type: 'stock' },
  { ticker: 'VIVT3', name: 'Telefônica Brasil ON', type: 'stock' },
  { ticker: 'KLBN11', name: 'Klabin UNT', type: 'stock' },
  { ticker: 'RADL3', name: 'Raia Drogasil ON', type: 'stock' },
  { ticker: 'JBSS3', name: 'JBS ON', type: 'stock' },
  { ticker: 'BRFS3', name: 'BRF ON', type: 'stock' },
  { ticker: 'MRFG3', name: 'Marfrig ON', type: 'stock' },
  { ticker: 'USIM5', name: 'Usiminas PNA', type: 'stock' },
  { ticker: 'CSNA3', name: 'CSN ON', type: 'stock' },
  { ticker: 'BPAC11', name: 'BTG Pactual UNT', type: 'stock' },
  { ticker: 'ASAI3', name: 'Assaí ON', type: 'stock' },
  { ticker: 'CRFB3', name: 'Carrefour Brasil ON', type: 'stock' },
  { ticker: 'AZUL4', name: 'Azul PN', type: 'stock' },
  { ticker: 'GOLL4', name: 'Gol PN', type: 'stock' },
  { ticker: 'TIMS3', name: 'TIM ON', type: 'stock' },
  { ticker: 'TOTVS3', name: 'TOTVS ON', type: 'stock' },
  { ticker: 'EGIE3', name: 'Engie Brasil ON', type: 'stock' },
  { ticker: 'TAEE11', name: 'Taesa UNT', type: 'stock' },
  { ticker: 'HYPE3', name: 'Hypera ON', type: 'stock' },
  { ticker: 'COGN3', name: 'Cogna Educação ON', type: 'stock' },
  { ticker: 'YDUQ3', name: 'Yduqs ON', type: 'stock' },
  { ticker: 'MRVE3', name: 'MRV ON', type: 'stock' },
  { ticker: 'CYRE3', name: 'Cyrela Realty ON', type: 'stock' },
  { ticker: 'NTCO3', name: 'Grupo Natura ON', type: 'stock' },
  { ticker: 'RAIZ4', name: 'Raízen PN', type: 'stock' },
];

// ─── Entry point público ──────────────────────────────────────────────────────

/**
 * Busca o ranking top 50 por volume do dia:
 * 1. Tenta BRAPI quote/list (dados do dia anterior, ordenados por volume)
 * 2. Fallback: pool curado das ações mais líquidas da B3
 *
 * Salva em localStorage com a data atual (fuso BRT) para evitar
 * chamadas repetidas no mesmo dia.
 */
export const fetchDailyTop50 = async (): Promise<MonitoredStock[]> => {
  try {
    const result = await fetchTop50ByVolumeFromBrapi();
    saveDailyCache(result);
    console.info(
      `[DailyInit] Top 50 por volume obtidos via BRAPI (${getTodayBRT()})`
    );
    return result;
  } catch (err) {
    console.warn(
      '[DailyInit] BRAPI quote/list falhou, usando pool curado:',
      err
    );
    const fallback = LIQUID_POOL.slice(0, 50);
    saveDailyCache(fallback);
    return fallback;
  }
};
