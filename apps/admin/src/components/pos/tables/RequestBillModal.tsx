import React, { useEffect, useState } from 'react';
import {
  X,
  Receipt,
  WarningCircle,
  CircleNotch,
} from '@phosphor-icons/react';
import type { RequestTableBillTipDto } from 'api-client';

interface RequestBillModalProps {
  isOpen: boolean;
  targetLabel: string;
  currency?: string;
  unsentCount: number;
  tipEnabled: boolean;
  tipDefaultPercent: number;
  initialTipMode?: string | null;
  initialTipPercent?: number | null;
  initialTipAmount?: number | null;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onConfirm: (tip?: RequestTableBillTipDto) => void;
}

type TipSelectionMode = 'NONE' | 'PERCENT' | 'CUSTOM';

export const RequestBillModal: React.FC<RequestBillModalProps> = ({
  isOpen,
  targetLabel,
  currency = 'NIO',
  unsentCount,
  tipEnabled,
  tipDefaultPercent,
  initialTipMode,
  initialTipAmount,
  isSubmitting,
  errorMessage,
  onClose,
  onConfirm,
}) => {
  const [tipChoice, setTipChoice] = useState<TipSelectionMode>('NONE');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setValidationError(null);
    const normalizedMode = String(initialTipMode || '').toUpperCase();
    if (tipEnabled && normalizedMode === 'PERCENT') {
      setTipChoice('PERCENT');
      setCustomAmount('');
    } else if (
      tipEnabled &&
      normalizedMode === 'CUSTOM' &&
      Number(initialTipAmount || 0) > 0
    ) {
      setTipChoice('CUSTOM');
      setCustomAmount(String(Number(initialTipAmount)));
    } else {
      setTipChoice('NONE');
      setCustomAmount('');
    }
  }, [isOpen, tipEnabled, initialTipMode, initialTipAmount]);

  if (!isOpen) return null;

  const currencySymbol = currency === 'USD' ? 'US$' : 'C$';
  const safePercent =
    Number.isFinite(tipDefaultPercent) && tipDefaultPercent > 0
      ? tipDefaultPercent
      : 10;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setValidationError(null);

    if (!tipEnabled) {
      onConfirm(undefined);
      return;
    }

    if (tipChoice === 'NONE') {
      onConfirm({ mode: 'NONE' });
      return;
    }

    if (tipChoice === 'PERCENT') {
      onConfirm({ mode: 'PERCENT', percent: safePercent });
      return;
    }

    const parsed = Number(customAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setValidationError('Ingresá un monto de propina mayor a cero.');
      return;
    }

    onConfirm({
      mode: 'CUSTOM',
      amount: Math.round(parsed * 100) / 100,
      currency: currency === 'USD' ? 'USD' : 'NIO',
    });
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Pedir la cuenta · ${targetLabel}`}
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-gray-200"
      >
        {/* Cabecera */}
        <div className="px-4 sm:px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center shrink-0">
              <Receipt size={18} weight="duotone" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-[#0F0F0F] truncate">
                Pedir la cuenta
              </h3>
              <p className="text-xs text-gray-600 truncate">{targetLabel}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="min-h-[44px] min-w-[44px] rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center cursor-pointer disabled:opacity-40"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {unsentCount > 0 && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950 flex items-start gap-2.5"
            >
              <WarningCircle
                size={18}
                weight="fill"
                className="text-amber-600 shrink-0 mt-0.5"
              />
              <div className="space-y-1 min-w-0">
                <p className="font-bold">
                  Hay {unsentCount}{' '}
                  {unsentCount === 1
                    ? 'renglón sin enviar'
                    : 'renglones sin enviar'}{' '}
                  a cocina.
                </p>
                <p className="text-amber-900">
                  Si continuás, estos productos se incluirán en la cuenta igual.
                </p>
              </div>
            </div>
          )}

          {tipEnabled && (
            <div className="space-y-2.5">
              <div>
                <p className="text-xs font-bold text-[#0F0F0F]">
                  Propina para mostrar en la cuenta
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  Solo se imprimirá la propina que elijas (es voluntaria). El monto final lo calcula el servidor.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTipChoice('NONE');
                    setValidationError(null);
                  }}
                  className={`min-h-[44px] px-3.5 py-2.5 rounded-xl border text-left text-xs font-semibold transition-colors cursor-pointer ${
                    tipChoice === 'NONE'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-950 ring-1 ring-indigo-500'
                      : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  Sin propina
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTipChoice('PERCENT');
                    setValidationError(null);
                  }}
                  className={`min-h-[44px] px-3.5 py-2.5 rounded-xl border text-left text-xs font-semibold transition-colors cursor-pointer ${
                    tipChoice === 'PERCENT'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-950 ring-1 ring-indigo-500'
                      : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  {safePercent} % sugerida
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTipChoice('CUSTOM');
                    setValidationError(null);
                  }}
                  className={`min-h-[44px] px-3.5 py-2.5 rounded-xl border text-left text-xs font-semibold transition-colors cursor-pointer ${
                    tipChoice === 'CUSTOM'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-950 ring-1 ring-indigo-500'
                      : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  Otro monto
                </button>
              </div>

              {tipChoice === 'CUSTOM' && (
                <div className="pt-1">
                  <label
                    htmlFor="request-bill-custom-tip"
                    className="block text-xs font-medium text-gray-700 mb-1"
                  >
                    Monto de propina ({currencySymbol})
                  </label>
                  <input
                    id="request-bill-custom-tip"
                    type="number"
                    step="0.01"
                    min="0.01"
                    inputMode="decimal"
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder="Ej. 50.00"
                    className="w-full min-h-[44px] px-3.5 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                  />
                </div>
              )}
            </div>
          )}

          {(validationError || errorMessage) && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <WarningCircle size={16} weight="fill" className="shrink-0 mt-0.5" />
              <span>{validationError || errorMessage}</span>
            </div>
          )}
        </div>

        {/* Pie */}
        <div className="px-4 sm:px-5 py-4 border-t border-gray-100 bg-white flex flex-col-reverse sm:flex-row gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="min-h-[44px] flex-1 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-[44px] flex-1 px-4 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <CircleNotch size={16} className="animate-spin" />
                <span>Generando cuenta...</span>
              </>
            ) : (
              <span>{unsentCount > 0 ? 'Continuar igual' : 'Pedir la cuenta'}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
