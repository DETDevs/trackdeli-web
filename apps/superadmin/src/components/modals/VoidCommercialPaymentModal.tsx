import React, { useEffect, useState } from 'react';
import { WarningCircle } from '@phosphor-icons/react';
import { Modal } from '../ui/Modal';
import {
  CommercialPayment,
  PAYMENT_KIND_LABELS,
  getApiErrorMessage,
  useVoidCommercialPayment,
} from '../../hooks/useCommercial';
import { formatCurrency, formatDateShort } from '../../utils/format';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  payment: CommercialPayment | null;
}

const MIN_REASON = 10;

export const VoidCommercialPaymentModal: React.FC<Props> = ({ isOpen, onClose, businessId, payment }) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mutation = useVoidCommercialPayment(businessId);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError(null);
    }
  }, [isOpen]);

  if (!payment) return null;
  const trimmed = reason.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (trimmed.length < MIN_REASON) {
      setError(`El motivo tiene que tener al menos ${MIN_REASON} caracteres.`);
      return;
    }
    mutation.mutate(
      { paymentId: payment.id, reason: trimmed },
      {
        onSuccess: () => onClose(),
        onError: (err) => setError(getApiErrorMessage(err, 'No se pudo anular el pago.')),
      },
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Anular pago" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-700 space-y-1">
          <p>
            <span className="text-gray-500">Pago:</span> {PAYMENT_KIND_LABELS[payment.kind]} de{' '}
            <strong>{formatCurrency(payment.amount)}</strong> del {formatDateShort(payment.paidAt)}
          </p>
          <p>El pago queda tachado en el historial y las cuotas y el saldo se recalculan.</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Motivo de la anulación</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Ej. Se registró dos veces la misma transferencia"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
          />
          <p className={`text-xs mt-1 ${trimmed.length < MIN_REASON ? 'text-gray-500' : 'text-emerald-700'}`}>
            {trimmed.length}/{MIN_REASON} caracteres mínimos
          </p>
        </div>
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
          <button
            type="submit"
            disabled={mutation.isPending || trimmed.length < MIN_REASON}
            className="h-10 px-4 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {mutation.isPending ? 'Anulando…' : 'Anular pago'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

