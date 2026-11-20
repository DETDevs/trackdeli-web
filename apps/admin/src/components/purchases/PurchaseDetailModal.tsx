import React from 'react';
import {
  X,
  Truck,
  XCircle,
  Trash,
  CreditCard,
} from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { type PosPurchase, getPosPurchaseById } from 'api-client';
import { formatCurrency, formatQuantity } from '../../utils/formatters';
import { formatManaguaDate, formatManaguaDateTime } from '../../utils/dateManagua';
import { extractApiErrorMessage } from '../../utils/productCost';

export interface PurchaseDetailModalProps {
  isOpen: boolean;
  purchaseId: string | null;
  initialPurchase?: PosPurchase | null;
  currency?: string;
  onClose: () => void;
  onRequestVoid: (purchase: PosPurchase) => void;
}

const formatDateOnly = (val?: string | null): string => {
  if (!val) return '—';
  const s = String(val).trim();
  return formatManaguaDate(/^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : s);
};

const PAYABLE_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  PARTIALLY_PAID: 'Abono parcial',
  PAID: 'Pagada',
  CANCELLED: 'Cancelada',
};

export const PurchaseDetailModal: React.FC<PurchaseDetailModalProps> = ({
  isOpen,
  purchaseId,
  initialPurchase = null,
  currency = 'NIO',
  onClose,
  onRequestVoid,
}) => {
  const {
    data: fetchedPurchase,
    isLoading,
    error,
  } = useQuery<PosPurchase>({
    queryKey: ['pos', 'purchases', 'detail', purchaseId],
    queryFn: () => getPosPurchaseById(purchaseId!),
    enabled: isOpen && Boolean(purchaseId),
    staleTime: 10000,
  });

  if (!isOpen || !purchaseId) return null;

  const purchase = fetchedPurchase || initialPurchase;
  const isVoided = purchase?.status === 'VOIDED';
  const items = purchase?.items || [];
  const hasBatches = items.some(
    (it) => Boolean(it.lotNumber || it.batchNumber || it.expiryDate),
  );
  const payable = purchase?.payableAccount || null;
  const activePaymentsCount = payable
    ? (payable.payments || []).filter((p) => !p.isVoided).length
    : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl border border-gray-200 shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-2 bg-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isVoided ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              <Truck size={22} weight="duotone" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                  {purchase?.invoiceNumber
                    ? `Comprobante ${purchase.invoiceNumber}`
                    : `Compra #${purchaseId.slice(0, 8)}`}
                </h3>
                {purchase && (
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      isVoided
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}
                  >
                    {isVoided ? 'Anulada' : 'Recibida'}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 truncate mt-0.5">
                {purchase?.supplier?.name || 'Sin proveedor asignado'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle"
            className="w-11 h-11 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors shrink-0 cursor-pointer"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs text-gray-700">
          {error && !purchase && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
              {extractApiErrorMessage(error, 'No se pudo cargar el detalle de la compra.')}
            </div>
          )}

          {isLoading && !purchase ? (
            <div className="py-12 text-center text-xs text-gray-500">
              Cargando detalle de la compra...
            </div>
          ) : purchase ? (
            <>
              {/* Alerta de anulación */}
              {isVoided && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl space-y-1 text-red-900 text-xs">
                  <div className="flex items-center gap-2 font-bold">
                    <XCircle size={18} weight="fill" className="text-red-600 shrink-0" />
                    <span>Esta compra fue anulada</span>
                  </div>
                  {purchase.voidReason && (
                    <p className="text-red-800 break-words">
                      <strong>Motivo:</strong> {purchase.voidReason}
                    </p>
                  )}
                  <p className="text-red-700">
                    Anulada por: <strong>{purchase.voidedBy?.name || 'Usuario'}</strong>
                    {purchase.voidedAt ? ` el ${formatManaguaDateTime(purchase.voidedAt)}` : ''}
                  </p>
                </div>
              )}

              {/* Cabecera */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="min-w-0">
                  <span className="text-gray-500 block">Proveedor</span>
                  <strong className="text-gray-900 break-words block mt-0.5">
                    {purchase.supplier?.name || 'Sin proveedor'}
                  </strong>
                  {purchase.supplier?.taxId && (
                    <span className="text-gray-600 font-mono block mt-0.5 break-all">
                      RUC: {purchase.supplier.taxId}
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <span className="text-gray-500 block">N.º de comprobante</span>
                  <strong className="font-mono text-gray-900 break-all block mt-0.5">
                    {purchase.invoiceNumber || 'Sin número'}
                  </strong>
                </div>

                <div className="min-w-0">
                  <span className="text-gray-500 block">Fecha de compra</span>
                  <strong className="text-gray-900 block mt-0.5">
                    {formatDateOnly(purchase.purchaseDate)}
                  </strong>
                </div>

                <div className="min-w-0">
                  <span className="text-gray-500 block">Registrada por</span>
                  <strong className="text-gray-900 break-words block mt-0.5">
                    {purchase.createdBy?.name || 'Usuario'}
                  </strong>
                </div>
              </div>

              {/* Cuenta por pagar asociada */}
              {payable && (
                <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <CreditCard size={18} weight="duotone" className="text-purple-700 shrink-0 mt-0.5" />
                    <div className="min-w-0 space-y-0.5">
                      <p className="font-bold text-purple-950">
                        Compra a crédito —{' '}
                        {PAYABLE_STATUS_LABELS[payable.status] || payable.status}
                      </p>
                      <p className="text-purple-800">
                        Vence el {formatDateOnly(payable.dueDate)} ·{' '}
                        {activePaymentsCount}{' '}
                        {activePaymentsCount === 1 ? 'abono activo' : 'abonos activos'}
                      </p>
                    </div>
                  </div>
                  <div className="sm:text-right font-mono shrink-0">
                    <span className="text-purple-800 block">
                      Original: {formatCurrency(Number(payable.originalAmount), currency)}
                    </span>
                    <span className="font-bold text-purple-950 block">
                      Saldo: {formatCurrency(Number(payable.balance), currency)}
                    </span>
                  </div>
                </div>
              )}

              {/* Ítems: móvil en tarjetas / escritorio en tabla */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-gray-900">
                    Productos ingresados ({items.length})
                  </span>
                  <span className="font-bold font-mono text-sm text-gray-900 sm:hidden">
                    Total: {formatCurrency(Number(purchase.total), currency)}
                  </span>
                </div>

                {/* Vista móvil */}
                <div className="sm:hidden space-y-2.5">
                  {items.map((it) => {
                    const lot = it.lotNumber || it.batchNumber;
                    return (
                      <div
                        key={it.id}
                        className="p-3 rounded-xl border border-gray-200 bg-white space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-gray-900 break-words">
                              {it.product?.name || `Producto (${it.productId.slice(0, 8)})`}
                            </p>
                            {(it.product?.barcode || it.product?.sku) && (
                              <p className="text-xs font-mono text-gray-500 break-all">
                                {it.product?.barcode || it.product?.sku}
                              </p>
                            )}
                          </div>
                          <span className="font-bold font-mono text-xs text-gray-900 shrink-0">
                            {formatCurrency(Number(it.subtotal), currency)}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                          <span>
                            {formatQuantity(it.quantity, it.product?.unit || 'UND')} ×{' '}
                            {formatCurrency(Number(it.unitCost), currency)}
                          </span>
                          {lot && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 font-mono font-semibold text-xs">
                              Lote: {lot}
                            </span>
                          )}
                          {it.expiryDate && (
                            <span className="text-gray-700">
                              Vence: {formatDateOnly(it.expiryDate)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Vista escritorio */}
                <div className="hidden sm:block border border-gray-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs text-gray-700">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3.5">Producto</th>
                        {hasBatches && <th className="py-2.5 px-3">Lote</th>}
                        {hasBatches && <th className="py-2.5 px-3">Vence</th>}
                        <th className="py-2.5 px-3 text-right">Cantidad</th>
                        <th className="py-2.5 px-3 text-right">Costo unit.</th>
                        <th className="py-2.5 px-3.5 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {items.map((it) => {
                        const lot = it.lotNumber || it.batchNumber;
                        return (
                          <tr key={it.id} className="hover:bg-gray-50/70">
                            <td className="py-2.5 px-3.5">
                              <div className="font-semibold text-gray-900">
                                {it.product?.name || `Producto (${it.productId.slice(0, 8)})`}
                              </div>
                              {(it.product?.barcode || it.product?.sku) && (
                                <div className="text-xs font-mono text-gray-500">
                                  {it.product?.barcode || it.product?.sku}
                                </div>
                              )}
                            </td>
                            {hasBatches && (
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                {lot ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded font-mono text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200">
                                    {lot}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                            )}
                            {hasBatches && (
                              <td className="py-2.5 px-3 whitespace-nowrap font-mono text-gray-700">
                                {it.expiryDate ? formatDateOnly(it.expiryDate) : '—'}
                              </td>
                            )}
                            <td className="py-2.5 px-3 text-right font-mono font-medium whitespace-nowrap">
                              {formatQuantity(it.quantity, it.product?.unit || 'UND')}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap">
                              {formatCurrency(Number(it.unitCost), currency)}
                            </td>
                            <td className="py-2.5 px-3.5 text-right font-mono font-semibold text-gray-900 whitespace-nowrap">
                              {formatCurrency(Number(it.subtotal), currency)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t border-gray-200">
                      <tr>
                        <td
                          colSpan={hasBatches ? 5 : 3}
                          className="py-3 px-3.5 text-right font-bold text-gray-800"
                        >
                          Total de la compra
                        </td>
                        <td className="py-3 px-3.5 text-right font-bold font-mono text-gray-900 text-sm whitespace-nowrap">
                          {formatCurrency(Number(purchase.total), currency)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {purchase.notes && (
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                  <span className="font-bold text-gray-800 block mb-0.5">Observaciones</span>
                  <p className="text-gray-700 break-words">{purchase.notes}</p>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 bg-gray-50 border-t border-gray-100 flex flex-col-reverse sm:flex-row items-center justify-between gap-2 shrink-0">
          <div className="w-full sm:w-auto">
            {purchase && !isVoided && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRequestVoid(purchase);
                }}
                className="w-full sm:w-auto min-h-[44px] px-4 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash size={15} weight="bold" />
                <span>Anular esta compra</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-[44px] px-5 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-gray-800 text-xs font-semibold transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
