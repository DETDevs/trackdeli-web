import React, { useState } from 'react';
import {
  Receipt,
  ArrowsClockwise,
  Wrench,
  Car,
  ArrowRight,
  WarningCircle,
  CaretLeft,
  CaretRight,
} from '@phosphor-icons/react';
import { useBackofficeSales, useBackofficeDashboard } from '../../hooks/useBackoffice';
import { useBackofficeDateFilter } from '../../hooks/useBackofficeDateFilter';
import { PosDateFilterPills } from '../../components/pos/PosDateFilterPills';
import { SaleDetailModal } from '../../components/pos/SaleDetailModal';
import { ModuleNotEnabledAlert } from '../../components/pos/ModuleNotEnabledAlert';
import { formatCurrency } from '../../utils/formatters';
import { formatDateTime } from '../../utils/formatDate';

export const PosSalesPage: React.FC = () => {
  const { preset, setPreset, from, to, customFrom, customTo, setCustomRange } =
    useBackofficeDateFilter('today');

  const [paymentMethod, setPaymentMethod] = useState<string>('ALL');
  const [excludeVoided, setExcludeVoided] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  // Consultar configuración para saber moneda y perfil de salón
  const { data: dashboardData } = useBackofficeDashboard();
  const currency = dashboardData?.currency || 'NIO';
  const isTallerProfile = dashboardData?.salonProfile === 'TALLER';

  // Consulta de ventas paginada
  const {
    data: salesResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useBackofficeSales({
    from,
    to,
    paymentMethod: paymentMethod !== 'ALL' ? paymentMethod : undefined,
    excludeVoided: excludeVoided ? true : undefined,
    page,
    limit: 20,
  });

  const sales = salesResponse?.data || [];
  const pagination = salesResponse?.pagination;

  if ((error as any)?.response?.data?.code === 'MODULE_NOT_ENABLED') {
    return <ModuleNotEnabledAlert message="El módulo de Punto de Venta no está habilitado para este negocio." />;
  }

  return (
    <div className="space-y-4 pb-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-base shadow-2xs">
            <Receipt size={22} weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
                Ventas del Punto de Venta
              </h2>
              {isTallerProfile && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                  <Wrench size={11} />
                  Perfil Taller
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Consulta de facturas emitidas, devoluciones y detalle de órdenes
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

      {/* Barra de Filtros (Fechas + Método de pago + Excluir anuladas) */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Selector de Fechas Rápido */}
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

          {/* Filtros complementarios */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Método de pago */}
            <select
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value);
                setPage(1);
              }}
              className="h-8 px-2.5 rounded-lg border border-gray-200 text-xs text-gray-800 bg-white focus:outline-none focus:border-gray-900 shadow-2xs"
            >
              <option value="ALL">Todos los métodos</option>
              <option value="EFECTIVO">Efectivo</option>
              <option value="TARJETA">Tarjeta</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="OTROS">Otros</option>
            </select>

            {/* Checkbox Excluir Anuladas */}
            <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none px-2 py-1 rounded-lg border border-gray-100 hover:bg-gray-50">
              <input
                type="checkbox"
                checked={excludeVoided}
                onChange={(e) => {
                  setExcludeVoided(e.target.checked);
                  setPage(1);
                }}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
              />
              <span className="text-[11px] font-medium text-gray-700">Sin anuladas</span>
            </label>
          </div>
        </div>
      </div>

      {/* Contenido Principal: Desktop Table + Mobile Cards */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-8 text-center space-y-3 shadow-2xs">
          <div className="w-7 h-7 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 text-xs">Cargando ventas...</p>
        </div>
      ) : isError ? (
        <div className="bg-white rounded-2xl border border-red-200 p-6 text-center text-red-700 shadow-2xs space-y-1">
          <WarningCircle size={24} className="mx-auto text-red-500 mb-1" />
          <p className="font-semibold text-xs">Error al cargar las ventas</p>
          <p className="text-[11px] text-red-500">
            {(error as any)?.response?.data?.message || 'Intente nuevamente más tarde.'}
          </p>
        </div>
      ) : sales.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center shadow-2xs space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 mx-auto">
            <Receipt size={24} />
          </div>
          <h4 className="font-semibold text-sm text-gray-900">No hay ventas registradas</h4>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            No se encontraron ventas para los filtros y fechas seleccionadas.
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
                    <th className="px-4 py-3">Factura</th>
                    <th className="px-4 py-3">Fecha y Hora</th>
                    <th className="px-4 py-3">
                      {isTallerProfile ? 'Cliente / Vehículo' : 'Cliente'}
                    </th>
                    <th className="px-4 py-3">Método</th>
                    <th className="px-4 py-3">Cajero</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                    <th className="px-4 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sales.map((sale) => (
                    <tr
                      key={sale.id}
                      onClick={() => setSelectedSaleId(sale.id)}
                      className="hover:bg-gray-50/70 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        #{sale.invoiceNumber}
                      </td>

                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {formatDateTime(sale.createdAt)}
                      </td>

                      <td className="px-4 py-3 max-w-[200px]">
                        {isTallerProfile && (sale.taller?.placa || sale.taller?.vehiculo) ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 font-semibold text-gray-900 truncate">
                              <Car size={13} className="text-amber-700 shrink-0" />
                              <span>{sale.taller.placa || 'Sin placa'}</span>
                              {sale.taller.vehiculo && (
                                <span className="text-gray-500 font-normal truncate">
                                  · {sale.taller.vehiculo}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500 truncate">
                              {sale.customer?.name || 'Cliente general'}
                              {sale.taller.tecnico && ` · Tec: ${sale.taller.tecnico}`}
                            </p>
                          </div>
                        ) : (
                          <div className="truncate">
                            <p className="font-medium text-gray-900 truncate">
                              {sale.customer?.name || 'Cliente general'}
                            </p>
                            {sale.customer?.phone && (
                              <p className="text-[11px] text-gray-400">{sale.customer.phone}</p>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-50 text-gray-700 border border-gray-200/60">
                          {sale.paymentMethod || 'Efectivo'}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-gray-600 truncate max-w-[120px]">
                        {sale.cashier?.name || 'Cajero'}
                      </td>

                      <td className="px-4 py-3 text-right font-bold text-gray-900 whitespace-nowrap">
                        {formatCurrency(sale.netTotal, currency)}
                      </td>

                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {sale.isVoided ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                            Anulada
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Pagada
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSaleId(sale.id);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors"
                        >
                          <span>Ver</span>
                          <ArrowRight size={11} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vista Celular: Tarjetas legibles y optimizadas */}
          <div className="md:hidden space-y-2.5">
            {sales.map((sale) => (
              <div
                key={sale.id}
                onClick={() => setSelectedSaleId(sale.id)}
                className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-2xs space-y-2.5 active:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-gray-900">
                        #{sale.invoiceNumber}
                      </span>
                      {sale.isVoided ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                          Anulada
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Pagada
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {formatDateTime(sale.createdAt)}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-bold text-gray-900 block">
                      {formatCurrency(sale.netTotal, currency)}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {sale.itemsCount} {sale.itemsCount === 1 ? 'ítem' : 'ítems'}
                    </span>
                  </div>
                </div>

                {/* Info Taller en móvil */}
                {isTallerProfile && (sale.taller?.placa || sale.taller?.vehiculo) && (
                  <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/70 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-gray-900">
                        <Car size={13} className="text-amber-700" />
                        <span>{sale.taller.placa || 'Sin placa'}</span>
                      </div>
                      {sale.taller.tecnico && (
                        <span className="text-[10px] text-gray-600">
                          Mec: {sale.taller.tecnico}
                        </span>
                      )}
                    </div>
                    {sale.taller.vehiculo && (
                      <p className="text-[11px] text-gray-700 truncate">
                        {sale.taller.vehiculo}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[11px] text-gray-500">
                  <span className="truncate max-w-[160px]">
                    {sale.customer?.name || 'Cliente general'}
                  </span>

                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-50 text-gray-700 border border-gray-200/60">
                    {sale.paymentMethod || 'Efectivo'}
                  </span>
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
                ({pagination.total} ventas totales)
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

      {/* Modal de Detalle de Venta */}
      <SaleDetailModal
        saleId={selectedSaleId}
        onClose={() => setSelectedSaleId(null)}
        currency={currency}
        isTallerProfile={isTallerProfile}
      />
    </div>
  );
};
