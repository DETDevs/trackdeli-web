import React from 'react';

export interface PhoneInputProps {
  value: string; // 8 dígitos (ej: "88881234")
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
  autoFocus?: boolean;
  label?: string;
  helperText?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  error,
  disabled = false,
  required = true,
  id = 'customerPhone',
  name = 'customerPhone',
  autoFocus = false,
  label = 'Teléfono WhatsApp',
  helperText = 'Ingresá los 8 dígitos de tu número de Nicaragua.',
}) => {
  const digits = value ? value.replace(/\D/g, '').slice(0, 8) : '';
  const count = digits.length;
  const isComplete = count === 8;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Teclas de navegación y control permitidas
    const allowedNavigationKeys = [
      'Backspace',
      'Delete',
      'Tab',
      'Escape',
      'Enter',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
    ];

    if (allowedNavigationKeys.includes(e.key)) {
      return;
    }

    // Permitir atajos (Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, Cmd+...)
    if (e.ctrlKey || e.metaKey) {
      return;
    }

    // Bloquear caracteres no numéricos en tiempo real
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      return;
    }

    // Si ya tiene 8 dígitos y no hay texto seleccionado, bloquear noveno dígito
    const input = e.currentTarget;
    const hasSelection =
      (input.selectionEnd ?? 0) - (input.selectionStart ?? 0) > 0;
    if (input.value.length >= 8 && !hasSelection) {
      e.preventDefault();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text') || '';
    let clean = pastedText.replace(/\D/g, '');

    // Si el usuario pegó el número con código de país (ej. +505 8888 1234 o 50588881234)
    if (clean.startsWith('505') && clean.length > 8) {
      clean = clean.slice(3);
    }

    onChange(clean.slice(0, 8));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let clean = e.target.value.replace(/\D/g, '');
    if (clean.startsWith('505') && clean.length > 8) {
      clean = clean.slice(3);
    }
    onChange(clean.slice(0, 8));
  };

  return (
    <div className="space-y-1.5">
      {/* Cabecera del label con contador */}
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="block text-xs font-bold uppercase tracking-wider text-gray-700"
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        <span
          className={`text-xs font-semibold tabular-nums transition-colors ${
            isComplete
              ? 'text-emerald-600 font-bold'
              : count > 0
              ? 'text-brand-600 font-medium'
              : 'text-gray-400'
          }`}
          aria-live="polite"
        >
          {count}/8 dígitos
        </span>
      </div>

      {/* Contenedor del input con prefijo +505 fijo */}
      <div
        className={`flex items-center rounded-xl bg-white border shadow-xs transition-all focus-within:ring-2 overflow-hidden ${
          error
            ? 'border-rose-300 focus-within:border-rose-500 focus-within:ring-rose-500/20'
            : 'border-gray-300 focus-within:border-brand-500 focus-within:ring-brand-500/20'
        } ${disabled ? 'opacity-60 bg-gray-50 cursor-not-allowed' : ''}`}
      >
        {/* Prefijo fijo no editable */}
        <div
          className="bg-gray-50 border-r border-gray-200 px-3.5 py-2.5 flex items-center gap-1.5 text-gray-700 font-semibold text-sm select-none shrink-0"
          title="Nicaragua (+505)"
        >
          <span className="text-base leading-none" role="img" aria-label="Bandera de Nicaragua">
            🇳🇮
          </span>
          <span className="tracking-tight text-gray-800">+505</span>
        </div>

        {/* Input numérico de 8 dígitos */}
        <input
          id={id}
          name={name}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="tel-national"
          required={required}
          disabled={disabled}
          autoFocus={autoFocus}
          maxLength={8}
          value={digits}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onChange={handleChange}
          placeholder="8888 1234"
          className="w-full px-3.5 py-2.5 bg-transparent border-0 text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0 tracking-wide"
        />
      </div>

      {/* Mensaje de error */}
      {error && (
        <p className="text-xs text-rose-600 font-medium animate-fadeIn">
          {error}
        </p>
      )}

      {/* Texto de ayuda */}
      {helperText && !error && (
        <p className="text-[11px] text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  );
};
