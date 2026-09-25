import React from 'react';
import { User, Phone, EnvelopeSimple, Info } from '@phosphor-icons/react';

interface CustomerFormData {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
}

interface CustomerFormProps {
  formData: CustomerFormData;
  onChange: (field: keyof CustomerFormData, value: string) => void;
  errors: Partial<Record<keyof CustomerFormData, string>>;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({
  formData,
  onChange,
  errors,
}) => {
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Permitir sólo +, números, espacios, guiones y paréntesis, máx 20 caracteres
    const rawVal = e.target.value;
    const filtered = rawVal.replace(/[^0-9+\s\-()]/g, '').slice(0, 20);
    onChange('customerPhone', filtered);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange('customerName', e.target.value.slice(0, 80));
  };

  return (
    <div className="space-y-4">
      {/* Nombre Completo */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
          Nombre completo <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <User size={18} />
          </div>
          <input
            type="text"
            required
            maxLength={80}
            value={formData.customerName}
            onChange={handleNameChange}
            placeholder="Ej. Juan Pérez"
            className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white border text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all shadow-xs ${
              errors.customerName
                ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20'
                : 'border-gray-300 focus:border-brand-500 focus:ring-brand-500/20'
            }`}
          />
        </div>
        {errors.customerName && (
          <p className="text-xs text-rose-600 mt-1 font-medium">{errors.customerName}</p>
        )}
      </div>

      {/* Teléfono / WhatsApp */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
          Teléfono WhatsApp <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Phone size={18} />
          </div>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            maxLength={20}
            value={formData.customerPhone}
            onChange={handlePhoneChange}
            placeholder="Ej. +505 8888 1234 o 8888 1234"
            className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white border text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all shadow-xs ${
              errors.customerPhone
                ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20'
                : 'border-gray-300 focus:border-brand-500 focus:ring-brand-500/20'
            }`}
          />
        </div>
        {errors.customerPhone && (
          <p className="text-xs text-rose-600 mt-1 font-medium">{errors.customerPhone}</p>
        )}
        <p className="text-[11px] text-gray-500 mt-1">
          Ingresá un número válido (ej. 8888 1234 o con código de país +505 8888 1234).
        </p>
      </div>

      {/* Correo Electrónico (Opcional) con nota de beneficio */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
            Correo electrónico
          </label>
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
            Opcional
          </span>
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <EnvelopeSimple size={18} />
          </div>
          <input
            type="email"
            value={formData.customerEmail}
            onChange={(e) => onChange('customerEmail', e.target.value)}
            placeholder="tunombre@ejemplo.com"
            className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white border text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all shadow-xs ${
              errors.customerEmail
                ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20'
                : 'border-gray-300 focus:border-brand-500 focus:ring-brand-500/20'
            }`}
          />
        </div>
        {errors.customerEmail && (
          <p className="text-xs text-rose-600 mt-1 font-medium">{errors.customerEmail}</p>
        )}

        {/* Nota de beneficio explicativa */}
        <div className="mt-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-950 shadow-2xs">
          <Info size={16} className="text-emerald-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-emerald-800 font-semibold">Recomendado:</strong> Si
            dejás tu email, te mandamos el comprobante de tu reserva y un enlace
            directo para cancelarla o reagendarla vos mismo.
          </p>
        </div>
      </div>
    </div>
  );
};
