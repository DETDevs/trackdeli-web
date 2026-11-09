import React, { useState } from 'react';
import {
  X,
  ArrowsDownUp,
  ArrowDownLeft,
  ArrowUpRight,
  CircleNotch,
} from '@phosphor-icons/react';
import { type CashMovementDto } from 'api-client';

interface CashMovementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onSubmitMovement: (dto: CashMovementDto) => Promise<any>;
  isSubmitting: boolean;
}

export const CashMovementsModal: React.FC<CashMovementsModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onSubmitMovement,
  isSubmitting,
}) => {
  const [type, setType] = useState<'ENTRADA' | 'SALIDA'>('SALIDA');
  const [amountStr, setAmountStr] = useState('');
  const [concept, setConcept] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const quickConcepts =
    type === 'SALIDA'
      ? [
          'Compra menor / insumos',
          'Pago a proveedor local',
          'Gastos de limpieza / artículos',
          'Almuerzo / refrigerio de personal',
          'Retiro parcial de efectivo',
        ]
      : [
          'Aporte de cambio adicional',
          'Devolución de vuelto',
          'Ingreso extraordinario',
          'Reintegro de gasto menor',
        ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      setErrorMessage('El monto debe ser un número mayor a cero');
      return;
    }

    const trimmedConcept = concept.trim();
    if (!trimmedConcept) {
      setErrorMessage('El motivo del movimiento es obligatorio');
      return;
    }

    try {
      const fullConcept = notes.trim()
        ? `${trimmedConcept} - ${notes.trim()}`
        : trimmedConcept;

      await onSubmitMovement({
        type,
        amount,
        concept: fullConcept,
        currency: 'NIO',
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'No se pudo registrar el movimiento. Verifica que tengas un turno de caja abierto.';
      setErrorMessage(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <ArrowsDownUp size={22} weight="duotone" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 leading-tight">Movimiento de caja</h3>
              <p className="text-xs text-gray-500">Registrá entradas y salidas de efectivo</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-10 h-10 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition-colors min-h-[44px] min-w-[44px] cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium leading-relaxed">
              {errorMessage}
            </div>
          )}

          {/* Selector de Tipo: ENTRADA / SALIDA */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setType('SALIDA');
                setConcept('');
              }}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all min-h-[44px] cursor-pointer ${
                type === 'SALIDA'
                  ? 'border-red-600 bg-red-50 text-red-700 shadow-2xs'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <ArrowUpRight size={18} weight="bold" />
              <span>Salida (Egreso)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setType('ENTRADA');
                setConcept('');
              }}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all min-h-[44px] cursor-pointer ${
                type === 'ENTRADA'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-2xs'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <ArrowDownLeft size={18} weight="bold" />
              <span>Entrada (Ingreso)</span>
            </button>
          </div>

          {/* Monto */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Monto en efectivo (C$)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                C$
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0.00"
                required
                className="w-full pl-11 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base font-bold text-gray-900 focus:bg-white focus:border-gray-900 focus:outline-hidden transition-colors min-h-[44px]"
              />
            </div>
          </div>

          {/* Motivo / Concepto */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Motivo del movimiento
            </label>
            <input
              type="text"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="Ej. Pago de taxi o compra de bolsas"
              required
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:border-gray-900 focus:outline-hidden transition-colors min-h-[44px]"
            />

            {/* Sugerencias rápidas */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {quickConcepts.map((qc) => (
                <button
                  key={qc}
                  type="button"
                  onClick={() => setConcept(qc)}
                  className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  {qc}
                </button>
              ))}
            </div>
          </div>

          {/* Nota opcional */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Detalle o nota adicional (opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Información adicional o referencia de recibo"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:border-gray-900 focus:outline-hidden transition-colors min-h-[44px]"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 px-4 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 min-h-[44px] cursor-pointer ${
                type === 'SALIDA'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {isSubmitting ? (
                <>
                  <CircleNotch size={18} className="animate-spin" />
                  <span>Registrando movimiento...</span>
                </>
              ) : (
                <span>Confirmar {type === 'SALIDA' ? 'salida' : 'entrada'} de efectivo</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

