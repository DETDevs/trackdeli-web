import React from 'react';
import {
  X,
  Receipt,
  Wrench,
  WarningCircle,
} from '@phosphor-icons/react';
import { useBackofficeSaleDetail } from '../../hooks/useBackoffice';
import { formatCurrency, formatQuantity } from '../../utils/formatters';
import { formatDateTime } from '../../utils/formatDate';

interface SaleDetailModalProps {
  saleId: string | null;
  onClose: () => void;
  currency?: string;
  isTallerProfile?: boolean;
}

export const SaleDetailModal: React.FC<SaleDetailModalProps> = ({
  saleId,
  onClose,
  currency = 'NIO',
  isTallerProfile = false,
}) => {
  const { data: sale, isLoading, isError, error } = useBackofficeSaleDetail(saleId);

  if (!saleId) return null;

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
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                <Receipt size={18} weight="duotone" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm text-gray-900">
                    Factura #{sale?.invoiceNumber || '—'}
                  </h3>
                  {sale?.isVoided && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                      Anulada
                    </span>
                  )}
                  {sale && !sale.isVoided && sale.totalRefunded > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      Con Devolución
                    </span>
                  )}
                  {sale && !sale.isVoided && sale.totalRefunded === 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Completada
                    </span>
                  )}
                </div>
                {sale?.createdAt && (
                  <p className="text-[11px] text-gray-500">
                    {formatDateTime(sale.createdAt)}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
            {isLoading && (
              <div className="py-12 text-center space-y-3">
                <div className="w-7 h-7 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-gray-400 text-xs">Cargando detalle de la venta...</p>
              </div>
            )}

            {isError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-center">
                <WarningCircle size={20} className="mx-auto mb-1 text-red-500" />
                <p className="font-medium">Error al cargar la venta</p>
                <p className="text-[11px] text-red-500 mt-0.5">
                  {(error as any)?.response?.data?.message || 'No se pudo obtener el detalle.'}
                </p>
              </div>
            )}

            {sale && (
              <>
                {/* Alerta de anulación si aplica */}
                {sale.isVoided && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200/80 text-red-800 space-y-1">
                    <p className="font-semibold text-xs flex items-center gap-1.5">
                      <WarningCircle size={15} />
                      Venta Anulada
                    </p>
                    {sale.voidReason && (
                      <p className="text-[11px] text-red-700">Motivo: {sale.voidReason}</p>
                    )}
                    {sale.voidedAt && (
                      <p className="text-[10px] text-red-600">Fecha de anulación: {formatDateTime(sale.voidedAt)}</p>
                    )}
                  </div>
                )}

                {/* Sección TALLER (Placa, Vehículo, Técnico, Área) */}
                {(isTallerProfile || sale.taller?.vehiculo || sale.taller?.placa) && (
                  <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                      <Wrench size={15} className="text-amber-700" />
                      <span>Información de Taller / Servicio</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                      <div>
                        <span className="text-[10px] font-medium text-amber-800/80 uppercase tracking-wider block">
                          Placa
                        </span>
                        <span className="font-bold text-gray-900 font-mono">
                          {sale.taller?.placa || '—'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-medium text-amber-800/80 uppercase tracking-wider block">
                          Vehículo
                        </span>
                        <span className="font-semibold text-gray-800 truncate block">
                          {sale.taller?.vehiculo || '—'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-medium text-amber-800/80 uppercase tracking-wider block">
                          Técnico / Mecánico
                        </span>
                        <span className="font-semibold text-gray-800 truncate block">
                          {sale.taller?.tecnico || '—'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-medium text-amber-800/80 uppercase tracking-wider block">
                          Bahía / Área
                        </span>
                        <span className="font-semibold text-gray-800 truncate block">
                          {sale.taller?.area || '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cliente & Cajero */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block">
                      Cliente
                    </span>
                    <p className="font-semibold text-gray-900 text-xs">
                      {sale.customer?.name || 'Cliente general'}
                    </p>
                    {sale.customer?.phone && (
                      <p className="text-gray-500 text-[11px]">Tel: {sale.customer.phone}</p>
                    )}
                    {sale.customer?.ruc && (
                      <p className="text-gray-500 text-[11px]">RUC / Cédula: {sale.customer.ruc}</p>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block">
                      Atendido por
                    </span>
                    <p className="font-semibold text-gray-900 text-xs">
                      {sale.cashier?.name || 'Cajero del sistema'}
                    </p>
                    {sale.cashRegister && (
                      <p className="text-gray-500 text-[11px]">
                        Caja #{sale.cashRegister.id.slice(0, 8)}
                      </p>
                    )}
                    <p className="text-gray-500 text-[11px]">
                      Método principal: {sale.paymentMethod || 'Efectivo'}
                    </p>
                  </div>
                </div>

                {/* Ítems de la Venta */}
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-3.5 py-2 border-b border-gray-100 font-semibold text-gray-700 text-xs flex justify-between">
                    <span>Productos y Servicios ({sale.items?.length || 0})</span>
                    <span>Subtotal</span>
                  </div>

                  <div className="divide-y divide-gray-100 max-h-56 overflow-y-auto">
                    {sale.items?.map((item) => (
                      <div key={item.id} className="p-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 text-xs truncate">
                            {item.productName}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                            <span>
                              {formatQuantity(item.quantity, item.unit)} × {formatCurrency(item.unitPrice, currency)}
                            </span>
                            {item.returnedQty > 0 && (
                              <span className="text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded text-[10px]">
                                Devuelto: {formatQuantity(item.returnedQty, item.unit)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-semibold text-gray-900 text-xs">
                            {formatCurrency(item.total, currency)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Resumen Financiero */}
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 space-y-1.5">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(sale.subtotal, currency)}</span>
                  </div>

                  {sale.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Descuento aplicado:</span>
                      <span>-{formatCurrency(sale.discountAmount, currency)}</span>
                    </div>
                  )}

                  {sale.taxAmount > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Impuestos (IVA):</span>
                      <span>{formatCurrency(sale.taxAmount, currency)}</span>
                    </div>
                  )}

                  {sale.totalRefunded > 0 && (
                    <div className="flex justify-between text-amber-700 font-medium">
                      <span>Total reembolsado / devuelto:</span>
                      <span>-{formatCurrency(sale.totalRefunded, currency)}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-200 flex justify-between items-center text-sm font-bold text-gray-900">
                    <span>Total Neto:</span>
                    <span className="text-base text-gray-900">
                      {formatCurrency(sale.netTotal, currency)}
                    </span>
                  </div>

                  <div className="flex justify-between text-[11px] text-gray-500 pt-1">
                    <span>Monto Recibido: {formatCurrency(sale.amountPaid, currency)}</span>
                    <span>Cambio: {formatCurrency(sale.change, currency)}</span>
                  </div>
                </div>

                {/* Notas si existen */}
                {sale.notes && (
                  <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 text-blue-900 text-xs">
                    <span className="font-semibold text-[11px] block text-blue-800">Notas:</span>
                    <p className="mt-0.5">{sale.notes}</p>
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
              className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-medium transition-colors shadow-2xs"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
