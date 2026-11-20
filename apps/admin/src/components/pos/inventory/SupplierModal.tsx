import React, { useState, useEffect, useMemo } from 'react';
import { X, Truck, WarningCircle, FloppyDisk } from '@phosphor-icons/react';
import { useQueryClient } from '@tanstack/react-query';
import {
  type PosSupplier,
  createPosSupplier,
  updatePosSupplier,
} from 'api-client';
import { extractApiErrorMessage } from '../../../utils/productCost';

export interface SupplierModalProps {
  isOpen: boolean;
  supplier?: PosSupplier | null;
  initialName?: string;
  existingSuppliers?: PosSupplier[];
  onClose: () => void;
  onSaved: (supplier: PosSupplier) => void;
  onSelectExisting?: (supplier: PosSupplier) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TAX_ID_REGEX = /^[A-Za-z0-9\-\.\s]+$/;

export const SupplierModal: React.FC<SupplierModalProps> = ({
  isOpen,
  supplier = null,
  initialName = '',
  existingSuppliers = [],
  onClose,
  onSaved,
  onSelectExisting,
}) => {
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (supplier) {
      setName(supplier.name || '');
      setTaxId(supplier.taxId || '');
      setPhone(supplier.phone || '');
      setEmail(supplier.email || '');
      setAddress(supplier.address || '');
      setNotes(supplier.notes || '');
    } else {
      setName(initialName || '');
      setTaxId('');
      setPhone('');
      setEmail('');
      setAddress('');
      setNotes('');
    }
    setErrorMsg(null);
  }, [isOpen, supplier, initialName]);

  const normalizedName = name.trim().toLowerCase().replace(/\s+/g, ' ');
  const duplicateSupplier = useMemo(() => {
    if (!normalizedName) return null;
    return (
      existingSuppliers.find(
        (s) =>
          s &&
          s.id !== supplier?.id &&
          s.name.trim().toLowerCase().replace(/\s+/g, ' ') === normalizedName,
      ) || null
    );
  }, [normalizedName, existingSuppliers, supplier]);

  if (!isOpen) return null;

  const isEditing = Boolean(supplier?.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMsg('El nombre del proveedor es obligatorio.');
      return;
    }

    if (duplicateSupplier) {
      setErrorMsg(
        `Ya tenés un proveedor con ese nombre («${duplicateSupplier.name}»). Podés usar el existente.`,
      );
      return;
    }

    const cleanTaxId = taxId.trim();
    if (cleanTaxId && !TAX_ID_REGEX.test(cleanTaxId)) {
      setErrorMsg('El RUC o identificación fiscal contiene caracteres inválidos.');
      return;
    }

    const cleanEmail = email.trim();
    if (cleanEmail && !EMAIL_REGEX.test(cleanEmail)) {
      setErrorMsg('Ingresá un correo electrónico válido.');
      return;
    }

    const cleanPhone = phone.trim();
    const cleanAddress = address.trim();
    const cleanNotes = notes.trim();

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      let saved: PosSupplier;
      if (isEditing && supplier) {
        saved = await updatePosSupplier(supplier.id, {
          name: cleanName,
          taxId: cleanTaxId || null,
          phone: cleanPhone || null,
          email: cleanEmail || null,
          address: cleanAddress || null,
          notes: cleanNotes || null,
        });
      } else {
        saved = await createPosSupplier({
          name: cleanName,
          ...(cleanTaxId ? { taxId: cleanTaxId } : {}),
          ...(cleanPhone ? { phone: cleanPhone } : {}),
          ...(cleanEmail ? { email: cleanEmail } : {}),
          ...(cleanAddress ? { address: cleanAddress } : {}),
          ...(cleanNotes ? { notes: cleanNotes } : {}),
        });
      }

      queryClient.invalidateQueries({ queryKey: ['pos', 'suppliers'] });
      onSaved(saved);
    } catch (err: any) {
      setErrorMsg(extractApiErrorMessage(err, 'No se pudo guardar el proveedor.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl border border-gray-200 shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-2 shrink-0 bg-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
              <Truck size={20} weight="duotone" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                {isEditing ? 'Editar proveedor' : 'Nuevo proveedor'}
              </h3>
              <p className="text-xs text-gray-500 truncate">
                {isEditing
                  ? 'Actualizá los datos de contacto y registro fiscal'
                  : 'Completá los datos del proveedor para tu catálogo'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Cerrar modal"
            className="w-11 h-11 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 flex items-center justify-center transition-colors shrink-0 cursor-pointer disabled:opacity-50"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-800">
                <WarningCircle size={18} weight="fill" className="text-red-600 shrink-0 mt-0.5" />
                <span className="break-words">{errorMsg}</span>
              </div>
            )}

            {/* Nombre */}
            <div>
              <label className="block text-xs font-semibold text-gray-800 mb-1">
                Nombre del proveedor <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                maxLength={100}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Ej. Droguería Central"
                autoFocus
                className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-purple-600 bg-white"
              />
            </div>

            {/* Aviso de nombre repetido */}
            {duplicateSupplier && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2 text-xs text-amber-900">
                <div className="flex items-start gap-2">
                  <WarningCircle size={18} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="font-medium">
                    Ya tenés un proveedor con ese nombre ({duplicateSupplier.name}).
                  </p>
                </div>
                {onSelectExisting && (
                  <button
                    type="button"
                    onClick={() => onSelectExisting(duplicateSupplier)}
                    className="min-h-[44px] w-full sm:w-auto px-3.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Usar el existente
                  </button>
                )}
              </div>
            )}

            {/* RUC y Teléfono */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1">
                  RUC / Identificación fiscal
                </label>
                <input
                  type="text"
                  maxLength={50}
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder="Ej. J0310000000000"
                  className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-900 font-mono focus:outline-none focus:border-purple-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  maxLength={30}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej. 8888-0000"
                  className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-purple-600 bg-white"
                />
              </div>
            </div>

            {/* Correo electrónico */}
            <div>
              <label className="block text-xs font-semibold text-gray-800 mb-1">
                Correo electrónico
              </label>
              <input
                type="email"
                maxLength={150}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ej. pedidos@proveedor.com"
                className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-purple-600 bg-white"
              />
            </div>

            {/* Dirección */}
            <div>
              <label className="block text-xs font-semibold text-gray-800 mb-1">
                Dirección
              </label>
              <input
                type="text"
                maxLength={300}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Dirección del distribuidor o bodega"
                className="w-full h-11 px-3 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-purple-600 bg-white"
              />
            </div>

            {/* Notas */}
            <div>
              <label className="block text-xs font-semibold text-gray-800 mb-1">
                Notas
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Días de entrega, condiciones o referencias útiles"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-purple-600 bg-white resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 sm:px-5 py-3 bg-gray-50 border-t border-gray-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto min-h-[44px] px-4 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || Boolean(duplicateSupplier)}
              className="w-full sm:w-auto min-h-[44px] px-5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <FloppyDisk size={16} weight="bold" />
              <span>
                {isSubmitting
                  ? 'Guardando...'
                  : isEditing
                  ? 'Guardar cambios'
                  : 'Crear proveedor'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
