import React, { useState } from 'react';
import {
  CheckCircle,
  Plus,
  ShareNetwork,
  DownloadSimple,
  WhatsappLogo,
  CircleNotch,
} from '@phosphor-icons/react';
import { type SaleResponse } from 'api-client';
import { formatCurrency } from '../../../utils/formatters';
import { formatManaguaDateTime } from '../../../utils/dateManagua';
import {
  shareOrFallbackReceipt,
  downloadReceiptPdf,
  getWhatsAppSummaryUrl,
  type ReceiptBusinessInfo,
} from '../../../utils/receiptPdf';

interface SaleSuccessViewProps {
  sale: SaleResponse;
  businessInfo?: ReceiptBusinessInfo;
  cashierName?: string;
  onNewSale: () => void;
}

export const SaleSuccessView: React.FC<SaleSuccessViewProps> = ({
  sale,
  businessInfo,
  cashierName,
  onNewSale,
}) => {
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showWhatsAppFallback, setShowWhatsAppFallback] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const methodLabel: Record<string, string> = {
    EFECTIVO: 'Efectivo',
    TARJETA: 'Tarjeta',
    TRANSFERENCIA: 'Transferencia',
  };

  const handleShareReceipt = async () => {
    setIsSharing(true);
    setStatusMessage(null);
    try {
      const result = await shareOrFallbackReceipt(sale, businessInfo, cashierName);
      if (result.shared) {
        setStatusMessage('¡Recibo compartido exitosamente!');
      } else if (result.downloaded) {
        setStatusMessage('Recibo descargado en tu dispositivo.');
        setShowWhatsAppFallback(true);
      }
    } catch {
      setStatusMessage('Ocurrió un error al procesar el recibo.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownloadReceipt = async () => {
    setIsDownloading(true);
    setStatusMessage(null);
    try {
      await downloadReceiptPdf(sale, businessInfo, cashierName);
      setStatusMessage('Recibo descargado (recibo-' + (sale.invoiceNumber || sale.id.slice(-6).toUpperCase()) + '.pdf)');
      setShowWhatsAppFallback(true);
    } catch {
      setStatusMessage('Ocurrió un error al descargar el PDF.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSendWhatsApp = () => {
    const url = getWhatsAppSummaryUrl(sale, businessInfo?.name, sale.customerPhone);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="max-w-md mx-auto py-6 px-4 select-none animate-in zoom-in-95 duration-200">
      <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 text-center shadow-xl shadow-gray-200/40 space-y-5">
        {/* Success Icon */}
        <div className="relative inline-flex items-center justify-center mx-auto">
          <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-3xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shadow-sm">
            <CheckCircle size={44} weight="fill" />
          </div>
        </div>

        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100/70 text-emerald-800 uppercase tracking-wider mb-2">
            Venta Registrada
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            ¡Cobro completado!
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Factura:{' '}
            <span className="font-mono font-bold text-gray-800">
              {sale.invoiceNumber || sale.id.slice(-6).toUpperCase()}
            </span>
          </p>
        </div>

        {/* Resumen de cobro */}
        <div className="bg-gray-50/90 border border-gray-200/70 rounded-2xl p-4 text-left space-y-2.5 text-xs">
          <div className="flex justify-between items-center text-gray-600">
            <span>Fecha y hora</span>
            <span className="font-medium text-gray-800">
              {formatManaguaDateTime(sale.createdAt || new Date())}
            </span>
          </div>

          <div className="flex justify-between items-center text-gray-600">
            <span>Método de pago</span>
            <span className="font-bold text-gray-800">
              {methodLabel[sale.paymentMethod] || sale.paymentMethod || 'Efectivo'}
            </span>
          </div>

          {sale.paymentMethod === 'EFECTIVO' && sale.amountPaid != null && sale.amountPaid > 0 && (
            <div className="flex justify-between items-center text-gray-600">
              <span>Monto recibido</span>
              <span className="font-medium text-gray-800">
                {formatCurrency(sale.amountPaid)}
              </span>
            </div>
          )}

          {sale.paymentMethod === 'EFECTIVO' && sale.change != null && sale.change > 0 && (
            <div className="flex justify-between items-center text-emerald-800 font-bold bg-emerald-100/60 p-2 rounded-xl">
              <span>Cambio / Vuelto</span>
              <span className="text-sm font-black">{formatCurrency(sale.change)}</span>
            </div>
          )}

          <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
            <span className="text-sm font-bold text-gray-900">Total cobrado</span>
            <span className="text-lg font-black text-emerald-800">
              {formatCurrency(sale.total)}
            </span>
          </div>
        </div>

        {/* Status notification */}
        {statusMessage && (
          <div className="p-2.5 rounded-xl bg-gray-100 border border-gray-200 text-xs font-semibold text-gray-700 animate-in fade-in duration-150">
            {statusMessage}
          </div>
        )}

        {/* Acciones de Recibo (Req #4) */}
        <div className="space-y-2.5 pt-1">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleShareReceipt}
              disabled={isSharing || isDownloading}
              className="py-3 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-98 disabled:opacity-50 min-h-[46px]"
              title="Compartir recibo PDF vía WhatsApp o el selector del sistema"
            >
              {isSharing ? (
                <CircleNotch size={17} className="animate-spin" />
              ) : (
                <ShareNetwork size={17} weight="bold" />
              )}
              <span>Compartir recibo</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadReceipt}
              disabled={isSharing || isDownloading}
              className="py-3 px-3 bg-white hover:bg-gray-50 border border-gray-300 text-gray-800 font-bold text-xs sm:text-sm rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs active:scale-98 disabled:opacity-50 min-h-[46px]"
              title="Descargar archivo PDF vertical de 80mm"
            >
              {isDownloading ? (
                <CircleNotch size={17} className="animate-spin" />
              ) : (
                <DownloadSimple size={17} weight="bold" />
              )}
              <span>Descargar PDF</span>
            </button>
          </div>

          {/* Opción de WhatsApp directo si navigator.share no está soportado o se desea enviar resumen */}
          {showWhatsAppFallback && (
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="w-full py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-800 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs active:scale-98 animate-in fade-in duration-200"
            >
              <WhatsappLogo size={17} weight="bold" className="text-emerald-600" />
              <span>Enviar resumen por WhatsApp</span>
            </button>
          )}

          {/* Acción principal: Nueva Venta */}
          <button
            type="button"
            onClick={onNewSale}
            className="w-full py-3.5 px-4 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs sm:text-sm rounded-2xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-98 min-h-[48px] mt-2"
          >
            <Plus size={18} weight="bold" />
            <span>Nueva venta</span>
          </button>
        </div>
      </div>
    </div>
  );
};
