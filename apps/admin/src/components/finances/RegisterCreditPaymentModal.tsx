import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  X,
  Coins,
  WarningCircle,
} from '@phosphor-icons/react';
import { registerCreditPayment } from 'api-client';
import { useAuthStore } from '../../store/auth.store';
import { formatCurrency } from '../../utils/formatters';
import { formatManaguaDate } from '../../utils/dateManagua';
import { CreditPaymentReceiptModal } from './CreditPaymentReceiptModal';
import { type CreditAbonoPrintData } from '../../utils/receiptPdf';

interface InstallmentInfo {
  id?: string;
  installmentNumber: number;
  amount: number;
  paidAmount?: number;
  dueDate: string;
  status: string;
}

export interface CreditAccountForPayment {
  id: string;
  invoiceNumber?: string;
  sale?: { invoiceNumber?: string };
  customer: {
    id?: string;
    name: string;
    phone?: string | null;
  };
  balance: number;
  originalAmount?: number;
  installments?: InstallmentInfo[];
}

interface RegisterCreditPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: CreditAccountForPayment | null;
  onSuccess: (payment: any, updatedAccount: any) => void;
  currency?: string;
}

export const RegisterCreditPaymentModal: React.FC<RegisterCreditPaymentModalProps> = ({
  isOpen,
  onClose,
  account,
  onSuccess,
  currency = 'NIO',
}) => {
  const user = useAuthStore((state) => state.user);

  const [amountStr, setAmountStr] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('EFECTIVO');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Recibo de abono post-éxito
  const [receiptData, setReceiptData] = useState<CreditAbonoPrintData | null>(null);

  // Clave de idempotencia única por intento de abono (se preserva en reintentos mientras el modal esté abierto)
  const idempotencyKeyRef = useRef<string>('');

  useEffect(() => {
    if (isOpen && account) {
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = window.crypto?.randomUUID ? window.crypto.randomUUID() : `abono-${Date.now()}`;
      }
    } else {
      idempotencyKeyRef.current = '';
    }
  }, [isOpen, account]);

  if (!isOpen || !account) return null;

  const now = new Date();
  const accBalance = Number(account.balance || 0);

  // Cálculos de cuotas pendientes y vencidas
  const processedInstallments = (account.installments || []).map((inst) => {
    const amount = Number(inst.amount || 0);
    const paid = Number(inst.paidAmount || 0);
    const pending = Math.max(0, Number((amount - paid).toFixed(2)));
    const isPaid = inst.status === 'PAID' || pending <= 0.005;
    const isOverdue = inst.status === 'OVERDUE' || (new Date(inst.dueDate) < now && !isPaid);

    return {
      ...inst,
      amount,
      paid,
      pending,
      isPaid,
      isOverdue,
    };
  });

  // Vencido a hoy: suma de cuotas vencidas
  const todayOverdue = processedInstallments
    .filter((inst) => !inst.isPaid && inst.isOverdue)
    .reduce((sum, inst) => sum + inst.pending, 0);

  // Próxima cuota: pendiente de la primera cuota no saldada
  const nextInstallment = processedInstallments.find((inst) => !inst.isPaid && inst.pending > 0);
  const nextInstallmentAmount = nextInstallment ? nextInstallment.pending : 0;

  const numericAmount = parseFloat(amountStr) || 0;
  const isAmountValid = numericAmount > 0 && numericAmount <= accBalance + 0.01;

  // Vista previa FIFO de cuotas cubiertas
  const paymentPreview = useMemo(() => {
    if (numericAmount <= 0 || numericAmount > accBalance + 0.01) return null;
    let remaining = numericAmount;
    const coveredParts: string[] = [];

    const sorted = [...processedInstallments]
      .filter((inst) => !inst.isPaid && inst.pending > 0)
      .sort((a, b) => a.installmentNumber - b.installmentNumber);

    for (const inst of sorted) {
      if (remaining <= 0) break;
      if (remaining >= inst.pending) {
        coveredParts.push(`Cuota ${inst.installmentNumber} completa`);
        remaining -= inst.pending;
      } else {
        const newPaid = inst.paid + remaining;
        coveredParts.push(
          `Cuota ${inst.installmentNumber} parcial (${formatCurrency(newPaid, currency)} de ${formatCurrency(inst.amount, currency)})`
        );
        remaining = 0;
      }
    }
    return coveredParts.join(', ');
  }, [numericAmount, processedInstallments, accBalance, currency]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!isAmountValid) {
      if (numericAmount <= 0) {
        setErrorMsg('El monto a abonar debe ser mayor a 0');
      } else {
        setErrorMsg(`El monto (${formatCurrency(numericAmount, currency)}) no puede superar el saldo pendiente (${formatCurrency(accBalance, currency)})`);
      }
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = window.crypto?.randomUUID ? window.crypto.randomUUID() : `abono-${Date.now()}`;
    }
    const idempotencyKey = idempotencyKeyRef.current;

    try {
      const response = await registerCreditPayment(
        account.id,
        {
          amount: Math.round(numericAmount * 100) / 100,
          paymentMethod,
          notes: notes.trim() || undefined,
        },
        undefined,
        {
          'Idempotency-Key': idempotencyKey,
        }
      );

      const updatedAccount = response.account;
      const payment = response.payment;

      setIsSubmitting(false);
      idempotencyKeyRef.current = '';
      onSuccess(payment, updatedAccount);

      // Preparar recibo
      const invoiceNumber = account.sale?.invoiceNumber || account.invoiceNumber;
      setReceiptData({
        paymentNumber: payment?.id?.slice(-6) || `AB-${Date.now().toString().slice(-6)}`,
        invoiceNumber,
        receivedAt: payment?.receivedAt || new Date().toISOString(),
        customerName: account.customer.name,
        customerPhone: account.customer.phone || undefined,
        amount: numericAmount,
        paymentMethod,
        notes: notes.trim() || undefined,
        previousBalance: accBalance,
        newBalance: updatedAccount?.balance !== undefined ? updatedAccount.balance : Math.max(0, accBalance - numericAmount),
        cashierName: user?.name || undefined,
        installmentsSummary: paymentPreview || undefined,
      });
    } catch (err: any) {
      setIsSubmitting(false);
      const msg = err?.response?.data?.message?.message || err?.response?.data?.message || 'Error al registrar el abono';
      setErrorMsg(typeof msg === 'string' ? msg : 'Error al registrar el abono');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-in fade-in duration-200">
        <div className="bg-white rounded-t-3xl sm:rounded-3xl border border-gray-200 w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-emerald-50/60">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                <Coins size={22} weight="bold" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-gray-900">
                  Registrar Abono a Crédito
                </h3>
                <p className="text-xs text-emerald-800">
                  Cliente: <span className="font-semibold">{account.customer.name}</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-11 h-11 rounded-xl hover:bg-emerald-100 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={20} weight="bold" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
                <WarningCircle size={18} weight="fill" className="text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Resumen del crédito */}
            <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-500">Saldo pendiente</span>
                <span className="text-lg font-bold text-gray-900 font-mono">
                  {formatCurrency(accBalance, currency)}
                </span>
              </div>

              {todayOverdue > 0 && (
                <div className="flex items-center justify-between text-rose-700 font-semibold text-xs pt-1 border-t border-gray-200">
                  <span>Monto vencido a hoy:</span>
                  <span className="font-mono font-bold">{formatCurrency(todayOverdue, currency)}</span>
                </div>
              )}

              {nextInstallment && (
                <div className="flex items-center justify-between text-[11px] text-gray-600 pt-1 border-t border-gray-200">
                  <span>
                    Próxima cuota (#{nextInstallment.installmentNumber} · {formatManaguaDate(nextInstallment.dueDate)}):
                  </span>
                  <span className="font-mono font-bold text-gray-900">
                    {formatCurrency(nextInstallment.pending, currency)}
                  </span>
                </div>
              )}
            </div>

            {/* Botones de sugerencia rápida */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                Monto sugerido
              </span>
              <div className="flex flex-wrap gap-2">
                {nextInstallmentAmount > 0 && nextInstallmentAmount !== accBalance && (
                  <button
                    type="button"
                    onClick={() => setAmountStr(nextInstallmentAmount.toFixed(2))}
                    className="h-11 px-3.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 font-semibold text-xs text-gray-800 transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5"
                  >
                    <span>Próxima cuota</span>
                    <span className="font-mono font-bold text-emerald-700">
                      ({formatCurrency(nextInstallmentAmount, currency)})
                    </span>
                  </button>
                )}

                {todayOverdue > 0 && todayOverdue !== accBalance && todayOverdue !== nextInstallmentAmount && (
                  <button
                    type="button"
                    onClick={() => setAmountStr(todayOverdue.toFixed(2))}
                    className="h-11 px-3.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 font-semibold text-xs text-rose-800 transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5"
                  >
                    <span>Vencido</span>
                    <span className="font-mono font-bold text-rose-700">
                      ({formatCurrency(todayOverdue, currency)})
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setAmountStr(accBalance.toFixed(2))}
                  className="h-11 px-3.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 font-semibold text-xs text-gray-800 transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5"
                >
                  <span>Saldar todo</span>
                  <span className="font-mono font-bold text-emerald-700">
                    ({formatCurrency(accBalance, currency)})
                  </span>
                </button>
              </div>
            </div>

            {/* Input de Monto */}
            <div className="space-y-1.5">
              <label className="font-bold text-xs text-gray-800 block">
                Monto a abonar <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                  C$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={accBalance}
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-11 pl-9 pr-3 rounded-xl border border-gray-200 font-mono font-bold text-base text-gray-900 bg-white focus:outline-none focus:border-gray-900 shadow-2xs"
                />
              </div>
            </div>

            {/* Vista previa FIFO */}
            {paymentPreview && (
              <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs text-emerald-900 space-y-0.5">
                <span className="font-bold text-[11px] text-emerald-800 block">
                  Aplicación estimada del abono (FIFO):
                </span>
                <p className="text-emerald-950 font-medium">{paymentPreview}</p>
              </div>
            )}

            {/* Método de Pago */}
            <div className="space-y-1.5">
              <label className="font-bold text-xs text-gray-800 block">
                Método de pago <span className="text-rose-600">*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-800 bg-white focus:outline-none focus:border-gray-900"
              >
                <option value="EFECTIVO">Efectivo</option>
                <option value="TARJETA">Tarjeta</option>
                <option value="TRANSFERENCIA">Transferencia bancaria</option>
              </select>
            </div>

            {/* Referencia o notas */}
            <div className="space-y-1.5">
              <label className="font-bold text-xs text-gray-800 block">
                Referencia o notas (opcional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="N° de transferencia, recibo manual, etc."
                className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-800 focus:outline-none focus:border-gray-900"
              />
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="w-full sm:w-auto h-11 px-5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !isAmountValid}
                className="w-full sm:w-auto h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-2xs cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Coins size={16} weight="bold" />
                    <span>Confirmar abono</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Recibo del abono post-éxito */}
      <CreditPaymentReceiptModal
        isOpen={Boolean(receiptData)}
        onClose={() => {
          setReceiptData(null);
          onClose();
        }}
        abonoData={receiptData}
        currency={currency}
      />
    </>
  );
};
