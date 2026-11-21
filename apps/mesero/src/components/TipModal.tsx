import React, { useState } from 'react';
import { X, HandCoins, CheckCircle } from '@phosphor-icons/react';
import type { RequestTableBillTipDto } from '../types/mesero';

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderTotal: number;
  defaultPercent?: number;
  currency?: string;
  onConfirm: (tipDto: RequestTableBillTipDto) => void;
  isSubmitting?: boolean;
}

type TipSelectionMode = 'NONE' | 'DEFAULT' | 'CUSTOM';

export const TipModal: React.FC<TipModalProps> = ({
  isOpen,
  onClose,
  orderTotal,
  defaultPercent = 10,
  currency = 'NIO',
  onConfirm,
  isSubmitting = false,
}) => {
  const [selection, setSelection] = useState<TipSelectionMode>('DEFAULT');
  const [customType, setCustomType] = useState<'PERCENT' | 'AMOUNT'>('PERCENT');
  const [customValue, setCustomValue] = useState<string>('15');

  if (!isOpen) return null;

  const defaultTipAmount = Math.round((orderTotal * (defaultPercent / 100)) * 100) / 100;

  const getCustomTipData = (): { amount: number; percent?: number } => {
    const val = parseFloat(customValue) || 0;
    if (customType === 'PERCENT') {
      const amt = Math.round((orderTotal * (val / 100)) * 100) / 100;
      return { amount: amt, percent: val };
    }
    return { amount: val };
  };

  const customTipData = getCustomTipData();

  const handleConfirm = () => {
    if (selection === 'NONE') {
      onConfirm({ mode: 'NONE' });
    } else if (selection === 'DEFAULT') {
      onConfirm({
        mode: 'PERCENT',
        percent: defaultPercent,
        amount: defaultTipAmount,
        currency: currency as 'NIO' | 'USD',
      });
    } else {
      if (customType === 'PERCENT') {
        onConfirm({
          mode: 'PERCENT',
          percent: customTipData.percent ?? 0,
          amount: customTipData.amount,
          currency: currency as 'NIO' | 'USD',
        });
      } else {
        onConfirm({
          mode: 'CUSTOM',
          amount: customTipData.amount,
          currency: currency as 'NIO' | 'USD',
        });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 animate-fadeIn">
      <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl space-y-4 border border-gray-100 max-h-[90vh] overflow-y-auto">
        {/* Encabezado */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-indigo-100 text-indigo-800 flex items-center justify-center shrink-0">
              <HandCoins size={20} weight="duotone" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-gray-900">Propina voluntaria</h3>
              <p className="text-xs text-gray-500">Total: C$ {orderTotal.toFixed(2)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl transition-colors cursor-pointer touch-manipulation"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-gray-600">
          La propina es 100 % voluntaria. Elegí la opción que te haya indicado el cliente:
        </p>

        {/* Opciones */}
        <div className="space-y-2.5">
          {/* Opción 1: % por defecto */}
          <button
            type="button"
            onClick={() => setSelection('DEFAULT')}
            className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer touch-manipulation flex items-center justify-between ${
              selection === 'DEFAULT'
                ? 'bg-indigo-50/80 border-indigo-500 text-indigo-950 shadow-xs ring-1 ring-indigo-500'
                : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50'
            }`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black">{defaultPercent} % sugerido</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                  Recomendado
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 font-mono">
                + C$ {defaultTipAmount.toFixed(2)} · Total: C$ {(orderTotal + defaultTipAmount).toFixed(2)}
              </p>
            </div>
            {selection === 'DEFAULT' && (
              <CheckCircle size={20} weight="fill" className="text-indigo-600 shrink-0" />
            )}
          </button>

          {/* Opción 2: Sin propina */}
          <button
            type="button"
            onClick={() => setSelection('NONE')}
            className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer touch-manipulation flex items-center justify-between ${
              selection === 'NONE'
                ? 'bg-gray-100 border-gray-900 text-gray-950 shadow-xs ring-1 ring-gray-900'
                : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50'
            }`}
          >
            <div>
              <span className="text-xs font-black">Sin propina</span>
              <p className="text-xs text-gray-500 mt-0.5 font-mono">
                Total: C$ {orderTotal.toFixed(2)}
              </p>
            </div>
            {selection === 'NONE' && (
              <CheckCircle size={20} weight="fill" className="text-gray-900 shrink-0" />
            )}
          </button>

          {/* Opción 3: Otro monto */}
          <button
            type="button"
            onClick={() => setSelection('CUSTOM')}
            className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer touch-manipulation flex items-center justify-between ${
              selection === 'CUSTOM'
                ? 'bg-indigo-50/80 border-indigo-500 text-indigo-950 shadow-xs ring-1 ring-indigo-500'
                : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50'
            }`}
          >
            <div>
              <span className="text-xs font-black">Otro monto o porcentaje</span>
              <p className="text-xs text-gray-500 mt-0.5">
                Ingresá un valor personalizado
              </p>
            </div>
            {selection === 'CUSTOM' && (
              <CheckCircle size={20} weight="fill" className="text-indigo-600 shrink-0" />
            )}
          </button>
        </div>

        {/* Formulario para "Otro monto" */}
        {selection === 'CUSTOM' && (
          <div className="p-3 bg-slate-50 border border-gray-200 rounded-2xl space-y-3 animate-fadeIn">
            <div className="flex rounded-xl bg-gray-200 p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setCustomType('PERCENT')}
                className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer touch-manipulation ${
                  customType === 'PERCENT'
                    ? 'bg-white text-gray-900 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Porcentaje (%)
              </button>
              <button
                type="button"
                onClick={() => setCustomType('AMOUNT')}
                className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer touch-manipulation ${
                  customType === 'AMOUNT'
                    ? 'bg-white text-gray-900 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monto fijo (C$)
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {customType === 'PERCENT' ? 'Porcentaje deseado' : 'Monto en córdobas'}
              </label>
              <input
                type="number"
                min="0"
                step={customType === 'PERCENT' ? '1' : '0.50'}
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                placeholder={customType === 'PERCENT' ? 'Ej. 15' : 'Ej. 50'}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>

            <p className="text-xs font-medium text-indigo-900">
              Propina: C$ {customTipData.amount.toFixed(2)} · Total: C${' '}
              {(orderTotal + customTipData.amount).toFixed(2)}
            </p>
          </div>
        )}

        {/* Acciones */}
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer touch-manipulation"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-extrabold shadow-xs transition-colors cursor-pointer touch-manipulation flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Generando...</span>
            ) : (
              <span>Pedir cuenta</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
