import React from 'react';
import {
  X,
  Wallet,
  Clock,
  WarningCircle,
  Coins,
  CheckCircle,
  Phone,
  Receipt,
  User,
  CalendarBlank,
} from '@phosphor-icons/react';
import { useCreditAccountDetail } from '../../hooks/useFinances';
import { formatCurrency } from '../../utils/formatters';
import { formatManaguaDate, formatManaguaDateTime } from '../../utils/dateManagua';

interface CreditAccountDetailModalProps {
  accountId: string | null;
  isOpen: boolean;
  onClose: () => void;
  currency?: string;
}

export const CreditAccountDetailModal: React.FC<CreditAccountDetailModalProps> = ({
  accountId,
  isOpen,
  onClose,
  currency = 'NIO',
}) => {
  const { data: account, isLoading } = useCreditAccountDetail(accountId, isOpen);

  if (!isOpen || !accountId) return null;

  const getAccountStatusBadge = () => {
    if (!account) return null;
    if (account.status === 'PAID' || account.balance <= 0.005) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle size={13} weight="fill" />
          <span>Saldada</span>
        </span>
      );
    }
    if (account.status === 'OVERDUE' || new Date(account.dueDate) < new Date()) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <WarningCircle size={13} weight="fill" />
          <span>Vencida</span>
        </span>
      );
    }
    if (account.status === 'PARTIALLY_PAID') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock size={13} weight="fill" />
          <span>Abono parcial</span>
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

  const getInstallmentStatusBadge = (status: string, dueDate: string) => {
    const isOverdue = status === 'OVERDUE' || (new Date(dueDate) < new Date() && status !== 'PAID');
    if (status === 'PAID') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle size={11} weight="fill" />
          <span>Pagada</span>
        </span>
      );
    }
    if (isOverdue) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <WarningCircle size={11} weight="fill" />
          <span>Vencida</span>
        </span>
      );
    }
    if (status === 'PARTIALLY_PAID') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock size={11} weight="fill" />
          <span>Parcial</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
        <Clock size={11} weight="regular" />
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
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Wallet size={20} weight="duotone" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-gray-900">
                  Cuenta por Cobrar {account?.sale?.invoiceNumber ? `• Factura ${account.sale.invoiceNumber}` : ''}
                </h3>
                {getAccountStatusBadge()}
              </div>
              <p className="text-xs text-gray-400">
                {account ? `Cliente: ${account.customer.name}` : 'Cargando detalles...'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !account ? (
            <div className="text-center py-12 text-sm text-gray-500">
              No se pudo cargar la información de la cuenta.
            </div>
          ) : (
            <>
              {/* Información del Cliente */}
              <div className="p-3.5 rounded-xl bg-gray-50/80 border border-gray-200/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <User size={15} className="text-gray-400" />
                  <span className="font-bold text-gray-900">{account.customer.name}</span>
                  {account.customer.ruc && (
                    <span className="text-[11px] text-gray-500">RUC: {account.customer.ruc}</span>
                  )}
                </div>
                {account.customer.phone && (
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Phone size={14} className="text-gray-400" />
                    <span>{account.customer.phone}</span>
                  </div>
                )}
                {account.frequency && (
                  <div className="flex items-center gap-1 text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100 text-[11px]">
                    <CalendarBlank size={13} />
                    <span>Frecuencia: {account.frequency}</span>
                  </div>
                )}
              </div>

              {/* Desglose Financiero del Crédito */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Coins size={14} weight="bold" />
                  <span>Desglose de la Operación de Crédito</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {/* Total Productos */}
                  <div className="p-3 rounded-xl bg-gray-50/70 border border-gray-200/70 space-y-0.5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Total Productos
                    </span>
                    <span className="text-sm font-bold text-gray-900 font-mono">
                      {formatCurrency(account.desglose.totalProductos, currency)}
                    </span>
                    <p className="text-[10px] text-gray-400">Venta base de mercancía</p>
                  </div>

                  {/* Prima recibida */}
                  <div className="p-3 rounded-xl bg-gray-50/70 border border-gray-200/70 space-y-0.5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Prima (Enganche)
                    </span>
                    <span className="text-sm font-bold text-gray-700 font-mono">
                      {formatCurrency(account.desglose.prima, currency)}
                    </span>
                    <p className="text-[10px] text-gray-400">
                      {account.desglose.prima > 0 ? 'Abonada en la venta' : 'Sin prima inicial'}
                    </p>
                  </div>

                  {/* Monto fiado */}
                  <div className="p-3 rounded-xl bg-gray-50/70 border border-gray-200/70 space-y-0.5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Monto Fiado
                    </span>
                    <span className="text-sm font-bold text-blue-700 font-mono">
                      {formatCurrency(account.desglose.fiado, currency)}
                    </span>
                    <p className="text-[10px] text-gray-400">Total fiado sin intereses</p>
                  </div>

                  {/* Interés aplicado */}
                  <div className="p-3 rounded-xl bg-gray-50/70 border border-gray-200/70 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                        Interés
                      </span>
                      {account.desglose.interestRate > 0 && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800">
                          {account.desglose.interestType === 'FLAT' ? 'Flat' : 'Mensual'} {account.desglose.interestRate}%
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-bold text-purple-700 font-mono">
                      {account.desglose.interestAmount > 0
                        ? `+${formatCurrency(account.desglose.interestAmount, currency)}`
                        : formatCurrency(0, currency)}
                    </span>
                    <p className="text-[10px] text-gray-400">
                      {account.desglose.interestAmount > 0 ? 'Interés agregado' : 'Sin interés aplicado'}
                    </p>
                  </div>

                  {/* Total a pagar */}
                  <div className="p-3 rounded-xl bg-gray-50/70 border border-gray-200/70 space-y-0.5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Total a Pagar
                    </span>
                    <span className="text-sm font-bold text-gray-900 font-mono">
                      {formatCurrency(account.desglose.totalAPagar, currency)}
                    </span>
                    <p className="text-[10px] text-gray-400">Capital + Interés</p>
                  </div>

                  {/* Saldo pendiente */}
                  <div className={`p-3 rounded-xl border space-y-0.5 ${
                    account.balance <= 0.005
                      ? 'bg-emerald-50/60 border-emerald-200'
                      : 'bg-rose-50/60 border-rose-200'
                  }`}>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Saldo Pendiente
                    </span>
                    <span className={`text-sm font-bold font-mono ${
                      account.balance <= 0.005 ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {formatCurrency(account.balance, currency)}
                    </span>
                    <p className="text-[10px] text-gray-500">
                      {account.balance <= 0.005 ? 'Completamente pagada' : 'Por cobrar'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Plan de Pagos / Tabla de Cuotas */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CalendarBlank size={14} weight="bold" />
                    <span>Plan de Pagos ({account.installments.length} {account.installments.length === 1 ? 'cuota' : 'cuotas'})</span>
                  </h4>
                  {account.installments.length === 1 && (
                    <span className="text-[10px] text-gray-400 italic">Pago único</span>
                  )}
                </div>

                <div className="border border-gray-200/80 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50/80 text-gray-500 border-b border-gray-100 text-[11px] uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Cuota</th>
                        <th className="py-2.5 px-3">Vencimiento</th>
                        <th className="py-2.5 px-3 text-right">Monto</th>
                        <th className="py-2.5 px-3 text-right">Abonado</th>
                        <th className="py-2.5 px-3 text-right">Saldo</th>
                        <th className="py-2.5 px-3 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {account.installments.map((inst) => {
                        const instBalance = Math.max(0, Math.round((inst.amount - inst.paidAmount) * 100) / 100);
                        return (
                          <tr key={inst.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-2.5 px-3 font-semibold text-gray-900">
                              #{inst.installmentNumber}
                              {account.installments.length > 1 && (
                                <span className="text-gray-400 font-normal text-[10px] ml-1">
                                  de {account.installments.length}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-gray-600 font-medium">
                              {formatManaguaDate(inst.dueDate)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-medium text-gray-900">
                              {formatCurrency(inst.amount, currency)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-medium">
                              {formatCurrency(inst.paidAmount, currency)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900">
                              {formatCurrency(instBalance, currency)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {getInstallmentStatusBadge(inst.status, inst.dueDate)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Historial de Abonos Recibidos */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt size={14} weight="bold" />
                  <span>Historial de Abonos Recibidos ({account.payments?.length || 0})</span>
                </h4>

                {(!account.payments || account.payments.length === 0) ? (
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-center text-xs text-gray-400 italic">
                    No se han registrado abonos para esta cuenta.
                  </div>
                ) : (
                  <div className="border border-gray-200/80 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50/80 text-gray-500 border-b border-gray-100 text-[11px] uppercase tracking-wider font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">Fecha y Hora</th>
                          <th className="py-2.5 px-3 text-right">Monto</th>
                          <th className="py-2.5 px-3 text-right">Capital</th>
                          <th className="py-2.5 px-3 text-right">Interés</th>
                          <th className="py-2.5 px-3">Método</th>
                          <th className="py-2.5 px-3">Recibido por</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {account.payments.map((payment) => (
                          <tr key={payment.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-2.5 px-3 text-gray-700 whitespace-nowrap">
                              {formatManaguaDateTime(payment.receivedAt)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                              {formatCurrency(payment.amount, currency)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-gray-700">
                              {formatCurrency(payment.principalPortion ?? payment.amount, currency)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-purple-700">
                              {payment.interestPortion > 0
                                ? `+${formatCurrency(payment.interestPortion, currency)}`
                                : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-gray-600">
                              <span className="px-1.5 py-0.5 rounded bg-gray-100 text-[10px] font-semibold text-gray-700">
                                {payment.paymentMethod}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-gray-600 truncate max-w-[120px]">
                              {payment.receivedByUser?.name || 'Cajero'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between shrink-0 text-xs">
          <p className="text-[11px] text-gray-400">
            💡 Los abonos se registran desde la app de escritorio TrackDeli POS en caja registradora.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
