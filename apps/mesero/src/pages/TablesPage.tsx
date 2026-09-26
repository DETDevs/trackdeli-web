import React, { useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import {
  ArrowsClockwise,
  WarningCircle,
  Armchair,
} from '@phosphor-icons/react';
import { useTablesStatus } from '../hooks/useMesero';
import { useWaiterAuth } from '../store/authStore';
import { Header } from '../components/Header';
import { TableCard } from '../components/TableCard';
import type { TableStatusSummary } from '../types/mesero';
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

  const { data: tables = [], isLoading, error, refetch, isRefetching } = useTablesStatus();
  const [filter, setFilter] = useState<'all' | 'free' | 'occupied'>('all');

  const handleLogout = () => {
    if (window.confirm('¿Deseás cerrar tu turno de mesero?')) {
      logout();
      toast.success('Turno cerrado', { duration: 2500 });
      navigate(`/mesas/${businessSlug}/login`, { replace: true });
    }
  };

  const handleSelectTable = (table: TableStatusSummary) => {
    navigate(`/mesas/${businessSlug}/tables/${table.id}`);
  };

  const filteredTables = tables.filter((t) => {
    const isOccupied = t.isOccupied && Boolean(t.activeOrder);
    if (filter === 'free') return !isOccupied;
    if (filter === 'occupied') return isOccupied;
    return true;
  });

  const occupiedCount = tables.filter((t) => t.isOccupied && Boolean(t.activeOrder)).length;
  const freeCount = tables.length - occupiedCount;

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
            onClick={() => refetch()}
            disabled={isRefetching}
            className={`p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors ${
              isRefetching ? 'animate-spin' : ''
            }`}
            title="Actualizar mesas"
          >
            <ArrowsClockwise size={18} weight="bold" />
          </button>
        }
      />

      {/* Main Content */}
      <main className="flex-1 max-w-md w-full mx-auto p-3.5 sm:p-4 space-y-4 pb-12">
        {/* Barra de Filtros y Resumen de Sala */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer touch-manipulation ${
                filter === 'all'
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              Todas ({tables.length})
            </button>

            <button
              type="button"
              onClick={() => setFilter('occupied')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer touch-manipulation flex items-center gap-1 ${
                filter === 'occupied'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-white text-amber-800 border border-amber-200'
              }`}
            >
              Ocupadas ({occupiedCount})
            </button>

            <button
              type="button"
              onClick={() => setFilter('free')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer touch-manipulation flex items-center gap-1 ${
                filter === 'free'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-emerald-800 border border-emerald-200'
              }`}
            >
              Libres ({freeCount})
            </button>
          </div>

          <span className="text-[11px] font-semibold text-gray-400 shrink-0">
            {isRefetching ? 'Sincronizando...' : 'En vivo'}
          </span>
        </div>

        {/* Loading state */}
        {isLoading && (
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

        {/* Error state */}
        {error && (
          <div className="p-5 rounded-3xl bg-rose-50 border border-rose-200 text-center space-y-2 text-rose-900">
            <WarningCircle size={32} className="mx-auto text-rose-500" />
            <h3 className="text-sm font-bold">Error al cargar mesas</h3>
            <p className="text-xs text-rose-700">
              No se pudo obtener el estado de las mesas. Verifica tu conexión.
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-2 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && filteredTables.length === 0 && (
          <div className="p-8 rounded-3xl bg-white border border-gray-200 text-center space-y-2">
            <Armchair size={36} className="text-gray-400 mx-auto" />
            <h3 className="text-sm font-bold text-gray-800">
              No hay mesas en este filtro
            </h3>
            <p className="text-xs text-gray-500">
              Cambiá el filtro o actualizá para ver las mesas disponibles.
            </p>
          </div>
        )}

        {/* Grilla de Mesas Táctiles (2 columnas en móvil) */}
        {!isLoading && filteredTables.length > 0 && (
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 animate-fadeIn">
            {filteredTables.map((table) => (
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
