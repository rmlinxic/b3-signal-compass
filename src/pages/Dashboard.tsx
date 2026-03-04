import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { AssetTable } from '@/components/dashboard/AssetTable';
import { DashboardFiltersBar } from '@/components/dashboard/DashboardFiltersBar';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { DashboardFilters, SortConfig, AssetWithSignal } from '@/types/market';
import { RefreshCw, Clock, TrendingUp, Timer, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  getDashboardAssets,
  getSettings,
  refreshDashboardAssets,
  replaceMonitoredAssets,
} from '@/lib/localDataStore';
import {
  isAssetListStaleToday,
  upsertAssetList,
} from '@/lib/supabaseDataStore';
import { fetchDailyTop50 } from '@/lib/topVolumeService';

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------

const fmtCountdown = (sec: number): string => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const INITIAL_FILTERS: DashboardFilters = {
  assetType: 'all',
  squeezeOnly: false,
  signalSide: 'all',
  signalType: 'all',
  rsiFilter: 'all',
  smaProximity: null,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Dashboard = () => {
  const [filters, setFilters] = useState<DashboardFilters>(INITIAL_FILTERS);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({
    key: 'confidence',
    direction: 'desc',
  });
  const [assets, setAssets] = useState<AssetWithSignal[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDailyInit, setIsDailyInit] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdownSec, setCountdownSec] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const countdownRef = useRef(0);
  const intervalIdRef = useRef<number | null>(null);

  // ---------------------------------------------------------------------------
  // Core refresh
  // ---------------------------------------------------------------------------
  const doRefresh = useCallback(async () => {
    const settings = getSettings();
    const totalSec = settings.updateInterval * 60;
    countdownRef.current = totalSec;
    setCountdownSec(totalSec);

    setIsRefreshing(true);
    try {
      const updated = await refreshDashboardAssets(settings.dataProvider);
      setAssets(updated);
      setLastUpdate(new Date());
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Falha ao buscar dados de mercado.'
      );
    }
    setIsRefreshing(false);
  }, []);

  // ---------------------------------------------------------------------------
  // Inicializacao
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const init = async () => {
      setAssets(getDashboardAssets());

      try {
        const stale = await isAssetListStaleToday();
        if (stale) {
          setIsDailyInit(true);
          const top50 = await fetchDailyTop50();
          await upsertAssetList(top50);
          replaceMonitoredAssets(top50);
          setIsDailyInit(false);
        }
      } catch (err) {
        console.warn('[DailyInit] Falha no Supabase, usando localStorage:', err);
        setIsDailyInit(false);
      }

      await doRefresh();
    };

    init();
  }, [doRefresh]);

  // ---------------------------------------------------------------------------
  // Tick 1s: countdown + auto-refresh
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const settings = getSettings();
    const totalSec = settings.updateInterval * 60;
    countdownRef.current = totalSec;
    setCountdownSec(totalSec);

    const tick = () => {
      countdownRef.current -= 1;
      setCountdownSec(countdownRef.current);

      if (countdownRef.current <= 0) {
        const s = getSettings();
        countdownRef.current = s.updateInterval * 60;
        setCountdownSec(countdownRef.current);

        refreshDashboardAssets(s.dataProvider)
          .then((updated) => {
            setAssets(updated);
            setLastUpdate(new Date());
            setErrorMessage(null);
          })
          .catch((err) =>
            setErrorMessage(
              err instanceof Error ? err.message : 'Falha ao buscar dados.'
            )
          );
      }
    };

    intervalIdRef.current = window.setInterval(tick, 1000);
    return () => {
      if (intervalIdRef.current !== null)
        window.clearInterval(intervalIdRef.current);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Manual refresh
  // ---------------------------------------------------------------------------
  const handleRefresh = async () => {
    if (isRefreshing || isDailyInit) return;
    await doRefresh();
  };

  // ---------------------------------------------------------------------------
  // Sort + filter + search
  // ---------------------------------------------------------------------------
  const sortedAssets = useMemo(() => {
    if (!sortConfig) return assets;
    return [...assets].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number')
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      if (typeof aVal === 'string' && typeof bVal === 'string')
        return sortConfig.direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      return 0;
    });
  }, [assets, sortConfig]);

  const displayedAssets = useMemo(() => {
    const q = searchQuery.trim().toUpperCase();
    if (!q) return sortedAssets;
    return sortedAssets.filter(
      (a) =>
        a.ticker.includes(q) ||
        a.name.toUpperCase().includes(q)
    );
  }, [sortedAssets, searchQuery]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const isUrgent = countdownSec <= 30 && countdownSec > 0;
  const hasSearch = searchQuery.trim().length > 0;

  return (
    <MainLayout>
      <div className="space-y-5 animate-slide-up">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Top 50 acoes por volume de negociacao da B3
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isDailyInit && (
              <div className="flex items-center gap-2 text-xs text-blue-500 animate-pulse">
                <TrendingUp className="h-3 w-3" />
                <span>Atualizando lista...</span>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{lastUpdate.toLocaleTimeString('pt-BR')}</span>
            </div>

            <div
              className={`flex items-center gap-1.5 text-xs font-mono ${
                isUrgent ? 'text-signal-buy animate-pulse' : 'text-muted-foreground'
              }`}
            >
              <Timer className="h-3 w-3" />
              <span>
                {isRefreshing ? 'Atualizando...' : `prox. ${fmtCountdown(countdownSec)}`}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || isDailyInit}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              Atualizar
            </Button>
          </div>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {errorMessage}
          </div>
        )}

        <DashboardStats assets={assets} />
        <DashboardFiltersBar filters={filters} onFiltersChange={setFilters} />

        {/* Barra de busca */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar ticker ou empresa... (ex: PETR4, Petrobras)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 h-9"
            />
            {hasSearch && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {hasSearch && (
            <p className="text-xs text-muted-foreground shrink-0">
              {displayedAssets.length === 0
                ? 'Nenhum resultado'
                : `${displayedAssets.length} ativo${
                    displayedAssets.length !== 1 ? 's' : ''
                  } encontrado${
                    displayedAssets.length !== 1 ? 's' : ''
                  }`}
            </p>
          )}
        </div>

        <AssetTable
          assets={displayedAssets}
          filters={filters}
          onSort={setSortConfig}
          sortConfig={sortConfig}
        />
      </div>
    </MainLayout>
  );
};

export default Dashboard;
