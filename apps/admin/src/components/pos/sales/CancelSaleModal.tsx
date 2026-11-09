import React, { useState } from 'react';
import {
  X,
  WarningCircle,
  ArrowCounterClockwise,
  Package,
} from '@phosphor-icons/react';
import { voidPosSale } from 'api-client';
import { useAuthStore } from '../../../store/auth.store';
import { usePosWebDevice } from '../../../hooks/usePosWebDevice';
import { usePosPolicies } from '../../../hooks/usePosPolicies';
import { ManagerApprovalModal } from '../cobrar/ManagerApprovalModal';
import { formatCurrency } from '../../../utils/formatters';

export type CancellationReasonCode =
  | 'PAYMENT_ERROR'
  | 'CUSTOMER_CANCELLED'
  | 'DEFECTIVE_PRODUCT'
  | 'DUPLICATE'
  | 'OTHER';

interface CancellationReasonOption {
  code: CancellationReasonCode;
  title: string;
  description: string;
  defaultRestock: boolean;
}

const REASON_OPTIONS: CancellationReasonOption[] = [
  {
    code: 'PAYMENT_ERROR',
    title: 'Error de cobro o monto equivocado',
    description: 'Se cobró un monto erróneo o un método de pago equivocado. Se anula para volver a cobrar.',
    defaultRestock: true,
  },
  {
    code: 'CUSTOMER_CANCELLED',
    title: 'Cancelación inmediata por el cliente',
    description: 'El cliente desistió de la compra antes del consumo o entrega. La mercadería regresa íntegra al inventario.',
    defaultRestock: true,
  },
  {
    code: 'DEFECTIVE_PRODUCT',
    title: 'Producto defectuoso / Merma',
    description: 'Producto dañado o en mal estado. Se devuelve el importe pero NO vuelve al inventario vendible.',
    defaultRestock: false,
  },
  {
    code: 'DUPLICATE',
    title: 'Transacción duplicada',
    description: 'La orden se procesó dos veces por error involuntario o intermitencia de red.',
    defaultRestock: true,
  },
  {
    code: 'OTHER',
    title: 'Otro motivo justificado',
    description: 'Especifiqué en las observaciones el motivo de la anulación.',
    defaultRestock: true,
  },
];

interface CancelSaleModalProps {
  isOpen: boolean;
  sale: {
    id: string;
    invoiceNumber: string;
    netTotal: number;
    amountPaid?: number;
    customer?: { name?: string } | null;
    customerName?: string;
  } | null;
  onClose: () => void;
  onSuccess: (saleId: string) => void;
  currency?: string;
}


export const CancelSaleModal: React.FC<CancelSaleModalProps> = ({
  isOpen,
  sale,
  onClose,
  onSuccess,
  currency = 'NIO',
}) => {
  const user = useAuthStore((state) => state.user);
  const { deviceId, deviceSecret } = usePosWebDevice();
  const { data: policies } = usePosPolicies();

  const [selectedReason, setSelectedReason] = useState<CancellationReasonCode>('PAYMENT_ERROR');
  const [restockInventory, setRestockInventory] = useState(true);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal de autorización
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);

  if (!isOpen || !sale) return null;

  const voidsCompletedEnabled = policies?.voidsCompletedEnabled ?? true;
  const voidsRequireApproval = policies?.voidsRequireApproval ?? true;
  const isCashier = user?.role === 'CAJERO';
  const needsManagerApproval = isCashier && voidsRequireApproval;

  const handleReasonChange = (code: CancellationReasonCode) => {
    setSelectedReason(code);
    const option = REASON_OPTIONS.find((r) => r.code === code);
    if (option) {
      setRestockInventory(option.defaultRestock);
    }
  };

  const getFullReasonText = () => {
    const selectedOption = REASON_OPTIONS.find((r) => r.code === selectedReason);
    return `${selectedOption?.title || selectedReason}${notes.trim() ? `: ${notes.trim()}` : ''}`;
  };

  const executeVoid = async (approvalToken?: string) => {
    setIsSubmitting(true);
    setErrorMsg(null);

    const reasonText = getFullReasonText();
    const idempotencyKey = window.crypto?.randomUUID ? window.crypto.randomUUID() : `void-${Date.now()}`;

    try {
      await voidPosSale(
        sale.id,
        {
          reason: reasonText,
          restock: restockInventory,
          approvalToken: approvalToken || undefined,
        },
        {
          'X-Device-Id': deviceId || undefined,
          'X-Device-Secret': deviceSecret || undefined,
          'Idempotency-Key': idempotencyKey,
        }
      );

      setIsSubmitting(false);
      onSuccess(sale.id);
    } catch (err: any) {
      setIsSubmitting(false);
      const code = err?.response?.data?.code || err?.response?.data?.message?.code;
      const msg = err?.response?.data?.message?.message || err?.response?.data?.message || 'Error al anular el comprobante';

      if (code === 'APPROVAL_TOKEN_REQUIRED' || code === 'INVALID_APPROVAL_TOKEN') {
        setIsApprovalModalOpen(true);
      } else {
        setErrorMsg(typeof msg === 'string' ? msg : 'Error al procesar la anulación');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidsCompletedEnabled) {
      setErrorMsg('La anulación de ventas está deshabilitada en la configuración del negocio.');
      return;
    }

    if (needsManagerApproval) {
      setIsApprovalModalOpen(true);
    } else {
      executeVoid();
    }
  };

  const handleApprovalSuccess = (token: string) => {
    setIsApprovalModalOpen(false);
    executeVoid(token);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-in fade-in duration-200">
        <div className="bg-white rounded-t-3xl sm:rounded-3xl border border-gray-200 w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-rose-50/60">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-2xs">
                <ArrowCounterClockwise size={22} weight="bold" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-gray-900">
                  Anular Comprobante #{sale.invoiceNumber}
                </h3>
                <p className="text-xs text-rose-700">Esta acción revertirá la venta</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-11 h-11 rounded-xl hover:bg-rose-100 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={20} weight="bold" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
                <WarningCircle size={18} weight="fill" className="text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Resumen del comprobante */}
            <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-gray-400 block">Cliente</span>
                <span className="font-semibold text-gray-800">
                  {sale.customer?.name || sale.customerName || 'Cliente general'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-gray-400 block">Total de la venta</span>
                <span className="text-sm font-bold text-gray-900 font-mono">
                  {formatCurrency(sale.netTotal, currency)}
                </span>
              </div>
            </div>

            {/* Motivo de anulación */}
            <div className="space-y-1.5">
              <label className="font-bold text-xs text-gray-800 block">
                Motivo de la anulación <span className="text-rose-600">*</span>
              </label>
              <div className="space-y-2">
                {REASON_OPTIONS.map((opt) => {
                  const isSelected = selectedReason === opt.code;
                  return (
                    <div
                      key={opt.code}
                      onClick={() => handleReasonChange(opt.code)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? 'border-rose-500 bg-rose-50/40 text-gray-900 shadow-2xs'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="cancelReason"
                          checked={isSelected}
                          onChange={() => handleReasonChange(opt.code)}
                          className="text-rose-600 focus:ring-rose-500 h-4 w-4"
                        />
                        <span className="font-bold">{opt.title}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 pl-6 mt-0.5">{opt.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Observaciones adicionales */}
            <div className="space-y-1.5">
              <label className="font-bold text-xs text-gray-800 block">
                Observaciones adicionales (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Escribí aquí detalles del motivo de anulación..."
                rows={2}
                className="w-full p-3 rounded-xl border border-gray-200 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-gray-900 resize-none"
              />
            </div>

            {/* Retorno de inventario */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl border border-gray-200 bg-gray-50/60 cursor-pointer">
              <input
                type="checkbox"
                checked={restockInventory}
                onChange={(e) => setRestockInventory(e.target.checked)}
                className="rounded border-gray-300 text-rose-600 focus:ring-rose-500 h-4 w-4 mt-0.5"
              />
              <div className="text-xs">
                <span className="font-bold text-gray-900 flex items-center gap-1.5">
                  <Package size={15} className="text-gray-600" />
                  Regresar productos al inventario
                </span>
                <span className="text-[11px] text-gray-500 block mt-0.5">
                  Reintegra las existencias de todos los productos cancelados. Desmarcalo solo si el producto fue merma o desecho.
                </span>
              </div>
            </label>

            {needsManagerApproval && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                🔒 Tu rol de <strong>Cajero</strong> requiere autorización del encargado para completar esta anulación.
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="w-full sm:w-auto h-11 px-5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !voidsCompletedEnabled}
                className="w-full sm:w-auto h-11 px-6 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-2xs cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <ArrowCounterClockwise size={16} weight="bold" />
                    <span>Confirmar anulación</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal de autorización del encargado */}
      <ManagerApprovalModal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        onApproved={handleApprovalSuccess}
        actionTitle="Anulación de comprobante"
        actionCode="ANULAR_VENTA_COBRADA"
        actionDescription={`Se requiere la autorización de un encargado para anular el comprobante #${sale.invoiceNumber}.`}
      />
    </>
  );
};
