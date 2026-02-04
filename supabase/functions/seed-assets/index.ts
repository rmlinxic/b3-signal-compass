import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Top 50 stocks by volume on B3
const TOP_STOCKS = [
  { ticker: 'PETR4', name: 'Petrobras PN' },
  { ticker: 'VALE3', name: 'Vale ON' },
  { ticker: 'ITUB4', name: 'Itaú Unibanco PN' },
  { ticker: 'BBDC4', name: 'Bradesco PN' },
  { ticker: 'PETR3', name: 'Petrobras ON' },
  { ticker: 'BBAS3', name: 'Banco do Brasil ON' },
  { ticker: 'B3SA3', name: 'B3 ON' },
  { ticker: 'ABEV3', name: 'Ambev ON' },
  { ticker: 'WEGE3', name: 'WEG ON' },
  { ticker: 'RENT3', name: 'Localiza ON' },
  { ticker: 'MGLU3', name: 'Magazine Luiza ON' },
  { ticker: 'SUZB3', name: 'Suzano ON' },
  { ticker: 'GGBR4', name: 'Gerdau PN' },
  { ticker: 'CSNA3', name: 'CSN ON' },
  { ticker: 'JBSS3', name: 'JBS ON' },
  { ticker: 'LREN3', name: 'Lojas Renner ON' },
  { ticker: 'RADL3', name: 'Raia Drogasil ON' },
  { ticker: 'RAIL3', name: 'Rumo ON' },
  { ticker: 'VIVT3', name: 'Telefônica Brasil ON' },
  { ticker: 'CMIG4', name: 'Cemig PN' },
  { ticker: 'ELET3', name: 'Eletrobras ON' },
  { ticker: 'ELET6', name: 'Eletrobras PNB' },
  { ticker: 'BPAC11', name: 'BTG Pactual UNT' },
  { ticker: 'SBSP3', name: 'Sabesp ON' },
  { ticker: 'HAPV3', name: 'Hapvida ON' },
  { ticker: 'EQTL3', name: 'Equatorial ON' },
  { ticker: 'CSAN3', name: 'Cosan ON' },
  { ticker: 'TOTS3', name: 'TOTVS ON' },
  { ticker: 'KLBN11', name: 'Klabin UNT' },
  { ticker: 'EMBR3', name: 'Embraer ON' },
  { ticker: 'UGPA3', name: 'Ultrapar ON' },
  { ticker: 'PRIO3', name: 'PetroRio ON' },
  { ticker: 'BRFS3', name: 'BRF ON' },
  { ticker: 'ENEV3', name: 'Eneva ON' },
  { ticker: 'CCRO3', name: 'CCR ON' },
  { ticker: 'CPLE6', name: 'Copel PNB' },
  { ticker: 'SANB11', name: 'Santander UNT' },
  { ticker: 'ITSA4', name: 'Itaúsa PN' },
  { ticker: 'VBBR3', name: 'Vibra Energia ON' },
  { ticker: 'NTCO3', name: 'Natura ON' },
  { ticker: 'ASAI3', name: 'Assaí ON' },
  { ticker: 'CYRE3', name: 'Cyrela ON' },
  { ticker: 'MRVE3', name: 'MRV ON' },
  { ticker: 'HYPE3', name: 'Hypera ON' },
  { ticker: 'BEEF3', name: 'Minerva ON' },
  { ticker: 'AZUL4', name: 'Azul PN' },
  { ticker: 'GOLL4', name: 'Gol PN' },
  { ticker: 'COGN3', name: 'Cogna ON' },
  { ticker: 'YDUQ3', name: 'Yduqs ON' },
  { ticker: 'QUAL3', name: 'Qualicorp ON' },
];

// Top 50 ETFs by volume on B3
const TOP_ETFS = [
  { ticker: 'BOVA11', name: 'iShares Ibovespa' },
  { ticker: 'IVVB11', name: 'iShares S&P 500' },
  { ticker: 'SMAL11', name: 'iShares Small Cap' },
  { ticker: 'HASH11', name: 'Hashdex Nasdaq Crypto' },
  { ticker: 'XFIX11', name: 'XP Índice Fundos Imobiliários' },
  { ticker: 'DIVO11', name: 'It Now IDIV' },
  { ticker: 'NASD11', name: 'Trend ETF Nasdaq 100' },
  { ticker: 'QBTC11', name: 'QR CME Bitcoin' },
  { ticker: 'ETHE11', name: 'Hashdex Ethereum' },
  { ticker: 'SPXI11', name: 'It Now S&P 500 TRN' },
  { ticker: 'GOLD11', name: 'Trend ETF LBMA Gold' },
  { ticker: 'TECK11', name: 'It Now NYSE FANG+' },
  { ticker: 'BOVV11', name: 'It Now Ibovespa' },
  { ticker: 'XINA11', name: 'Trend ETF China' },
  { ticker: 'BBSD11', name: 'BB ETF S&P Dividendos' },
  { ticker: 'PIBB11', name: 'It Now PIB Brasil' },
  { ticker: 'ECOO11', name: 'It Now ICO2' },
  { ticker: 'SMAC11', name: 'It Now Small Cap' },
  { ticker: 'MATB11', name: 'It Now IMAT' },
  { ticker: 'FIND11', name: 'It Now IFNC' },
  { ticker: 'GOVE11', name: 'It Now IGCT' },
  { ticker: 'ISUS11', name: 'It Now ISE' },
  { ticker: 'UTEC11', name: 'It Now UTIL' },
  { ticker: 'IMAB11', name: 'It Now IMA-B' },
  { ticker: 'IRFM11', name: 'It Now IRF-M P2' },
  { ticker: 'FIXA11', name: 'Mirae Asset Renda Fixa' },
  { ticker: 'B5P211', name: 'It Now IMA-B5 P2' },
  { ticker: 'EURP11', name: 'Trend ETF MSCI Europa' },
  { ticker: 'ACWI11', name: 'Trend ETF MSCI ACWI' },
  { ticker: 'WRLD11', name: 'Investo FTSE Global' },
  { ticker: 'USDB11', name: 'BTG Dólar' },
  { ticker: '5GTK11', name: 'Trend ETF 5G Tech' },
  { ticker: 'SHOT11', name: 'It Now NYSE FANG+ Alavancado' },
  { ticker: 'NDIV11', name: 'Trend ETF NASDAQ Dividendos' },
  { ticker: 'DNAI11', name: 'It Now DNA' },
  { ticker: 'TRIG11', name: 'Trend ETF Agribusiness' },
  { ticker: 'FOOD11', name: 'Trend ETF Food' },
  { ticker: 'DRIV11', name: 'It Now EV & Battery' },
  { ticker: 'JOGO11', name: 'It Now Gaming' },
  { ticker: 'MILL11', name: 'Trend ETF Millennium' },
  { ticker: 'GENB11', name: 'Trend ETF Genomics' },
  { ticker: 'BLOK11', name: 'Investo Blockchain' },
  { ticker: 'META11', name: 'Trend ETF Metaverse' },
  { ticker: 'REVE11', name: 'It Now Real Estate' },
  { ticker: 'BITH11', name: 'Hashdex Bitcoin' },
  { ticker: 'DEFI11', name: 'Hashdex DeFi' },
  { ticker: 'WEB311', name: 'Hashdex Web3' },
  { ticker: 'QDFI11', name: 'QR DeFi' },
  { ticker: 'CRPT11', name: 'Empiricus Crypto' },
  { ticker: 'NFTS11', name: 'Investo NFT' },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Insert all stocks
    const stocksToInsert = TOP_STOCKS.map(s => ({
      ticker: s.ticker,
      name: s.name,
      type: 'stock' as const,
      is_active: true,
    }));
    
    const { error: stocksError } = await supabase
      .from('assets')
      .upsert(stocksToInsert, { onConflict: 'ticker' });
    
    if (stocksError) {
      throw new Error(`Error inserting stocks: ${stocksError.message}`);
    }
    
    // Insert all ETFs
    const etfsToInsert = TOP_ETFS.map(e => ({
      ticker: e.ticker,
      name: e.name,
      type: 'etf' as const,
      is_active: true,
    }));
    
    const { error: etfsError } = await supabase
      .from('assets')
      .upsert(etfsToInsert, { onConflict: 'ticker' });
    
    if (etfsError) {
      throw new Error(`Error inserting ETFs: ${etfsError.message}`);
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Seed completed successfully',
        stocks_inserted: TOP_STOCKS.length,
        etfs_inserted: TOP_ETFS.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: unknown) {
    console.error('Error in seed-assets function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
