import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { topStocks, topETFs } from '@/lib/mockData';
import {
  addAsset,
  importAssets,
  seedTopAssets,
  getDashboardAssets,
} from '@/lib/localDataStore';

interface AssetInput {
  ticker: string;
  name: string;
  type: 'stock' | 'etf';
}

const Admin = () => {
  const [newAsset, setNewAsset] = useState<AssetInput>({
    ticker: '',
    name: '',
    type: 'stock',
  });
  const [bulkInput, setBulkInput] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const [assetsPreview, setAssetsPreview] = useState(getDashboardAssets());

  const handleAddAsset = () => {
    if (!newAsset.ticker || !newAsset.name) {
      toast.error('Preencha todos os campos');
      return;
    }
    const updated = addAsset(newAsset.ticker, newAsset.name, newAsset.type);
    toast.success(`Ativo ${newAsset.ticker} adicionado com sucesso!`);
    setAssetsPreview(updated);
    setNewAsset({ ticker: '', name: '', type: 'stock' });
  };

  const handleBulkImport = () => {
    const lines = bulkInput.trim().split('\n').filter((l) => l.trim());
    if (lines.length === 0) {
      toast.error('Cole os tickers no formato: TICKER;NOME;TIPO');
      return;
    }

    const parsedRows = lines
      .map((line) => {
        const [ticker, name, type] = line.split(';').map((s) => s.trim());
        if (ticker && name && (type === 'stock' || type === 'etf')) {
          return { ticker, name, type };
        }
        return null;
      })
      .filter(Boolean) as Array<{ ticker: string; name: string; type: 'stock' | 'etf' }>;

    const updated = importAssets(parsedRows);
    toast.success(`${parsedRows.length} ativos importados com sucesso!`);
    setAssetsPreview(updated);
    setBulkInput('');
  };

  const handleSeedData = async () => {
    setIsSeeding(true);
    
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const updated = seedTopAssets();
    setIsSeeding(false);
    setSeeded(true);
    setAssetsPreview(updated);
    toast.success('100 ativos cadastrados com sucesso! (50 ações + 50 ETFs)');
  };

  const handleExportTemplate = () => {
    const template = 'TICKER;NOME;TIPO\nPETR4;Petrobras PN;stock\nBOVA11;iShares Ibovespa;etf';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_ativos.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.info('Template baixado');
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-slide-up max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            Administração
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie a lista de ativos e configure o seed inicial
          </p>
        </div>

        {/* Quick Seed */}
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              Seed Inicial
            </CardTitle>
            <CardDescription>
              Cadastre automaticamente as 50 ações e 50 ETFs mais negociados na B3
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Button
                onClick={handleSeedData}
                disabled={isSeeding || seeded}
                className="min-w-[200px]"
              >
                {isSeeding ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Cadastrando...
                  </>
                ) : seeded ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Seed Realizado
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Cadastrar 100 Ativos
                  </>
                )}
              </Button>
              <span className="text-sm text-muted-foreground">
                Inclui: PETR4, VALE3, ITUB4, BOVA11, IVVB11, e mais 95 ativos
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Add Single Asset */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Adicionar Ativo
              </CardTitle>
              <CardDescription>
                Adicione um ativo manualmente à lista de monitoramento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ticker">Ticker</Label>
                <Input
                  id="ticker"
                  placeholder="Ex: PETR4"
                  value={newAsset.ticker}
                  onChange={(e) =>
                    setNewAsset((prev) => ({
                      ...prev,
                      ticker: e.target.value.toUpperCase(),
                    }))
                  }
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  placeholder="Ex: Petrobras PN"
                  value={newAsset.name}
                  onChange={(e) =>
                    setNewAsset((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant={newAsset.type === 'stock' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() =>
                      setNewAsset((prev) => ({ ...prev, type: 'stock' }))
                    }
                  >
                    Ação
                  </Button>
                  <Button
                    type="button"
                    variant={newAsset.type === 'etf' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() =>
                      setNewAsset((prev) => ({ ...prev, type: 'etf' }))
                    }
                  >
                    ETF
                  </Button>
                </div>
              </div>

              <Button onClick={handleAddAsset} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </CardContent>
          </Card>

          {/* Bulk Import */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Importação em Lote
              </CardTitle>
              <CardDescription>
                Cole uma lista de ativos no formato CSV
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="bulk">Lista de Ativos</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExportTemplate}
                    className="h-auto p-1 text-xs"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Baixar Template
                  </Button>
                </div>
                <Textarea
                  id="bulk"
                  placeholder="TICKER;NOME;TIPO&#10;PETR4;Petrobras PN;stock&#10;BOVA11;iShares Ibovespa;etf"
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  className="font-mono text-sm h-[140px]"
                />
              </div>

              <Button onClick={handleBulkImport} className="w-full">
                <Upload className="h-4 w-4 mr-2" />
                Importar
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Current Assets Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ativos Cadastrados (Preview)</CardTitle>
            <CardDescription>
              Lista dos primeiros 10 ativos de cada tipo (total cadastrado após seed: 100)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Stocks */}
              <div>
                <h4 className="text-sm font-medium mb-3 text-primary">Ações (50)</h4>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Ticker</TableHead>
                        <TableHead>Nome</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assetsPreview
                        .filter((asset) => asset.type === 'stock')
                        .slice(0, 10)
                        .map((asset) => (
                        <TableRow key={asset.ticker}>
                          <TableCell className="font-mono font-medium">
                            {asset.ticker}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {asset.name}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  +40 mais ações...
                </p>
              </div>

              {/* ETFs */}
              <div>
                <h4 className="text-sm font-medium mb-3 text-accent">ETFs (50)</h4>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Ticker</TableHead>
                        <TableHead>Nome</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assetsPreview
                        .filter((asset) => asset.type === 'etf')
                        .slice(0, 10)
                        .map((asset) => (
                        <TableRow key={asset.ticker}>
                          <TableCell className="font-mono font-medium">
                            {asset.ticker}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {asset.name}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  +40 mais ETFs...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Admin;
