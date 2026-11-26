import React, { useState, useEffect } from 'react';
import { PencilSimple, WarningCircle } from '@phosphor-icons/react';
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
    type: '',
    logoUrl: '',
    contactName: '',
    contactRole: '',
    contactPhone: '',
    contactWhatsapp: '',
    contactEmail: '',
    contactAddress: '',
    contactMunicipality: '',
    contactDepartment: '',
    contactTaxId: '',
    contactNotes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && business) {
      const c = business.contact;
      const sug = business.suggestedContact;
      setFormData({
        name: business.name || '',
        type: business.type || '',
        logoUrl: business.logoUrl || (business as any).logo || '',
        contactName: c?.name || business.contactName || sug?.name || '',
        contactRole: c?.role || business.contactRole || sug?.role || '',
        contactPhone:
          c?.phone ||
          business.contactPhone ||
          sug?.phone ||
          (business as any).phone ||
          business.posPhone ||
          '',
        contactWhatsapp:
          c?.whatsapp ||
          business.contactWhatsapp ||
          sug?.whatsapp ||
          business.whatsappNumber ||
          '',
        contactEmail: c?.email || business.contactEmail || sug?.email || '',
        contactAddress:
          c?.address ||
          business.contactAddress ||
          sug?.address ||
          (business as any).address ||
          business.posAddress ||
          '',
        contactMunicipality: c?.municipality || business.contactMunicipality || '',
        contactDepartment: c?.department || business.contactDepartment || '',
        contactTaxId:
          c?.taxId ||
          business.contactTaxId ||
          sug?.taxId ||
          (business as any).taxId ||
          '',
        contactNotes: c?.notes || business.contactNotes || '',
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

    if (formData.contactPhone.trim()) {
      const digitsOnly = formData.contactPhone.replace(/[^0-9]/g, '');
      if (digitsOnly.length < 8) {
        newErrors.contactPhone = 'Ingresá un teléfono válido (mínimo 8 dígitos).';
      }
    }

    if (formData.contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail.trim())) {
      newErrors.contactEmail = 'Ingresá un correo electrónico válido.';
    }

    if (formData.logoUrl.trim()) {
      try {
        const url = new URL(formData.logoUrl.trim());
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          newErrors.logoUrl = 'La dirección del logo debe comenzar con http:// o https://';
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

    if (!validate()) return;

    try {
      const phoneVal = formData.contactPhone.trim();
      const waVal = formData.contactWhatsapp.trim() || phoneVal;
      const addrVal = formData.contactAddress.trim();
      const taxVal = formData.contactTaxId.trim();

      await updateMutation.mutateAsync({
        id: business.id,
        data: {
          name: formData.name.trim(),
          type: formData.type.trim() || undefined,
          logoUrl: formData.logoUrl.trim() || undefined,
          phone: phoneVal || undefined,
          posPhone: phoneVal || undefined,
          whatsappNumber: waVal ? waVal.replace(/[^0-9]/g, '') : undefined,
          address: addrVal || undefined,
          posAddress: addrVal || undefined,
          taxId: taxVal || undefined,
          ruc: taxVal || undefined,
          contact: {
            name: formData.contactName.trim() || null,
            role: formData.contactRole.trim() || null,
            phone: phoneVal || null,
            whatsapp: waVal || null,
            email: formData.contactEmail.trim() || null,
            address: addrVal || null,
            municipality: formData.contactMunicipality.trim() || null,
            department: formData.contactDepartment.trim() || null,
            taxId: taxVal || null,
            notes: formData.contactNotes.trim() || null,
          },
        },
      });

      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error al actualizar los datos.';
      setApiError(Array.isArray(msg) ? msg.join('. ') : msg);
    }
  };

  const inputClass = (err?: string) =>
    `w-full h-10 px-3 rounded-lg border text-xs text-gray-900 bg-white focus:outline-none transition-colors ${
      err ? 'border-red-500 focus:border-red-600' : 'border-gray-200 focus:border-gray-900'
    }`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar datos del cliente y negocio"
      subtitle={`Actualizá los datos de contacto y perfil de ${business.name}`}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {apiError && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2.5">
            <WarningCircle size={18} className="text-red-600 shrink-0 mt-0.5" weight="fill" />
            <div>
              <p className="font-semibold text-red-900">No se pudieron guardar los cambios</p>
              <p className="text-xs text-red-700 mt-0.5">{apiError}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Nombre del negocio *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (errors.name) setErrors({ ...errors, name: '' });
              }}
              placeholder="Ej. Farmacia San José"
              required
              className={inputClass(errors.name)}
            />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Nombre del contacto
            </label>
            <input
              type="text"
              value={formData.contactName}
              onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
              placeholder="Ej. María Gómez"
              className={inputClass()}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Cargo
            </label>
            <input
              type="text"
              value={formData.contactRole}
              onChange={(e) => setFormData({ ...formData, contactRole: e.target.value })}
              placeholder="Ej. Propietaria, Administrador"
              className={inputClass()}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Teléfono
            </label>
            <input
              type="text"
              value={formData.contactPhone}
              onChange={(e) => {
                setFormData({ ...formData, contactPhone: e.target.value });
                if (errors.contactPhone) setErrors({ ...errors, contactPhone: '' });
              }}
              placeholder="Ej. 8888-8888"
              className={inputClass(errors.contactPhone)}
            />
            {errors.contactPhone && <p className="text-xs text-red-600 mt-1">{errors.contactPhone}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              WhatsApp (opcional si es igual al teléfono)
            </label>
            <input
              type="text"
              value={formData.contactWhatsapp}
              onChange={(e) => setFormData({ ...formData, contactWhatsapp: e.target.value })}
              placeholder="Ej. 50588888888"
              className={inputClass()}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              value={formData.contactEmail}
              onChange={(e) => {
                setFormData({ ...formData, contactEmail: e.target.value });
                if (errors.contactEmail) setErrors({ ...errors, contactEmail: '' });
              }}
              placeholder="contacto@negocio.com"
              className={inputClass(errors.contactEmail)}
            />
            {errors.contactEmail && <p className="text-xs text-red-600 mt-1">{errors.contactEmail}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              RUC o cédula
            </label>
            <input
              type="text"
              value={formData.contactTaxId}
              onChange={(e) => setFormData({ ...formData, contactTaxId: e.target.value })}
              placeholder="Ej. J0310000000000"
              className={inputClass()}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Municipio
            </label>
            <input
              type="text"
              value={formData.contactMunicipality}
              onChange={(e) => setFormData({ ...formData, contactMunicipality: e.target.value })}
              placeholder="Ej. Managua"
              className={inputClass()}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Departamento
            </label>
            <input
              type="text"
              value={formData.contactDepartment}
              onChange={(e) => setFormData({ ...formData, contactDepartment: e.target.value })}
              placeholder="Ej. Managua"
              className={inputClass()}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Dirección
            </label>
            <input
              type="text"
              value={formData.contactAddress}
              onChange={(e) => setFormData({ ...formData, contactAddress: e.target.value })}
              placeholder="Dirección física del local"
              className={inputClass()}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Rubro / tipo (texto opcional)
            </label>
            <input
              type="text"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              placeholder="Ej. Farmacia, Restaurante"
              className={inputClass()}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              URL del logo (opcional)
            </label>
            <input
              type="url"
              value={formData.logoUrl}
              onChange={(e) => {
                setFormData({ ...formData, logoUrl: e.target.value });
                if (errors.logoUrl) setErrors({ ...errors, logoUrl: '' });
              }}
              placeholder="https://..."
              className={inputClass(errors.logoUrl)}
            />
            {errors.logoUrl && <p className="text-xs text-red-600 mt-1">{errors.logoUrl}</p>}
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Notas internas
            </label>
            <textarea
              rows={2}
              value={formData.contactNotes}
              onChange={(e) => setFormData({ ...formData, contactNotes: e.target.value })}
              placeholder="Observaciones internas sobre el cliente o acuerdos..."
              className="w-full p-2.5 rounded-lg border border-gray-200 text-xs text-gray-900 bg-white focus:outline-none focus:border-gray-900 resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={updateMutation.isPending}
            className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 disabled:opacity-50 transition-all cursor-pointer"
          >
            <PencilSimple size={15} />
            <span>{updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
