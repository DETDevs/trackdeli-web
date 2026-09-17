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
  return (
    <div className="space-y-4">
      {/* Nombre Completo */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
          Nombre completo <span className="text-rose-400">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
            <User size={18} />
          </div>
          <input
            type="text"
            required
            value={formData.customerName}
            onChange={(e) => onChange('customerName', e.target.value)}
            placeholder="Ej. Juan Pérez"
            className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-gray-800/80 border text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 transition-all ${
              errors.customerName
                ? 'border-rose-500/60 focus:ring-rose-500/50'
                : 'border-gray-700 focus:border-brand-500 focus:ring-brand-500/40'
            }`}
          />
        </div>
        {errors.customerName && (
          <p className="text-xs text-rose-400 mt-1">{errors.customerName}</p>
        )}
      </div>

      {/* Teléfono / WhatsApp */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
          Teléfono WhatsApp <span className="text-rose-400">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
            <Phone size={18} />
          </div>
          <input
            type="tel"
            required
            value={formData.customerPhone}
            onChange={(e) => onChange('customerPhone', e.target.value)}
            placeholder="Ej. +505 8888 1234"
            className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-gray-800/80 border text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 transition-all ${
              errors.customerPhone
                ? 'border-rose-500/60 focus:ring-rose-500/50'
                : 'border-gray-700 focus:border-brand-500 focus:ring-brand-500/40'
            }`}
          />
        </div>
        {errors.customerPhone && (
          <p className="text-xs text-rose-400 mt-1">{errors.customerPhone}</p>
        )}
        <p className="text-[11px] text-gray-500 mt-1">
          Usaremos este número para comunicarnos sobre tu reserva.
        </p>
      </div>

      {/* Correo Electrónico (Opcional) con nota de beneficio */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Correo electrónico
          </label>
          <span className="text-[11px] font-medium text-gray-500">Opcional</span>
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
            <EnvelopeSimple size={18} />
          </div>
          <input
            type="email"
            value={formData.customerEmail}
            onChange={(e) => onChange('customerEmail', e.target.value)}
            placeholder="tunombre@ejemplo.com"
            className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-gray-800/80 border text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 transition-all ${
              errors.customerEmail
                ? 'border-rose-500/60 focus:ring-rose-500/50'
                : 'border-gray-700 focus:border-brand-500 focus:ring-brand-500/40'
            }`}
          />
        </div>
        {errors.customerEmail && (
          <p className="text-xs text-rose-400 mt-1">{errors.customerEmail}</p>
        )}

        {/* Nota de beneficio explicativa requerida en Paso 2 */}
        <div className="mt-2.5 p-3 rounded-xl bg-brand-500/5 border border-brand-500/20 flex items-start gap-2.5 text-xs text-gray-300">
          <Info size={16} className="text-brand-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-brand-400 font-medium">Recomendado:</strong> Si
            dejás tu email, te mandamos el comprobante de tu reserva y un enlace
            directo para cancelarla o reagendarla vos mismo.
          </p>
        </div>
      </div>
    </div>
  );
};
