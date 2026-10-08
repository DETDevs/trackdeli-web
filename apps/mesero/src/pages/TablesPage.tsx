import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import {
  ArrowsClockwise,
  WarningCircle,
  Armchair,
  WifiSlash,
} from '@phosphor-icons/react';
import { useTablesStatus, useZones } from '../hooks/useMesero';
import { useWaiterAuth } from '../store/authStore';
import { Header } from '../components/Header';
import { TableCard } from '../components/TableCard';
import { POLLING_CONFIG } from '../config/polling';
import type { TableStatusSummary, TableZone } from '../types/mesero';
import toast from 'react-hot-toast';

export const TablesPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { session, logout } = useWaiterAuth();

  const businessSlug = slug || session?.slug || '';

  // Proteger la vista: si no hay sesión, volver al login
  if (!session) {
    return <Navigate to={`/mesas/${businessSlug || 'default'}/login`} replace />;
  }

  // Consulta de mesas con sondeo inteligente activo en esta pantalla (20 s)
  const {
    data: tables = [],
    isLoading,
    error,
    refetch,
    dataUpdatedAt,
  } = useTablesStatus({ enabledPolling: true });

  // Consulta opcional de zonas del salón
  const { data: zonesFromApi = [] } = useZones();

  // Estado de conexión del dispositivo
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Estado de refresco manual iniciado por el usuario
  const [isManualRefetching, setIsManualRefetching] = useState(false);

  // Ticker liviano para actualizar la frescura del indicador "En vivo" (< 45s)
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);

  // Zona seleccionada persistida en la sesión del mesero (A.4)
  const storageZoneKey = `trackdeli_waiter_zone_${businessSlug}`;
  const [selectedZoneId, setSelectedZoneId] = useState<string>(() => {
    try {
      return sessionStorage.getItem(storageZoneKey) || 'ALL';
    } catch {
      return 'ALL';
    }
  });

  // Filtro de estado: Todas / Ocupadas / Libres
  const [statusFilter, setStatusFilter] = useState<'all' | 'free' | 'occupied'>('all');

  // Guardar la zona seleccionada en sessionStorage al cambiar
  useEffect(() => {
    try {
      sessionStorage.setItem(storageZoneKey, selectedZoneId);
    } catch {}
  }, [selectedZoneId, storageZoneKey]);

  // Page Visibility API y reconexión online (B.1 y B.4)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refetch();
      }
    };

    const handleOnline = () => {
      setIsOnline(true);
      refetch();
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
  }, [refetch]);

  // Construcción de la lista de zonas con mesas
  const zonesWithTables = useMemo(() => {
    const map = new Map<string, { id: string; name: string; sortOrder: number }>();

    // 1. Zonas del backend para respetar orden
    zonesFromApi.forEach((z: TableZone, idx: number) => {
      map.set(z.id, {
        id: z.id,
        name: z.name,
        sortOrder: z.sortOrder ?? idx,
      });
    });

    // 2. Extraer zonas presentes en las mesas
    let noZoneCount = 0;
    tables.forEach((t) => {
      if (t.zoneId) {
        if (!map.has(t.zoneId)) {
          map.set(t.zoneId, {
            id: t.zoneId,
            name: t.zoneName || 'Zona',
            sortOrder: 999,
          });
        }
      } else if (t.zoneName && t.zoneName.toLowerCase() !== 'sin zona') {
        if (!map.has(t.zoneName)) {
          map.set(t.zoneName, {
            id: t.zoneName,
            name: t.zoneName,
            sortOrder: 999,
          });
        }
      } else {
        noZoneCount++;
      }
    });

    // Ordenar zonas principales
    const sorted = Array.from(map.values()).sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.name.localeCompare(b.name);
    });

    // Agregar "Sin zona" al final si hay mesas sin zona (A.6)
    if (noZoneCount > 0) {
      sorted.push({
        id: 'no-zone',
        name: 'Sin zona',
        sortOrder: 9999,
      });
    }

    return sorted;
  }, [zonesFromApi, tables]);

  // Si la zona seleccionada ya no existe, volver a 'ALL'
  useEffect(() => {
    if (selectedZoneId !== 'ALL') {
      const exists = zonesWithTables.some((z) => z.id === selectedZoneId);
      if (!exists && zonesWithTables.length > 0) {
        setSelectedZoneId('ALL');
      }
    }
  }, [zonesWithTables, selectedZoneId]);

  // Conteo total de mesas por zona para los chips
  const zoneCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    tables.forEach((t) => {
      const zKey =
        t.zoneId ||
        (t.zoneName && t.zoneName.toLowerCase() !== 'sin zona' ? t.zoneName : 'no-zone');
      counts[zKey] = (counts[zKey] || 0) + 1;
    });
    return counts;
  }, [tables]);

  // 1. Filtrar mesas pertenecientes a la zona elegida
  const tablesInSelectedZone = useMemo(() => {
    if (selectedZoneId === 'ALL') return tables;
    if (selectedZoneId === 'no-zone') {
      return tables.filter(
        (t) => !t.zoneId && (!t.zoneName || t.zoneName.toLowerCase() === 'sin zona')
      );
    }
    return tables.filter(
      (t) => t.zoneId === selectedZoneId || t.zoneName === selectedZoneId
    );
  }, [tables, selectedZoneId]);

  // 2. Conteos de estado (Ocupadas / Libres) dentro de la zona elegida (A.2)
  const occupiedCountInZone = useMemo(() => {
    return tablesInSelectedZone.filter((t) => t.isOccupied && Boolean(t.activeOrder)).length;
  }, [tablesInSelectedZone]);

  const freeCountInZone = tablesInSelectedZone.length - occupiedCountInZone;

  // 3. Filtrar por estado (Todas / Ocupadas / Libres)
  const displayedTables = useMemo(() => {
    return tablesInSelectedZone.filter((t) => {
      const isOccupied = t.isOccupied && Boolean(t.activeOrder);
      if (statusFilter === 'free') return !isOccupied;
      if (statusFilter === 'occupied') return isOccupied;
      return true;
    });
  }, [tablesInSelectedZone, statusFilter]);

  // 4. En vista "Todas" (selectedZoneId === 'ALL'), agrupar mesas por zona con encabezado (A.3)
  const groupedSections = useMemo(() => {
    if (selectedZoneId !== 'ALL') return null;

    const sections: Array<{
      zone: { id: string; name: string };
      tables: TableStatusSummary[];
      freeCount: number;
      occupiedCount: number;
    }> = [];

    zonesWithTables.forEach((z) => {
      const zTables = displayedTables.filter((t) => {
        if (z.id === 'no-zone') {
          return !t.zoneId && (!t.zoneName || t.zoneName.toLowerCase() === 'sin zona');
        }
        return t.zoneId === z.id || t.zoneName === z.name || t.zoneName === z.id;
      });

      if (zTables.length > 0) {
        const occ = zTables.filter((t) => t.isOccupied && Boolean(t.activeOrder)).length;
        sections.push({
          zone: z,
          tables: zTables,
          freeCount: zTables.length - occ,
          occupiedCount: occ,
        });
      }
    });

    return sections;
  }, [selectedZoneId, zonesWithTables, displayedTables]);

  const handleLogout = () => {
    if (window.confirm('¿Deseás cerrar tu turno de mesero?')) {
      try {
        sessionStorage.removeItem(storageZoneKey);
      } catch {}
      logout();
      toast.success('Turno cerrado', { duration: 2500 });
      navigate(`/mesas/${businessSlug}/login`, { replace: true });
    }
  };

  const handleSelectTable = useCallback(
    (table: TableStatusSummary) => {
      navigate(`/mesas/${businessSlug}/tables/${table.id}`);
    },
    [businessSlug, navigate]
  );

  const handleManualRefetch = async () => {
    setIsManualRefetching(true);
    try {
      await refetch();
    } finally {
      setIsManualRefetching(false);
    }
  };

  // Cálculo del estado del indicador "En vivo" (B.6)
  const isConnectionFresh =
    dataUpdatedAt > 0 &&
    now - dataUpdatedAt < POLLING_CONFIG.LIVE_INDICATOR_FRESH_THRESHOLD_MS;

  const isLive = isOnline && !error && isConnectionFresh;
  const isErrorOrOffline = !isOnline || Boolean(error);

  // Mostrar fila de chips de zonas solo si el negocio tiene 2 o más zonas (A.1)
  const showZoneChips = zonesWithTables.length >= 2;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header fijo */}
      <Header
        waiterName={session.waiter.name}
        businessName={session.business?.name}
        onLogout={handleLogout}
        rightAction={
          <button
            type="button"
            onClick={handleManualRefetch}
            disabled={isManualRefetching}
            className={`p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer touch-manipulation ${
              isManualRefetching ? 'animate-spin text-gray-900' : ''
            }`}
            title="Actualizar mesas"
          >
            <ArrowsClockwise size={18} weight="bold" />
          </button>
        }
      />

      {/* Main Content */}
      <main className="flex-1 max-w-md w-full mx-auto p-3.5 sm:p-4 space-y-3.5 pb-12">
        {/* Aviso discreto en caso de desconexión o fallo (B.4) */}
        {isErrorOrOffline && (
          <div className="flex items-center justify-between px-3.5 py-2 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <WifiSlash size={16} weight="bold" className="text-amber-600 shrink-0" />
              <span className="font-semibold truncate">Sin conexión, reintentando…</span>
            </div>
            <button
              type="button"
              onClick={handleManualRefetch}
              className="text-xs font-bold text-amber-950 underline hover:no-underline shrink-0 ml-2"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Fila de Chips de Zonas (A.1 y A.7) - Solo si hay 2 o más zonas */}
        {showZoneChips && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {/* Chip: Todas */}
              <button
                type="button"
                onClick={() => setSelectedZoneId('ALL')}
                className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-colors flex items-center justify-center cursor-pointer touch-manipulation ${
                  selectedZoneId === 'ALL'
                    ? 'bg-gray-900 text-white shadow-xs'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
                }`}
              >
                Todas ({tables.length})
              </button>

              {/* Chips por cada zona */}
              {zonesWithTables.map((zone) => {
                const count = zoneCounts[zone.id] || 0;
                const isSelected = selectedZoneId === zone.id;
                return (
                  <button
                    key={zone.id}
                    type="button"
                    onClick={() => setSelectedZoneId(zone.id)}
                    className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-colors flex items-center justify-center cursor-pointer touch-manipulation ${
                      isSelected
                        ? 'bg-gray-900 text-white shadow-xs'
                        : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {zone.name} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Barra de Filtros de Estado y Conexión "En vivo" (A.2 y B.6) */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer touch-manipulation ${
                statusFilter === 'all'
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
              }`}
            >
              Todas ({tablesInSelectedZone.length})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('occupied')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer touch-manipulation flex items-center gap-1 ${
                statusFilter === 'occupied'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-white text-amber-800 border border-amber-200 hover:border-amber-300'
              }`}
            >
              Ocupadas ({occupiedCountInZone})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('free')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer touch-manipulation flex items-center gap-1 ${
                statusFilter === 'free'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-emerald-800 border border-emerald-200 hover:border-emerald-300'
              }`}
            >
              Libres ({freeCountInZone})
            </button>
          </div>

          {/* Indicador "En vivo" verídico con umbral de frescura de 45 s (B.6) */}
          <div className="flex items-center gap-1.5 shrink-0 pl-1">
            <span
              className={`w-2 h-2 rounded-full transition-colors ${
                isLive
                  ? 'bg-emerald-500 shadow-2xs'
                  : isErrorOrOffline
                  ? 'bg-rose-500'
                  : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span
              className={`text-[11px] font-semibold transition-colors ${
                isLive
                  ? 'text-emerald-700'
                  : isErrorOrOffline
                  ? 'text-rose-700'
                  : 'text-amber-700'
              }`}
            >
              {isLive
                ? 'En vivo'
                : isErrorOrOffline
                ? 'Sin conexión'
                : isManualRefetching
                ? 'Actualizando…'
                : 'Sincronizando…'}
            </span>
          </div>
        </div>

        {/* Loading state inicial */}
        {isLoading && tables.length === 0 && (
          <div className="grid grid-cols-2 gap-3 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-36 rounded-3xl bg-white border border-gray-200 p-4 space-y-3"
              >
                <div className="h-6 w-16 bg-gray-200 rounded-lg" />
                <div className="h-4 w-24 bg-gray-100 rounded-lg" />
              </div>
            ))}
          </div>
        )}

        {/* Error state completo cuando no hay mesas cargadas */}
        {error && tables.length === 0 && (
          <div className="p-5 rounded-3xl bg-rose-50 border border-rose-200 text-center space-y-2 text-rose-900">
            <WarningCircle size={32} className="mx-auto text-rose-500" />
            <h3 className="text-sm font-bold">Error al cargar mesas</h3>
            <p className="text-xs text-rose-700">
              No se pudo obtener el estado de las mesas. Verifica tu conexión.
            </p>
            <button
              type="button"
              onClick={handleManualRefetch}
              className="mt-2 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-xs active:scale-95 transition-transform"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Empty state cuando no hay mesas en el filtro/zona */}
        {!isLoading && displayedTables.length === 0 && (
          <div className="p-8 rounded-3xl bg-white border border-gray-200 text-center space-y-2">
            <Armchair size={36} className="text-gray-400 mx-auto" />
            <h3 className="text-sm font-bold text-gray-800">
              No hay mesas en esta selección
            </h3>
            <p className="text-xs text-gray-500">
              Cambiá la zona o el filtro para ver las mesas disponibles.
            </p>
          </div>
        )}

        {/* Grilla Agrupada por Zona en vista "Todas" (A.3 y A.6) */}
        {!isLoading && groupedSections && groupedSections.length > 0 && (
          <div className="space-y-5">
            {groupedSections.map((sec) => (
              <div key={sec.zone.id} className="space-y-2.5">
                {/* Título de Sección de la Zona */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-900">
                      {sec.zone.name}
                    </h2>
                    <span className="text-[11px] font-semibold text-gray-400">
                      ({sec.tables.length})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
                    <span className="text-emerald-700 font-semibold">
                      {sec.freeCount} {sec.freeCount === 1 ? 'libre' : 'libres'}
                    </span>
                    <span>•</span>
                    <span className="text-amber-700 font-semibold">
                      {sec.occupiedCount}{' '}
                      {sec.occupiedCount === 1 ? 'ocupada' : 'ocupadas'}
                    </span>
                  </div>
                </div>

                {/* Grilla de Mesas de la Zona */}
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                  {sec.tables.map((table) => (
                    <TableCard
                      key={table.id}
                      table={table}
                      onClick={() => handleSelectTable(table)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Grilla Directa cuando se ha elegido una Zona Específica */}
        {!isLoading && !groupedSections && displayedTables.length > 0 && (
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            {displayedTables.map((table) => (
              <TableCard
                key={table.id}
                table={table}
                onClick={() => handleSelectTable(table)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
