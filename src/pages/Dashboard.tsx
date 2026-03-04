import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { AssetTable } from '@/components/dashboard/AssetTable';
import { DashboardFiltersBar } from '@/components/dashboard/DashboardFiltersBar';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { DashboardFilters, SortConfig, AssetWithSignal } from '@/types/market';
import { RefreshCw, Clock, TrendingUp } from 'lucide-react';
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

const Dashboard = () => {
  const [filters, setFilters] = useState<DashboardFilters>({
    assetType: 'all',
    squeezeOnly: false,
    signalSide: 'all',
    rsiFilter: 'all',
    smaProximity: null,
  });

  const [sortConfig, setSortConfig] = useState<SortConfig | null>({
    key: 'confidence',
    direction: 'desc',
  });

  const [assets, setAssets] = useState<AssetWithSignal[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDailyInit, setIsDailyInit] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ─── Inicialização do app ──────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      // Exibe dados em cache imediatamente (sem travar a UI)
      setAssets(getDashboardAssets());

      try {
        // Verifica globalmente (via Supabase) se a lista precisa ser atualizada.
        // O PRIMEIRO usuário do dia dispara a atualização para todos.
        const stale = await isAssetListStaleToday();
        if (stale) {
          setIsDailyInit(true);
          const top50 = await fetchDailyTop50();
          // Atualiza Supabase (compartilhado) e localStorage (cache local)
          await upsertAssetList(top50);
          replaceMonitoredAssets(top50);
          setIsDailyInit(false);
        }
      } catch (err) {
        console.warn('[DailyInit] Falha no Supabase, usando localStorage:', err);
        setIsDailyInit(false);
      }

      // Busca cotações e recalcula sinais (salva no Supabase automaticamente)
      setIsRefreshing(true);
      try {
        const updated = await refreshDashboardAssets(getSettings().dataProvider);
        setAssets(updated);
        setLastUpdate(new Date());
        setErrorMessage(null);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Falha ao buscar dados de mercado.'
        );
      }
      setIsRefreshing(false);
    };

    init();
  }, []);

  // ─── Polling periódico ────────────────────────────────────────────────────────
  useEffect(() => {
    const settings = getSettings();
    const intervalMs = settings.updateInterval * 60 * 1000;
    const id = window.setInterval(() => {
      refreshDashboardAssets(settings.dataProvider)
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
    }, intervalMs);
    return () => window.clearInterval(id);
  }, []);

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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise((r) => setTimeout(r, 400));
    try {
      const updated = await refreshDashboardAssets(getSettings().dataProvider);
      setAssets(updated);
      setLastUpdate(new Date());
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Falha ao buscar dados.'
      );
    }
    setIsRefreshing(false);
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-slide-up">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Top 50 ações por volume de negociação da B3
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isDailyInit && (
              <div className="flex items-center gap-2 text-xs text-blue-500 animate-pulse">
                <TrendingUp className="h-3 w-3" />
                <span>Atualizando lista de ativos...</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Atualizado: {lastUpdate.toLocaleTimeString('pt-BR')}</span>
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
