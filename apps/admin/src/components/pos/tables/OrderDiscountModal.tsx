import React, { useEffect, useState } from 'react';
import { X, Percent, CurrencyCircleDollar, WarningCircle, CircleNotch } from '@phosphor-icons/react';
import { formatCurrency } from '../../../utils/formatters';

interface OrderDiscountModalProps {
  isOpen: boolean;
  subtotal: number;
  currentPercent: number;
  currentAmount: number;
  currency?: string;
  userRole: string;
  cashierMaxDiscountPercent: number;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onApply: (dto: { discountPercent?: number; discountAmount?: number }) => Promise<void>;
}

export const OrderDiscountModal: React.FC<OrderDiscountModalProps> = ({
  isOpen,
  subtotal,
  currentPercent,
  currentAmount,
  currency = 'NIO',
  userRole,
  cashierMaxDiscountPercent,
  isSubmitting,
  errorMessage,
  onClose,
  onApply,
}) => {
  const [mode, setMode] = useState<'PERCENT' | 'AMOUNT'>('PERCENT');
  const [valueStr, setValueStr] = useState<string>('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLocalError(null);
      if (currentPercent > 0) {
        setMode('PERCENT');
        setValueStr(String(currentPercent));
      } else if (currentAmount > 0) {
        setMode('AMOUNT');
        setValueStr(String(currentAmount));
      } else {
        setMode('PERCENT');
        setValueStr('');
      }
    }
  }, [isOpen, currentPercent, currentAmount]);

  if (!isOpen) return null;

  const isCashier = String(userRole || '').toUpperCase() === 'CAJERO';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const num = Number(valueStr);
    if (!Number.isFinite(num) || num < 0) {
      setLocalError('Ingresá un valor válido mayor o igual a 0.');
      return;
    }

    if (mode === 'PERCENT') {
      if (num > 100) {
        setLocalError('El porcentaje no puede superar 100 %.');
        return;
      }
      if (isCashier && num > cashierMaxDiscountPercent) {
        setLocalError(
          `Tu rol permite como máximo ${cashierMaxDiscountPercent} % de descuento.`,
        );
        return;
      }
      await onApply({ discountPercent: num, discountAmount: 0 });
      return;
    }

    if (subtotal > 0 && num > subtotal) {
      setLocalError(
        `El monto no puede superar el subtotal (${formatCurrency(subtotal, currency)}).`,
      );
      return;
    }
    if (isCashier && subtotal > 0) {
      const pct = (num / subtotal) * 100;
      if (pct > cashierMaxDiscountPercent) {
        setLocalError(
          `Este descuento equivale a ${pct.toFixed(1)} % y supera el límite de cajero (${cashierMaxDiscountPercent} %).`,
        );
        return;
      }
    }
    await onApply({ discountPercent: 0, discountAmount: num });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-[#0F0F0F]">
              Descuento general
            </h3>
            <p className="text-xs text-gray-500">
              Subtotal actual: {formatCurrency(subtotal, currency)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="min-h-[44px] min-w-[44px] rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center cursor-pointer"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-gray-100 border border-gray-200">
            <button
              type="button"
              onClick={() => {
                setMode('PERCENT');
                setLocalError(null);
              }}
              className={`min-h-[44px] px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'PERCENT'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Percent size={15} weight="bold" />
              <span>Porcentaje (%)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('AMOUNT');
                setLocalError(null);
              }}
              className={`min-h-[44px] px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'AMOUNT'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CurrencyCircleDollar size={15} weight="bold" />
              <span>Monto fijo</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              {mode === 'PERCENT' ? 'Porcentaje de descuento (%)' : 'Monto a descontar'}
            </label>
            <input
              type="number"
              step="any"
              min="0"
              max={mode === 'PERCENT' ? 100 : subtotal > 0 ? subtotal : undefined}
              value={valueStr}
              onChange={(e) => {
                setValueStr(e.target.value);
                setLocalError(null);
              }}
              placeholder={mode === 'PERCENT' ? 'Ej: 10' : 'Ej: 50'}
              className="w-full min-h-[44px] px-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-900 tabular-nums focus:outline-none focus:border-gray-900"
            />
            {isCashier && (
              <p className="text-xs text-gray-500 mt-1">
                Límite configurado para cajero: hasta {cashierMaxDiscountPercent} %.
              </p>
            )}
          </div>

          {(localError || errorMessage) && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <WarningCircle size={16} weight="fill" className="shrink-0 mt-0.5" />
              <span>{localError || errorMessage}</span>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
            {(currentPercent > 0 || currentAmount > 0) && (
              <button
                type="button"
                onClick={() => onApply({ discountPercent: 0, discountAmount: 0 })}
                disabled={isSubmitting}
                className="min-h-[44px] px-3.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-xs font-semibold text-red-700 cursor-pointer"
              >
                Quitar
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="min-h-[44px] flex-1 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[44px] flex-1 px-4 rounded-xl bg-[#0F0F0F] hover:bg-gray-800 text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <CircleNotch size={16} className="animate-spin" />
                  <span>Aplicando...</span>
                </>
              ) : (
                <span>Aplicar descuento</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
