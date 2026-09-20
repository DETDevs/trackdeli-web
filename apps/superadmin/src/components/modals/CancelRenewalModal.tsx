import React, { useState, useEffect } from 'react';
import { CalendarBlank, WarningCircle } from '@phosphor-icons/react';
import { Modal } from '../ui/Modal';
import {
  useCancelProductRenewal,
  BusinessProductType,
  getProductLabel,
} from '../../hooks/useBusinessProducts';
import { formatDateShort } from '../../utils/format';

interface CancelRenewalModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  businessName: string;
  productType: BusinessProductType;
  coverageEndDate?: string | null;
}

export const CancelRenewalModal: React.FC<CancelRenewalModalProps> = ({
  isOpen,
  onClose,
  businessId,
  businessName,
  productType,
  coverageEndDate,
}) => {
  const cancelMutation = useCancelProductRenewal();
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
    }
  }, [isOpen]);

  const label = getProductLabel(productType);
  const formattedEndDate = coverageEndDate
    ? formatDateShort(coverageEndDate)
    : 'fin del período actual';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cancelMutation.isPending) return;

    try {
      await cancelMutation.mutateAsync({
        businessId,
        productType,
        dto: {
          reason: reason.trim() || undefined,
        },
      });
      onClose();
    } catch {
      // Toast handles the error in the mutation
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`¿Cancelar renovación de ${label}?`}
      subtitle={`El servicio seguirá activo para ${businessName} hasta el vencimiento`}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/90 text-xs text-amber-900 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-amber-800">
            <WarningCircle size={18} weight="fill" className="text-amber-600 shrink-0" />
            <span>Cancelación de renovación automática (Soft)</span>
          </div>
          <p className="text-[12px] leading-relaxed text-amber-900/90">
            El servicio seguirá <strong>activo</strong> hasta el{' '}
            <span className="font-semibold underline decoration-amber-400 decoration-2">
              {formattedEndDate}
            </span>
            . Después de esa fecha se desactivará automáticamente si no se registra un nuevo pago.
          </p>
          <div className="pt-1 text-[11px] text-amber-800/80 flex items-center gap-1.5 border-t border-amber-200/60">
            <CalendarBlank size={14} className="shrink-0" />
            <span>El negocio puede seguir utilizando {label} con normalidad hasta esa fecha.</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Motivo de cancelación (opcional)
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej: Cliente no continuará el próximo mes / Decisión temporal"
            className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-xs text-gray-900 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Mantener renovación
          </button>
          <button
            type="submit"
            disabled={cancelMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 disabled:opacity-50 transition-colors shadow-2xs cursor-pointer"
          >
            <span>
              {cancelMutation.isPending ? 'Cancelando...' : 'Confirmar cancelación'}
            </span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
