import React, { useState } from 'react';
import {
  X,
  CreditCard,
  Clock,
  WarningCircle,
  Coins,
  ArrowCounterClockwise,
  CheckCircle,
  Phone,
  IdentificationBadge,
} from '@phosphor-icons/react';
import { usePayableDetail, useVoidPayablePayment } from '../../hooks/useFinances';
import { formatCurrency } from '../../utils/formatters';
import { formatManaguaDate, formatManaguaDateTime } from '../../utils/dateManagua';

interface PayableDetailModalProps {
  payableId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onRegisterPayment: () => void;
  currency?: string;
}

export const PayableDetailModal: React.FC<PayableDetailModalProps> = ({
  payableId,
  isOpen,
  onClose,
  onRegisterPayment,
  currency = 'NIO',
}) => {
  const { data: payable, isLoading } = usePayableDetail(payableId, isOpen);
  const voidPaymentMutation = useVoidPayablePayment();

  const [voidingPaymentId, setVoidingPaymentId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState<string>('');
  const [voidError, setVoidError] = useState<string | null>(null);

  if (!isOpen || !payableId) return null;

  const handleVoidPayment = async (paymentId: string) => {
    if (!voidReason.trim()) {
      setVoidError('Debes indicar un motivo de anulación');
      return;
    }

    setVoidError(null);
    await voidPaymentMutation.mutateAsync({
      payableId,
      paymentId,
      dto: { reason: voidReason.trim() },
    });

    setVoidingPaymentId(null);
    setVoidReason('');
  };

  const getStatusBadge = () => {
    if (!payable) return null;
    if (payable.status === 'PAID') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle size={13} weight="fill" />
          <span>Pagada</span>
        </span>
      );
    }
    if (payable.isOverdue) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <WarningCircle size={13} weight="fill" />
          <span>Vencida</span>
        </span>
      );
    }
    if (payable.status === 'PARTIALLY_PAID') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock size={13} weight="fill" />
          <span>Abonada parcialmente</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
        <Clock size={13} weight="fill" />
        <span>Pendiente</span>
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <CreditCard size={20} weight="duotone" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm text-gray-900">
                  {payable?.invoiceNumber
                    ? `Factura ${payable.invoiceNumber}`
                    : `Cuenta por Pagar #${payableId.slice(-6)}`}
                </h3>
                {getStatusBadge()}
              </div>
              <p className="text-xs text-gray-500">{payable?.supplier?.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading || !payable ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-7 h-7 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Tarjetas de montos y fechas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[11px] text-gray-400 font-medium block">Total Original</span>
                  <span className="text-sm font-bold text-gray-900 block mt-0.5">
                    {formatCurrency(payable.originalAmount, currency)}
                  </span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[11px] text-gray-400 font-medium block">Total Abonado</span>
                  <span className="text-sm font-bold text-emerald-700 block mt-0.5">
                    {formatCurrency(payable.paidAmount, currency)}
                  </span>
                </div>
                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                  <span className="text-[11px] text-emerald-800 font-semibold block">
                    Saldo Pendiente
                  </span>
                  <span className="text-sm font-bold text-emerald-800 block mt-0.5">
                    {formatCurrency(payable.balance, currency)}
                  </span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[11px] text-gray-400 font-medium block">Vencimiento</span>
                  <span
                    className={`text-xs font-bold block mt-0.5 ${
                      payable.isOverdue ? 'text-rose-600' : 'text-gray-900'
                    }`}
                  >
                    {formatManaguaDate(payable.dueDate)}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {payable.isOverdue
                      ? `${Math.abs(payable.daysToDue)} días vencida`
                      : `${payable.daysToDue} días restantes`}
                  </span>
                </div>
              </div>

              {/* Información de Proveedor y Compra */}
              <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-100 text-xs space-y-2">
                <div className="font-semibold text-gray-800 flex items-center justify-between">
                  <span>Detalles del Proveedor</span>
                  <span className="text-gray-400 font-normal">
                    Emisión: {formatManaguaDate(payable.purchaseDate)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 pt-1 text-gray-600">
                  <div>
                    <span className="text-gray-400 mr-1.5">Nombre:</span>
                    <span className="font-medium text-gray-900">{payable.supplier.name}</span>
                  </div>
                  {payable.supplier.phone && (
                    <div className="flex items-center gap-1">
                      <Phone size={13} className="text-gray-400" />
                      <span>{payable.supplier.phone}</span>
                    </div>
                  )}
                  {payable.supplier.taxId && (
                    <div className="flex items-center gap-1">
                      <IdentificationBadge size={13} className="text-gray-400" />
                      <span>RUC: {payable.supplier.taxId}</span>
                    </div>
                  )}
                </div>
                {payable.notes && (
                  <p className="text-[11px] text-gray-500 pt-1 italic">Notas: {payable.notes}</p>
                )}
              </div>

              {/* Items comprados si existen */}
              {payable.purchase?.items && payable.purchase.items.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                    Productos de la compra ({payable.purchase.items.length})
                  </h4>
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-gray-50 text-gray-400 border-b border-gray-100 text-[10px] uppercase">
                        <tr>
                          <th className="px-3 py-2">Producto</th>
                          <th className="px-3 py-2 text-right">Cant.</th>
                          <th className="px-3 py-2 text-right">Costo Unit.</th>
                          <th className="px-3 py-2 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-gray-700">
                        {payable.purchase.items.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50/50">
                            <td className="px-3 py-2 font-medium text-gray-900">
                              {item.productName}
                            </td>
                            <td className="px-3 py-2 text-right font-mono">{item.quantity}</td>
                            <td className="px-3 py-2 text-right font-mono">
                              {formatCurrency(item.cost, currency)}
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-gray-900 font-mono">
                              {formatCurrency(item.subtotal, currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Historial de Abonos */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                    Historial de Abonos ({payable.payments.length})
                  </h4>
                  {payable.balance > 0 && payable.status !== 'PAID' && (
                    <button
                      onClick={onRegisterPayment}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-gray-900 hover:bg-black transition-colors cursor-pointer"
                    >
                      <Coins size={14} weight="bold" />
                      <span>Registrar abono</span>
                    </button>
                  )}
                </div>

                {payable.payments.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-4 text-center bg-gray-50 rounded-xl">
                    No se han registrado abonos todavía para esta cuenta.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {payable.payments.map((p) => {
                      const isVoidingThis = voidingPaymentId === p.id;

                      return (
                        <div
                          key={p.id}
                          className={`p-3.5 rounded-xl border transition-all ${
                            p.isVoided
                              ? 'bg-rose-50/30 border-rose-200/60 opacity-70'
                              : 'bg-white border-gray-200/80 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm text-gray-900 font-mono">
                                  {formatCurrency(p.amount, currency)}
                                </span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700">
                                  {p.paymentMethod}
                                </span>
                                {p.isVoided && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                    Anulado
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-gray-400 mt-0.5">
                                {formatManaguaDateTime(p.paidAt)} • Registrado por:{' '}
                                <span className="text-gray-600 font-medium">
                                  {p.paidBy?.name || 'Usuario'}
                                </span>
                              </p>
                              {p.notes && (
                                <p className="text-xs text-gray-600 mt-1 italic">
                                  Ref: {p.notes}
                                </p>
                              )}
                              {p.isVoided && p.voidReason && (
                                <p className="text-[11px] text-rose-700 mt-1">
                                  Motivo anulación: {p.voidReason}
                                </p>
                              )}
                            </div>

                            {!p.isVoided && (
                              <div>
                                {isVoidingThis ? (
                                  <button
                                    onClick={() => setVoidingPaymentId(null)}
                                    className="text-xs text-gray-500 hover:text-gray-800"
                                  >
                                    Cancelar
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setVoidingPaymentId(p.id);
                                      setVoidReason('');
                                      setVoidError(null);
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1"
                                    title="Anular abono"
                                  >
                                    <ArrowCounterClockwise size={14} />
                                    <span>Anular</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Subformulario de confirmación de anulación */}
                          {isVoidingThis && (
                            <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                              <label className="block text-[11px] font-semibold text-gray-700">
                                Motivo de anulación *
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={voidReason}
                                  onChange={(e) => {
                                    setVoidReason(e.target.value);
                                    setVoidError(null);
                                  }}
                                  placeholder="Ej: Monto ingresado por error"
                                  className="flex-1 h-9 px-3 rounded-lg border border-gray-200 text-xs bg-white focus:outline-none focus:border-rose-500"
                                />
                                <button
                                  type="button"
                                  disabled={voidPaymentMutation.isPending}
                                  onClick={() => handleVoidPayment(p.id)}
                                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition-colors disabled:opacity-50"
                                >
                                  {voidPaymentMutation.isPending ? 'Anulando...' : 'Confirmar'}
                                </button>
                              </div>
                              {voidError && (
                                <p className="text-[11px] text-rose-600 font-medium">{voidError}</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
          <span className="text-[11px] text-gray-400">
            {payable ? `ID: ${payable.id}` : ''}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
