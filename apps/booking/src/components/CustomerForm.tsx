import React from 'react';
import { User, EnvelopeSimple, Info } from '@phosphor-icons/react';
import { PhoneInput } from './PhoneInput';

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

      {/* Teléfono / WhatsApp con prefijo fijo +505 */}
      <PhoneInput
        value={formData.customerPhone}
        onChange={(val) => onChange('customerPhone', val)}
        error={errors.customerPhone}
      />

      {/* Correo Electrónico (Obligatorio para confirmación) */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
          Correo electrónico <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <EnvelopeSimple size={18} />
          </div>
          <input
            type="email"
            required
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

        {/* Nota explicativa de envío de confirmación */}
        <div className="mt-2.5 p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-2.5 text-xs text-blue-950 shadow-2xs">
          <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Te enviaremos a este correo la confirmación de tu cita, el comprobante y el enlace para gestionarla o cancelarla.
          </p>
        </div>
      </div>
    </div>
  );
};
