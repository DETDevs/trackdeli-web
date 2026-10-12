import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  WarningCircle,
  Backspace,
  LockSimple,
} from '@phosphor-icons/react';
import type { TableOrderItem } from '../types/mesero';

interface VoidItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: TableOrderItem | null;
  voidQty?: number; // Si es parcial, la cantidad a anular
  onConfirm: (params: { reason: string; pin: string; qty?: number }) => Promise<void>;
  isLoading: boolean;
}

const COMMON_REASONS = [
  'Cliente canceló',
  'Error al ordenar',
  'Demora en cocina',
  'Plato devuelto',
  'Mesa se retiró',
];

export const VoidItemModal: React.FC<VoidItemModalProps> = ({
  isOpen,
  onClose,
  item,
  voidQty,
  onConfirm,
  isLoading,
}) => {
  const [reason, setReason] = useState('');
  const [pin, setPin] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !item) return null;

  const isPartial = voidQty !== undefined && voidQty > 0 && voidQty < item.quantity;
  const targetQty = isPartial ? voidQty : item.quantity;

  const handleKeyPress = (num: string) => {
    if (isLoading || pin.length >= 8) return;
    setErrorMessage(null);
    setPin((prev) => prev + num);
  };

  const handleBackspace = () => {
    if (isLoading) return;
    setErrorMessage(null);
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClearPin = () => {
    if (isLoading) return;
    setErrorMessage(null);
    setPin('');
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLoading) return;

    const trimmedReason = reason.trim();
    if (!trimmedReason || trimmedReason.length < 3) {
      setErrorMessage('El motivo es obligatorio (mínimo 3 caracteres)');
      return;
    }

    if (!pin.trim()) {
      setErrorMessage('Ingresá el PIN del cajero o encargado');
      return;
    }

    setErrorMessage(null);
    try {
      await onConfirm({
        reason: trimmedReason,
        pin: pin.trim(),
        qty: isPartial ? targetQty : undefined,
      });
      // Limpiar datos sensibles
      setPin('');
      setReason('');
      setErrorMessage(null);
    } catch (err: any) {
      const status = err?.response?.status;
      const dataMessage = err?.response?.data?.message;

      if (status === 429) {
        setErrorMessage('Demasiados intentos, esperá unos minutos');
      } else if (dataMessage === 'INVALID_AUTHORIZATION') {
        setErrorMessage('PIN inválido. Verificá que sea cajero o encargado.');
      } else if (dataMessage === 'AUTHORIZATION_REQUIRED') {
        setErrorMessage('Se requiere autorización de cajero o encargado.');
      } else if (status === 403) {
        setErrorMessage('No tenés autorización para realizar esta anulación.');
      } else if (!err?.response || err?.code === 'ERR_NETWORK') {
        setErrorMessage('No se pudo conectar. Revisá tu conexión e intentá otra vez.');
      } else {
        setErrorMessage(
          typeof dataMessage === 'string'
            ? dataMessage
            : 'Error al solicitar anulación. Revisá los datos.'
        );
      }
      setPin('');
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    setPin('');
    setReason('');
    setErrorMessage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="p-4 pb-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldCheck size={20} weight="duotone" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-gray-900 leading-tight">
                {isPartial ? 'Anulación parcial' : 'Solicitar anulación'}
              </h3>
              <p className="text-[11px] text-gray-500 font-normal">
                Requiere PIN de cajero o encargado
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isLoading}
            onClick={handleClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          {/* Item details */}
          <div className="p-3 rounded-2xl bg-rose-50/60 border border-rose-100 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-bold text-gray-900">
                {item.productName}
              </span>
              <span className="text-xs font-extrabold text-rose-700 font-mono">
                {isPartial ? `-${targetQty} de ${item.quantity}` : `${item.quantity}x`}
              </span>
            </div>
            <p className="text-[11px] text-rose-800">
              {isPartial
                ? `Se anularán ${targetQty} unidad(es) de este renglón ya enviado.`
                : 'Este producto ya fue enviado a cocina y no se puede quitar sin autorización.'}
            </p>
          </div>

          {/* Motivo de anulación (obligatorio) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 block">
              Motivo de anulación <span className="text-rose-500">*</span>
            </label>

            {/* Chips de motivos comunes */}
            <div className="flex flex-wrap gap-1">
              {COMMON_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setReason(r);
                    setErrorMessage(null);
                  }}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer touch-manipulation ${
                    reason === r
                      ? 'bg-rose-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setErrorMessage(null);
              }}
              placeholder="Escribí el motivo detallado..."
              maxLength={120}
              className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
              autoFocus
            />
          </div>

          {/* PIN de autorización */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <LockSimple size={13} weight="bold" />
                PIN del cajero o encargado <span className="text-rose-500">*</span>
              </span>
              {pin && (
                <button
                  type="button"
                  onClick={handleClearPin}
                  className="text-[10px] text-gray-400 hover:text-gray-600 font-normal"
                >
                  Limpiar
                </button>
              )}
            </label>

            {/* Indicador visual de PIN enmascarado */}
            <div className="flex items-center justify-center gap-2 py-1">
              {[0, 1, 2, 3].map((idx) => {
                const filled = pin.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full transition-all ${
                      filled
                        ? 'bg-gray-900 scale-110 shadow-xs'
                        : 'border-2 border-gray-300 bg-white'
                    }`}
                  />
                );
              })}
              {pin.length > 4 && (
                <span className="text-[10px] font-bold text-gray-500">
                  +{pin.length - 4}
                </span>
              )}
            </div>

            {/* Input oculto / alternativo para teclado físico */}
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, ''));
                setErrorMessage(null);
              }}
              autoComplete="off"
              className="sr-only"
              id="pin-authorizer-hidden-input"
            />

            {/* Teclado numérico táctil */}
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleKeyPress(digit)}
                  disabled={isLoading}
                  className="h-10 rounded-xl bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-900 font-bold text-base flex items-center justify-center transition-colors cursor-pointer touch-manipulation border border-gray-100"
                >
                  {digit}
                </button>
              ))}
              <div />
              <button
                type="button"
                onClick={() => handleKeyPress('0')}
                disabled={isLoading}
                className="h-10 rounded-xl bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-900 font-bold text-base flex items-center justify-center transition-colors cursor-pointer touch-manipulation border border-gray-100"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                disabled={isLoading || pin.length === 0}
                className="h-10 rounded-xl bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-colors cursor-pointer touch-manipulation border border-gray-100 disabled:opacity-30"
              >
                <Backspace size={18} weight="bold" />
              </button>
            </div>
          </div>

          {/* Mensaje de error claro */}
          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs font-semibold animate-fadeIn">
              <WarningCircle size={16} weight="fill" className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Botones de acción */}
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              disabled={isLoading}
              onClick={handleClose}
              className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !reason.trim() || !pin.trim()}
              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:opacity-40 text-white font-bold text-xs shadow-sm transition-all cursor-pointer touch-manipulation flex items-center justify-center gap-1.5"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <span>Autorizar anulación</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
