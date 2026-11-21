import React, { useEffect, useState } from 'react';
import { X, WarningCircle, Trash, Minus, Plus, CircleNotch } from '@phosphor-icons/react';
import type { PosTableOrderItem } from 'api-client';
import { formatCurrency } from '../../../utils/formatters';

interface VoidTableItemModalProps {
  isOpen: boolean;
  item: PosTableOrderItem | null;
  currency?: string;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onConfirm: (payload: { qty: number; reason: string }) => Promise<void>;
}

const QUICK_REASONS = [
  'Error al tomar el pedido',
  'Cliente canceló el producto',
  'Producto agotado en cocina',
];

export const VoidTableItemModal: React.FC<VoidTableItemModalProps> = ({
  isOpen,
  item,
  currency = 'NIO',
  isSubmitting,
  errorMessage,
  onClose,
  onConfirm,
}) => {
  const [qty, setQty] = useState<number>(1);
  const [reason, setReason] = useState<string>('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && item) {
      setQty(Number(item.quantity) || 1);
      setReason('');
      setLocalError(null);
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const maxQty = Number(item.quantity) || 1;
  const step = Number.isInteger(maxQty) ? 1 : 0.25;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!Number.isFinite(qty) || qty <= 0 || qty > maxQty) {
      setLocalError(`La cantidad a anular debe estar entre 0.01 y ${maxQty}.`);
      return;
    }

    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      setLocalError('El motivo de anulación es obligatorio (mínimo 3 caracteres).');
      return;
    }

    await onConfirm({ qty, reason: trimmed });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
              <Trash size={18} weight="bold" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-[#0F0F0F] truncate">
                Anular producto enviado
              </h3>
              <p className="text-xs text-gray-500 truncate">{item.productName}</p>
            </div>
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-between gap-2 text-xs">
            <span className="text-gray-600">
              Cantidad en mesa: <strong className="text-gray-900">{maxQty}</strong>
            </span>
            <span className="font-semibold text-gray-900 tabular-nums">
              {formatCurrency(item.unitPrice, currency)} c/u
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Cantidad a anular
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setQty((prev) => Math.max(step, Math.round((prev - step) * 1000) / 1000))
                }
                disabled={isSubmitting || qty <= step}
                className="min-h-[44px] min-w-[44px] rounded-xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-800 cursor-pointer disabled:opacity-40"
                aria-label="Restar cantidad"
              >
                <Minus size={16} weight="bold" />
              </button>

              <input
                type="number"
                step="any"
                min="0.001"
                max={maxQty}
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
                className="flex-1 min-h-[44px] px-3 rounded-xl border border-gray-200 text-center text-sm font-bold text-gray-900 tabular-nums focus:outline-none focus:border-gray-900"
              />

              <button
                type="button"
                onClick={() =>
                  setQty((prev) => Math.min(maxQty, Math.round((prev + step) * 1000) / 1000))
                }
                disabled={isSubmitting || qty >= maxQty}
                className="min-h-[44px] min-w-[44px] rounded-xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-800 cursor-pointer disabled:opacity-40"
                aria-label="Sumar cantidad"
              >
                <Plus size={16} weight="bold" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Motivo de anulación (obligatorio)
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {QUICK_REASONS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setReason(preset);
                    setLocalError(null);
                  }}
                  className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    reason === preset
                      ? 'bg-[#0F0F0F] text-white border-[#0F0F0F]'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            <textarea
              rows={2}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setLocalError(null);
              }}
              placeholder="Describí brevemente por qué se anula..."
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-gray-900"
            />
          </div>

          {(localError || errorMessage) && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <WarningCircle size={16} weight="fill" className="shrink-0 mt-0.5" />
              <span>{localError || errorMessage}</span>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
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
              className="min-h-[44px] flex-1 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <CircleNotch size={16} className="animate-spin" />
                  <span>Anulando...</span>
                </>
              ) : (
                <span>Confirmar anulación</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
