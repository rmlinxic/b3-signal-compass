/**
 * Pool curado das ações mais líquidas da B3.
 * Usado como fallback quando a API de ranking não está disponível,
 * e como lista inicial (seed) antes do primeiro acesso do dia.
 */
export interface PoolStock {
  ticker: string;
  name: string;
  type: 'stock' | 'etf';
}

export const LIQUID_POOL: PoolStock[] = [
  { ticker: 'PETR4', name: 'Petrobras PN', type: 'stock' },
  { ticker: 'VALE3', name: 'Vale ON', type: 'stock' },
  { ticker: 'ITUB4', name: 'Itaú Unibanco PN', type: 'stock' },
  { ticker: 'BBDC4', name: 'Bradesco PN', type: 'stock' },
  { ticker: 'BBAS3', name: 'Banco do Brasil ON', type: 'stock' },
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
  { ticker: 'B3SA3', name: 'B3 ON', type: 'stock' },
];
