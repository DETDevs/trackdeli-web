import React, { useState, useEffect } from 'react';
import { PencilSimple, Storefront, Phone, MapPin, IdentificationCard, Tag, Image, WarningCircle, Info } from '@phosphor-icons/react';
import { Modal } from '../ui/Modal';
import { BusinessDetail, useUpdateBusiness } from '../../hooks/useBusinesses';

interface EditBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: BusinessDetail;
}

export const EditBusinessModal: React.FC<EditBusinessModalProps> = ({
  isOpen,
  onClose,
  business,
}) => {
  const updateMutation = useUpdateBusiness();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    taxId: '',
    type: '',
    logoUrl: '',
    useListPrice: false,
    twoStepSaleEnabled: false,
    twoStepTicketTtlHours: 4,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && business) {
      setFormData({
        name: business.name || '',
        phone:
          business.phone ||
          business.posPhone ||
          business.whatsappNumber ||
          business.whatsappDisplay ||
          '',
        address: business.address || business.posAddress || '',
        taxId: business.taxId || (business as any).ruc || '',
        type: business.type || '',
        logoUrl: business.logoUrl || (business as any).logo || '',
        useListPrice: Boolean(business.useListPrice),
        twoStepSaleEnabled: Boolean(business.twoStepSaleEnabled),
        twoStepTicketTtlHours: business.twoStepTicketTtlHours ?? 4,
      });
      setErrors({});
      setApiError(null);
    }
  }, [isOpen, business]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre del negocio es obligatorio.';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'El nombre no puede tener más de 100 caracteres.';
    }

    if (formData.phone.trim()) {
      const digitsOnly = formData.phone.replace(/[^0-9]/g, '');
      if (digitsOnly.length < 8) {
        newErrors.phone = 'Ingresá un número de teléfono válido (mínimo 8 dígitos).';
      }
    }

    if (formData.address.trim().length > 300) {
      newErrors.address = 'La dirección no puede tener más de 300 caracteres.';
    }

    if (formData.taxId.trim().length > 50) {
      newErrors.taxId = 'El RUC / Cédula no puede tener más de 50 caracteres.';
    }

    if (formData.type.trim().length > 50) {
      newErrors.type = 'El tipo de negocio no puede tener más de 50 caracteres.';
    }

    if (formData.logoUrl.trim()) {
      try {
        const url = new URL(formData.logoUrl.trim());
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          newErrors.logoUrl = 'La URL del logo debe comenzar con http:// o https://';
        }
      } catch {
        newErrors.logoUrl = 'Ingresá una dirección URL válida para el logo.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!validate()) {
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim() || undefined,
        posPhone: formData.phone.trim() || undefined,
        whatsappNumber: formData.phone.replace(/[^0-9]/g, '') || undefined,
        address: formData.address.trim() || undefined,
        posAddress: formData.address.trim() || undefined,
        taxId: formData.taxId.trim() || undefined,
        ruc: formData.taxId.trim() || undefined,
        type: formData.type.trim() || undefined,
        logoUrl: formData.logoUrl.trim() || undefined,
        logo: formData.logoUrl.trim() || undefined,
        useListPrice: formData.useListPrice,
        twoStepSaleEnabled: formData.twoStepSaleEnabled,
        twoStepTicketTtlHours: Number(formData.twoStepTicketTtlHours) || 4,
      };

      await updateMutation.mutateAsync({
        id: business.id,
        data: payload,
      });

      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error al actualizar los datos del negocio.';
      const formattedMsg = Array.isArray(msg) ? msg.join('. ') : msg;
      setApiError(formattedMsg);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar datos del negocio"
      subtitle={`Actualizá los datos generales de ${business.name}`}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {apiError && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200/80 text-xs text-red-800 flex items-start gap-2.5">
            <WarningCircle size={18} className="text-red-600 shrink-0 mt-0.5" weight="fill" />
            <div className="space-y-0.5">
              <p className="font-semibold text-red-900">No se pudieron guardar los cambios</p>
              <p className="text-[11px] text-red-700 leading-relaxed">{apiError}</p>
            </div>
          </div>
        )}

        {/* Nombre */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1.5">
            <Storefront size={14} className="text-gray-500" />
            <span>Nombre del negocio *</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => {
              setFormData({ ...formData, name: e.target.value });
              if (errors.name) setErrors({ ...errors, name: '' });
            }}
            placeholder="Ej: Asados Doña María"
            required
            className={`w-full h-9 px-3 rounded-xl border text-xs text-gray-900 bg-white focus:outline-none transition-colors ${
              errors.name
                ? 'border-red-500 focus:border-red-600 focus:ring-1 focus:ring-red-500'
                : 'border-gray-200 focus:border-gray-900'
            }`}
          />
          {errors.name && (
            <p className="text-[11px] text-red-600 mt-1">{errors.name}</p>
          )}
        </div>

        {/* Tipo de negocio y RUC en dos columnas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1.5">
              <Tag size={14} className="text-gray-500" />
              <span>Tipo de negocio</span>
            </label>
            <input
              type="text"
              value={formData.type}
              onChange={(e) => {
                setFormData({ ...formData, type: e.target.value });
                if (errors.type) setErrors({ ...errors, type: '' });
              }}
              placeholder="Ej: Restaurante, Farmacia, Taller..."
              className={`w-full h-9 px-3 rounded-xl border text-xs text-gray-900 bg-white focus:outline-none transition-colors ${
                errors.type
                  ? 'border-red-500 focus:border-red-600'
                  : 'border-gray-200 focus:border-gray-900'
              }`}
            />
            {errors.type && (
              <p className="text-[11px] text-red-600 mt-1">{errors.type}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1.5">
              <IdentificationCard size={14} className="text-gray-500" />
              <span>RUC / Cédula</span>
            </label>
            <input
              type="text"
              value={formData.taxId}
              onChange={(e) => {
                setFormData({ ...formData, taxId: e.target.value });
                if (errors.taxId) setErrors({ ...errors, taxId: '' });
              }}
              placeholder="Ej: J0310000000000"
              className={`w-full h-9 px-3 rounded-xl border text-xs text-gray-900 bg-white focus:outline-none transition-colors ${
                errors.taxId
                  ? 'border-red-500 focus:border-red-600'
                  : 'border-gray-200 focus:border-gray-900'
              }`}
            />
            {errors.taxId && (
              <p className="text-[11px] text-red-600 mt-1">{errors.taxId}</p>
            )}
          </div>
        </div>

        {/* Teléfono */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1.5">
            <Phone size={14} className="text-gray-500" />
            <span>Teléfono de contacto</span>
          </label>
          <input
            type="text"
            value={formData.phone}
            onChange={(e) => {
              setFormData({ ...formData, phone: e.target.value });
              if (errors.phone) setErrors({ ...errors, phone: '' });
            }}
            placeholder="Ej: 8888-8888 o +505 8888 8888"
            className={`w-full h-9 px-3 rounded-xl border text-xs text-gray-900 bg-white focus:outline-none transition-colors ${
              errors.phone
                ? 'border-red-500 focus:border-red-600 focus:ring-1 focus:ring-red-500'
                : 'border-gray-200 focus:border-gray-900'
            }`}
          />
          {errors.phone && (
            <p className="text-[11px] text-red-600 mt-1">{errors.phone}</p>
          )}
        </div>

        {/* Dirección */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1.5">
            <MapPin size={14} className="text-gray-500" />
            <span>Dirección</span>
          </label>
          <textarea
            rows={2}
            value={formData.address}
            onChange={(e) => {
              setFormData({ ...formData, address: e.target.value });
              if (errors.address) setErrors({ ...errors, address: '' });
            }}
            placeholder="Ej: De la Rotonda El Güegüense 2c abajo, 1c al sur"
            className={`w-full p-2.5 rounded-xl border text-xs text-gray-900 bg-white focus:outline-none transition-colors resize-none ${
              errors.address
                ? 'border-red-500 focus:border-red-600 focus:ring-1 focus:ring-red-500'
                : 'border-gray-200 focus:border-gray-900'
            }`}
          />
          {errors.address && (
            <p className="text-[11px] text-red-600 mt-1">{errors.address}</p>
          )}
        </div>

        {/* Logo URL */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1.5">
            <Image size={14} className="text-gray-500" />
            <span>URL del Logo</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="url"
              value={formData.logoUrl}
              onChange={(e) => {
                setFormData({ ...formData, logoUrl: e.target.value });
                if (errors.logoUrl) setErrors({ ...errors, logoUrl: '' });
              }}
              placeholder="https://ejemplo.com/logo.png"
              className={`flex-1 h-9 px-3 rounded-xl border text-xs text-gray-900 bg-white focus:outline-none transition-colors ${
                errors.logoUrl
                  ? 'border-red-500 focus:border-red-600 focus:ring-1 focus:ring-red-500'
                  : 'border-gray-200 focus:border-gray-900'
              }`}
            />
            {formData.logoUrl && !errors.logoUrl && (
              <div className="w-9 h-9 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden shrink-0 flex items-center justify-center">
                <img
                  src={formData.logoUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
          {errors.logoUrl && (
            <p className="text-[11px] text-red-600 mt-1">{errors.logoUrl}</p>
          )}
        </div>

        {/* Usar precio de etiqueta */}
        <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-200/70 flex items-center justify-between gap-3">
          <div>
            <label
              className="block text-xs font-bold text-gray-900 cursor-pointer"
              onClick={() => setFormData({ ...formData, useListPrice: !formData.useListPrice })}
            >
              Usar precio de etiqueta
            </label>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Muestra precio de etiqueta y descuento en productos y comprobantes (farmacias)
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, useListPrice: !formData.useListPrice })}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              formData.useListPrice ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                formData.useListPrice ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Venta en dos pasos (vendedor → caja) */}
        <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/70 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <label
                className="block text-xs font-bold text-gray-900 cursor-pointer"
                onClick={() =>
                  setFormData({
                    ...formData,
                    twoStepSaleEnabled: !formData.twoStepSaleEnabled,
                  })
                }
              >
                Venta en dos pasos (vendedor → caja)
              </label>
              <p className="text-[11px] text-gray-500 mt-0.5">
                El vendedor arma la orden y la envía a caja; el cajero la cobra.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setFormData({
                  ...formData,
                  twoStepSaleEnabled: !formData.twoStepSaleEnabled,
                })
              }
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                formData.twoStepSaleEnabled ? 'bg-amber-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  formData.twoStepSaleEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {formData.twoStepSaleEnabled && (
            <div className="pt-2 border-t border-amber-200/50 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Vencimiento del ticket (horas)
                </label>
                <input
                  type="number"
                  min={1}
                  max={72}
                  value={formData.twoStepTicketTtlHours}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      twoStepTicketTtlHours: Math.max(1, parseInt(e.target.value, 10) || 1),
                    })
                  }
                  className="w-full sm:w-36 px-3 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Tiempo límite antes de que un ticket no cobrado venza (por defecto 4 horas).
                </p>
              </div>

              {/* Aviso de límite de dispositivos y versión mínima */}
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-100/70 border border-amber-300/60 text-amber-900 text-[11px] leading-relaxed">
                <Info size={16} className="shrink-0 text-amber-700 mt-0.5" weight="fill" />
                <div>
                  <p className="font-semibold">Aviso importante:</p>
                  <p>
                    Las computadoras de vendedores cuentan en el límite del plan.
                    {business?.twoStepMinVersion
                      ? ` Requiere el POS de escritorio versión ${business.twoStepMinVersion} o superior.`
                      : ''}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={updateMutation.isPending}
            className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
          >
            <PencilSimple size={15} />
            <span>{updateMutation.isPending ? 'Guardando cambios...' : 'Guardar cambios'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
