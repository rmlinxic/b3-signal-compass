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
  isFirstAccessToday,
  fetchDailyTop50,
} from '@/lib/topVolumeService';

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

  // ─── Inicialização diária + carga inicial ────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      // Exibe imediatamente o que está em cache (sem bloquear a UI)
      setAssets(getDashboardAssets());

      if (isFirstAccessToday()) {
        setIsDailyInit(true);
        try {
          const top50 = await fetchDailyTop50();
          const freshAssets = replaceMonitoredAssets(top50);
          setAssets(freshAssets);
        } catch (err) {
          console.error('[DailyInit] Erro ao buscar top 50:', err);
        }
        setIsDailyInit(false);
      }

      // Atualiza cotações e indicadores após definir a lista
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
            : 'Falha ao buscar dados de mercado. Tente novamente em instantes.'
        );
      }
      setIsRefreshing(false);
    };

    init();
  }, []);

  // ─── Polling periódico (todos os provedores) ─────────────────────────────────
  useEffect(() => {
    const settings = getSettings();
    const intervalMs = settings.updateInterval * 60 * 1000;
    const intervalId = window.setInterval(() => {
      refreshDashboardAssets(settings.dataProvider)
        .then((updated) => {
          setAssets(updated);
          setLastUpdate(new Date());
          setErrorMessage(null);
        })
        .catch((error) => {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Falha ao buscar dados de mercado.'
          );
        });
    }, intervalMs);

    return () => window.clearInterval(intervalId);
  }, []);

  const sortedAssets = useMemo(() => {
    if (!sortConfig) return assets;

    return [...assets].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortConfig.direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return 0;
    });
  }, [assets, sortConfig]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    try {
      const updated = await refreshDashboardAssets(getSettings().dataProvider);
      setAssets(updated);
      setLastUpdate(new Date());
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Falha ao buscar dados de mercado. Tente novamente em instantes.'
      );
    }
    setIsRefreshing(false);
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-slide-up">
        {/* Header */}
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
              <span>
                Atualizado: {lastUpdate.toLocaleTimeString('pt-BR')}
              </span>
            </div>
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

        {/* Erro */}
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
