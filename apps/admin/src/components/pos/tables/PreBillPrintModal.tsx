import React, { useMemo, useState } from 'react';
import { X, Printer, Receipt } from '@phosphor-icons/react';
import type { PosTableOrder, PosTableSubAccount } from 'api-client';
import {
  generatePreBillHtml,
  type PreBillBusinessInfo,
} from '../../../utils/preBillHtml';
import { printReceiptViaIframe } from '../../../utils/receiptHtml';

interface PreBillPrintModalProps {
  isOpen: boolean;
  order: PosTableOrder | null;
  subAccount?: PosTableSubAccount | null;
  business?: PreBillBusinessInfo | null;
  currency?: string;
  onClose: () => void;
}

export const PreBillPrintModal: React.FC<PreBillPrintModalProps> = ({
  isOpen,
  order,
  subAccount = null,
  business,
  currency = 'NIO',
  onClose,
}) => {
  const [isPrinting, setIsPrinting] = useState(false);

  const html = useMemo(() => {
    if (!order) return '';
    return generatePreBillHtml({ order, subAccount, business, currency });
  }, [order, subAccount, business, currency]);

  if (!isOpen || !order) return null;

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <Receipt size={18} weight="duotone" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-[#0F0F0F] truncate">
                Pre-cuenta{subAccount ? ` · ${subAccount.label}` : ''}
              </h3>
              <p className="text-xs text-amber-800 font-medium">
                No es un comprobante de venta · Formato 80 mm
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center cursor-pointer"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-100 p-4 flex justify-center">
          <div className="bg-white border border-gray-300 rounded-xl shadow-xs overflow-hidden w-full max-w-[320px]">
            <iframe
              title="Vista previa de pre-cuenta"
              srcDoc={html}
              className="w-full h-[420px] border-0 bg-white"
            />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 bg-white flex flex-col-reverse sm:flex-row gap-2 shrink-0">
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
            <span>{isPrinting ? 'Preparando...' : 'Imprimir pre-cuenta'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
