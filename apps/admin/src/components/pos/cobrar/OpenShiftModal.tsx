import React, { useState } from 'react';
import { X, CashRegister, CircleNotch, Coins, Calculator } from '@phosphor-icons/react';
import { type OpenCashRegisterDto } from 'api-client';

interface OpenShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onOpenShift: (dto: OpenCashRegisterDto) => Promise<any>;
  isOpening: boolean;
}

const NIO_DENOMINATIONS = [
  { value: 1000, label: 'C$ 1,000' },
  { value: 500, label: 'C$ 500' },
  { value: 200, label: 'C$ 200' },
  { value: 100, label: 'C$ 100' },
  { value: 50, label: 'C$ 50' },
  { value: 20, label: 'C$ 20' },
  { value: 10, label: 'C$ 10' },
  { value: 5, label: 'C$ 5' },
  { value: 1, label: 'C$ 1' },
];

export const OpenShiftModal: React.FC<OpenShiftModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onOpenShift,
  isOpening,
}) => {
  const [mode, setMode] = useState<'DIRECT' | 'DENOMINATIONS'>('DIRECT');
  const [initialAmount, setInitialAmount] = useState('0');
  const [denoms, setDenoms] = useState<Record<number, number>>({
    1000: 0,
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0,
    5: 0,
    1: 0,
  });
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const denomsTotal = Object.entries(denoms).reduce(
    (sum, [val, qty]) => sum + Number(val) * (Number(qty) || 0),
    0,
  );

  const effectiveAmount = mode === 'DENOMINATIONS' ? denomsTotal : Number(initialAmount) || 0;

  const handleDenomChange = (val: number, qtyStr: string) => {
    const qty = Math.max(0, parseInt(qtyStr, 10) || 0);
    setDenoms((prev) => ({ ...prev, [val]: qty }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (isNaN(effectiveAmount) || effectiveAmount < 0) {
      setErrorMessage('El monto inicial debe ser un número válido mayor o igual a 0');
      return;
    }

    try {
      const denominationsPayload =
        mode === 'DENOMINATIONS'
          ? Object.entries(denoms)
              .filter(([_, qty]) => Number(qty) > 0)
              .map(([val, qty]) => ({ value: Number(val), qty: Number(qty) }))
          : undefined;

      await onOpenShift({
        initialAmount: effectiveAmount,
        openingCash: effectiveAmount,
        notes: notes.trim() || undefined,
        ...(denominationsPayload ? { denominations: denominationsPayload } : {}),
      } as any);
      onSuccess?.();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'No se pudo abrir el turno de caja. Verificá tus permisos o la conexión.';
      setErrorMessage(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <CashRegister size={22} weight="duotone" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 leading-tight">Abrir turno de caja</h3>
              <p className="text-xs text-gray-500">Ingresá el saldo base inicial de efectivo</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isOpening}
            className="w-10 h-10 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition-colors min-h-[44px] min-w-[44px] cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body with scroll */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium leading-relaxed">
              {errorMessage}
            </div>
          )}

          {/* Selector de modo: Monto directo vs Desglose de billetes */}
          <div className="flex rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setMode('DIRECT')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all min-h-[44px] cursor-pointer ${
                mode === 'DIRECT'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calculator size={16} />
              <span>Monto directo</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('DENOMINATIONS')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all min-h-[44px] cursor-pointer ${
                mode === 'DENOMINATIONS'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Coins size={16} />
              <span>Por billetes</span>
            </button>
          </div>

          {mode === 'DIRECT' ? (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Monto inicial en caja (C$)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
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
                  className="w-full pl-11 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base font-bold text-gray-900 focus:bg-white focus:border-gray-900 focus:outline-hidden transition-colors min-h-[44px]"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Efectivo base disponible para dar cambio</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-700 px-1">
                <span>Denominación</span>
                <span>Cantidad</span>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {NIO_DENOMINATIONS.map((d) => (
                  <div
                    key={d.value}
                    className="flex items-center justify-between gap-3 p-2 bg-gray-50 rounded-xl border border-gray-100"
                  >
                    <span className="text-xs font-bold text-gray-800">{d.label}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={denoms[d.value] || ''}
                        onChange={(e) => handleDenomChange(d.value, e.target.value)}
                        placeholder="0"
                        className="w-20 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-mono text-center text-gray-900 focus:border-gray-900 focus:outline-hidden min-h-[44px]"
                      />
                      <span className="text-xs text-gray-400 font-mono w-16 text-right">
                        C$ {(d.value * (denoms[d.value] || 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-800">Total contado inicial:</span>
                <span className="text-sm font-black text-emerald-900 font-mono">
                  C$ {denomsTotal.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Nota u observación (opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Fondo para vuelto de billetes grandes"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:border-gray-900 focus:outline-hidden transition-colors min-h-[44px]"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isOpening}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 min-h-[44px] cursor-pointer"
            >
              {isOpening ? (
                <>
                  <CircleNotch size={18} className="animate-spin" />
                  <span>Abriendo turno...</span>
                </>
              ) : (
                <span>Confirmar apertura de caja</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
