import React, { useState } from 'react';
import {
  CashRegister,
  ArrowsClockwise,
  ArrowRight,
  WarningCircle,
  CaretLeft,
  CaretRight,
} from '@phosphor-icons/react';
import { useBackofficeCashRegisters, useBackofficeDashboard } from '../../hooks/useBackoffice';
import { useBackofficeDateFilter } from '../../hooks/useBackofficeDateFilter';
import { PosDateFilterPills } from '../../components/pos/PosDateFilterPills';
import { CashRegisterDetailModal } from '../../components/pos/CashRegisterDetailModal';
import { ModuleNotEnabledAlert } from '../../components/pos/ModuleNotEnabledAlert';
import { formatCurrency } from '../../utils/formatters';
import { formatDateTime } from '../../utils/formatDate';

export const PosCashRegistersPage: React.FC = () => {
  const { preset, setPreset, from, to, customFrom, customTo, setCustomRange } =
    useBackofficeDateFilter('month');

  const [page, setPage] = useState(1);
  const [selectedRegisterId, setSelectedRegisterId] = useState<string | null>(null);

  const { data: dashboardData } = useBackofficeDashboard();
  const currency = dashboardData?.currency || 'NIO';

  const {
    data: registersResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useBackofficeCashRegisters({
    from,
    to,
    page,
    limit: 20,
  });

  const registers = registersResponse?.data || [];
  const pagination = registersResponse?.pagination;

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
              Control de turnos, fondos iniciales, diferencias y arqueo de efectivo
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-medium text-gray-700 transition-colors shadow-2xs"
        >
          <ArrowsClockwise size={13} className={isLoading ? 'animate-spin' : ''} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Barra de Filtros: Fechas */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
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
      ) : registers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center shadow-2xs space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 mx-auto">
            <CashRegister size={24} />
          </div>
          <h4 className="font-semibold text-sm text-gray-900">No hay cajas registradas</h4>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            No se encontraron aperturas ni cierres de caja en el rango de fechas seleccionado.
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
                    <th className="px-4 py-3">Caja</th>
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
                  {registers.map((reg) => (
                    <tr
                      key={reg.id}
                      onClick={() => setSelectedRegisterId(reg.id)}
                      className="hover:bg-gray-50/70 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-3 font-semibold text-gray-900 font-mono">
                        #{reg.id.slice(0, 8).toUpperCase()}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
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
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-medium text-gray-900">{formatDateTime(reg.openedAt)}</p>
                        <p className="text-[11px] text-gray-400">Por: {reg.openedBy?.name || 'Cajero'}</p>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {reg.closedAt ? (
                          <>
                            <p className="font-medium text-gray-900">{formatDateTime(reg.closedAt)}</p>
                            <p className="text-[11px] text-gray-400">Por: {reg.closedBy?.name || 'Cajero'}</p>
                          </>
                        ) : (
                          <span className="text-gray-400">En curso...</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right font-medium text-gray-700 whitespace-nowrap">
                        {formatCurrency(reg.openingCash, currency)}
                      </td>

                      <td className="px-4 py-3 text-right font-bold text-gray-900 whitespace-nowrap">
                        {formatCurrency(reg.totalSales, currency)}
                        <span className="text-[10px] text-gray-400 font-normal block">
                          {reg.salesCount} ventas
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {reg.difference !== null ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md font-semibold text-[11px] ${
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
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRegisterId(reg.id);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors"
                        >
                          <span>Arqueo</span>
                          <ArrowRight size={11} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vista Celular: Tarjetas legibles */}
          <div className="md:hidden space-y-2.5">
            {registers.map((reg) => (
              <div
                key={reg.id}
                onClick={() => setSelectedRegisterId(reg.id)}
                className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-2xs space-y-2.5 active:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-gray-900 font-mono">
                        Caja #{reg.id.slice(0, 8).toUpperCase()}
                      </span>
                      {reg.status === 'OPEN' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Abierta
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                          Cerrada
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Abierta: {formatDateTime(reg.openedAt)}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-bold text-gray-900 block">
                      {formatCurrency(reg.totalSales, currency)}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {reg.salesCount} ventas
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase block">Cajero</span>
                    <span className="text-gray-700 font-medium">
                      {reg.closedBy?.name || reg.openedBy?.name || 'Cajero'}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 uppercase block">Diferencia</span>
                    {reg.difference !== null ? (
                      <span
                        className={`font-semibold text-xs ${
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
                      <span className="text-gray-400">En curso</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Paginación */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-gray-200/80 shadow-2xs text-xs">
              <span className="text-gray-500">
                Página <span className="font-semibold text-gray-900">{pagination.page}</span> de{' '}
                <span className="font-semibold text-gray-900">{pagination.totalPages}</span>{' '}
                ({pagination.total} cajas)
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <CaretLeft size={16} />
                </button>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <CaretRight size={16} />
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
