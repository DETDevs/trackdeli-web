import React, { useEffect } from 'react';
import { Backspace } from '@phosphor-icons/react';

interface PinKeypadProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit?: (pin: string) => void;
  isError?: boolean;
  disabled?: boolean;
}

export const PinKeypad: React.FC<PinKeypadProps> = ({
  value,
  onChange,
  onSubmit,
  isError = false,
  disabled = false,
}) => {
  const handleDigit = (digit: string) => {
    if (disabled || value.length >= 4) return;
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(25);
      } catch {}
    }
    const newVal = value + digit;
    onChange(newVal);
    if (newVal.length === 4 && onSubmit) {
      onSubmit(newVal);
    }
  };

  const handleBackspace = () => {
    if (disabled || value.length === 0) return;
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(20);
      } catch {}
    }
    onChange(value.slice(0, -1));
  };

  const handleClear = () => {
    if (disabled || value.length === 0) return;
    onChange('');
  };

  // Soporte para teclado físico o emulador
  useEffect(() => {
    const handlePhysicalKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      if (/^[0-9]$/.test(e.key)) {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };
    window.addEventListener('keydown', handlePhysicalKeyDown);
    return () => window.removeEventListener('keydown', handlePhysicalKeyDown);
  }, [value, disabled]);

  return (
    <div className="w-full max-w-xs mx-auto space-y-6 select-none">
      {/* Indicadores visuales de 4 puntos (PIN Dots) */}
      <div
        className={`flex items-center justify-center gap-4 py-2 ${
          isError ? 'animate-shake' : ''
        }`}
      >
        {[0, 1, 2, 3].map((index) => {
          const filled = index < value.length;
          return (
            <div
              key={index}
              className={`w-4 h-4 rounded-full transition-all duration-200 ${
                isError
                  ? 'bg-rose-500 border-2 border-rose-600 scale-110'
                  : filled
                  ? 'bg-gray-900 border-2 border-gray-900 scale-110 shadow-xs'
                  : 'bg-white border-2 border-gray-300'
              }`}
            />
          );
        })}
      </div>

      {/* Teclado numérico táctil grande para móvil */}
      <div className="grid grid-cols-3 gap-3 p-1">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <button
            key={digit}
            type="button"
            disabled={disabled}
            onClick={() => handleDigit(digit)}
            className="h-16 rounded-2xl bg-white hover:bg-gray-50 active:bg-gray-200 border border-gray-200 text-2xl font-bold text-gray-900 shadow-xs flex items-center justify-center transition-transform active:scale-95 cursor-pointer touch-manipulation disabled:opacity-50"
          >
            {digit}
          </button>
        ))}

        {/* Fila inferior: Limpiar, 0, Borrar */}
        <button
          type="button"
          disabled={disabled || value.length === 0}
          onClick={handleClear}
          className="h-16 rounded-2xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-xs font-bold uppercase tracking-wider text-gray-600 flex items-center justify-center transition-transform active:scale-95 cursor-pointer touch-manipulation disabled:opacity-30"
        >
          Borrar
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => handleDigit('0')}
          className="h-16 rounded-2xl bg-white hover:bg-gray-50 active:bg-gray-200 border border-gray-200 text-2xl font-bold text-gray-900 shadow-xs flex items-center justify-center transition-transform active:scale-95 cursor-pointer touch-manipulation disabled:opacity-50"
        >
          0
        </button>

        <button
          type="button"
          disabled={disabled || value.length === 0}
          onClick={handleBackspace}
          className="h-16 rounded-2xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 flex items-center justify-center transition-transform active:scale-95 cursor-pointer touch-manipulation disabled:opacity-30"
          title="Retroceso"
        >
          <Backspace size={24} weight="bold" />
        </button>
      </div>
    </div>
  );
};
