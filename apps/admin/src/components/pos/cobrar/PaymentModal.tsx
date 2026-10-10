import React, { useState, useMemo } from 'react';
import {
  X,
  Money,
  CreditCard,
  ArrowsLeftRight,
  User,
  Phone,
  CircleNotch,
  WarningCircle,
  CaretDown,
  CaretUp,
} from '@phosphor-icons/react';
import { formatCurrency } from '../../../utils/formatters';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  subtotal: number;
  discountAmount: number;
  onSubmitSale: (paymentData: {
    method: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA';
    amountTendered?: number;
    reference?: string;
    customerName?: string;
    customerPhone?: string;
    notes?: string;
  }) => Promise<void>;
  isSubmitting: boolean;
  errorMessage?: string | null;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  total,
  onSubmitSale,
  isSubmitting,
  errorMessage,
}) => {
  const [method, setMethod] = useState<'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA'>('EFECTIVO');
  const [amountTenderedStr, setAmountTenderedStr] = useState<string>(() => total.toFixed(2));
  const [reference, setReference] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [showCustomerFields, setShowCustomerFields] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isOpen) return null;

  const amountTendered = parseFloat(amountTenderedStr) || 0;
  const change = Math.max(0, Math.round((amountTendered - total) * 100) / 100);
  const isShort = method === 'EFECTIVO' && amountTendered < total;

  // Sugerencias de billetes en córdobas
  const quickBills = useMemo(() => {
    const bills = [50, 100, 200, 500, 1000];
    const suggestions = bills.filter((b) => b >= total);
    return suggestions.slice(0, 3);
  }, [total]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (method === 'EFECTIVO' && amountTendered < total) {
      setLocalError(`El monto recibido es menor al total a cobrar (${formatCurrency(total)})`);
      return;
    }

    try {
      await onSubmitSale({
        method,
        amountTendered: method === 'EFECTIVO' ? amountTendered : total,
        reference: reference.trim() || undefined,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    } catch {
      // El error es manejado en el componente padre
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs select-none p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-base text-gray-900 leading-tight">Cobrar venta</h3>
            <p className="text-xs text-gray-500">Selecciona el método de pago</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Total display grande */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 text-center">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-0.5">
              Total a pagar
            </span>
            <div className="text-3xl sm:text-4xl font-black text-emerald-950 tracking-tight">
              {formatCurrency(total)}
            </div>
          </div>

          {(localError || errorMessage) && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <WarningCircle size={16} className="shrink-0 mt-0.5" weight="fill" />
              <span>{localError || errorMessage}</span>
            </div>
          )}

          {/* Selector de métodos de pago */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Método de pago
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMethod('EFECTIVO');
                  setAmountTenderedStr(total.toFixed(2));
                }}
                className={`py-3 px-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  method === 'EFECTIVO'
                    ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Money size={20} weight={method === 'EFECTIVO' ? 'fill' : 'regular'} />
                <span>Efectivo</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('TARJETA')}
                className={`py-3 px-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  method === 'TARJETA'
                    ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <CreditCard size={20} weight={method === 'TARJETA' ? 'fill' : 'regular'} />
                <span>Tarjeta</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('TRANSFERENCIA')}
                className={`py-3 px-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  method === 'TRANSFERENCIA'
                    ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <ArrowsLeftRight size={20} weight={method === 'TRANSFERENCIA' ? 'bold' : 'regular'} />
                <span>Transferencia</span>
              </button>
            </div>
          </div>

          {/* Opciones según método */}
          {method === 'EFECTIVO' && (
            <div className="space-y-3 bg-gray-50/80 p-3.5 rounded-2xl border border-gray-200/70">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Monto recibido (C$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                    C$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amountTenderedStr}
                    onChange={(e) => setAmountTenderedStr(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-base font-black text-gray-900 focus:outline-hidden focus:border-gray-900"
                  />
                </div>
              </div>

              {/* Botones de efectivo rápido */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setAmountTenderedStr(total.toFixed(2))}
                  className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-800 text-[11px] font-bold rounded-lg border border-gray-200"
                >
                  Exacto ({formatCurrency(total)})
                </button>
                {quickBills.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setAmountTenderedStr(b.toFixed(2))}
                    className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-800 text-[11px] font-bold rounded-lg border border-gray-200"
                  >
                    C$ {b}
                  </button>
                ))}
              </div>

              {/* Cálculo de cambio */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                  isShort
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-950 font-bold'
                }`}
              >
                <span>{isShort ? 'Faltan para completar el pago' : 'Cambio / Vuelto'}</span>
                <span className="text-base font-black">
                  {isShort
                    ? formatCurrency(total - amountTendered)
                    : formatCurrency(change)}
                </span>
              </div>
            </div>
          )}

          {method === 'TARJETA' && (
            <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-200/70 space-y-2">
              <label className="block text-xs font-semibold text-gray-700">
                Número de autorización / voucher (opcional)
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ej: 123456"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-hidden focus:border-gray-900"
              />
            </div>
          )}

          {method === 'TRANSFERENCIA' && (
            <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-200/70 space-y-2">
              <label className="block text-xs font-semibold text-gray-700">
                Número de referencia de transferencia (opcional)
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ej: BAC-987654 / Banpro"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-hidden focus:border-gray-900"
              />
            </div>
          )}

          {/* Cliente opcional */}
          <div className="border border-gray-200/70 rounded-2xl overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => setShowCustomerFields((prev) => !prev)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <User size={15} className="text-gray-500" />
                <span>
                  {customerName ? `Cliente: ${customerName}` : 'Datos del cliente (opcional)'}
                </span>
              </div>
              {showCustomerFields ? <CaretUp size={14} /> : <CaretDown size={14} />}
            </button>

            {showCustomerFields && (
              <div className="p-3.5 border-t border-gray-100 bg-gray-50/50 space-y-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">
                    Nombre del cliente
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-hidden focus:border-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">
                    Teléfono
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <Phone size={13} />
                    </span>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Ej: 8888-1234"
                      className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-hidden focus:border-gray-900"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notas de la orden */}
          <div>
            <label className="block text-[11px] font-medium text-gray-600 mb-1">
              Notas de la venta (opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instrucciones o detalles adicionales"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-hidden focus:border-gray-900"
            />
          </div>

          {/* Botón de confirmar cobro */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || isShort}
              className="w-full py-4 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm sm:text-base font-bold rounded-2xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20 active:scale-98 min-h-[50px]"
            >
              {isSubmitting ? (
                <>
                  <CircleNotch size={18} className="animate-spin" />
                  <span>Procesando venta...</span>
                </>
              ) : (
                <span>Confirmar y Cobrar {formatCurrency(total)}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
