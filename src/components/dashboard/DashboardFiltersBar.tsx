import { DashboardFilters, AssetType, SignalSide } from '@/types/market';
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

export function DashboardFiltersBar({ filters, onFiltersChange }: DashboardFiltersBarProps) {
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
      rsiFilter: 'all',
      smaProximity: null,
    });
  };

  const hasActiveFilters =
    filters.assetType !== 'all' ||
    filters.squeezeOnly ||
    filters.signalSide !== 'all' ||
    filters.rsiFilter !== 'all' ||
    filters.smaProximity !== null;

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 rounded-lg bg-card border border-border">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span>Filtros</span>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {/* Asset Type */}
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Tipo</Label>
          <Select
            value={filters.assetType}
            onValueChange={(v) => updateFilter('assetType', v as AssetType | 'all')}
          >
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="stock">Ações</SelectItem>
              <SelectItem value="etf">ETFs</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Signal Side */}
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Sinal</Label>
          <Select
            value={filters.signalSide}
            onValueChange={(v) => updateFilter('signalSide', v as SignalSide | 'all')}
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

        {/* RSI Filter */}
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">RSI</Label>
          <Select
            value={filters.rsiFilter}
            onValueChange={(v) =>
              updateFilter('rsiFilter', v as 'all' | 'overbought' | 'oversold')
            }
          >
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="overbought">Sobrecomprado</SelectItem>
              <SelectItem value="oversold">Sobrevendido</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* SMA Proximity */}
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Prox. SMA</Label>
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
              <SelectItem value="1">≤ 1%</SelectItem>
              <SelectItem value="2">≤ 2%</SelectItem>
              <SelectItem value="5">≤ 5%</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Squeeze Only */}
        <div className="flex items-center gap-2">
          <Switch
            id="squeeze-only"
            checked={filters.squeezeOnly}
            onCheckedChange={(checked) => updateFilter('squeezeOnly', checked)}
          />
          <Label htmlFor="squeeze-only" className="text-xs cursor-pointer">
            Apenas Squeeze
          </Label>
        </div>

        {/* Reset Filters */}
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
