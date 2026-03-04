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

const SIGNAL_TYPE_LABEL: Record<string, string> = {
  bb_bounce: 'Bounce ↑',
  bb_breakout: 'Rompimento ↑',
  bb_rejection: 'Rejeicao ↓',
  bb_breakdown: 'Rompimento ↓',
};

const SIGNAL_TYPE_COLOR: Record<string, string> = {
  bb_bounce: 'text-signal-buy',
  bb_breakout: 'text-signal-buy',
  bb_rejection: 'text-signal-sell',
  bb_breakdown: 'text-signal-sell',
};

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
      if (filters.rsiFilter === 'overbought' && (asset.rsi_1d ?? 0) < 60) return false;
      if (filters.rsiFilter === 'oversold' && (asset.rsi_1d ?? 100) > 45) return false;
      if (
        filters.smaProximity &&
        Math.abs(asset.distance_to_sma50 ?? 100) > filters.smaProximity
      )
        return false;
      return true;
    });
  }, [assets, filters]);

  const handleSort = (key: keyof AssetWithSignal) => {
    const direction =
      sortConfig?.key === key && sortConfig.direction === 'desc' ? 'asc' : 'desc';
    onSort({ key, direction });
  };

  const SortIcon = ({ columnKey }: { columnKey: keyof AssetWithSignal }) => {
    if (sortConfig?.key !== columnKey)
      return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />;
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-primary" />
    ) : (
      <ArrowDown className="h-3 w-3 text-primary" />
    );
  };

  const fmt = (v: number | null, d = 2) =>
    v === null ? '—' : v.toFixed(d);
  const fmtPct = (v: number | null) =>
    v === null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
  const fmtVol = (v: number) => {
    if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
    return v.toString();
  };

  const SmaCell = ({ value }: { value: 'above' | 'below' | null }) =>
    value ? (
      <span
        className={cn(
          'inline-flex items-center gap-1 text-xs font-medium',
          value === 'above' ? 'text-signal-buy' : 'text-signal-sell'
        )}
      >
        {value === 'above' ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
        {value === 'above' ? 'Acima' : 'Abaixo'}
      </span>
    ) : (
      <span>—</span>
    );

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
                  Preco
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
                onClick={() => handleSort('bb_width_1d')}
              >
                <div className="flex items-center gap-1">
                  BB Width
                  <SortIcon columnKey="bb_width_1d" />
                </div>
              </TableHead>
              <TableHead>Squeeze</TableHead>
              <TableHead>SMA50</TableHead>
              <TableHead>SMA200</TableHead>
              <TableHead
                className="cursor-pointer hover:text-foreground"
                onClick={() => handleSort('distance_to_sma50')}
              >
                <div className="flex items-center gap-1">
                  Dist SMA50
                  <SortIcon columnKey="distance_to_sma50" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:text-foreground"
                onClick={() => handleSort('rsi_1d')}
              >
                <div className="flex items-center gap-1">
                  RSI (D)
                  <SortIcon columnKey="rsi_1d" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:text-foreground"
                onClick={() => handleSort('rsi_1wk')}
              >
                <div className="flex items-center gap-1">
                  RSI (S)
                  <SortIcon columnKey="rsi_1wk" />
                </div>
              </TableHead>
              <TableHead>Setup</TableHead>
              <TableHead>Sinal</TableHead>
              <TableHead
                className="cursor-pointer hover:text-foreground"
                onClick={() => handleSort('confidence')}
              >
                <div className="flex items-center gap-1">
                  Confianca
                  <SortIcon columnKey="confidence" />
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAssets.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={15}
                  className="h-32 text-center text-muted-foreground"
                >
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
                      {asset.type === 'stock' ? 'Acao' : 'ETF'}
                    </span>
                  </TableCell>
                  <TableCell className="data-cell">
                    R$ {fmt(asset.last_price)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      'data-cell font-medium',
                      asset.price_change_pct >= 0 ? 'positive' : 'negative'
                    )}
                  >
                    {fmtPct(asset.price_change_pct)}
                  </TableCell>
                  <TableCell className="data-cell text-muted-foreground">
                    {fmtVol(asset.volume)}
                  </TableCell>
                  <TableCell className="data-cell">
                    {fmt(asset.bb_width_1d, 4)}
                  </TableCell>
                  <TableCell>
                    <SqueezeBadge isActive={asset.is_squeeze} size="sm" />
                  </TableCell>
                  <TableCell>
                    <SmaCell value={asset.price_vs_sma50} />
                  </TableCell>
                  <TableCell>
                    <SmaCell value={asset.price_vs_sma200} />
                  </TableCell>
                  <TableCell
                    className={cn(
                      'data-cell',
                      (asset.distance_to_sma50 ?? 0) >= 0 ? 'positive' : 'negative'
                    )}
                  >
                    {fmtPct(asset.distance_to_sma50)}
                  </TableCell>
                  <TableCell className="data-cell">
                    <span
                      className={cn(
                        (asset.rsi_1d ?? 50) > 60 && 'text-signal-sell',
                        (asset.rsi_1d ?? 50) < 45 && 'text-signal-buy'
                      )}
                    >
                      {fmt(asset.rsi_1d, 1)}
                    </span>
                  </TableCell>
                  <TableCell className="data-cell">
                    <span
                      className={cn(
                        (asset.rsi_1wk ?? 50) > 60 && 'text-signal-sell',
                        (asset.rsi_1wk ?? 50) < 45 && 'text-signal-buy'
                      )}
                    >
                      {fmt(asset.rsi_1wk, 1)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {asset.signal_type ? (
                      <span
                        className={cn(
                          'text-xs font-medium',
                          SIGNAL_TYPE_COLOR[asset.signal_type] ?? ''
                        )}
                      >
                        {SIGNAL_TYPE_LABEL[asset.signal_type] ?? asset.signal_type}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <SignalBadge
                      side={asset.signal_side}
                      size="sm"
                      showIcon={false}
                    />
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
