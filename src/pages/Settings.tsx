import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Settings as SettingsIcon, Save, RotateCcw } from 'lucide-react';
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

  const updateSetting = <K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const updateWeight = (key: keyof typeof settings.confidenceWeights, value: number) => {
    setSettings((prev) => ({
      ...prev,
      confidenceWeights: {
        ...prev.confidenceWeights,
        [key]: value,
      },
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveSettings(settings);
    toast.success('Configurações salvas com sucesso!');
    setHasChanges(false);
  };

  const handleReset = () => {
    setSettings(resetSettings());
    setHasChanges(true);
    toast.info('Configurações restauradas para valores padrão');
  };

  const totalWeight = Object.values(settings.confidenceWeights).reduce(
    (a, b) => a + b,
    0
  );

  return (
    <MainLayout>
      <div className="space-y-6 animate-slide-up max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <SettingsIcon className="h-6 w-6 text-primary" />
              Configurações
            </h1>
            <p className="text-sm text-muted-foreground">
              Ajuste os parâmetros dos indicadores técnicos e do sistema
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

        {/* Indicator Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Parâmetros dos Indicadores</CardTitle>
            <CardDescription>
              Configure os períodos e parâmetros dos indicadores técnicos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bollinger Bands Period */}
              <div className="space-y-2">
                <Label htmlFor="bbPeriod">Período Bollinger Bands</Label>
                <Input
                  id="bbPeriod"
                  type="number"
                  value={settings.bbPeriod}
                  onChange={(e) => updateSetting('bbPeriod', parseInt(e.target.value) || 20)}
                  min={5}
                  max={50}
                />
                <p className="text-xs text-muted-foreground">
                  Número de períodos para calcular a média móvel central (padrão: 20)
                </p>
              </div>

              {/* Bollinger Bands Std */}
              <div className="space-y-2">
                <Label htmlFor="bbStd">Desvio Padrão BB</Label>
                <Input
                  id="bbStd"
                  type="number"
                  step="0.5"
                  value={settings.bbStd}
                  onChange={(e) => updateSetting('bbStd', parseFloat(e.target.value) || 2)}
                  min={1}
                  max={4}
                />
                <p className="text-xs text-muted-foreground">
                  Multiplicador do desvio padrão para as bandas (padrão: 2)
                </p>
              </div>

              {/* RSI Period */}
              <div className="space-y-2">
                <Label htmlFor="rsiPeriod">Período RSI</Label>
                <Input
                  id="rsiPeriod"
                  type="number"
                  value={settings.rsiPeriod}
                  onChange={(e) => updateSetting('rsiPeriod', parseInt(e.target.value) || 14)}
                  min={5}
                  max={30}
                />
                <p className="text-xs text-muted-foreground">
                  Número de períodos para calcular o RSI (padrão: 14)
                </p>
              </div>

              {/* SMA Period */}
              <div className="space-y-2">
                <Label htmlFor="smaPeriod">Período SMA</Label>
                <Input
                  id="smaPeriod"
                  type="number"
                  value={settings.smaPeriod}
                  onChange={(e) => updateSetting('smaPeriod', parseInt(e.target.value) || 100)}
                  min={20}
                  max={200}
                />
                <p className="text-xs text-muted-foreground">
                  Número de períodos para a média móvel simples (padrão: 100)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Squeeze Detection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Detecção de Squeeze</CardTitle>
            <CardDescription>
              Configure os parâmetros para identificar compressão nas Bandas de Bollinger
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="squeezeThreshold">
                  Limiar de BB Width: {settings.squeezeThreshold.toFixed(2)}
                </Label>
                <Slider
                  id="squeezeThreshold"
                  value={[settings.squeezeThreshold]}
                  onValueChange={([v]) => updateSetting('squeezeThreshold', v)}
                  min={0.01}
                  max={0.15}
                  step={0.01}
                />
                <p className="text-xs text-muted-foreground">
                  Considera squeeze quando BB Width estiver abaixo deste valor
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="squeezePercentile">
                  Percentil de Squeeze: {settings.squeezePercentile}%
                </Label>
                <Slider
                  id="squeezePercentile"
                  value={[settings.squeezePercentile]}
                  onValueChange={([v]) => updateSetting('squeezePercentile', v)}
                  min={5}
                  max={25}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">
                  Ou quando estiver no percentil mais baixo dos últimos 20 dias
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Confidence Weights */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pesos de Confiança</CardTitle>
            <CardDescription>
              Configure a importância de cada critério no cálculo do score de confiança
              {totalWeight !== 100 && (
                <span className="text-destructive ml-2">
                  (Total: {totalWeight}% - deve somar 100%)
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Squeeze Detectado: {settings.confidenceWeights.squeeze}%</Label>
                <Slider
                  value={[settings.confidenceWeights.squeeze]}
                  onValueChange={([v]) => updateWeight('squeeze', v)}
                  min={0}
                  max={50}
                  step={5}
                />
              </div>

              <div className="space-y-2">
                <Label>Cruzamento SMA100: {settings.confidenceWeights.smaCross}%</Label>
                <Slider
                  value={[settings.confidenceWeights.smaCross]}
                  onValueChange={([v]) => updateWeight('smaCross', v)}
                  min={0}
                  max={50}
                  step={5}
                />
              </div>

              <div className="space-y-2">
                <Label>Condição RSI: {settings.confidenceWeights.rsi}%</Label>
                <Slider
                  value={[settings.confidenceWeights.rsi]}
                  onValueChange={([v]) => updateWeight('rsi', v)}
                  min={0}
                  max={50}
                  step={5}
                />
              </div>

              <div className="space-y-2">
                <Label>Expansão BB: {settings.confidenceWeights.bbExpansion}%</Label>
                <Slider
                  value={[settings.confidenceWeights.bbExpansion]}
                  onValueChange={([v]) => updateWeight('bbExpansion', v)}
                  min={0}
                  max={50}
                  step={5}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configurações do Sistema</CardTitle>
            <CardDescription>
              Configure a frequência de atualização e o provedor de dados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="updateInterval">
                  Intervalo de Atualização: {settings.updateInterval} min
                </Label>
                <Slider
                  id="updateInterval"
                  value={[settings.updateInterval]}
                  onValueChange={([v]) => updateSetting('updateInterval', v)}
                  min={1}
                  max={30}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">
                  Frequência de atualização dos dados em minutos
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataProvider">Provedor de Dados</Label>
                <Select
                  value={settings.dataProvider}
                  onValueChange={(v) => updateSetting('dataProvider', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brapi">BRAPI (Recomendado)</SelectItem>
                    <SelectItem value="simulado">Simulado (Local)</SelectItem>
                    <SelectItem value="manual">Manual / CSV</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Selecione o provedor de dados de mercado. Para BRAPI, configure
                  o token em VITE_BRAPI_TOKEN.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Settings;
