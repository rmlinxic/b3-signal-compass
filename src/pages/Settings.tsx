import { useEffect, useState } from 'react';
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
import { Slider } from '@/components/ui/slider';
import { Settings as SettingsIcon, Save, RotateCcw, Info } from 'lucide-react';
import { toast } from 'sonner';
import {
  DEFAULT_SETTINGS,
  getSettings,
  resetSettings,
  saveSettings,
  SettingsState,
} from '@/lib/localDataStore';

const Settings = () => {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setSettings(getSettings());
  }, []);

  const update = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const updateWeight = (
    key: keyof typeof settings.confidenceWeights,
    value: number
  ) => {
    setSettings((prev) => ({
      ...prev,
      confidenceWeights: { ...prev.confidenceWeights, [key]: value },
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveSettings(settings);
    toast.success('Configuracoes salvas!');
    setHasChanges(false);
  };

  const handleReset = () => {
    setSettings(resetSettings());
    setHasChanges(true);
    toast.info('Configuracoes restauradas para padrao');
  };

  const totalWeight = Object.values(settings.confidenceWeights).reduce(
    (a, b) => a + b,
    0
  );

  return (
    <MainLayout>
      <div className="space-y-6 animate-slide-up max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <SettingsIcon className="h-6 w-6 text-primary" />
              Configuracoes
            </h1>
            <p className="text-sm text-muted-foreground">
              Parametros dos indicadores tecnicos para Swing Trade
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Restaurar
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
          <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <p>
            Todos os sinais sao calculados sobre dados <strong>diarios e semanais</strong> do
            Yahoo Finance. Nenhuma analise intraday (15m, 5m) e realizada — o foco e
            exclusivamente em <strong>swing trade</strong> com horizonte de dias a semanas.
          </p>
        </div>

        {/* Bollinger Bands */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bandas de Bollinger</CardTitle>
            <CardDescription>
              Parametros das BB usadas para detectar squeeze, bounce e rompimentos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="bbPeriod">Periodo BB</Label>
                <Input
                  id="bbPeriod"
                  type="number"
                  value={settings.bbPeriod}
                  onChange={(e) => update('bbPeriod', parseInt(e.target.value) || 20)}
                  min={5}
                  max={50}
                />
                <p className="text-xs text-muted-foreground">
                  Media movel central das bandas. Padrao: 20
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bbStd">Desvio Padrao BB</Label>
                <Input
                  id="bbStd"
                  type="number"
                  step="0.5"
                  value={settings.bbStd}
                  onChange={(e) => update('bbStd', parseFloat(e.target.value) || 2)}
                  min={1}
                  max={4}
                />
                <p className="text-xs text-muted-foreground">
                  Multiplicador do desvio padrao. Padrao: 2
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="squeezeThreshold">
                  Limiar de Squeeze: {settings.squeezeThreshold.toFixed(2)}
                </Label>
                <Slider
                  id="squeezeThreshold"
                  value={[settings.squeezeThreshold]}
                  onValueChange={([v]) => update('squeezeThreshold', v)}
                  min={0.02}
                  max={0.20}
                  step={0.01}
                />
                <p className="text-xs text-muted-foreground">
                  BB Width abaixo deste valor indica compressao (squeeze).
                  Squeeze antecede rompimentos. Padrao: 0.07
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Medias Moveis */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Medias Moveis (SMAs)</CardTitle>
            <CardDescription>
              SMA50 filtra tendencia de medio prazo; SMA200 filtra tendencia macro (golden/death cross)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="smaPeriod">SMA Rapida</Label>
                <Input
                  id="smaPeriod"
                  type="number"
                  value={settings.smaPeriod}
                  onChange={(e) => update('smaPeriod', parseInt(e.target.value) || 50)}
                  min={10}
                  max={100}
                />
                <p className="text-xs text-muted-foreground">
                  Usada como filtro de tendencia de medio prazo. Padrao: 50
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sma200Period">SMA Lenta</Label>
                <Input
                  id="sma200Period"
                  type="number"
                  value={settings.sma200Period}
                  onChange={(e) => update('sma200Period', parseInt(e.target.value) || 200)}
                  min={100}
                  max={250}
                />
                <p className="text-xs text-muted-foreground">
                  Tendencia macro. Golden cross (SMA50 &gt; SMA200) favorece compras.
                  Padrao: 200
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* RSI */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">RSI</CardTitle>
            <CardDescription>
              Limiares de RSI para confirmacao dos setups de swing trade
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="rsiPeriod">Periodo RSI</Label>
                <Input
                  id="rsiPeriod"
                  type="number"
                  value={settings.rsiPeriod}
                  onChange={(e) => update('rsiPeriod', parseInt(e.target.value) || 14)}
                  min={5}
                  max={30}
                />
                <p className="text-xs text-muted-foreground">Padrao: 14</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rsiOversold">
                  Sobrevenda (Bounce Buy): {settings.rsiOversold}
                </Label>
                <Slider
                  id="rsiOversold"
                  value={[settings.rsiOversold]}
                  onValueChange={([v]) => update('rsiOversold', v)}
                  min={25}
                  max={50}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">
                  RSI abaixo deste valor ativa BB Bounce Buy. Padrao: 45
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rsiOverbought">
                  Sobrecompra (Rejection Sell): {settings.rsiOverbought}
                </Label>
                <Slider
                  id="rsiOverbought"
                  value={[settings.rsiOverbought]}
                  onValueChange={([v]) => update('rsiOverbought', v)}
                  min={50}
                  max={80}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">
                  RSI acima deste valor ativa BB Rejection Sell. Padrao: 60
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pontuacao de Confianca */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pontuacao de Confianca</CardTitle>
            <CardDescription>
              Peso de cada pilar no score de confianca (0-100).
              {totalWeight !== 100 && (
                <span className="text-destructive ml-2">
                  Total: {totalWeight} pts (deve somar 100)
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>
                  Toque na Banda: {settings.confidenceWeights.bandTouch} pts
                </Label>
                <Slider
                  value={[settings.confidenceWeights.bandTouch]}
                  onValueChange={([v]) => updateWeight('bandTouch', v)}
                  min={0}
                  max={50}
                  step={5}
                />
                <p className="text-xs text-muted-foreground">
                  Qualidade do toque na banda superior ou inferior
                </p>
              </div>

              <div className="space-y-2">
                <Label>
                  Confluencia RSI: {settings.confidenceWeights.rsiConfluence} pts
                </Label>
                <Slider
                  value={[settings.confidenceWeights.rsiConfluence]}
                  onValueChange={([v]) => updateWeight('rsiConfluence', v)}
                  min={0}
                  max={50}
                  step={5}
                />
                <p className="text-xs text-muted-foreground">
                  O quanto o RSI confirma o sinal da BB
                </p>
              </div>

              <div className="space-y-2">
                <Label>
                  Alinhamento de Tendencia: {settings.confidenceWeights.trendAlignment} pts
                </Label>
                <Slider
                  value={[settings.confidenceWeights.trendAlignment]}
                  onValueChange={([v]) => updateWeight('trendAlignment', v)}
                  min={0}
                  max={50}
                  step={5}
                />
                <p className="text-xs text-muted-foreground">
                  Preco alinhado com a SMA50 na direcao do sinal
                </p>
              </div>

              <div className="space-y-2">
                <Label>
                  Golden/Death Cross: {settings.confidenceWeights.smaCross} pts
                </Label>
                <Slider
                  value={[settings.confidenceWeights.smaCross]}
                  onValueChange={([v]) => updateWeight('smaCross', v)}
                  min={0}
                  max={50}
                  step={5}
                />
                <p className="text-xs text-muted-foreground">
                  SMA50 vs SMA200 alinhado com o sinal (golden cross para compra)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sistema */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sistema</CardTitle>
            <CardDescription>
              Frequencia de atualizacao dos dados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-sm space-y-2">
              <Label htmlFor="updateInterval">
                Intervalo de Atualizacao: {settings.updateInterval} min
              </Label>
              <Slider
                id="updateInterval"
                value={[settings.updateInterval]}
                onValueChange={([v]) => update('updateInterval', v)}
                min={5}
                max={60}
                step={5}
              />
              <p className="text-xs text-muted-foreground">
                Frequencia com que o dashboard busca novos dados do Yahoo Finance.
                Para swing trade, 15-30 min e suficiente. Padrao: 30 min
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Settings;
