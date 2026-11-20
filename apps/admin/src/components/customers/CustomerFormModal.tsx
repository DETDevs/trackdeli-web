import React, { useState, useEffect } from 'react';
import {
  User,
  X,
  CircleNotch,
  MapPin,
  MapTrifold,
  Keyboard,
  Check,
  WarningCircle,
  Eye,
  ArrowsClockwise,
  CheckCircle,
  CreditCard,
} from '@phosphor-icons/react';
import { PinPicker } from 'map';
import { toast } from 'react-hot-toast';
import {
  createCustomer,
  updateCustomer,
  updateCustomerStatus,
  type Customer,
  type CreateCustomerInput,
  type UpdateCustomerInput,
} from 'api-client';

interface DuplicateCustomerItem {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  documentId?: string | null;
  ruc?: string | null;
  isActive?: boolean;
}

interface DuplicateConflictInfo {
  canConfirm: boolean;
  message: string;
  customer?: DuplicateCustomerItem;
}

export interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  hasCarteraCobro: boolean;
  isPosManager: boolean;
  onSuccess: (saved: Customer) => void;
  onViewCustomer?: (customerId: string) => void;
}

const PHONE_REGEX = /^[0-9+ ()-]{7,25}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  customer,
  hasCarteraCobro,
  isPosManager,
  onSuccess,
  onViewCustomer,
}) => {
  const isEditing = Boolean(customer?.id);
  const canManageCredit = Boolean(hasCarteraCobro && isPosManager);
  const hadOriginalPhone = Boolean(customer?.phone && customer.phone.trim() !== '');

  const [name, setName] = useState('');
  const [ruc, setRuc] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryReference, setDeliveryReference] = useState('');
  const [notes, setNotes] = useState('');
  const [creditLimitStr, setCreditLimitStr] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);

  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locationMode, setLocationMode] = useState<'text' | 'map'>('text');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateConflictInfo | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setDuplicateInfo(null);
    setIsSubmitting(false);
    setIsReactivating(false);

    if (customer) {
      setName(customer.name || '');
      setRuc(customer.ruc || '');
      setPhone(customer.phone || '');
      setEmail(customer.email || '');
      setAddress(customer.lastAddressText || '');
      setDeliveryReference(customer.deliveryReference || '');
      setNotes(customer.notes || '');
      setCreditLimitStr(
        customer.creditLimit !== null && customer.creditLimit !== undefined
          ? String(customer.creditLimit)
          : '',
      );
      setIsBlocked(Boolean(customer.isBlocked));
      setLat(customer.lastLatitude ?? null);
      setLng(customer.lastLongitude ?? null);
      setLocationMode(customer.lastLatitude ? 'map' : 'text');
    } else {
      setName('');
      setRuc('');
      setPhone('');
      setEmail('');
      setAddress('');
      setDeliveryReference('');
      setNotes('');
      setCreditLimitStr('');
      setIsBlocked(false);
      setLat(null);
      setLng(null);
      setLocationMode('text');
    }
  }, [isOpen, customer]);

  if (!isOpen) return null;

  const handleFieldChange = (setter: (val: string) => void, value: string) => {
    setter(value);
    if (errorMsg) setErrorMsg(null);
    if (duplicateInfo) setDuplicateInfo(null);
  };

  const handleSubmit = async (e?: React.FormEvent, confirmDuplicatesOverride = false) => {
    if (e) e.preventDefault();

    const cleanName = name.trim();
    const cleanRuc = ruc.trim();
    const cleanPhone = phone.trim();
    const cleanEmail = email.trim();
    const cleanAddress = address.trim();
    const cleanDeliveryReference = deliveryReference.trim();
    const cleanNotes = notes.trim();

    if (!cleanName) {
      setErrorMsg('Ingresá el nombre del cliente.');
      return;
    }
    if (cleanName.length > 100) {
      setErrorMsg('El nombre no puede superar los 100 caracteres.');
      return;
    }

    // Teléfono obligatorio al crear; al editar, obligatorio solo si el cliente ya tenía teléfono
    const phoneRequired = !isEditing || hadOriginalPhone;
    if (phoneRequired && !cleanPhone) {
      setErrorMsg('Ingresá el teléfono del cliente.');
      return;
    }
    if (cleanPhone && !PHONE_REGEX.test(cleanPhone)) {
      setErrorMsg('El formato del teléfono no es válido (7 a 25 caracteres: números, +, -, (), espacios).');
      return;
    }

    if (cleanRuc.length > 30) {
      setErrorMsg('La cédula o RUC no puede superar los 30 caracteres.');
      return;
    }

    if (cleanEmail && !EMAIL_REGEX.test(cleanEmail)) {
      setErrorMsg('El correo electrónico no es válido.');
      return;
    }

    if (cleanAddress.length > 300) {
      setErrorMsg('La dirección no puede superar los 300 caracteres.');
      return;
    }

    if (cleanDeliveryReference.length > 300) {
      setErrorMsg('El punto de referencia no puede superar los 300 caracteres.');
      return;
    }

    if (cleanNotes.length > 2000) {
      setErrorMsg('Las notas no pueden superar los 2000 caracteres.');
      return;
    }

    let parsedCreditLimit: number | null | undefined = undefined;
    if (canManageCredit) {
      if (creditLimitStr.trim() !== '') {
        const num = Number(creditLimitStr);
        if (!Number.isFinite(num) || num < 0) {
          setErrorMsg('El límite de crédito debe ser un número mayor o igual a 0.');
          return;
        }
        parsedCreditLimit = num;
      } else if (isEditing) {
        parsedCreditLimit = null;
      }
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      let saved: Customer;

      if (isEditing && customer) {
        const updatePayload: UpdateCustomerInput = {
          name: cleanName,
          phone: cleanPhone || null,
          ruc: cleanRuc || null,
          documentId: cleanRuc || null,
          email: cleanEmail || null,
          address: cleanAddress || null,
          deliveryReference: cleanDeliveryReference || null,
          notes: cleanNotes || null,
          latitude: lat ?? undefined,
          longitude: lng ?? undefined,
          isBlocked,
          checkDuplicates: true,
        };

        if (confirmDuplicatesOverride) {
          updatePayload.confirmDuplicates = true;
        }

        if (canManageCredit && parsedCreditLimit !== undefined) {
          updatePayload.creditLimit = parsedCreditLimit;
        }

        saved = await updateCustomer(customer.id, updatePayload);
        toast.success('Cliente actualizado correctamente');
      } else {
        const createPayload: CreateCustomerInput = {
          name: cleanName,
          phone: cleanPhone,
          ...(cleanRuc ? { ruc: cleanRuc, documentId: cleanRuc } : {}),
          ...(cleanEmail ? { email: cleanEmail } : {}),
          ...(cleanAddress ? { address: cleanAddress } : {}),
          ...(cleanDeliveryReference ? { deliveryReference: cleanDeliveryReference } : {}),
          ...(cleanNotes ? { notes: cleanNotes } : {}),
          ...(isBlocked ? { isBlocked: true } : {}),
          checkDuplicates: true,
        };

        if (confirmDuplicatesOverride) {
          createPayload.confirmDuplicates = true;
        }

        if (canManageCredit && parsedCreditLimit !== undefined && parsedCreditLimit !== null) {
          createPayload.creditLimit = parsedCreditLimit;
        }

        saved = await createCustomer(createPayload);
        toast.success('Cliente creado correctamente');
      }

      onSuccess(saved);
      onClose();
    } catch (err: any) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      const code =
        data?.code || (typeof data?.message === 'object' ? data?.message?.code : null);
      const rawMessage =
        typeof data?.message === 'object'
          ? data?.message?.message
          : Array.isArray(data?.message)
          ? data.message.join(', ')
          : data?.message || err?.message || 'Error al guardar el cliente';

      if (status === 409 || code === 'DUPLICATE_CUSTOMER') {
        const canConfirm = Boolean(data?.canConfirm);
        const dupCustomer: DuplicateCustomerItem | undefined =
          data?.duplicates?.[0]?.customer || data?.existingCustomer;
        const dupName = dupCustomer?.name || 'Cliente ya registrado';

        const message = canConfirm
          ? `Ya existe un cliente activo con esa cédula/RUC o teléfono equivalente: ${dupName}.`
          : `Ya existe un cliente registrado con ese teléfono: ${dupName}.`;

        setDuplicateInfo({
          canConfirm,
          message,
          customer: dupCustomer,
        });
        setErrorMsg(null);
      } else {
        setDuplicateInfo(null);
        setErrorMsg(String(rawMessage));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReactivateDuplicate = async () => {
    const dupId = duplicateInfo?.customer?.id;
    if (!dupId) return;

    setIsReactivating(true);
    setErrorMsg(null);
    try {
      const reactivated = await updateCustomerStatus(dupId, true);
      toast.success('Cliente reactivado correctamente');
      onSuccess(reactivated);
      if (onViewCustomer) {
        onViewCustomer(dupId);
      }
      onClose();
    } catch (err: any) {
      const rawMessage =
        err?.response?.data?.message || err?.message || 'Error al reactivar el cliente';
      setErrorMsg(String(rawMessage));
    } finally {
      setIsReactivating(false);
    }
  };

  const handleViewDuplicate = () => {
    const dupId = duplicateInfo?.customer?.id;
    if (dupId && onViewCustomer) {
      onViewCustomer(dupId);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
      />

      <div className="relative w-full max-w-xl bg-white rounded-t-2xl sm:rounded-2xl border border-gray-100 shadow-2xl overflow-hidden z-10 max-h-[94vh] sm:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-900 text-white flex items-center justify-center shrink-0">
              <User size={18} weight="bold" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 leading-tight">
                {isEditing ? 'Editar cliente' : 'Nuevo cliente'}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {isEditing
                  ? 'Actualizá los datos de contacto, entrega y crédito del cliente.'
                  : 'Registrá un nuevo cliente en el directorio de tu negocio.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={(e) => handleSubmit(e, false)}
          className="p-5 sm:p-6 space-y-5 overflow-y-auto text-xs"
        >
          {/* Error message */}
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800">
              <WarningCircle size={18} weight="fill" className="text-red-600 shrink-0 mt-0.5" />
              <span className="font-medium leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* Duplicate conflict warning */}
          {duplicateInfo && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3 text-amber-950">
              <div className="flex items-start gap-2.5">
                <WarningCircle
                  size={18}
                  weight="fill"
                  className="text-amber-600 shrink-0 mt-0.5"
                />
                <div className="space-y-1 text-xs leading-relaxed">
                  <p className="font-semibold text-amber-950">{duplicateInfo.message}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-gray-700">
                    {duplicateInfo.customer?.phone && (
                      <span>Teléfono: {duplicateInfo.customer.phone}</span>
                    )}
                    {(duplicateInfo.customer?.documentId || duplicateInfo.customer?.ruc) && (
                      <span>
                        Cédula/RUC: {duplicateInfo.customer.documentId || duplicateInfo.customer.ruc}
                      </span>
                    )}
                    {duplicateInfo.customer?.isActive === false && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-800">
                        Cliente inactivo
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {duplicateInfo.customer?.id && onViewCustomer && (
                  <button
                    type="button"
                    onClick={handleViewDuplicate}
                    className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 rounded-lg font-semibold text-xs inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Eye size={14} weight="bold" />
                    <span>Ver cliente</span>
                  </button>
                )}

                {duplicateInfo.customer?.isActive === false && isPosManager && (
                  <button
                    type="button"
                    onClick={handleReactivateDuplicate}
                    disabled={isReactivating}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-semibold text-xs inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  >
                    {isReactivating ? (
                      <CircleNotch size={14} className="animate-spin" />
                    ) : (
                      <ArrowsClockwise size={14} weight="bold" />
                    )}
                    <span>Reactivar cliente</span>
                  </button>
                )}

                {duplicateInfo.canConfirm && (
                  <button
                    type="button"
                    onClick={() => handleSubmit(undefined, true)}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg font-semibold text-xs inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  >
                    <CheckCircle size={14} weight="bold" />
                    <span>{isSubmitting ? 'Guardando...' : 'Guardar de todos modos'}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 1. Datos básicos */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Datos básicos
            </h4>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Nombre completo *
              </label>
              <input
                type="text"
                required
                maxLength={100}
                placeholder="Ej. Alexander Fonseca"
                value={name}
                onChange={(e) => handleFieldChange(setName, e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:border-gray-900 outline-none transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Cédula / RUC
                </label>
                <input
                  type="text"
                  maxLength={30}
                  placeholder="Ej. 001-000000-0000A"
                  value={ruc}
                  onChange={(e) => handleFieldChange(setRuc, e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:border-gray-900 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Teléfono {!isEditing || hadOriginalPhone ? '*' : '(opcional)'}
                </label>
                <input
                  type="tel"
                  maxLength={30}
                  placeholder="Ej. 8888 7777 o +505 8888 7777"
                  value={phone}
                  onChange={(e) => handleFieldChange(setPhone, e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:border-gray-900 outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Correo electrónico
              </label>
              <input
                type="email"
                maxLength={255}
                placeholder="Ej. cliente@correo.com"
                value={email}
                onChange={(e) => handleFieldChange(setEmail, e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:border-gray-900 outline-none transition-colors"
              />
            </div>
          </div>

          {/* 2. Dirección y punto de referencia */}
          <div className="space-y-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Dirección y punto de referencia
              </h4>
              <div className="flex items-center bg-gray-100 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setLocationMode('text')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    locationMode === 'text'
                      ? 'bg-white text-gray-900 shadow-2xs'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Keyboard size={13} />
                  <span>Manual</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLocationMode('map')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    locationMode === 'map'
                      ? 'bg-white text-gray-900 shadow-2xs'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <MapTrifold size={13} />
                  <span>Pin en mapa</span>
                </button>
              </div>
            </div>

            {locationMode === 'map' ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-500">
                  Arrastrá el pin para fijar la ubicación exacta del domicilio del cliente.
                </p>
                <PinPicker
                  mapboxToken={(import.meta as any).env.VITE_MAPBOX_TOKEN}
                  initialLat={lat || 12.1328}
                  initialLng={lng || -86.2504}
                  onConfirm={(newLat, newLng, addr) => {
                    setLat(newLat);
                    setLng(newLng);
                    if (addr) setAddress(addr);
                    toast.success('Ubicación fijada en el mapa');
                  }}
                />
                {(lat && lng) || address ? (
                  <div className="text-xs text-gray-600 bg-emerald-50/70 border border-emerald-100 rounded-lg p-2.5 flex items-center gap-2">
                    <MapPin size={14} className="text-emerald-600 shrink-0" weight="fill" />
                    <span className="truncate flex-1 font-medium">
                      {address || `Coordenadas: ${lat?.toFixed(5)}, ${lng?.toFixed(5)}`}
                    </span>
                    <span className="text-xs text-emerald-700 font-semibold shrink-0 flex items-center gap-1">
                      <Check size={12} weight="bold" /> Guardado
                    </span>
                  </div>
                ) : null}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Dirección habitual de entrega
                </label>
                <textarea
                  maxLength={300}
                  placeholder="Ej. De la farmacia 1c abajo, casa esquinera color verde"
                  value={address}
                  onChange={(e) => handleFieldChange(setAddress, e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:border-gray-900 outline-none transition-colors h-20 resize-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Punto de referencia
              </label>
              <input
                type="text"
                maxLength={300}
                placeholder="Ej. Portón blanco frente al súper"
                value={deliveryReference}
                onChange={(e) => handleFieldChange(setDeliveryReference, e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:border-gray-900 outline-none transition-colors"
              />
            </div>
          </div>

          {/* 3. Notas */}
          <div className="space-y-2 pt-3 border-t border-gray-100">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Notas
            </h4>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Notas u observaciones internas
              </label>
              <input
                type="text"
                maxLength={2000}
                placeholder="Ej. Llamar antes de llegar"
                value={notes}
                onChange={(e) => handleFieldChange(setNotes, e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:border-gray-900 outline-none transition-colors"
              />
            </div>
          </div>

          {/* 4. Crédito (solo con Cartera de Cobro y ENCARGADO / SUPERADMIN) */}
          {canManageCredit && (
            <div className="space-y-2 pt-3 border-t border-gray-100">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard size={15} className="text-gray-700" />
                <span>Crédito</span>
              </h4>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Límite de crédito (C$)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Ej. 5000.00 (dejá vacío si no tiene límite asignado)"
                  value={creditLimitStr}
                  onChange={(e) => handleFieldChange(setCreditLimitStr, e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:border-gray-900 outline-none transition-colors"
                />
              </div>
            </div>
          )}

          {/* 5. Bloquear cliente */}
          <div className="pt-2 border-t border-gray-100">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isBlocked}
                onChange={(e) => setIsBlocked(e.target.checked)}
                className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 h-4 w-4"
              />
              <span className="text-xs text-gray-700 font-medium">
                Bloquear este cliente (no permitir nuevos pedidos)
              </span>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting && <CircleNotch size={14} className="animate-spin" />}
              <span>{isEditing ? 'Guardar cambios' : 'Crear cliente'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
