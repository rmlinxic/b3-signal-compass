import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Database,
  Upload,
  Plus,
  Trash2,
  Download,
  RefreshCw,
  Check,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  addAsset,
  removeAsset,
  refreshSingleAsset,
  importAssets,
  seedTopAssets,
  getDashboardAssets,
} from '@/lib/localDataStore';
import { fetchYahooQuote } from '@/lib/yahooFinanceClient';
import { cn } from '@/lib/utils';
import type { AssetWithSignal } from '@/types/market';

type ValidationStatus = 'idle' | 'loading' | 'valid' | 'invalid';

interface QuotePreview {
  price: number;
  changePct: number;
  suggestedName: string;
}

// ---------------------------------------------------------------------------
// Signal badge
// ---------------------------------------------------------------------------
const SignalDot = ({ side }: { side: AssetWithSignal['signal_side'] }) => {
  if (side === 'buy')
    return (
      <span className="flex items-center gap-1 text-signal-buy text-xs font-medium">
        <TrendingUp className="h-3 w-3" /> Compra
      </span>
    );
  if (side === 'sell')
    return (
      <span className="flex items-center gap-1 text-signal-sell text-xs font-medium">
        <TrendingDown className="h-3 w-3" /> Venda
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-muted-foreground text-xs">
      <Minus className="h-3 w-3" /> Neutro
    </span>
  );
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const Admin = () => {
  // ---- Form: single asset ----
  const [tickerInput, setTickerInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [typeInput, setTypeInput] = useState<'stock' | 'etf'>('stock');
  const [validStatus, setValidStatus] = useState<ValidationStatus>('idle');
  const [quotePreview, setQuotePreview] = useState<QuotePreview | null>(null);
  const [validError, setValidError] = useState('');
  const [loadingRefresh, setLoadingRefresh] = useState<string | null>(null);

  // ---- Asset list ----
  const [assets, setAssets] = useState<AssetWithSignal[]>(getDashboardAssets);
  const [search, setSearch] = useState('');

  // ---- Bulk import ----
  const [bulkInput, setBulkInput] = useState('');
  const [showBulk, setShowBulk] = useState(false);

  // ---- Seed ----
  const [isSeeding, setIsSeeding] = useState(false);
  const [seeded, setSeeded] = useState(false);

  // ---------------------------------------------------------------------------
  // Validate ticker against Yahoo Finance
  // ---------------------------------------------------------------------------
  const handleValidate = async () => {
    const t = tickerInput.trim().toUpperCase();
    if (!t) {
      toast.error('Digite um ticker antes de verificar');
      return;
    }
    if (assets.some((a) => a.ticker === t)) {
      toast.error(`${t} ja esta na lista de monitoramento`);
      return;
    }

    setValidStatus('loading');
    setQuotePreview(null);
    setValidError('');

    try {
      const quote = await fetchYahooQuote(t);
      const suggestedName = quote.longName ?? quote.shortName ?? t;
      setQuotePreview({
        price: quote.regularMarketPrice ?? 0,
        changePct: quote.regularMarketChangePercent ?? 0,
        suggestedName,
      });
      // Auto-fill name only if the field is empty
      if (!nameInput) setNameInput(suggestedName);
      setValidStatus('valid');
    } catch (err) {
      setValidStatus('invalid');
      setValidError(
        err instanceof Error
          ? err.message
          : 'Ticker nao encontrado no Yahoo Finance'
      );
    }
  };

  // ---------------------------------------------------------------------------
  // Add asset + immediate background refresh
  // ---------------------------------------------------------------------------
  const handleAdd = async () => {
    const t = tickerInput.trim().toUpperCase();
    if (!t || !nameInput.trim() || validStatus !== 'valid') return;

    const updated = addAsset(t, nameInput.trim(), typeInput);
    setAssets(updated);

    toast.success(`${t} adicionado! Buscando indicadores...`);

    // Reset form
    setTickerInput('');
    setNameInput('');
    setValidStatus('idle');
    setQuotePreview(null);

    // Background: compute indicators for this asset only
    setLoadingRefresh(t);
    refreshSingleAsset(t)
      .then((next) => {
        setAssets(next);
        toast.success(`Indicadores de ${t} calculados!`);
      })
      .catch((err) => {
        console.warn('[refreshSingleAsset]', err);
        toast.error(`Erro ao buscar indicadores de ${t}`);
      })
      .finally(() => setLoadingRefresh(null));
  };

  // ---------------------------------------------------------------------------
  // Delete asset
  // ---------------------------------------------------------------------------
  const handleDelete = (ticker: string) => {
    const updated = removeAsset(ticker);
    setAssets(updated);
    toast.success(`${ticker} removido da lista de monitoramento`);
  };

  // ---------------------------------------------------------------------------
  // Bulk import
  // ---------------------------------------------------------------------------
  const handleBulkImport = () => {
    const lines = bulkInput.trim().split('\n').filter((l) => l.trim());
    if (lines.length === 0) {
      toast.error('Cole os tickers no formato: TICKER;NOME;TIPO');
      return;
    }
    const parsed = lines
      .map((line) => {
        const [ticker, name, type] = line.split(';').map((s) => s.trim());
        if (ticker && name && (type === 'stock' || type === 'etf'))
          return { ticker, name, type } as {
            ticker: string;
            name: string;
            type: 'stock' | 'etf';
          };
        return null;
      })
      .filter(Boolean) as Array<{
      ticker: string;
      name: string;
      type: 'stock' | 'etf';
    }>;

    if (parsed.length === 0) {
      toast.error(
        'Nenhuma linha valida. Use o formato: TICKER;NOME;stock|etf'
      );
      return;
    }

    const updated = importAssets(parsed);
    setAssets(updated);
    toast.success(`${parsed.length} ativos importados com sucesso!`);
    setBulkInput('');
    setShowBulk(false);
  };

  const handleExportTemplate = () => {
    const template =
      'TICKER;NOME;TIPO\nPETR4;Petrobras PN;stock\nBOVA11;iShares Ibovespa;etf';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_ativos.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---------------------------------------------------------------------------
  // Seed
  // ---------------------------------------------------------------------------
  const handleSeed = async () => {
    setIsSeeding(true);
    await new Promise((r) => setTimeout(r, 600));
    const updated = seedTopAssets();
    setAssets(updated);
    setIsSeeding(false);
    setSeeded(true);
    toast.success('Lista padrao restaurada com sucesso!');
  };

  // ---------------------------------------------------------------------------
  // Filtered list
  // ---------------------------------------------------------------------------
  const q = search.trim().toUpperCase();
  const filtered = assets.filter(
    (a) =>
      !q ||
      a.ticker.includes(q) ||
      a.name.toUpperCase().includes(q)
  );

  const stockCount = assets.filter((a) => a.type === 'stock').length;
  const etfCount = assets.filter((a) => a.type === 'etf').length;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <MainLayout>
      <div className="space-y-6 animate-slide-up max-w-5xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            Gerenciar Ativos
          </h1>
          <p className="text-sm text-muted-foreground">
            Adicione, remova e gerencie os ativos monitorados
          </p>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Adicionar ativo com validacao Yahoo Finance                          */}
        {/* ------------------------------------------------------------------ */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Adicionar Ativo
            </CardTitle>
            <CardDescription>
              O ticker e verificado em tempo real no Yahoo Finance antes de ser
              adicionado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Ticker + Verificar */}
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Label htmlFor="ticker">Ticker B3</Label>
                <Input
                  id="ticker"
                  placeholder="Ex: WEGE3"
                  value={tickerInput}
                  onChange={(e) => {
                    setTickerInput(e.target.value.toUpperCase());
                    setValidStatus('idle');
                    setQuotePreview(null);
                    setValidError('');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleValidate()}
                  className="font-mono"
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={handleValidate}
                  disabled={validStatus === 'loading' || !tickerInput.trim()}
                  className="min-w-[110px]"
                >
                  {validStatus === 'loading' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    'Verificar'
                  )}
                </Button>
              </div>
            </div>

            {/* Preview apos validacao */}
            {validStatus === 'valid' && quotePreview && (
              <div className="rounded-md border border-signal-buy/30 bg-signal-buy/5 p-3 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-signal-buy shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-signal-buy">
                    {tickerInput} verificado
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {quotePreview.suggestedName}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-mono font-bold">
                    R$ {quotePreview.price.toFixed(2)}
                  </p>
                  <p
                    className={cn(
                      'text-xs font-mono',
                      quotePreview.changePct >= 0
                        ? 'text-signal-buy'
                        : 'text-signal-sell'
                    )}
                  >
                    {quotePreview.changePct >= 0 ? '+' : ''}
                    {quotePreview.changePct.toFixed(2)}%
                  </p>
                </div>
              </div>
            )}

            {validStatus === 'invalid' && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 flex items-center gap-3">
                <XCircle className="h-5 w-5 text-destructive shrink-0" />
                <p className="text-sm text-destructive">{validError}</p>
              </div>
            )}

            {/* Nome (editavel, auto-preenchido) */}
            <div className="space-y-1">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                placeholder="Ex: WEG S.A."
                value={nameInput}
                onChange={(e) =>
                  setNameInput(e.target.value)
                }
                disabled={validStatus !== 'valid'}
              />
              {validStatus === 'valid' && (
                <p className="text-[11px] text-muted-foreground">
                  Nome sugerido pelo Yahoo Finance. Edite se necessario.
                </p>
              )}
            </div>

            {/* Tipo */}
            <div className="space-y-1">
              <Label>Tipo</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={typeInput === 'stock' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTypeInput('stock')}
                >
                  Acao
                </Button>
                <Button
                  type="button"
                  variant={typeInput === 'etf' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTypeInput('etf')}
                >
                  ETF
                </Button>
              </div>
            </div>

            {/* Adicionar */}
            <Button
              className="w-full"
              disabled={
                validStatus !== 'valid' ||
                !nameInput.trim() ||
                loadingRefresh !== null
              }
              onClick={handleAdd}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar ao Dashboard
            </Button>
          </CardContent>
        </Card>

        {/* ------------------------------------------------------------------ */}
        {/* Lista completa de ativos                                             */}
        {/* ------------------------------------------------------------------ */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle>Ativos Monitorados</CardTitle>
                <CardDescription>
                  {assets.length} ativos &mdash; {stockCount} acoes &bull; {etfCount} ETFs
                </CardDescription>
              </div>
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar ticker ou nome..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="rounded-b-lg overflow-hidden">
              <div className="max-h-[480px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead className="w-[90px]">Ticker</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead className="w-[50px] text-center">Tipo</TableHead>
                      <TableHead className="w-[90px] text-right">Preco</TableHead>
                      <TableHead className="w-[70px] text-right">Var.</TableHead>
                      <TableHead className="w-[80px] text-center">Sinal</TableHead>
                      <TableHead className="w-[60px] text-right">RSI(D)</TableHead>
                      <TableHead className="w-[44px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center text-muted-foreground py-8 text-sm"
                        >
                          {search ? 'Nenhum ativo encontrado' : 'Lista vazia'}
                        </TableCell>
                      </TableRow>
                    )}
                    {filtered.map((a) => (
                      <TableRow key={a.ticker} className="group">
                        <TableCell className="font-mono font-semibold text-primary">
                          {a.ticker}
                          {loadingRefresh === a.ticker && (
                            <Loader2 className="inline ml-1 h-3 w-3 animate-spin text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground truncate max-w-[160px]">
                          {a.name}
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={cn(
                              'text-[10px] px-1.5 py-0.5 rounded uppercase font-medium',
                              a.type === 'stock'
                                ? 'bg-primary/15 text-primary'
                                : 'bg-accent/15 text-accent'
                            )}
                          >
                            {a.type === 'stock' ? 'Acao' : 'ETF'}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-right text-sm">
                          {a.last_price > 0
                            ? `R$ ${a.last_price.toFixed(2)}`
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell
                          className={cn(
                            'font-mono text-right text-sm',
                            a.price_change_pct > 0
                              ? 'text-signal-buy'
                              : a.price_change_pct < 0
                              ? 'text-signal-sell'
                              : 'text-muted-foreground'
                          )}
                        >
                          {a.last_price > 0
                            ? `${a.price_change_pct >= 0 ? '+' : ''}${a.price_change_pct.toFixed(2)}%`
                            : '—'}
                        </TableCell>
                        <TableCell className="text-center">
                          <SignalDot side={a.signal_side} />
                        </TableCell>
                        <TableCell
                          className={cn(
                            'font-mono text-right text-sm',
                            (a.rsi_1d ?? 50) > 60 && 'text-signal-sell',
                            (a.rsi_1d ?? 50) < 45 && 'text-signal-buy'
                          )}
                        >
                          {a.rsi_1d != null ? a.rsi_1d.toFixed(1) : '—'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(a.ticker)}
                            title={`Remover ${a.ticker}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ------------------------------------------------------------------ */}
        {/* Acoes de manutencao                                                  */}
        {/* ------------------------------------------------------------------ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Importacao em lote */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Importacao em Lote
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setShowBulk((v) => !v)}
                >
                  {showBulk ? 'Fechar' : 'Expandir'}
                </Button>
              </div>
              <CardDescription className="text-xs">
                Cole uma lista no formato TICKER;NOME;TIPO
              </CardDescription>
            </CardHeader>
            {showBulk && (
              <CardContent className="space-y-3">
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleExportTemplate}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Baixar Template
                  </Button>
                </div>
                <Textarea
                  placeholder="PETR4;Petrobras PN;stock&#10;BOVA11;iShares Ibovespa;etf"
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  className="font-mono text-sm h-[120px]"
                />
                <Button onClick={handleBulkImport} className="w-full" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Importar
                </Button>
              </CardContent>
            )}
          </Card>

          {/* Restaurar lista padrao */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                Restaurar Lista Padrao
              </CardTitle>
              <CardDescription className="text-xs">
                Substitui a lista atual pelos ativos do LIQUID_POOL (top B3 por
                volume)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={handleSeed}
                disabled={isSeeding || seeded}
                className="w-full"
              >
                {isSeeding ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Restaurando...
                  </>
                ) : seeded ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Restaurado
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Restaurar Lista
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Admin;
