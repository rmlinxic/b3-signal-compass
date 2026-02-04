import { AssetWithSignal, Asset, Bar, SignalSide } from '@/types/market';

// Top 50 ações mais negociadas na B3 (exemplo)
export const topStocks: Omit<Asset, 'id' | 'created_at' | 'updated_at'>[] = [
  { ticker: 'PETR4', name: 'Petrobras PN', type: 'stock', is_active: true },
  { ticker: 'VALE3', name: 'Vale ON', type: 'stock', is_active: true },
  { ticker: 'ITUB4', name: 'Itaú Unibanco PN', type: 'stock', is_active: true },
  { ticker: 'BBDC4', name: 'Bradesco PN', type: 'stock', is_active: true },
  { ticker: 'PETR3', name: 'Petrobras ON', type: 'stock', is_active: true },
  { ticker: 'BBAS3', name: 'Banco do Brasil ON', type: 'stock', is_active: true },
  { ticker: 'B3SA3', name: 'B3 ON', type: 'stock', is_active: true },
  { ticker: 'ABEV3', name: 'Ambev ON', type: 'stock', is_active: true },
  { ticker: 'WEGE3', name: 'WEG ON', type: 'stock', is_active: true },
  { ticker: 'RENT3', name: 'Localiza ON', type: 'stock', is_active: true },
  { ticker: 'MGLU3', name: 'Magazine Luiza ON', type: 'stock', is_active: true },
  { ticker: 'SUZB3', name: 'Suzano ON', type: 'stock', is_active: true },
  { ticker: 'GGBR4', name: 'Gerdau PN', type: 'stock', is_active: true },
  { ticker: 'CSNA3', name: 'CSN ON', type: 'stock', is_active: true },
  { ticker: 'JBSS3', name: 'JBS ON', type: 'stock', is_active: true },
  { ticker: 'LREN3', name: 'Lojas Renner ON', type: 'stock', is_active: true },
  { ticker: 'RADL3', name: 'Raia Drogasil ON', type: 'stock', is_active: true },
  { ticker: 'RAIL3', name: 'Rumo ON', type: 'stock', is_active: true },
  { ticker: 'VIVT3', name: 'Telefônica Brasil ON', type: 'stock', is_active: true },
  { ticker: 'CMIG4', name: 'Cemig PN', type: 'stock', is_active: true },
  { ticker: 'ELET3', name: 'Eletrobras ON', type: 'stock', is_active: true },
  { ticker: 'ELET6', name: 'Eletrobras PNB', type: 'stock', is_active: true },
  { ticker: 'BPAC11', name: 'BTG Pactual UNT', type: 'stock', is_active: true },
  { ticker: 'SBSP3', name: 'Sabesp ON', type: 'stock', is_active: true },
  { ticker: 'HAPV3', name: 'Hapvida ON', type: 'stock', is_active: true },
  { ticker: 'EQTL3', name: 'Equatorial ON', type: 'stock', is_active: true },
  { ticker: 'CSAN3', name: 'Cosan ON', type: 'stock', is_active: true },
  { ticker: 'TOTS3', name: 'TOTVS ON', type: 'stock', is_active: true },
  { ticker: 'KLBN11', name: 'Klabin UNT', type: 'stock', is_active: true },
  { ticker: 'EMBR3', name: 'Embraer ON', type: 'stock', is_active: true },
  { ticker: 'UGPA3', name: 'Ultrapar ON', type: 'stock', is_active: true },
  { ticker: 'PRIO3', name: 'PetroRio ON', type: 'stock', is_active: true },
  { ticker: 'BRFS3', name: 'BRF ON', type: 'stock', is_active: true },
  { ticker: 'ENEV3', name: 'Eneva ON', type: 'stock', is_active: true },
  { ticker: 'CCRO3', name: 'CCR ON', type: 'stock', is_active: true },
  { ticker: 'CPLE6', name: 'Copel PNB', type: 'stock', is_active: true },
  { ticker: 'SANB11', name: 'Santander UNT', type: 'stock', is_active: true },
  { ticker: 'ITSA4', name: 'Itaúsa PN', type: 'stock', is_active: true },
  { ticker: 'VBBR3', name: 'Vibra Energia ON', type: 'stock', is_active: true },
  { ticker: 'NTCO3', name: 'Natura ON', type: 'stock', is_active: true },
  { ticker: 'ASAI3', name: 'Assaí ON', type: 'stock', is_active: true },
  { ticker: 'CYRE3', name: 'Cyrela ON', type: 'stock', is_active: true },
  { ticker: 'MRVE3', name: 'MRV ON', type: 'stock', is_active: true },
  { ticker: 'HYPE3', name: 'Hypera ON', type: 'stock', is_active: true },
  { ticker: 'BEEF3', name: 'Minerva ON', type: 'stock', is_active: true },
  { ticker: 'AZUL4', name: 'Azul PN', type: 'stock', is_active: true },
  { ticker: 'GOLL4', name: 'Gol PN', type: 'stock', is_active: true },
  { ticker: 'COGN3', name: 'Cogna ON', type: 'stock', is_active: true },
  { ticker: 'YDUQ3', name: 'Yduqs ON', type: 'stock', is_active: true },
  { ticker: 'QUAL3', name: 'Qualicorp ON', type: 'stock', is_active: true },
];

// Top 50 ETFs mais negociados na B3
export const topETFs: Omit<Asset, 'id' | 'created_at' | 'updated_at'>[] = [
  { ticker: 'BOVA11', name: 'iShares Ibovespa', type: 'etf', is_active: true },
  { ticker: 'IVVB11', name: 'iShares S&P 500', type: 'etf', is_active: true },
  { ticker: 'SMAL11', name: 'iShares Small Cap', type: 'etf', is_active: true },
  { ticker: 'HASH11', name: 'Hashdex Nasdaq Crypto', type: 'etf', is_active: true },
  { ticker: 'XFIX11', name: 'XP Índice Fundos Imobiliários', type: 'etf', is_active: true },
  { ticker: 'DIVO11', name: 'It Now IDIV', type: 'etf', is_active: true },
  { ticker: 'NASD11', name: 'Trend ETF Nasdaq 100', type: 'etf', is_active: true },
  { ticker: 'QBTC11', name: 'QR CME Bitcoin', type: 'etf', is_active: true },
  { ticker: 'ETHE11', name: 'Hashdex Ethereum', type: 'etf', is_active: true },
  { ticker: 'SPXI11', name: 'It Now S&P 500 TRN', type: 'etf', is_active: true },
  { ticker: 'GOLD11', name: 'Trend ETF LBMA Gold', type: 'etf', is_active: true },
  { ticker: 'TECK11', name: 'It Now NYSE FANG+', type: 'etf', is_active: true },
  { ticker: 'BOVV11', name: 'It Now Ibovespa', type: 'etf', is_active: true },
  { ticker: 'XINA11', name: 'Trend ETF China', type: 'etf', is_active: true },
  { ticker: 'BBSD11', name: 'BB ETF S&P Dividendos', type: 'etf', is_active: true },
  { ticker: 'PIBB11', name: 'It Now PIB Brasil', type: 'etf', is_active: true },
  { ticker: 'ECOO11', name: 'It Now ICO2', type: 'etf', is_active: true },
  { ticker: 'SMAC11', name: 'It Now Small Cap', type: 'etf', is_active: true },
  { ticker: 'MATB11', name: 'It Now IMAT', type: 'etf', is_active: true },
  { ticker: 'FIND11', name: 'It Now IFNC', type: 'etf', is_active: true },
  { ticker: 'GOVE11', name: 'It Now IGCT', type: 'etf', is_active: true },
  { ticker: 'ISUS11', name: 'It Now ISE', type: 'etf', is_active: true },
  { ticker: 'UTEC11', name: 'It Now UTIL', type: 'etf', is_active: true },
  { ticker: 'IMAB11', name: 'It Now IMA-B', type: 'etf', is_active: true },
  { ticker: 'IRFM11', name: 'It Now IRF-M P2', type: 'etf', is_active: true },
  { ticker: 'FIXA11', name: 'Mirae Asset Renda Fixa', type: 'etf', is_active: true },
  { ticker: 'B5P211', name: 'It Now IMA-B5 P2', type: 'etf', is_active: true },
  { ticker: 'EURP11', name: 'Trend ETF MSCI Europa', type: 'etf', is_active: true },
  { ticker: 'ACWI11', name: 'Trend ETF MSCI ACWI', type: 'etf', is_active: true },
  { ticker: 'WRLD11', name: 'Investo FTSE Global', type: 'etf', is_active: true },
  { ticker: 'USDB11', name: 'BTG Dólar', type: 'etf', is_active: true },
  { ticker: '5GTK11', name: 'Trend ETF 5G Tech', type: 'etf', is_active: true },
  { ticker: 'SHOT11', name: 'It Now NYSE FANG+ Alavancado', type: 'etf', is_active: true },
  { ticker: 'NDIV11', name: 'Trend ETF NASDAQ Dividendos', type: 'etf', is_active: true },
  { ticker: 'DNAI11', name: 'It Now DNA', type: 'etf', is_active: true },
  { ticker: 'TRIG11', name: 'Trend ETF Agribusiness', type: 'etf', is_active: true },
  { ticker: 'FOOD11', name: 'Trend ETF Food', type: 'etf', is_active: true },
  { ticker: 'DRIV11', name: 'It Now EV & Battery', type: 'etf', is_active: true },
  { ticker: 'JOGO11', name: 'It Now Gaming', type: 'etf', is_active: true },
  { ticker: 'MILL11', name: 'Trend ETF Millennium', type: 'etf', is_active: true },
  { ticker: 'GENB11', name: 'Trend ETF Genomics', type: 'etf', is_active: true },
  { ticker: 'BLOK11', name: 'Investo Blockchain', type: 'etf', is_active: true },
  { ticker: 'META11', name: 'Trend ETF Metaverse', type: 'etf', is_active: true },
  { ticker: 'REVE11', name: 'It Now Real Estate', type: 'etf', is_active: true },
  { ticker: 'BITH11', name: 'Hashdex Bitcoin', type: 'etf', is_active: true },
  { ticker: 'DEFI11', name: 'Hashdex DeFi', type: 'etf', is_active: true },
  { ticker: 'WEB311', name: 'Hashdex Web3', type: 'etf', is_active: true },
  { ticker: 'QDFI11', name: 'QR DeFi', type: 'etf', is_active: true },
  { ticker: 'CRPT11', name: 'Empiricus Crypto', type: 'etf', is_active: true },
  { ticker: 'NFTS11', name: 'Investo NFT', type: 'etf', is_active: true },
];

// Função para gerar dados mock
function generateMockAssetWithSignal(
  asset: Omit<Asset, 'id' | 'created_at' | 'updated_at'>,
  index: number
): AssetWithSignal {
  const basePrice = 10 + Math.random() * 90;
  const priceChange = (Math.random() - 0.5) * 10;
  const volume = Math.floor(Math.random() * 50000000) + 1000000;
  const bbWidth = Math.random() * 0.15;
  const isSqueeze = bbWidth < 0.05;
  const rsi15m = 20 + Math.random() * 60;
  const rsi1d = 25 + Math.random() * 50;
  const distanceToSma = (Math.random() - 0.5) * 10;
  
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

  return {
    id: `mock-${index}`,
    ticker: asset.ticker,
    name: asset.name,
    type: asset.type,
    is_active: asset.is_active,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
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
    signal_side: signalSide,
    confidence,
    last_updated: new Date().toISOString(),
  };
}

export const generateMockDashboardData = (): AssetWithSignal[] => {
  const stocks = topStocks.map((s, i) => generateMockAssetWithSignal(s, i));
  const etfs = topETFs.map((e, i) => generateMockAssetWithSignal(e, i + 50));
  return [...stocks, ...etfs];
};

// Generate mock candle data
export const generateMockBars = (assetId: string, timeframe: '15m' | '1d', count: number = 100): Bar[] => {
  const bars: Bar[] = [];
  const now = new Date();
  const intervalMs = timeframe === '15m' ? 15 * 60 * 1000 : 24 * 60 * 60 * 1000;
  let basePrice = 30 + Math.random() * 70;

  for (let i = count - 1; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * intervalMs);
    const volatility = 0.02 + Math.random() * 0.03;
    const change = (Math.random() - 0.5) * volatility * basePrice;
    const open = basePrice;
    const close = basePrice + change;
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    const volume = Math.floor(Math.random() * 1000000) + 100000;

    bars.push({
      id: `bar-${i}`,
      asset_id: assetId,
      timeframe,
      timestamp: timestamp.toISOString(),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume,
      created_at: timestamp.toISOString(),
    });

    basePrice = close;
  }

  return bars;
};
