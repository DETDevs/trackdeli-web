import React, { useEffect, useState } from 'react';
import { X, WarningCircle, CircleNotch, DoorOpen } from '@phosphor-icons/react';

interface CancelTableOrderModalProps {
  isOpen: boolean;
  tableNumber: string;
  hasSentItems: boolean;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void>;
}

export const CancelTableOrderModal: React.FC<CancelTableOrderModalProps> = ({
  isOpen,
  tableNumber,
  hasSentItems,
  isSubmitting,
  errorMessage,
  onClose,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const tableLabel = /^mesa\s+/i.test(String(tableNumber || '').trim())
    ? String(tableNumber).trim()
    : `Mesa ${String(tableNumber || '').trim()}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = reason.trim();
    await onConfirm(clean ? clean : undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <DoorOpen size={18} weight="duotone" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-[#0F0F0F] truncate">
                Liberar mesa sin cobro
              </h3>
              <p className="text-xs text-gray-500 truncate">{tableLabel}</p>
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
          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
            Esto cancelará la orden abierta de <strong>{tableLabel}</strong> sin
            registrar una venta y la mesa volverá a quedar <strong>Libre</strong> en el
            salón.
          </p>

          {hasSentItems && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
              Esta mesa ya tiene productos enviados a cocina. Se recomienda indicar el
              motivo de la cancelación para el registro de auditoría.
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Motivo (opcional)
            </label>
            <textarea
              rows={2}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Mesa abierta por error o cliente se retiró..."
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-gray-900"
            />
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <WarningCircle size={16} weight="fill" className="shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="min-h-[44px] flex-1 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 cursor-pointer"
            >
              Volver
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[44px] flex-1 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <CircleNotch size={16} className="animate-spin" />
                  <span>Liberando...</span>
                </>
              ) : (
                <span>Liberar mesa</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
