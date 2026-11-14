import React, { useEffect, useState } from 'react';
import { X, Prohibit, CircleNotch, WarningCircle } from '@phosphor-icons/react';
import {
  formatQuoteApiError,
  updatePosQuoteStatus,
  type PosQuote,
} from 'api-client';

interface CancelQuoteModalProps {
  isOpen: boolean;
  quote: PosQuote | null;
  businessId?: string;
  onClose: () => void;
  onCancelled: (updated: PosQuote) => void;
}

export const CancelQuoteModal: React.FC<CancelQuoteModalProps> = ({
  isOpen,
  quote,
  businessId,
  onClose,
  onCancelled,
}) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, quote?.id]);

  if (!isOpen || !quote) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setError('Tenés que escribir un motivo para cancelar esta proforma.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const updated = await updatePosQuoteStatus(
        quote.id,
        {
          status: 'CANCELLED',
          cancelReason: trimmed.slice(0, 500),
        },
        businessId,
      );
      onCancelled(updated);
      onClose();
    } catch (err) {
      setError(formatQuoteApiError(err, 'No se pudo cancelar la proforma.').message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
              <Prohibit size={19} weight="bold" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 truncate">
                Cancelar proforma {quote.quoteNumber}
              </h3>
              <p className="text-xs text-slate-500">Esta acción no se puede deshacer</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            La proforma quedará marcada como <strong className="text-slate-900">Cancelada</strong>{' '}
            y se conservará en el historial con el motivo ingresado.
          </p>

          <div>
            <label
              htmlFor="cancel-quote-reason"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Motivo de cancelación *
            </label>
            <textarea
              id="cancel-quote-reason"
              rows={3}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isSubmitting}
              placeholder="Ej.: Cliente desistió de la compra o solicitó otra cotización..."
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none"
            />
            <div className="flex justify-end mt-1">
              <span className="text-xs text-slate-400">{reason.length}/500</span>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2.5 text-xs text-rose-700 flex items-start gap-2">
              <WarningCircle size={16} className="shrink-0 mt-0.5" weight="fill" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              Volver
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <CircleNotch size={15} className="animate-spin" />
                  Cancelando...
                </>
              ) : (
                'Confirmar cancelación'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

