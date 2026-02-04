import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AssetWithSignal, DashboardFilters, SortConfig } from '@/types/market';
import { SignalBadge } from '@/components/signals/SignalBadge';
import { SqueezeBadge } from '@/components/signals/SqueezeBadge';
import { ConfidenceMeter } from '@/components/signals/ConfidenceMeter';
import { cn } from '@/lib/utils';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface AssetTableProps {
  assets: AssetWithSignal[];
  filters: DashboardFilters;
  onSort: (config: SortConfig) => void;
  sortConfig: SortConfig | null;
}

export function AssetTable({ assets, filters, onSort, sortConfig }: AssetTableProps) {
  const navigate = useNavigate();

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      if (filters.assetType !== 'all' && asset.type !== filters.assetType) return false;
      if (filters.squeezeOnly && !asset.is_squeeze) return false;
      if (filters.signalSide !== 'all' && asset.signal_side !== filters.signalSide) return false;
      if (filters.rsiFilter === 'overbought' && (asset.rsi_15m ?? 0) < 70) return false;
      if (filters.rsiFilter === 'oversold' && (asset.rsi_15m ?? 100) > 30) return false;
      if (filters.smaProximity && Math.abs(asset.distance_to_sma100 ?? 100) > filters.smaProximity) return false;
      return true;
    });
  }, [assets, filters]);

  const handleSort = (key: keyof AssetWithSignal) => {
    const direction = sortConfig?.key === key && sortConfig.direction === 'desc' ? 'asc' : 'desc';
    onSort({ key, direction });
  };

  const SortIcon = ({ columnKey }: { columnKey: keyof AssetWithSignal }) => {
    if (sortConfig?.key !== columnKey) {
      return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-primary" />
    ) : (
      <ArrowDown className="h-3 w-3 text-primary" />
    );
  };

  const formatNumber = (value: number | null, decimals = 2) => {
    if (value === null) return '—';
    return value.toFixed(decimals);
  };

  const formatPercent = (value: number | null) => {
    if (value === null) return '—';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const formatVolume = (value: number) => {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toString();
  };

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="table-header border-b border-border hover:bg-transparent">
              <TableHead className="w-[100px]">Ticker</TableHead>
              <TableHead className="w-[60px]">Tipo</TableHead>
              <TableHead
                className="cursor-pointer hover:text-foreground"
                onClick={() => handleSort('last_price')}
              >
                <div className="flex items-center gap-1">
                  Último
                  <SortIcon columnKey="last_price" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:text-foreground"
                onClick={() => handleSort('price_change_pct')}
              >
                <div className="flex items-center gap-1">
                  Var %
                  <SortIcon columnKey="price_change_pct" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:text-foreground"
                onClick={() => handleSort('volume')}
              >
                <div className="flex items-center gap-1">
                  Volume
                  <SortIcon columnKey="volume" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:text-foreground"
                onClick={() => handleSort('bb_width_15m')}
              >
                <div className="flex items-center gap-1">
                  BB Width
                  <SortIcon columnKey="bb_width_15m" />
                </div>
              </TableHead>
              <TableHead>Squeeze</TableHead>
              <TableHead>SMA100 15m</TableHead>
              <TableHead>SMA100 1D</TableHead>
              <TableHead
                className="cursor-pointer hover:text-foreground"
                onClick={() => handleSort('distance_to_sma100')}
              >
                <div className="flex items-center gap-1">
                  Dist SMA
                  <SortIcon columnKey="distance_to_sma100" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:text-foreground"
                onClick={() => handleSort('rsi_15m')}
              >
                <div className="flex items-center gap-1">
                  RSI 15m
                  <SortIcon columnKey="rsi_15m" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:text-foreground"
                onClick={() => handleSort('rsi_1d')}
              >
                <div className="flex items-center gap-1">
                  RSI 1D
                  <SortIcon columnKey="rsi_1d" />
                </div>
              </TableHead>
              <TableHead>Sinal</TableHead>
              <TableHead
                className="cursor-pointer hover:text-foreground"
                onClick={() => handleSort('confidence')}
              >
                <div className="flex items-center gap-1">
                  Confiança
                  <SortIcon columnKey="confidence" />
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAssets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={14} className="h-32 text-center text-muted-foreground">
                  Nenhum ativo encontrado com os filtros selecionados.
                </TableCell>
              </TableRow>
            ) : (
              filteredAssets.map((asset) => (
                <TableRow
                  key={asset.id}
                  className="table-row-hover border-b border-border/50"
                  onClick={() => navigate(`/asset/${asset.ticker}`)}
                >
                  <TableCell className="font-mono font-semibold text-primary">
                    {asset.ticker}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded uppercase',
                        asset.type === 'stock'
                          ? 'bg-primary/20 text-primary'
                          : 'bg-accent/20 text-accent'
                      )}
                    >
                      {asset.type === 'stock' ? 'Ação' : 'ETF'}
                    </span>
                  </TableCell>
                  <TableCell className="data-cell">
                    R$ {formatNumber(asset.last_price)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      'data-cell font-medium',
                      asset.price_change_pct >= 0 ? 'positive' : 'negative'
                    )}
                  >
                    {formatPercent(asset.price_change_pct)}
                  </TableCell>
                  <TableCell className="data-cell text-muted-foreground">
                    {formatVolume(asset.volume)}
                  </TableCell>
                  <TableCell className="data-cell">
                    {formatNumber(asset.bb_width_15m, 4)}
                  </TableCell>
                  <TableCell>
                    <SqueezeBadge isActive={asset.is_squeeze} size="sm" />
                  </TableCell>
                  <TableCell>
                    {asset.price_vs_sma100_15m ? (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 text-xs font-medium',
                          asset.price_vs_sma100_15m === 'above' ? 'text-signal-buy' : 'text-signal-sell'
                        )}
                      >
                        {asset.price_vs_sma100_15m === 'above' ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                        {asset.price_vs_sma100_15m === 'above' ? 'Acima' : 'Abaixo'}
                      </span>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    {asset.price_vs_sma100_1d ? (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 text-xs font-medium',
                          asset.price_vs_sma100_1d === 'above' ? 'text-signal-buy' : 'text-signal-sell'
                        )}
                      >
                        {asset.price_vs_sma100_1d === 'above' ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                        {asset.price_vs_sma100_1d === 'above' ? 'Acima' : 'Abaixo'}
                      </span>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell
                    className={cn(
                      'data-cell',
                      (asset.distance_to_sma100 ?? 0) >= 0 ? 'positive' : 'negative'
                    )}
                  >
                    {formatPercent(asset.distance_to_sma100)}
                  </TableCell>
                  <TableCell className="data-cell">
                    <span
                      className={cn(
                        (asset.rsi_15m ?? 50) > 70 && 'text-signal-sell',
                        (asset.rsi_15m ?? 50) < 30 && 'text-signal-buy'
                      )}
                    >
                      {formatNumber(asset.rsi_15m, 1)}
                    </span>
                  </TableCell>
                  <TableCell className="data-cell">
                    <span
                      className={cn(
                        (asset.rsi_1d ?? 50) > 70 && 'text-signal-sell',
                        (asset.rsi_1d ?? 50) < 30 && 'text-signal-buy'
                      )}
                    >
                      {formatNumber(asset.rsi_1d, 1)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <SignalBadge side={asset.signal_side} size="sm" showIcon={false} />
                  </TableCell>
                  <TableCell>
                    <ConfidenceMeter value={asset.confidence} size="sm" />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
