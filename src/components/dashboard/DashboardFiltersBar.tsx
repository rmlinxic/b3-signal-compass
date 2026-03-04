import { DashboardFilters, AssetType, SignalSide, SignalType } from '@/types/market';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Filter, X } from 'lucide-react';

interface DashboardFiltersBarProps {
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
}

export function DashboardFiltersBar({
  filters,
  onFiltersChange,
}: DashboardFiltersBarProps) {
  const updateFilter = <K extends keyof DashboardFilters>(
    key: K,
    value: DashboardFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const resetFilters = () => {
    onFiltersChange({
      assetType: 'all',
      squeezeOnly: false,
      signalSide: 'all',
      signalType: 'all',
      rsiFilter: 'all',
      smaProximity: null,
    });
  };

  const hasActiveFilters =
    filters.assetType !== 'all' ||
    filters.squeezeOnly ||
    filters.signalSide !== 'all' ||
    filters.signalType !== 'all' ||
    filters.rsiFilter !== 'all' ||
    filters.smaProximity !== null;

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 rounded-lg bg-card border border-border">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span>Filtros</span>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {/* Tipo de ativo */}
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Tipo</Label>
          <Select
            value={filters.assetType}
            onValueChange={(v) =>
              updateFilter('assetType', v as AssetType | 'all')
            }
          >
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="stock">Acoes</SelectItem>
              <SelectItem value="etf">ETFs</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Direcao do sinal */}
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Sinal</Label>
          <Select
            value={filters.signalSide}
            onValueChange={(v) =>
              updateFilter('signalSide', v as SignalSide | 'all')
            }
          >
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="buy">Compra</SelectItem>
              <SelectItem value="sell">Venda</SelectItem>
              <SelectItem value="neutral">Neutro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tipo de setup */}
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Setup</Label>
          <Select
            value={filters.signalType ?? 'all'}
            onValueChange={(v) =>
              updateFilter(
                'signalType',
                v === 'all' ? 'all' : (v as SignalType)
              )
            }
          >
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os setups</SelectItem>
              <SelectItem value="bb_bounce">Bounce Banda Inf.</SelectItem>
              <SelectItem value="bb_rejection">Rejeicao Banda Sup.</SelectItem>
              <SelectItem value="bb_breakout">Rompimento Altista</SelectItem>
              <SelectItem value="bb_breakdown">Rompimento Baixista</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* RSI */}
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">RSI</Label>
          <Select
            value={filters.rsiFilter}
            onValueChange={(v) =>
              updateFilter(
                'rsiFilter',
                v as 'all' | 'overbought' | 'oversold'
              )
            }
          >
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="oversold">Sobrevendido (&lt;45)</SelectItem>
              <SelectItem value="overbought">Sobrecomprado (&gt;60)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Proximidade SMA50 */}
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Prox. SMA50</Label>
          <Select
            value={filters.smaProximity?.toString() ?? 'all'}
            onValueChange={(v) =>
              updateFilter('smaProximity', v === 'all' ? null : parseFloat(v))
            }
          >
            <SelectTrigger className="w-[100px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="2">≤ 2%</SelectItem>
              <SelectItem value="5">≤ 5%</SelectItem>
              <SelectItem value="10">≤ 10%</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Squeeze BB ativo */}
        <div className="flex items-center gap-2">
          <Switch
            id="squeeze-only"
            checked={filters.squeezeOnly}
            onCheckedChange={(checked) => updateFilter('squeezeOnly', checked)}
          />
          <Label htmlFor="squeeze-only" className="text-xs cursor-pointer">
            Squeeze BB ativo
          </Label>
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3 mr-1" />
            Limpar
          </Button>
        )}
      </div>
    </div>
  );
}
