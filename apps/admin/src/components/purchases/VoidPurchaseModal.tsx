import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { X, WarningCircle, Trash, ArrowRight } from '@phosphor-icons/react';
import { type PosPurchase, voidPosPurchase } from 'api-client';
import { formatCurrency, formatQuantity } from '../../utils/formatters';
import { extractApiErrorMessage, generateIdempotencyKey } from '../../utils/productCost';

export interface VoidPurchaseModalProps {
  isOpen: boolean;
  purchase: PosPurchase | null;
  currency?: string;
  onClose: () => void;
  onSuccess: (voidedPurchase: PosPurchase) => void;
}

export const VoidPurchaseModal: React.FC<VoidPurchaseModalProps> = ({
  isOpen,
  purchase,
  currency = 'NIO',
  onClose,
  onSuccess,
}) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{
    message: string;
    actionPath?: '/finances' | '/pos/inventory';
    actionHint?: string;
    actionLabel?: string;
  } | null>(null);

  const submittingRef = useRef(false);
  const idempotencyKeyRef = useRef('');

  useEffect(() => {
    if (isOpen && purchase) {
      setReason('');
      setErrorInfo(null);
      submittingRef.current = false;
      setIsSubmitting(false);
      idempotencyKeyRef.current = generateIdempotencyKey('void-pur');
    } else if (!isOpen) {
      idempotencyKeyRef.current = '';
      submittingRef.current = false;
    }
  }, [isOpen, purchase?.id]);

  if (!isOpen || !purchase) return null;

  const items = purchase.items || [];

  const handleConfirmVoid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;

    const cleanReason = reason.trim();
    if (!cleanReason) {
      setErrorInfo({ message: 'El motivo de la anulación es obligatorio.' });
      return;
    }

    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = generateIdempotencyKey('void-pur');
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setErrorInfo(null);

    try {
      const voided = await voidPosPurchase(
        purchase.id,
        { reason: cleanReason },
        { 'Idempotency-Key': idempotencyKeyRef.current },
      );

      idempotencyKeyRef.current = '';
      onSuccess(voided);
      onClose();
    } catch (err: any) {
      const code = err?.response?.data?.code || err?.response?.data?.message?.code || '';
      const msg = extractApiErrorMessage(err, 'No se pudo anular la compra.');

      if (code === 'PURCHASE_HAS_ACTIVE_PAYMENTS') {
        setErrorInfo({
          message: msg,
          actionHint: 'Anulá primero los abonos activos en Finanzas → Cuentas por pagar.',
          actionPath: '/finances',
          actionLabel: 'Ir a Finanzas',
        });
      } else if (
        code === 'PURCHASE_VOID_INSUFFICIENT_STOCK' ||
        msg.toLowerCase().includes('unidades vendidas') ||
        msg.toLowerCase().includes('stock')
      ) {
        setErrorInfo({
          message: msg,
          actionHint: 'Para corregir el inventario disponible, hacé un ajuste desde Catálogo.',
          actionPath: '/pos/inventory',
          actionLabel: 'Ir a Catálogo',
        });
      } else {
        setErrorInfo({ message: msg });
      }
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl border border-gray-200 shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-2 bg-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
              <Trash size={22} weight="duotone" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                Anular compra
              </h3>
              <p className="text-xs text-gray-500 truncate">
                {purchase.invoiceNumber
                  ? `Comprobante ${purchase.invoiceNumber}`
                  : `Compra #${purchase.id.slice(0, 8)}`}{' '}
                · {formatCurrency(Number(purchase.total), currency)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Cerrar modal"
            className="w-11 h-11 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors shrink-0 cursor-pointer disabled:opacity-50"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleConfirmVoid} className="flex flex-col flex-1 min-h-0">
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs text-gray-700 flex-1">
            {errorInfo && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl space-y-2 text-xs text-red-900">
                <div className="flex items-start gap-2">
                  <WarningCircle size={18} weight="fill" className="text-red-600 shrink-0 mt-0.5" />
                  <span className="font-medium break-words">{errorInfo.message}</span>
                </div>
                {errorInfo.actionHint && (
                  <p className="text-red-800 break-words">{errorInfo.actionHint}</p>
                )}
                {errorInfo.actionPath && errorInfo.actionLabel && (
                  <Link
                    to={errorInfo.actionPath}
                    onClick={onClose}
                    className="inline-flex items-center gap-1 min-h-[36px] px-3 rounded-lg bg-white border border-red-200 text-red-800 font-semibold hover:bg-red-100 transition-colors"
                  >
                    <span>{errorInfo.actionLabel}</span>
                    <ArrowRight size={14} weight="bold" />
                  </Link>
                )}
              </div>
            )}

            {/* Resumen de lo que se va a descontar */}
            <div className="p-3.5 bg-red-50/70 border border-red-200/80 rounded-2xl text-red-950 space-y-2">
              <p className="font-bold text-xs">
                Se va a descontar del inventario al confirmar:
              </p>
              <ul className="space-y-1 text-xs">
                {items.map((it) => {
                  const lot = it.lotNumber || it.batchNumber;
                  return (
                    <li
                      key={it.id}
                      className="flex flex-wrap items-center justify-between gap-2 bg-white/80 px-2.5 py-1.5 rounded-lg border border-red-100"
                    >
                      <div className="min-w-0 flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-gray-900 break-words">
                          {it.product?.name || `Producto (${it.productId.slice(0, 8)})`}
                        </span>
                        {lot && (
                          <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 font-mono text-xs">
                            Lote: {lot}
                          </span>
                        )}
                      </div>
                      <span className="font-mono font-bold text-red-700 shrink-0">
                        -{formatQuantity(it.quantity, it.product?.unit || 'UND')}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {purchase.payableAccount && (
                <p className="text-xs text-red-800">
                  La cuenta por pagar asociada se cancelará si no tiene abonos activos.
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-900 block">
                Motivo de la anulación <span className="text-red-600">*</span>
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ej. Comprobante ingresado por error, mercadería devuelta al proveedor..."
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-gray-900 resize-none"
                autoFocus
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 sm:px-6 py-3 bg-gray-50 border-t border-gray-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto min-h-[44px] px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-gray-800 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className="w-full sm:w-auto min-h-[44px] px-5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Trash size={15} weight="bold" />
              <span>{isSubmitting ? 'Anulando compra...' : 'Confirmar anulación'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
