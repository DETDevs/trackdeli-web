import React from 'react';
import {
  X,
  CashRegister,
  ArrowDownLeft,
  ArrowUpRight,
  WarningCircle,
  Desktop,
  ShieldCheck,
  Storefront,
  Motorcycle,
  DeviceMobile,
} from '@phosphor-icons/react';
import { useBackofficeCashRegisterDetail } from '../../hooks/useBackoffice';
import { formatCurrency } from '../../utils/formatters';
import { formatDateTime } from '../../utils/formatDate';
import { formatDiscrepancyReason, getVisibleChannels } from '../../utils/visibleChannels';
import { TipsSummaryBlock } from './TipsSummaryBlock';

interface CashRegisterDetailModalProps {
  registerId: string | null;
  onClose: () => void;
  currency?: string;
}

export const CashRegisterDetailModal: React.FC<CashRegisterDetailModalProps> = ({
  registerId,
  onClose,
  currency = 'NIO',
}) => {
  const { data: reg, isLoading, isError, error } = useBackofficeCashRegisterDetail(registerId);

  if (!registerId) return null;

  const hasAuthorizedDiscrepancy = Boolean(
    reg?.discrepancyAuthorizer || reg?.discrepancyReason
  );

  const channelsVisibility = getVisibleChannels(undefined, reg?.salesByChannel || null);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4 text-center">
        <div className="relative w-full max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl text-left shadow-2xl overflow-hidden transform transition-all flex flex-col max-h-[92vh] sm:max-h-[88vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <CashRegister size={18} weight="duotone" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm text-gray-900">
                    Turno #{reg?.id ? reg.id.slice(0, 8).toUpperCase() : '—'}
                  </h3>
                  {reg?.status === 'OPEN' ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Abierta
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                      Cerrada
                    </span>
                  )}
                  {hasAuthorizedDiscrepancy && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                      Descuadre autorizado
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
                  <span className="inline-flex items-center gap-1 font-medium text-gray-700">
                    <Desktop size={12} className="text-gray-400" />
                    {reg?.deviceName || 'Caja sin nombre'}
                  </span>
                  {reg?.openedAt && (
                    <span>• Apertura: {formatDateTime(reg.openedAt)}</span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
            {isLoading && (
              <div className="py-12 text-center space-y-3">
                <div className="w-7 h-7 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-gray-400 text-xs">Cargando arqueo y detalle de caja...</p>
              </div>
            )}

            {isError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-center">
                <WarningCircle size={20} className="mx-auto mb-1 text-red-500" />
                <p className="font-medium">Error al cargar la caja</p>
                <p className="text-[11px] text-red-500 mt-0.5">
                  {(error as any)?.response?.data?.message || 'No se pudo obtener el detalle.'}
                </p>
              </div>
            )}

            {reg && (
              <>
                {/* Fechas, Cajeros y Caja */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block">
                      Apertura
                    </span>
                    <p className="font-semibold text-gray-900 text-xs">
                      {reg.openedBy?.name || 'Cajero no asignado'}
                    </p>
                    <p className="text-gray-500 text-[11px]">
                      {formatDateTime(reg.openedAt)}
                    </p>
                    <p className="text-gray-700 text-[11px] pt-1">
                      Fondo inicial: <span className="font-semibold font-mono">{formatCurrency(reg.openingCash, currency)}</span>
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block">
                      Cierre
                    </span>
                    <p className="font-semibold text-gray-900 text-xs">
                      {reg.closedAt ? (reg.closedBy?.name || 'Cajero no asignado') : 'Aún en curso'}
                    </p>
                    <p className="text-gray-500 text-[11px]">
                      {reg.closedAt ? formatDateTime(reg.closedAt) : 'Caja abierta actualmente'}
                    </p>
                    {reg.closingCash !== null && (
                      <p className="text-gray-700 text-[11px] pt-1">
                        Efectivo contado: <span className="font-semibold font-mono">{formatCurrency(reg.closingCash, currency)}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Arqueo y Cuadre */}
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-900">
                    <span className="uppercase text-[11px] text-gray-500 tracking-wider">
                      Arqueo de Efectivo
                    </span>
                    {reg.difference !== null && (
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                          reg.difference === 0
                            ? 'bg-emerald-50 text-emerald-800'
                            : reg.difference > 0
                            ? 'bg-blue-50 text-blue-800'
                            : 'bg-red-50 text-red-800'
                        }`}
                      >
                        {reg.difference === 0
                          ? 'Cuadre exacto'
                          : reg.difference > 0
                          ? `Sobrante: ${formatCurrency(reg.difference, currency)}`
                          : `Faltante: ${formatCurrency(Math.abs(reg.difference), currency)}`}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-xs">
                    <div className="p-2.5 rounded-lg bg-white border border-gray-200/70">
                      <span className="text-[10px] text-gray-400 uppercase block">Efectivo Esperado</span>
                      <span className="font-bold text-gray-900 text-sm font-mono">
                        {formatCurrency(reg.expectedCash, currency)}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-gray-200/70">
                      <span className="text-[10px] text-gray-400 uppercase block">Efectivo Contado</span>
                      <span className="font-bold text-gray-900 text-sm font-mono">
                        {reg.closingCash !== null ? formatCurrency(reg.closingCash, currency) : '—'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-gray-200/70 col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-gray-400 uppercase block">Diferencia</span>
                      <span
                        className={`font-bold text-sm font-mono ${
                          reg.difference === null
                            ? 'text-gray-400'
                            : reg.difference < 0
                            ? 'text-red-700'
                            : reg.difference > 0
                            ? 'text-blue-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {reg.difference !== null ? formatCurrency(reg.difference, currency) : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Detalle de Descuadre Autorizado (si existe) */}
                {hasAuthorizedDiscrepancy && (
                  <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-amber-900 font-semibold text-xs">
                        <ShieldCheck size={16} weight="bold" className="text-amber-700" />
                        <span>Descuadre autorizado</span>
                      </div>
                      <span className="text-[11px] font-medium text-amber-700">
                        {reg.recountAttempts !== undefined ? `${reg.recountAttempts} reconteo${reg.recountAttempts === 1 ? '' : 's'}` : ''}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <div>
                        <span className="text-[10px] text-amber-700 uppercase tracking-wider block font-semibold">
                          Motivo
                        </span>
                        <p className="font-medium text-gray-900 mt-0.5">
                          {formatDiscrepancyReason(reg.discrepancyReason)}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] text-amber-700 uppercase tracking-wider block font-semibold">
                          Autorizado por
                        </span>
                        <p className="font-medium text-gray-900 mt-0.5">
                          {reg.discrepancyAuthorizer?.name || 'Encargado del negocio'}
                          {reg.discrepancyAuthorizer?.role && (
                            <span className="text-gray-500 text-[11px] ml-1">
                              ({reg.discrepancyAuthorizer.role})
                            </span>
                          )}
                        </p>
                        {reg.discrepancyAuthorizedAt && (
                          <p className="text-[11px] text-gray-500">
                            {formatDateTime(reg.discrepancyAuthorizedAt)}
                          </p>
                        )}
                      </div>
                    </div>

                    {reg.discrepancyNote && (
                      <div className="pt-1 border-t border-amber-200/60">
                        <span className="text-[10px] text-amber-700 uppercase tracking-wider block font-semibold">
                          Nota explicativa
                        </span>
                        <p className="text-gray-800 text-xs mt-0.5 bg-white/70 p-2 rounded-lg border border-amber-100">
                          {reg.discrepancyNote}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Desglose de Ventas por Método */}
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
                  <span className="uppercase text-[11px] text-gray-500 font-semibold tracking-wider block">
                    Ventas del Turno ({reg.salesCount || 0} comprobantes)
                  </span>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-white border border-gray-200/70">
                      <span className="text-[10px] text-gray-400 block">Efectivo</span>
                      <span className="font-semibold text-gray-900 font-mono">
                        {formatCurrency(reg.totalCash, currency)}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-white border border-gray-200/70">
                      <span className="text-[10px] text-gray-400 block">Tarjeta</span>
                      <span className="font-semibold text-gray-900 font-mono">
                        {formatCurrency(reg.totalCard, currency)}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-white border border-gray-200/70">
                      <span className="text-[10px] text-gray-400 block">Transferencia</span>
                      <span className="font-semibold text-gray-900 font-mono">
                        {formatCurrency(reg.totalTransfer, currency)}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-white border border-gray-200/70">
                      <span className="text-[10px] text-gray-400 block">Total Ventas</span>
                      <span className="font-bold text-gray-900 font-mono">
                        {formatCurrency(reg.totalSales, currency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Propinas del turno (aparte de las ventas; oculto para cajero/vendedor en cierre ciego) */}
                {reg.tipsSummary != null && (
                  <TipsSummaryBlock tipsSummary={reg.tipsSummary} currency={currency} />
                )}

                {/* Desglose de Ventas por Canal (oculto si solo MOSTRADOR tiene ventas) */}
                {channelsVisibility.shouldShowChannelsBlock && reg.salesByChannel && (
                  <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
                    <span className="uppercase text-[11px] text-gray-500 font-semibold tracking-wider block">
                      Ventas por Canal
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-white border border-gray-200/70 space-y-0.5">
                        <div className="flex items-center gap-1.5 text-gray-700 font-medium">
                          <Storefront size={14} className="text-gray-500" />
                          <span>Mostrador</span>
                        </div>
                        <div className="flex items-baseline justify-between pt-1">
                          <span className="font-bold text-gray-900 font-mono">
                            {formatCurrency(reg.salesByChannel.MOSTRADOR?.total || 0, currency)}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {reg.salesByChannel.MOSTRADOR?.count || 0} ventas
                          </span>
                        </div>
                      </div>

                      {channelsVisibility.isDeliveryVisible && (
                        <div className="p-2.5 rounded-lg bg-white border border-gray-200/70 space-y-0.5">
                          <div className="flex items-center gap-1.5 text-blue-700 font-medium">
                            <Motorcycle size={14} />
                            <span>A Domicilio</span>
                          </div>
                          <div className="flex items-baseline justify-between pt-1">
                            <span className="font-bold text-gray-900 font-mono">
                              {formatCurrency(reg.salesByChannel.DOMICILIO?.total || 0, currency)}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {reg.salesByChannel.DOMICILIO?.count || 0} ventas
                            </span>
                          </div>
                        </div>
                      )}

                      {channelsVisibility.isPedidosYaVisible && (
                        <div className="p-2.5 rounded-lg bg-white border border-gray-200/70 space-y-0.5">
                          <div className="flex items-center gap-1.5 text-red-700 font-medium">
                            <DeviceMobile size={14} />
                            <span>PedidosYa</span>
                          </div>
                          <div className="flex items-baseline justify-between pt-1">
                            <span className="font-bold text-gray-900 font-mono">
                              {formatCurrency(reg.salesByChannel.PEDIDOSYA?.total || 0, currency)}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {reg.salesByChannel.PEDIDOSYA?.count || 0} ventas
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Movimientos de Caja (Entradas / Salidas de dinero) */}
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-3.5 py-2 border-b border-gray-100 font-semibold text-gray-700 text-xs flex justify-between">
                    <span>Movimientos de Caja ({reg.movements?.length || 0})</span>
                    <span>Monto</span>
                  </div>

                  {(!reg.movements || reg.movements.length === 0) ? (
                    <div className="p-4 text-center text-gray-400 text-xs">
                      No se registraron entradas o salidas manuales de efectivo en esta caja.
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 max-h-40 overflow-y-auto">
                      {reg.movements.map((mov) => {
                        const isIncome = mov.type === 'IN' || mov.type === 'INGRESO';
                        return (
                          <div key={mov.id} className="p-2.5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-6 h-6 rounded-md flex items-center justify-center ${
                                  isIncome ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                                }`}
                              >
                                {isIncome ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{mov.concept || (isIncome ? 'Ingreso' : 'Egreso')}</p>
                                <p className="text-[10px] text-gray-400">{formatDateTime(mov.createdAt)}</p>
                              </div>
                            </div>
                            <span
                              className={`font-semibold font-mono ${
                                isIncome ? 'text-emerald-700' : 'text-red-700'
                              }`}
                            >
                              {isIncome ? '+' : '-'}{formatCurrency(mov.amount, mov.currency || currency)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Notas si existen */}
                {reg.notes && (
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs">
                    <span className="font-semibold text-[11px] text-gray-500 block">Notas de cierre:</span>
                    <p className="text-gray-700 mt-0.5">{reg.notes}</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer - Solo lectura */}
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex justify-end shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-medium transition-colors shadow-2xs cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
