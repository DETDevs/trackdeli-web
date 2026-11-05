import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { WarningCircle } from '@phosphor-icons/react';
import { Modal } from '../ui/Modal';
import {
  CommercialEquipment,
  CommercialEquipmentStatus,
  CommercialEquipmentType,
  EQUIPMENT_STATUS_LABELS,
  EQUIPMENT_TYPE_LABELS,
  SERIAL_REQUIRED_TYPES,
  getApiErrorMessage,
  useSaveCommercialEquipment,
} from '../../hooks/useCommercial';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  agreementId: string;
  equipment: CommercialEquipment | null; // null = agregar
}

const inputCls =
  'w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900';
const labelCls = 'block text-xs font-medium text-gray-700 mb-1.5';

export const CommercialEquipmentModal: React.FC<Props> = ({ isOpen, onClose, businessId, agreementId, equipment }) => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [equipmentType, setEquipmentType] = useState<CommercialEquipmentType>('COMPUTADORA');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [price, setPrice] = useState('');
  const [status, setStatus] = useState<CommercialEquipmentStatus>('ENTREGADO');
  const [deliveredAt, setDeliveredAt] = useState(today);
  const [warrantyEndsAt, setWarrantyEndsAt] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useSaveCommercialEquipment(businessId);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (equipment) {
      setEquipmentType(equipment.equipmentType);
      setBrand(equipment.brand);
      setModel(equipment.model);
      setSerialNumber(equipment.serialNumber || '');
      setPrice(equipment.price != null ? String(equipment.price) : '');
      setStatus(equipment.status);
      setDeliveredAt(equipment.deliveredAt || '');
      setWarrantyEndsAt(equipment.warrantyEndsAt || '');
      setDescription(equipment.description || '');
    } else {
      setEquipmentType('COMPUTADORA');
      setBrand('');
      setModel('');
      setSerialNumber('');
      setPrice('');
      setStatus('ENTREGADO');
      setDeliveredAt(today);
      setWarrantyEndsAt('');
      setDescription('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, equipment?.id]);

  const serialRequired = status === 'ENTREGADO' && SERIAL_REQUIRED_TYPES.includes(equipmentType);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!brand.trim() || !model.trim()) {
      setError('Ingresá la marca y el modelo.');
      return;
    }
    // Sin validar la serie aquí a propósito: el API es el que la exige (400) y su mensaje se muestra tal cual.
    mutation.mutate(
      {
        agreementId,
        equipmentId: equipment?.id,
        input: {
          equipmentType,
          brand: brand.trim(),
          model: model.trim(),
          serialNumber: serialNumber.trim(),
          price: price ? parseFloat(price) : undefined,
          status,
          deliveredAt: deliveredAt || undefined,
          warrantyEndsAt: warrantyEndsAt || undefined,
          description: description.trim() || undefined,
        },
      },
      {
        onSuccess: () => onClose(),
        onError: (err) => setError(getApiErrorMessage(err, 'No se pudo guardar el equipo.')),
      },
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={equipment ? 'Editar equipo' : 'Agregar equipo entregado'} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Tipo</label>
            <select value={equipmentType} onChange={(e) => setEquipmentType(e.target.value as CommercialEquipmentType)} className={inputCls}>
              {(Object.keys(EQUIPMENT_TYPE_LABELS) as CommercialEquipmentType[]).map((t) => (
                <option key={t} value={t}>
                  {EQUIPMENT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Estado</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as CommercialEquipmentStatus)} className={inputCls}>
              {(Object.keys(EQUIPMENT_STATUS_LABELS) as CommercialEquipmentStatus[]).map((s) => (
                <option key={s} value={s}>
                  {EQUIPMENT_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Marca</label>
            <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} maxLength={100} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Modelo</label>
            <input type="text" value={model} onChange={(e) => setModel(e.target.value)} maxLength={100} className={inputCls} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>
              Número de serie {serialRequired ? <span className="text-red-600">(obligatorio al entregar)</span> : '(opcional)'}
            </label>
            <input type="text" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} maxLength={100} className={`${inputCls} font-mono`} />
          </div>
          <div>
            <label className={labelCls}>Precio (US$, opcional)</label>
            <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Fecha de entrega</label>
            <input type="date" value={deliveredAt} onChange={(e) => setDeliveredAt(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Garantía hasta (opcional)</label>
            <input type="date" value={warrantyEndsAt} onChange={(e) => setWarrantyEndsAt(e.target.value)} className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Descripción (opcional)</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={255} className={inputCls} />
        </div>
        {equipment && (
          <p className="text-xs text-gray-500">Los equipos no se borran: si se retiró, cambiá el estado a "Retirado".</p>
        )}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
            <WarningCircle size={16} weight="fill" className="shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 px-4 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
            Cancelar
          </button>
          <button type="submit" disabled={mutation.isPending} className="h-10 px-4 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 cursor-pointer">
            {mutation.isPending ? 'Guardando…' : equipment ? 'Guardar cambios' : 'Agregar equipo'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

