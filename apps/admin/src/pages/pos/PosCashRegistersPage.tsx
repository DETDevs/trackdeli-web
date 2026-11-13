import React, { useState, useMemo } from 'react';
import {
  CashRegister,
  ArrowsClockwise,
  ArrowRight,
  WarningCircle,
  CaretLeft,
  CaretRight,
  Desktop,
  ShieldCheck,
  Funnel,
  Clock,
  User,
} from '@phosphor-icons/react';
import {
  useBackofficeCashRegisters,
  useBackofficeDashboard,
  usePosOpenCashRegisters,
} from '../../hooks/useBackoffice';
import { useBackofficeDateFilter } from '../../hooks/useBackofficeDateFilter';
import { PosDateFilterPills } from '../../components/pos/PosDateFilterPills';
import { CashRegisterDetailModal } from '../../components/pos/CashRegisterDetailModal';
import { ModuleNotEnabledAlert } from '../../components/pos/ModuleNotEnabledAlert';
import { WebAccessDisabledView } from '../../components/pos/WebAccessDisabledView';
import { useAuthStore } from '../../store/auth.store';
import { formatCurrency } from '../../utils/formatters';
import { formatDateTime } from '../../utils/formatDate';

export const PosCashRegistersPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const isManagerOrAdmin = user?.role === 'ENCARGADO' || user?.role === 'SUPERADMIN';

  const { preset, setPreset, from, to, customFrom, customTo, setCustomRange } =
    useBackofficeDateFilter('month');

  const [page, setPage] = useState(1);
  const [selectedRegisterId, setSelectedRegisterId] = useState<string | null>(null);
  const [showOnlyDiscrepancy, setShowOnlyDiscrepancy] = useState(false);

  const { data: dashboardData } = useBackofficeDashboard();
  const currency = dashboardData?.currency || 'NIO';

  // Consulta de cajas abiertas en tiempo real (solo visible para Encargado y Superadmin)
  const {
    data: openRegisters = [],
    isLoading: isLoadingOpenList,
    refetch: refetchOpenList,
  } = usePosOpenCashRegisters(isManagerOrAdmin);

  const {
    data: registersResponse,
    isLoading,
    isError,
    error,
    refetch: refetchRegisters,
  } = useBackofficeCashRegisters({
    from,
    to,
    page,
    limit: 20,
  });

  const registers = registersResponse?.data || [];
  const pagination = registersResponse?.pagination;

  // Filtrado de cajas con descuadre en el cliente si está activo el filtro
  const filteredRegisters = useMemo(() => {
    if (!showOnlyDiscrepancy) return registers;
    return registers.filter((reg) => {
      const hasDifference = reg.difference !== null && reg.difference !== 0;
      const hasDiscrepancyReason = Boolean(reg.discrepancyReason);
      const hasAuthorizer = Boolean(reg.discrepancyAuthorizer);
      return hasDifference || hasDiscrepancyReason || hasAuthorizer;
    });
  }, [registers, showOnlyDiscrepancy]);

  const handleRefreshAll = () => {
    refetchRegisters();
    if (isManagerOrAdmin) {
      refetchOpenList();
    }
  };

  if (
    (error as any)?.response?.data?.code === 'WEB_ACCESS_DISABLED' ||
    (error as any)?.response?.status === 403
  ) {
    return <WebAccessDisabledView />;
  }

  if ((error as any)?.response?.data?.code === 'MODULE_NOT_ENABLED') {
    return <ModuleNotEnabledAlert message="El módulo de Punto de Venta no está habilitado para este negocio." />;
  }

  return (
    <div className="space-y-4 pb-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-base shadow-2xs">
            <CashRegister size={22} weight="duotone" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
              Cierres y Arqueos de Caja
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Control de turnos, computadoras, diferencias y autorizaciones de descuadre
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefreshAll}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-medium text-gray-700 transition-colors shadow-2xs cursor-pointer"
        >
          <ArrowsClockwise size={13} className={isLoading || isLoadingOpenList ? 'animate-spin' : ''} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Bloque Cajas abiertas ahora (solo ENCARGADO y SUPERADMIN) */}
      {isManagerOrAdmin && (
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Cajas abiertas ahora ({openRegisters.length})
              </h3>
            </div>
            <span className="text-xs text-gray-600">
              Vista en vivo por computadora
            </span>
          </div>

          {isLoadingOpenList ? (
            <div className="py-4 text-center text-xs text-gray-600">
              Cargando cajas activas...
            </div>
          ) : openRegisters.length === 0 ? (
            <div className="py-3 px-4 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-600 flex flex-wrap items-center justify-between gap-2">
              <span>No hay ninguna caja abierta en este momento.</span>
              <span className="text-xs text-gray-600">Todos los turnos están cerrados</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {openRegisters.map((op) => (
                <div
                  key={op.id}
                  className="p-3.5 rounded-xl bg-gray-50/80 border border-gray-200/80 flex flex-col justify-between space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-gray-900">
                        <Desktop size={14} className="text-brand-600 shrink-0" />
                        <span>{op.deviceName || 'Caja sin nombre'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <User size={12} className="text-gray-500 shrink-0" />
                        <span>Cajero: <strong className="text-gray-800 font-medium">{op.cashierName || 'Cajero'}</strong></span>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      Abierta
                    </span>
                  </div>

                  <div className="pt-2 border-t border-gray-200/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <Clock size={12} className="shrink-0" />
                      <span>{formatDateTime(op.openedAt)}</span>
                    </div>
                    <div className="text-right ml-auto">
                      <span className="text-xs text-gray-600 uppercase block">Fondo inicial</span>
                      <span className="font-semibold text-gray-900 font-mono whitespace-nowrap tabular-nums">
                        {formatCurrency(op.openingCash, currency)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Barra de Filtros: Fechas y Filtro Con Descuadre */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <PosDateFilterPills
          preset={preset}
          setPreset={(p) => {
            setPreset(p);
            setPage(1);
          }}
          from={from}
          to={to}
          customFrom={customFrom}
          customTo={customTo}
          setCustomRange={(f, t) => {
            setCustomRange(f, t);
            setPage(1);
          }}
        />

        {/* Filtro Con Descuadre */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setShowOnlyDiscrepancy((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              showOnlyDiscrepancy
                ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200 shadow-2xs'
            }`}
          >
            <Funnel size={13} weight={showOnlyDiscrepancy ? 'bold' : 'regular'} />
            <span>Con descuadre</span>
          </button>
        </div>
      </div>

      {/* Contenido: Desktop Table + Mobile Cards */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-8 text-center space-y-3 shadow-2xs">
          <div className="w-7 h-7 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 text-xs">Cargando turnos de caja...</p>
        </div>
      ) : isError ? (
        <div className="bg-white rounded-2xl border border-red-200 p-6 text-center text-red-700 shadow-2xs space-y-1">
          <WarningCircle size={24} className="mx-auto text-red-500 mb-1" />
          <p className="font-semibold text-xs">Error al cargar cierres de caja</p>
          <p className="text-[11px] text-red-500">
            {(error as any)?.response?.data?.message || 'Intente nuevamente más tarde.'}
          </p>
        </div>
      ) : filteredRegisters.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center shadow-2xs space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 mx-auto">
            <CashRegister size={24} />
          </div>
          <h4 className="font-semibold text-sm text-gray-900">
            {showOnlyDiscrepancy ? 'No hay cajas con descuadre' : 'No hay cajas registradas'}
          </h4>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {showOnlyDiscrepancy
              ? 'Todos los turnos de este período cuadraron exactamente o no tienen discrepancias registradas.'
              : 'No se encontraron aperturas ni cierres de caja en el rango de fechas seleccionado.'}
          </p>
        </div>
      ) : (
        <>
          {/* Vista Escritorio: Tabla */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Turno</th>
                    <th className="px-4 py-3">Caja</th>
                    <th className="px-4 py-3">Cajero</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Apertura</th>
                    <th className="px-4 py-3">Cierre</th>
                    <th className="px-4 py-3 text-right">Fondo</th>
                    <th className="px-4 py-3 text-right">Ventas</th>
                    <th className="px-4 py-3 text-right">Diferencia</th>
                    <th className="px-4 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRegisters.map((reg) => {
                    const hasAuthorizedDiscrepancy = Boolean(
                      reg.discrepancyAuthorizer || reg.discrepancyReason
                    );

                    return (
                      <tr
                        key={reg.id}
                        onClick={() => setSelectedRegisterId(reg.id)}
                        className="hover:bg-gray-50/70 transition-colors cursor-pointer group"
                      >
                        <td className="px-4 py-3 font-semibold text-gray-900 font-mono">
                          #{reg.id.slice(0, 8).toUpperCase()}
                        </td>

                        {/* Columna Caja (computadora) */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-medium text-gray-900">
                            <Desktop size={13} className="text-gray-400 shrink-0" />
                            <span>{reg.deviceName || '—'}</span>
                          </div>
                        </td>

                        {/* Columna Cajero */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="font-medium text-gray-900">
                            {reg.closedBy?.name || reg.openedBy?.name || 'Cajero'}
                          </p>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex flex-col gap-1 items-start">
                            {reg.status === 'OPEN' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                Abierta
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                                Cerrada
                              </span>
                            )}

                            {hasAuthorizedDiscrepancy && (
                              <span
                                title="Descuadre verificado y autorizado por un encargado"
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200"
                              >
                                <ShieldCheck size={11} className="text-amber-700" />
                                <span>Descuadre autorizado</span>
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="font-medium text-gray-900">{formatDateTime(reg.openedAt)}</p>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          {reg.closedAt ? (
                            <p className="font-medium text-gray-900">{formatDateTime(reg.closedAt)}</p>
                          ) : (
                            <span className="text-gray-400">En curso...</span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right font-medium text-gray-700 whitespace-nowrap font-mono">
                          {formatCurrency(reg.openingCash, currency)}
                        </td>

                        <td className="px-4 py-3 text-right font-bold text-gray-900 whitespace-nowrap font-mono">
                          {formatCurrency(reg.totalSales, currency)}
                          <span className="text-xs text-gray-600 font-normal block font-sans">
                            {reg.salesCount} ventas
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right whitespace-nowrap font-mono">
                          {reg.difference !== null ? (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md font-semibold text-xs ${
                                reg.difference === 0
                                  ? 'bg-emerald-50 text-emerald-800'
                                  : reg.difference > 0
                                  ? 'bg-blue-50 text-blue-800'
                                  : 'bg-red-50 text-red-800'
                              }`}
                            >
                              {reg.difference > 0 ? '+' : ''}
                              {formatCurrency(reg.difference, currency)}
                            </span>
                          ) : (
                            <span className="text-gray-400 font-sans">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRegisterId(reg.id);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors cursor-pointer"
                          >
                            <span>Arqueo</span>
                            <ArrowRight size={11} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vista Celular: Tarjetas legibles sin desbordes */}
          <div className="md:hidden space-y-2.5">
            {filteredRegisters.map((reg) => {
              const hasAuthorizedDiscrepancy = Boolean(
                reg.discrepancyAuthorizer || reg.discrepancyReason
              );

              return (
                <div
                  key={reg.id}
                  onClick={() => setSelectedRegisterId(reg.id)}
                  className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-2xs space-y-2.5 active:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-xs text-gray-900 font-mono">
                          #{reg.id.slice(0, 8).toUpperCase()}
                        </span>
                        {reg.status === 'OPEN' ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Abierta
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                            Cerrada
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-gray-700">
                        <Desktop size={13} className="text-gray-400 shrink-0" />
                        <span className="font-medium">{reg.deviceName || 'Caja sin nombre'}</span>
                      </div>

                      <p className="text-xs text-gray-600">
                        Apertura: {formatDateTime(reg.openedAt)}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-gray-900 block font-mono whitespace-nowrap tabular-nums">
                        {formatCurrency(reg.totalSales, currency)}
                      </span>
                      <span className="text-xs text-gray-600 tabular-nums">
                        {reg.salesCount} ventas
                      </span>
                    </div>
                  </div>

                  {hasAuthorizedDiscrepancy && (
                    <div className="pt-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        <ShieldCheck size={12} className="text-amber-700" />
                        <span>Descuadre autorizado</span>
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                    <div>
                      <span className="text-xs text-gray-600 uppercase block">Cajero</span>
                      <span className="text-gray-800 font-medium">
                        {reg.closedBy?.name || reg.openedBy?.name || 'Cajero'}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-gray-600 uppercase block">Diferencia</span>
                      {reg.difference !== null ? (
                        <span
                          className={`font-semibold text-xs font-mono whitespace-nowrap tabular-nums ${
                            reg.difference === 0
                              ? 'text-emerald-700'
                              : reg.difference > 0
                              ? 'text-blue-700'
                              : 'text-red-700'
                          }`}
                        >
                          {reg.difference > 0 ? '+' : ''}
                          {formatCurrency(reg.difference, currency)}
                        </span>
                      ) : (
                        <span className="text-gray-600 font-sans">En curso</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Paginación */}
          {pagination && pagination.total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white px-4 py-3.5 rounded-2xl border border-gray-200/80 shadow-2xs text-xs">
              <div className="text-gray-500 text-center sm:text-left">
                Mostrando{' '}
                <span className="font-semibold text-gray-900 font-mono">
                  {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)}
                </span>{' '}
                a{' '}
                <span className="font-semibold text-gray-900 font-mono">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>{' '}
                de <span className="font-semibold text-gray-900 font-mono">{pagination.total}</span> turnos totales
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium shadow-2xs cursor-pointer"
                  title="Página anterior"
                >
                  <CaretLeft size={14} weight="bold" />
                  <span className="hidden sm:inline">Anterior</span>
                </button>

                {/* Números de página */}
                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                    .filter((p) => {
                      return (
                        p === 1 ||
                        p === pagination.totalPages ||
                        Math.abs(p - pagination.page) <= 1
                      );
                    })
                    .map((p, idx, arr) => {
                      const prev = arr[idx - 1];
                      const showEllipsis = prev && p - prev > 1;
                      return (
                        <React.Fragment key={p}>
                          {showEllipsis && <span className="text-gray-400 px-1">…</span>}
                          <button
                            type="button"
                            onClick={() => setPage(p)}
                            className={`w-7 h-7 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                              pagination.page === p
                                ? 'bg-gray-900 text-white shadow-xs'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      );
                    })}
                </div>

                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium shadow-2xs cursor-pointer"
                  title="Página siguiente"
                >
                  <span className="hidden sm:inline">Siguiente</span>
                  <CaretRight size={14} weight="bold" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal de Detalle de Caja y Arqueo */}
      <CashRegisterDetailModal
        registerId={selectedRegisterId}
        onClose={() => setSelectedRegisterId(null)}
        currency={currency}
      />
    </div>
  );
};
