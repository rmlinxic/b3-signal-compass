import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { AssetTable } from '@/components/dashboard/AssetTable';
import { DashboardFiltersBar } from '@/components/dashboard/DashboardFiltersBar';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { DashboardFilters, SortConfig, AssetWithSignal } from '@/types/market';
import { RefreshCw, Clock, TrendingUp, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  // Countdown em segundos ate a proxima atualizacao automatica
  const [countdownSec, setCountdownSec] = useState(0);

  // Ref para permitir reset do countdown a partir de qualquer lugar
  const countdownRef = useRef(0);
  const intervalIdRef = useRef<number | null>(null);

  // ---------------------------------------------------------------------------
  // Core refresh function
  // ---------------------------------------------------------------------------
  const doRefresh = useCallback(async () => {
    const settings = getSettings();
    // Reinicia o countdown
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
  // Inicializacao: lista diaria + primeiro fetch
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const init = async () => {
      // Exibe cache imediatamente
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
  // Tick a cada 1 segundo: decrementa countdown e dispara refresh quando chega 0
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
        // Reseta o countdown imediatamente para evitar multiplos disparos
        countdownRef.current = s.updateInterval * 60;
        setCountdownSec(countdownRef.current);

        // Refresh silencioso (sem spinner bloqueante)
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
      if (intervalIdRef.current !== null) {
        window.clearInterval(intervalIdRef.current);
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Refresh manual
  // ---------------------------------------------------------------------------
  const handleRefresh = async () => {
    if (isRefreshing || isDailyInit) return;
    await doRefresh();
  };

  // ---------------------------------------------------------------------------
  // Filtragem e ordenacao
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

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const isUrgent = countdownSec <= 30 && countdownSec > 0;

  return (
    <MainLayout>
      <div className="space-y-6 animate-slide-up">

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
                <span>Atualizando lista de ativos...</span>
              </div>
            )}

            {/* Ultima atualizacao */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{lastUpdate.toLocaleTimeString('pt-BR')}</span>
            </div>

            {/* Countdown */}
            <div
              className={`flex items-center gap-1.5 text-xs font-mono ${
                isUrgent
                  ? 'text-signal-buy animate-pulse'
                  : 'text-muted-foreground'
              }`}
            >
              <Timer className="h-3 w-3" />
              <span>
                {isRefreshing
                  ? 'Atualizando...'
                  : `prox. ${fmtCountdown(countdownSec)}`}
              </span>
            </div>

            {/* Botao manual */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || isDailyInit}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${
                  isRefreshing ? 'animate-spin' : ''
                }`}
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
        <AssetTable
          assets={sortedAssets}
          filters={filters}
          onSort={setSortConfig}
          sortConfig={sortConfig}
        />
      </div>
    </MainLayout>
  );
};

export default Dashboard;
