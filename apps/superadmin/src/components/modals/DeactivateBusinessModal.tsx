import React, { useState, useEffect } from 'react';
import { Warning, ShieldWarning } from '@phosphor-icons/react';
import { Modal } from '../ui/Modal';

interface DeactivateBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  businessName: string;
  onConfirm: (businessId: string, reason?: string) => void;
  isLoading?: boolean;
}

export const DeactivateBusinessModal: React.FC<DeactivateBusinessModalProps> = ({
  isOpen,
  onClose,
  businessId,
  businessName,
  onConfirm,
  isLoading = false,
}) => {
  const [typedName, setTypedName] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTypedName('');
      setReason('');
    }
  }, [isOpen]);

  const isMatch = typedName.trim() === businessName.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMatch || isLoading) return;
    onConfirm(businessId, reason.trim() || undefined);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="¿Desactivar este negocio?"
      subtitle="Acción de alta sensibilidad operativa"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Warning Banner */}
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-xs text-red-900 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-red-700">
            <Warning size={18} weight="fill" />
            <span>Estás por desactivar: &ldquo;{businessName}&rdquo;</span>
          </div>

          <div className="space-y-1 text-red-800/90 pt-1">
            <p className="font-medium">Al desactivarlo:</p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] pl-1">
              <li>El encargado no podrá ingresar al panel</li>
              <li>Los pedidos activos NO se cancelan automáticamente</li>
              <li>Los repartidores dejan de recibir pedidos de este negocio</li>
            </ul>
          </div>
        </div>

        {/* Motivo de desactivación */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Motivo de desactivación (opcional)
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej: Membresía vencida / Solicitud del comercio"
            className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 focus:outline-none focus:border-gray-900"
          />
        </div>

        {/* Confirmación por nombre */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Para confirmar, escribí el nombre del negocio:{' '}
            <span className="font-semibold text-gray-900 select-all">
              {businessName}
            </span>
          </label>
          <input
            type="text"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder={`Escribí "${businessName}" exactamente`}
            autoFocus
            required
            className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
          />
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!isMatch || isLoading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
          >
            <ShieldWarning size={16} />
            <span>{isLoading ? 'Desactivando...' : 'Desactivar negocio'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
