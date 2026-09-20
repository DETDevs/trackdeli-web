import React, { useState, useEffect } from 'react';
import { WarningOctagon, XCircle } from '@phosphor-icons/react';
import { Modal } from '../ui/Modal';
import {
  useDeactivateNowProduct,
  BusinessProductType,
  getProductLabel,
} from '../../hooks/useBusinessProducts';

interface DeactivateNowModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  businessName: string;
  productType: BusinessProductType;
}

export const DeactivateNowModal: React.FC<DeactivateNowModalProps> = ({
  isOpen,
  onClose,
  businessId,
  businessName,
  productType,
}) => {
  const deactivateNowMutation = useDeactivateNowProduct();
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
    }
  }, [isOpen]);

  const label = getProductLabel(productType);
  const isReasonValid = reason.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isReasonValid || deactivateNowMutation.isPending) return;

    try {
      await deactivateNowMutation.mutateAsync({
        businessId,
        productType,
        dto: {
          reason: reason.trim(),
        },
      });
      onClose();
    } catch {
      // Handled by toast in mutation
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Corte Inmediato — ${label}`}
      subtitle={`Desactivación forzosa e inmediata para ${businessName}`}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 space-y-2.5">
          <div className="flex items-center gap-2 font-semibold text-red-800">
            <WarningOctagon size={18} weight="fill" className="text-red-600 shrink-0" />
            <span>Interrupción inmediata de servicio (Hard Deactivation)</span>
          </div>
          <p className="text-[12px] leading-relaxed text-red-900/90">
            Esta acción desactivará el producto <strong>al instante</strong>, revocando el acceso a {label} de inmediato sin esperar al fin del período de membresía ya pagado.
          </p>
          <p className="text-[11px] text-red-800/80 pt-1 border-t border-red-200/60 leading-relaxed">
            Utilice esta acción exclusivamente para casos excepcionales, bajas definitivas solicitadas por el cliente o suspensión por incumplimientos.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-800 mb-1">
            Motivo obligatorio del corte inmediato <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            required
            placeholder="Escriba obligatoriamente el motivo para auditoría (ej. Incumplimiento de términos, baja express solicitada por el titular)..."
            className="w-full p-2.5 rounded-lg border border-gray-200 bg-white text-xs text-gray-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
          />
          <span className="text-[11px] text-gray-400 mt-1 block">
            Este motivo quedará asentado en el registro de auditoría del negocio.
          </span>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!isReasonValid || deactivateNowMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer"
          >
            <XCircle size={15} weight="bold" />
            <span>
              {deactivateNowMutation.isPending ? 'Procesando corte...' : 'Ejecutar corte inmediato'}
            </span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
