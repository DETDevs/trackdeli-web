import React, { useState } from 'react';
import {
  X,
  ShareNetwork,
  DownloadSimple,
  WhatsappLogo,
  CheckCircle,
} from '@phosphor-icons/react';
import {
  type SaleReturnPrintData,
  downloadReturnReceiptPdf,
  shareOrFallbackReturnReceipt,
  getWhatsAppReturnSummaryUrl,
  type ReceiptBusinessInfo,
} from '../../../utils/receiptPdf';
import { formatCurrency } from '../../../utils/formatters';

interface ReturnReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnData: SaleReturnPrintData | null;
  businessInfo?: ReceiptBusinessInfo;
  customerPhone?: string | null;
}

export const ReturnReceiptModal: React.FC<ReturnReceiptModalProps> = ({
  isOpen,
  onClose,
  returnData,
  businessInfo,
  customerPhone,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen || !returnData) return null;

  const handleShare = async () => {
    setIsProcessing(true);
    setSuccessMsg(null);
    try {
      const res = await shareOrFallbackReturnReceipt(returnData, businessInfo);
      if (res.shared) {
        setSuccessMsg('Comprobante compartido');
      } else if (res.downloaded) {
        setSuccessMsg('Comprobante descargado');
      }
      setTimeout(() => setSuccessMsg(null), 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    setIsProcessing(true);
    setSuccessMsg(null);
    try {
      await downloadReturnReceiptPdf(returnData, businessInfo);
      setSuccessMsg('Comprobante descargado en PDF');
      setTimeout(() => setSuccessMsg(null), 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWhatsApp = () => {
    const url = getWhatsAppReturnSummaryUrl(returnData, businessInfo?.name, customerPhone);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl border border-gray-200 w-full max-w-md max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-emerald-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
              <CheckCircle size={22} weight="bold" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900">
                Devolución Procesada
              </h3>
              <p className="text-xs text-emerald-700">Comprobante #{returnData.returnNumber}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 rounded-xl hover:bg-emerald-100 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Feedback message */}
        {successMsg && (
          <div className="mx-4 mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-medium">
            <CheckCircle size={16} weight="fill" className="text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-400">Total reembolsado</span>
              <span className="text-lg font-bold text-gray-900 font-mono">
                {formatCurrency(returnData.refundAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-600 pt-1 border-t border-gray-200">
              <span>Método: <strong>{returnData.refundMethod}</strong></span>
              <span>Factura: <strong>#{returnData.invoiceNumber}</strong></span>
            </div>
            {returnData.reason && (
              <p className="text-[11px] text-gray-500 pt-1">
                Motivo: {returnData.reason}
              </p>
            )}
          </div>

          {/* Lista de productos devueltos */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-xs text-gray-800">Artículos devueltos</h4>
            <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden bg-white">
              {returnData.items.map((it, idx) => (
                <div key={idx} className="p-2.5 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{it.productName}</p>
                    <p className="text-[11px] text-gray-400">Cantidad devuelta: {it.quantity}</p>
                  </div>
                  <span className="font-mono font-bold text-gray-900">
                    {formatCurrency(it.refundAmount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="p-4 bg-gray-50/80 border-t border-gray-100 space-y-2 shrink-0">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleShare}
              disabled={isProcessing}
              className="h-11 px-3 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <ShareNetwork size={16} weight="bold" />
              <span>Compartir</span>
            </button>
            <button
              type="button"
              onClick={handleWhatsApp}
              className="h-11 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <WhatsappLogo size={16} weight="bold" />
              <span>WhatsApp</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={isProcessing}
              className="h-11 px-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <DownloadSimple size={16} weight="bold" />
              <span>Descargar PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 font-semibold text-xs transition-colors cursor-pointer"
            >
              Listo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
