import React, { useState, useEffect, useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ForkKnife,
  ArrowsClockwise,
  WifiSlash,
  WarningCircle,
  Armchair,
  Gear,
} from '@phosphor-icons/react';
import {
  getMyBusiness,
  getPosSalonZones,
  getPosTablesStatus,
  openPosTableOrder,
  type PosSalonZone,
  type PosTableStatusItem,
} from 'api-client';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/auth.store';
import { formatCurrency } from '../../utils/formatters';
import { extractApiErrorMessage } from '../../utils/productCost';
import { isRestaurantSalonBusiness } from '../../utils/salonVertical';
import { SalonTableCard } from '../../components/pos/tables/SalonTableCard';
import { SalonConfigModal } from '../../components/pos/tables/SalonConfigModal';

type StatusFilter = 'ALL' | 'OCCUPIED' | 'BILL_REQUESTED' | 'FREE';

const isBillRequestedTable = (t: PosTableStatusItem): boolean =>
  t.status === 'OCCUPIED' &&
  Boolean(t.currentOrder) &&
  (t.displayStatus === 'BILL_REQUESTED' ||
    t.billStatus === 'REQUESTED' ||
    t.currentOrder?.billStatus === 'REQUESTED');

interface NormalizedZone {
  id: string;
  name: string;
  sortOrder: number;
}

const POLLING_INTERVAL_MS = 15000;
const NO_ZONE_ID = '__NO_ZONE__';

const formatUpdatedAgo = (dataUpdatedAt: number, nowMs: number): string => {
  if (!dataUpdatedAt) return 'Actualizando...';
  const diffSec = Math.max(0, Math.floor((nowMs - dataUpdatedAt) / 1000));
  if (diffSec < 5) return 'Actualizado recién';
  if (diffSec < 60) return `Actualizado hace ${diffSec} s`;
  const mins = Math.floor(diffSec / 60);
  return `Actualizado hace ${mins} min`;
};

export const PosTablesPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const userRole = String(user?.role || '').toUpperCase();

  const isAllowedRole =
    userRole === 'ENCARGADO' ||
    userRole === 'SUPERADMIN' ||
    userRole === 'CAJERO';
  const canConfigureSalon =
    userRole === 'ENCARGADO' || userRole === 'SUPERADMIN';

  const { data: business, isLoading: isLoadingBusiness } = useQuery({
    queryKey: ['business', 'me'],
    queryFn: getMyBusiness,
    enabled: userRole !== 'VENDEDOR' && isAllowedRole,
    staleTime: 60000,
    retry: false,
  });

  const isRestaurant = isRestaurantSalonBusiness(
    business,
    (user as any)?.business,
  );
  const canQuerySalon = isAllowedRole && isRestaurant;

  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [isTabVisible, setIsTabVisible] = useState<boolean>(() =>
    typeof document !== 'undefined'
      ? document.visibilityState === 'visible'
      : true,
  );
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [selectedZoneId, setSelectedZoneId] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [openingTableId, setOpeningTableId] = useState<string | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);

  const zonesQuery = useQuery<PosSalonZone[]>({
    queryKey: ['pos', 'salon', 'zones'],
    queryFn: () => getPosSalonZones(),
    enabled: canQuerySalon && isOnline,
    staleTime: 30000,
  });

  const tablesQuery = useQuery<PosTableStatusItem[]>({
    queryKey: ['pos', 'tables', 'status'],
    queryFn: () => getPosTablesStatus(),
    enabled: canQuerySalon && isOnline,
    refetchInterval:
      canQuerySalon && isOnline && isTabVisible ? POLLING_INTERVAL_MS : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const refetchTables = tablesQuery.refetch;
  const refetchZones = zonesQuery.refetch;

  // Escuchar cambios de visibilidad de pestaña y estado de red
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      setIsTabVisible(visible);
      if (visible && navigator.onLine && canQuerySalon) {
        setNowMs(Date.now());
        refetchTables();
        refetchZones();
      }
    };

    const handleOnline = () => {
      setIsOnline(true);
      setNowMs(Date.now());
      if (canQuerySalon) {
        refetchTables();
        refetchZones();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [canQuerySalon, refetchTables, refetchZones]);

  // Ticker liviano para actualizar "Actualizado hace..." y el tiempo abierto en mesas
  useEffect(() => {
    if (!isTabVisible) return;
    setNowMs(Date.now());
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 5000);
    return () => window.clearInterval(timer);
  }, [isTabVisible]);

  const tables = tablesQuery.data || [];
  const zonesFromApi = zonesQuery.data || [];
  const currency = (business as any)?.currency || 'NIO';

  // Lista ordenada de zonas presentes
  const zonesList = useMemo<NormalizedZone[]>(() => {
    const map = new Map<string, NormalizedZone>();

    zonesFromApi.forEach((z, index) => {
      map.set(z.id, {
        id: z.id,
        name: z.name,
        sortOrder: typeof z.sortOrder === 'number' ? z.sortOrder : index,
      });
    });

    let hasNoZoneTables = false;
    tables.forEach((t) => {
      if (t.zoneId) {
        if (!map.has(t.zoneId)) {
          map.set(t.zoneId, {
            id: t.zoneId,
            name: t.zoneName || 'Zona',
            sortOrder: 999,
          });
        }
      } else {
        hasNoZoneTables = true;
      }
    });

    const sorted = Array.from(map.values()).sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.name.localeCompare(b.name, 'es');
    });

    if (hasNoZoneTables) {
      sorted.push({
        id: NO_ZONE_ID,
        name: 'Sin zona',
        sortOrder: 9999,
      });
    }

    return sorted;
  }, [zonesFromApi, tables]);

  // Si la zona seleccionada dejó de existir, volver a 'ALL'
  useEffect(() => {
    if (
      selectedZoneId !== 'ALL' &&
      zonesList.length > 0 &&
      !zonesList.some((z) => z.id === selectedZoneId)
    ) {
      setSelectedZoneId('ALL');
    }
  }, [selectedZoneId, zonesList]);

  // Mesas dentro de la zona activa
  const zoneScopedTables = useMemo(() => {
    if (selectedZoneId === 'ALL') return tables;
    if (selectedZoneId === NO_ZONE_ID) {
      return tables.filter((t) => !t.zoneId);
    }
    return tables.filter((t) => t.zoneId === selectedZoneId);
  }, [tables, selectedZoneId]);

  const occupiedCount = useMemo(
    () => zoneScopedTables.filter((t) => t.status === 'OCCUPIED').length,
    [zoneScopedTables],
  );
  const billRequestedCount = useMemo(
    () => zoneScopedTables.filter((t) => isBillRequestedTable(t)).length,
    [zoneScopedTables],
  );
  const occupiedOnlyCount = occupiedCount - billRequestedCount;
  const freeCount = zoneScopedTables.length - occupiedCount;

  // Total por cobrar: suma únicamente los totales por mesa entregados por el API
  const totalToCollect = useMemo(
    () =>
      zoneScopedTables.reduce((acc, t) => {
        if (t.status !== 'OCCUPIED') return acc;
        return acc + Number(t.currentOrder?.total || 0);
      }, 0),
    [zoneScopedTables],
  );

  // Filtro por estado (Todas / Cuenta pedida / Ocupadas / Libres)
  const filteredTables = useMemo(() => {
    if (statusFilter === 'ALL') return zoneScopedTables;
    if (statusFilter === 'BILL_REQUESTED') {
      return zoneScopedTables.filter((t) => isBillRequestedTable(t));
    }
    if (statusFilter === 'OCCUPIED') {
      return zoneScopedTables.filter(
        (t) => t.status === 'OCCUPIED' && !isBillRequestedTable(t),
      );
    }
    return zoneScopedTables.filter((t) => t.status === 'FREE');
  }, [zoneScopedTables, statusFilter]);

  // Agrupación visual por zonas cuando se muestran todas las zonas
  const groupedSections = useMemo(() => {
    if (selectedZoneId !== 'ALL') {
      const zone = zonesList.find((z) => z.id === selectedZoneId);
      return [
        {
          id: selectedZoneId,
          name: zone?.name || 'Mesas',
          tables: filteredTables,
        },
      ];
    }

    const byZone = new Map<string, PosTableStatusItem[]>();
    filteredTables.forEach((t) => {
      const key = t.zoneId || NO_ZONE_ID;
      const list = byZone.get(key) || [];
      list.push(t);
      byZone.set(key, list);
    });

    const sections: Array<{
      id: string;
      name: string;
      tables: PosTableStatusItem[];
    }> = [];

    zonesList.forEach((z) => {
      const list = byZone.get(z.id);
      if (list && list.length > 0) {
        sections.push({
          id: z.id,
          name: z.name,
          tables: list,
        });
      }
    });

    return sections;
  }, [selectedZoneId, zonesList, filteredTables]);

  // Guardas de acceso después de declarar los hooks
  if (userRole === 'VENDEDOR') {
    return <Navigate to="/pos/quotes" replace />;
  }

  if (!isAllowedRole) {
    return <Navigate to="/" replace />;
  }

  if (isLoadingBusiness && !business && !isRestaurant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[260px]">
        <div className="w-7 h-7 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-gray-500 font-medium">
          Verificando configuración del salón...
        </p>
      </div>
    );
  }

  if (!isLoadingBusiness && !isRestaurant) {
    return (
      <Navigate
        to={userRole === 'CAJERO' ? '/pos/cobrar' : '/pos/dashboard'}
        replace
      />
    );
  }

  const handleManualRefresh = () => {
    if (!isOnline) {
      toast.error('Sin conexión a internet. Reconectá para actualizar el salón.');
      return;
    }
    setNowMs(Date.now());
    refetchTables();
    refetchZones();
  };

  const handleSelectTable = async (table: PosTableStatusItem) => {
    if (!isOnline) {
      toast.error('Sin conexión. Reconectá para abrir una mesa.');
      return;
    }

    if (table.status === 'OCCUPIED') {
      navigate(`/pos/tables/${table.id}`, { state: { table } });
      return;
    }

    if (openingTableId) return;
    setOpeningTableId(table.id);

    try {
      const openedOrder = await openPosTableOrder(table.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pos', 'tables', 'status'] }),
        queryClient.invalidateQueries({ queryKey: ['pos', 'salon', 'zones'] }),
      ]);
      navigate(`/pos/tables/${table.id}`, {
        state: {
          table: {
            ...table,
            status: 'OCCUPIED',
          },
          openedOrderId: openedOrder?.id,
        },
      });
    } catch (err) {
      toast.error(extractApiErrorMessage(err, 'No se pudo abrir la mesa.'));
    } finally {
      setOpeningTableId(null);
    }
  };

  const zoneTableCount = (zoneId: string): number => {
    if (zoneId === NO_ZONE_ID) {
      return tables.filter((t) => !t.zoneId).length;
    }
    return tables.filter((t) => t.zoneId === zoneId).length;
  };

  return (
    <div className="space-y-4 pb-10 max-w-7xl mx-auto">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-100">
            <ForkKnife size={22} weight="duotone" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-[#0F0F0F] tracking-tight truncate">
              Salón
            </h1>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {isOnline
                ? formatUpdatedAgo(tablesQuery.dataUpdatedAt, nowMs)
                : 'Sin conexión'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 self-stretch sm:self-auto">
          {canConfigureSalon && (
            <button
              type="button"
              onClick={() => setIsConfigModalOpen(true)}
              disabled={!isOnline}
              className="min-h-[44px] flex-1 sm:flex-none px-4 rounded-xl bg-[#0F0F0F] hover:bg-gray-800 text-white text-xs font-semibold transition-colors shadow-2xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Gear size={16} weight="bold" />
              <span>Configurar salón</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={!isOnline || tablesQuery.isFetching}
            className="min-h-[44px] flex-1 sm:flex-none px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-800 transition-colors shadow-2xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowsClockwise
              size={16}
              className={tablesQuery.isFetching ? 'animate-spin' : ''}
            />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Aviso sin conexión */}
      {!isOnline && (
        <div
          role="alert"
          className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-start gap-3 text-amber-950"
        >
          <WifiSlash size={20} weight="bold" className="text-amber-700 shrink-0 mt-0.5" />
          <div className="min-w-0 text-xs sm:text-sm space-y-0.5">
            <p className="font-semibold">Sin conexión a internet</p>
            <p className="text-amber-900">
              Necesitás conexión para actualizar el salón o abrir una mesa. No se guardan
              acciones sin conexión.
            </p>
          </div>
        </div>
      )}

      {/* Resumen superior */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 shadow-2xs min-w-0">
          <p className="text-xs font-medium text-gray-500 truncate">Mesas libres</p>
          <p className="text-lg sm:text-xl font-bold text-emerald-700 tabular-nums mt-0.5 truncate">
            {freeCount}
          </p>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 shadow-2xs min-w-0">
          <p className="text-xs font-medium text-gray-500 truncate">Mesas ocupadas</p>
          <p className="text-lg sm:text-xl font-bold text-amber-800 tabular-nums mt-0.5 truncate">
            {occupiedOnlyCount}
          </p>
        </div>

        <div className="bg-indigo-50/70 p-3.5 sm:p-4 rounded-2xl border border-indigo-200 shadow-2xs min-w-0">
          <p className="text-xs font-medium text-indigo-800 truncate">Cuenta pedida</p>
          <p className="text-lg sm:text-xl font-bold text-indigo-950 tabular-nums mt-0.5 truncate">
            {billRequestedCount}
          </p>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 shadow-2xs min-w-0">
          <p className="text-xs font-medium text-gray-500 truncate">Total abierto</p>
          <p className="text-lg sm:text-xl font-bold text-[#0F0F0F] tabular-nums mt-0.5 truncate">
            {formatCurrency(totalToCollect, currency)}
          </p>
        </div>
      </div>

      {/* Filtros de zonas y estado */}
      {tables.length > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
          {/* Chips de zonas */}
          {zonesList.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedZoneId('ALL')}
                className={`min-h-[44px] px-3.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  selectedZoneId === 'ALL'
                    ? 'bg-[#0F0F0F] text-white'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                Todas ({tables.length})
              </button>

              {zonesList.map((zone) => {
                const count = zoneTableCount(zone.id);
                const active = selectedZoneId === zone.id;
                return (
                  <button
                    key={zone.id}
                    type="button"
                    onClick={() => setSelectedZoneId(zone.id)}
                    className={`min-h-[44px] px-3.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-[#0F0F0F] text-white'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {zone.name} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Filtro por estado */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100">
            {(
              [
                {
                  id: 'ALL',
                  label: `Todas (${zoneScopedTables.length})`,
                  activeClass: 'bg-gray-900 text-white border-gray-900',
                  idleClass: 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200',
                },
                {
                  id: 'BILL_REQUESTED',
                  label: `Cuenta pedida (${billRequestedCount})`,
                  activeClass: 'bg-indigo-700 text-white border-indigo-700',
                  idleClass:
                    billRequestedCount > 0
                      ? 'bg-indigo-50 text-indigo-900 hover:bg-indigo-100 border-indigo-200'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200',
                },
                {
                  id: 'OCCUPIED',
                  label: `Ocupadas (${occupiedOnlyCount})`,
                  activeClass: 'bg-amber-700 text-white border-amber-700',
                  idleClass: 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200',
                },
                {
                  id: 'FREE',
                  label: `Libres (${freeCount})`,
                  activeClass: 'bg-emerald-700 text-white border-emerald-700',
                  idleClass: 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200',
                },
              ] as {
                id: StatusFilter;
                label: string;
                activeClass: string;
                idleClass: string;
              }[]
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setStatusFilter(opt.id)}
                className={`min-h-[44px] px-3.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                  statusFilter === opt.id ? opt.activeClass : opt.idleClass
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Contenido principal */}
      {tablesQuery.isLoading && tables.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-10 flex flex-col items-center justify-center text-center">
          <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm font-medium text-gray-700">Cargando mesas del salón...</p>
        </div>
      ) : tablesQuery.isError && tables.length === 0 ? (
        <div className="bg-white rounded-2xl border border-red-200 p-8 flex flex-col items-center justify-center text-center gap-3">
          <WarningCircle size={32} weight="duotone" className="text-red-500" />
          <div className="space-y-1 max-w-md">
            <p className="text-sm font-bold text-gray-900">
              No se pudieron cargar las mesas
            </p>
            <p className="text-xs text-gray-600">
              {extractApiErrorMessage(
                tablesQuery.error,
                'Ocurrió un error al consultar el estado del salón.',
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={handleManualRefresh}
            className="min-h-[44px] px-4 rounded-xl bg-[#0F0F0F] hover:bg-gray-800 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      ) : tables.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-8 sm:p-12 flex flex-col items-center justify-center text-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-500 flex items-center justify-center">
            <Armchair size={26} weight="duotone" />
          </div>
          <div className="space-y-1 max-w-md">
            <h2 className="text-base font-bold text-gray-900">
              Todavía no hay mesas
            </h2>
            <p className="text-xs sm:text-sm text-gray-600">
              Todavía no hay mesas. Las crea el encargado en Configuración del salón.
            </p>
          </div>
          {canConfigureSalon && (
            <button
              type="button"
              onClick={() => setIsConfigModalOpen(true)}
              disabled={!isOnline}
              className="min-h-[44px] px-4 rounded-xl bg-[#0F0F0F] hover:bg-gray-800 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Gear size={16} weight="bold" />
              <span>Configurar salón</span>
            </button>
          )}
        </div>
      ) : filteredTables.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-8 flex flex-col items-center justify-center text-center gap-3">
          <p className="text-sm font-semibold text-gray-800">
            No hay mesas que coincidan con este filtro.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedZoneId('ALL');
              setStatusFilter('ALL');
            }}
            className="min-h-[44px] px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-800 transition-colors cursor-pointer"
          >
            Ver todas las mesas
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedSections.map((section) => {
            const secOccupied = section.tables.filter(
              (t) => t.status === 'OCCUPIED',
            ).length;
            return (
              <section key={section.id} className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                  <h2 className="text-sm sm:text-base font-bold text-[#0F0F0F]">
                    {section.name}
                  </h2>
                  <span className="text-xs font-medium text-gray-600">
                    {secOccupied === 1 ? '1 ocupada' : `${secOccupied} ocupadas`} de{' '}
                    {section.tables.length}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                  {section.tables.map((table) => (
                    <SalonTableCard
                      key={table.id}
                      table={table}
                      currency={currency}
                      nowMs={nowMs}
                      isOpening={openingTableId === table.id}
                      disabled={Boolean(openingTableId) || !isOnline}
                      onSelect={handleSelectTable}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {canConfigureSalon && (
        <SalonConfigModal
          isOpen={isConfigModalOpen}
          business={business}
          onClose={() => setIsConfigModalOpen(false)}
        />
      )}
    </div>
  );
};
