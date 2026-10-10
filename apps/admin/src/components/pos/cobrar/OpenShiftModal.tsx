import React, { useState } from 'react';
import { X, CashRegister, CircleNotch } from '@phosphor-icons/react';
import { type OpenCashRegisterDto } from 'api-client';

interface OpenShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onOpenShift: (dto: OpenCashRegisterDto) => Promise<any>;
  isOpening: boolean;
}

export const OpenShiftModal: React.FC<OpenShiftModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onOpenShift,
  isOpening,
}) => {
  const [initialAmount, setInitialAmount] = useState('0');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const amountNum = Number(initialAmount);
    if (isNaN(amountNum) || amountNum < 0) {
      setErrorMessage('El monto inicial debe ser un número válido mayor o igual a 0');
      return;
    }

    try {
      await onOpenShift({
        initialAmount: amountNum,
        openingCash: amountNum,
        notes: notes.trim() || undefined,
      });
      onSuccess?.();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'No se pudo abrir el turno de caja. Verifica tus permisos o la conexión.';
      setErrorMessage(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CashRegister size={18} weight="duotone" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 leading-tight">Abrir turno de caja</h3>
              <p className="text-[11px] text-gray-500">Requerido para registrar ventas</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isOpening}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Monto inicial en caja (C$)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                C$
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={initialAmount}
                onChange={(e) => setInitialAmount(e.target.value)}
                placeholder="0.00"
                required
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:bg-white focus:border-gray-900 focus:outline-hidden transition-colors"
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Efectivo disponible para dar cambio</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Notas del turno (opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Turno tarde / cambio inicial"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:border-gray-900 focus:outline-hidden transition-colors"
            />
          </div>

          <div className="pt-2 space-y-2">
            <button
              type="submit"
              disabled={isOpening}
              className="w-full py-3 px-4 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs min-h-[44px]"
            >
              {isOpening ? (
                <>
                  <CircleNotch size={16} className="animate-spin" />
                  <span>Abriendo turno...</span>
                </>
              ) : (
                <span>Confirmar y abrir turno</span>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={isOpening}
              className="w-full py-2 text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
