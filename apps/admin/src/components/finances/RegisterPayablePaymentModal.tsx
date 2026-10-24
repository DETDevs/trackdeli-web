import React, { useState, useEffect } from 'react';
import { X, Coins, Check } from '@phosphor-icons/react';
import { PayableItem } from '../../types/finances';
import { useCreatePayablePayment } from '../../hooks/useFinances';
import { formatCurrency } from '../../utils/formatters';

interface RegisterPayablePaymentModalProps {
  payable: PayableItem | null;
  isOpen: boolean;
  onClose: () => void;
  currency?: string;
}

const PAYMENT_METHODS = [
  { id: 'TRANSFERENCIA', label: 'Transferencia bancaria' },
  { id: 'EFECTIVO', label: 'Efectivo (sin caja)' },
  { id: 'TARJETA', label: 'Tarjeta' },
  { id: 'CHEQUE', label: 'Cheque' },
  { id: 'OTRO', label: 'Otro' },
];

export const RegisterPayablePaymentModal: React.FC<RegisterPayablePaymentModalProps> = ({
  payable,
  isOpen,
  onClose,
  currency = 'NIO',
}) => {
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('TRANSFERENCIA');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const createPaymentMutation = useCreatePayablePayment();

  useEffect(() => {
    if (payable) {
      setAmount(String(payable.balance));
      setPaymentMethod('TRANSFERENCIA');
      setNotes('');
      setError(null);
    }
  }, [payable, isOpen]);

  if (!isOpen || !payable) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Ingresa un monto válido mayor a 0');
      return;
    }

    if (numAmount > payable.balance + 0.009) {
      setError(`El monto no puede superar el saldo pendiente (${formatCurrency(payable.balance, currency)})`);
      return;
    }

    setError(null);

    await createPaymentMutation.mutateAsync({
      payableId: payable.id,
      dto: {
        amount: Math.round(numAmount * 100) / 100,
        paymentMethod,
        notes: notes.trim() || undefined,
        deductFromCurrentShift: false,
      },
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-in">
        <div className="px-6 py-4.5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Coins size={18} weight="bold" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-900">Registrar Abono a Proveedor</h3>
              <p className="text-xs text-gray-500 truncate max-w-[260px]">
                {payable.supplier.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Resumen de cuenta */}
          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Factura / Compra:</span>
              <span className="font-semibold text-gray-800">
                {payable.invoiceNumber || `Compra #${payable.purchaseId.slice(-6)}`}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Monto Original:</span>
              <span className="font-medium text-gray-700">
                {formatCurrency(payable.originalAmount, currency)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1.5 border-t border-gray-200/60">
              <span className="text-gray-700 font-semibold">Saldo Pendiente:</span>
              <span className="font-bold text-emerald-700 text-sm">
                {formatCurrency(payable.balance, currency)}
              </span>
            </div>
          </div>

          {/* Campo Monto */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-gray-700">
                Monto a abonar *
              </label>
              <button
                type="button"
                onClick={() => setAmount(String(payable.balance))}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
              >
                Pagar saldo total
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">
                {currency === 'USD' ? '$' : 'C$'}
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={payable.balance}
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError(null);
                }}
                placeholder="0.00"
                autoFocus
                required
                className="w-full h-11 pl-9 pr-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-900 bg-white focus:outline-none focus:border-gray-900"
              />
            </div>
            {error && <p className="text-[11px] font-medium text-rose-600 mt-1">{error}</p>}
          </div>

          {/* Método de pago */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Método de pago *
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-medium text-gray-900 bg-white focus:outline-none focus:border-gray-900"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Notas / Referencia */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Referencia / Comprobante (opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Transferencia BAC #992384"
              className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs text-gray-900 bg-white focus:outline-none focus:border-gray-900"
            />
          </div>

          {/* Nota informativa web */}
          <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-100 text-[11px] text-emerald-800 leading-relaxed">
            💡 Este abono se registra como pago directo al proveedor. Desde la web no se descuenta de caja física.
          </div>

          {/* Botones de acción */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createPaymentMutation.isPending}
              className="inline-flex items-center gap-1.5 px-4.5 py-2 text-xs font-bold text-white bg-gray-900 hover:bg-black rounded-xl transition-colors disabled:opacity-50"
            >
              {createPaymentMutation.isPending ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check size={14} weight="bold" />
              )}
              <span>Registrar abono</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
