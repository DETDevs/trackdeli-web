import React, { useMemo, useState } from 'react';
import { X, Printer, Receipt } from '@phosphor-icons/react';
import type { PosReceiptSettingsData, PosTableBill } from 'api-client';
import {
  formatBillSubAccountLabel,
  generatePreBillHtml,
} from '../../../utils/preBillHtml';
import { printReceiptViaIframe } from '../../../utils/receiptHtml';

interface PreBillPrintModalProps {
  isOpen: boolean;
  bill: PosTableBill | null;
  receiptSettings?: PosReceiptSettingsData | null;
  totalSubAccounts?: number;
  onClose: () => void;
}

export const PreBillPrintModal: React.FC<PreBillPrintModalProps> = ({
  isOpen,
  bill,
  receiptSettings = null,
  totalSubAccounts,
  onClose,
}) => {
  const [isPrinting, setIsPrinting] = useState(false);

  const html = useMemo(() => {
    if (!bill) return '';
    return generatePreBillHtml({ bill, receiptSettings, totalSubAccounts });
  }, [bill, receiptSettings, totalSubAccounts]);

  if (!isOpen || !bill) return null;

  const snapshot = bill.snapshot;
  const isReprint = Boolean(bill.isReprint || snapshot.isReprint);
  const sequenceNumber = Number(bill.sequence || snapshot.sequence || 1);
  const subAccountDisplay = formatBillSubAccountLabel(snapshot, totalSubAccounts);
  const paperWidthMm = receiptSettings?.paperWidthMm === 58 ? 58 : 80;
  const legendText =
    String(snapshot.legend || '').trim() || 'Cuenta. No es un comprobante de pago.';

  const handlePrint = async () => {
    if (!html) return;
    setIsPrinting(true);
    try {
      await printReceiptViaIframe(html);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Vista previa de cuenta"
    >
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-gray-200">
        <div className="px-4 sm:px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-2 shrink-0">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center shrink-0">
              <Receipt size={18} weight="duotone" />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 className="text-base font-bold text-[#0F0F0F]">
                  Cuenta{subAccountDisplay ? ` · ${subAccountDisplay}` : ''}
                </h3>
                {isReprint && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-900 border border-indigo-200 whitespace-nowrap">
                    Reimpresión #{sequenceNumber}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200 whitespace-nowrap">
                  {paperWidthMm} mm
                </span>
              </div>
              <p className="text-xs text-indigo-900 font-semibold">
                {legendText}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center cursor-pointer shrink-0"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-100 p-3 sm:p-4 flex justify-center">
          <div
            className={`bg-white border border-gray-300 rounded-xl shadow-xs overflow-hidden w-full ${
              paperWidthMm === 58 ? 'max-w-[248px]' : 'max-w-[332px]'
            }`}
          >
            <iframe
              title="Vista previa de cuenta"
              srcDoc={html}
              className="w-full h-[440px] border-0 bg-white"
            />
          </div>
        </div>

        <div className="px-4 sm:px-5 py-4 border-t border-gray-100 bg-white flex flex-col-reverse sm:flex-row gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] flex-1 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 cursor-pointer"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={isPrinting}
            className="min-h-[44px] flex-1 px-4 rounded-xl bg-[#0F0F0F] hover:bg-gray-800 text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Printer size={16} weight="bold" />
            <span>{isPrinting ? 'Preparando...' : 'Imprimir cuenta'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
