import React, { useState } from 'react';
import {
  CheckCircle,
  Plus,
  ShareNetwork,
  DownloadSimple,
  WhatsappLogo,
  CircleNotch,
  LinkSimple,
  Check,
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
  // whatsapp fallback handled directly
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const methodLabel: Record<string, string> = {
    EFECTIVO: 'Efectivo',
    TARJETA: 'Tarjeta',
    TRANSFERENCIA: 'Transferencia',
    CREDITO: 'Crédito',
    MIXTO: 'Pago mixto',
  };

  const isPerLine =
    sale.taxModel === 'PER_LINE' ||
    (sale.items || []).some((it: any) => it.taxable !== undefined && it.taxable !== null);
  const listPriceTotal = Number((sale as any).listPriceTotal || 0);
  const listDiscountTotal = Number((sale as any).listDiscountTotal || 0);
  const discountManual = Number(sale.discountAmount || 0);
  const taxAmount = Number(sale.taxAmount || 0);
  const total = Number(sale.total || 0);
  const subtotalBeforeTax =
    (sale as any).subtotalBeforeTax != null
      ? Number((sale as any).subtotalBeforeTax)
      : Math.max(0, Number(sale.subtotal || 0) - discountManual);
  const hasTaxable = taxAmount > 0 || (sale.items || []).some((it: any) => Boolean(it.taxable));
  const hasListDiscount = listDiscountTotal > 0 && listPriceTotal > 0;
  const listDiscountPct = hasListDiscount ? Math.round((listDiscountTotal / listPriceTotal) * 100) : 0;

  const creditAccount = (sale as any).creditAccount;
  const isCredit = sale.paymentMethod === 'CREDITO' || Boolean(creditAccount);
  const installments = creditAccount?.installments || [];

  const handleShareReceipt = async () => {
    setIsSharing(true);
    setStatusMessage(null);
    try {
      const result = await shareOrFallbackReceipt(sale, businessInfo, cashierName);
      if (result.shared) {
        setStatusMessage('¡Recibo compartido exitosamente!');
      } else if (result.downloaded) {
        setStatusMessage('Recibo descargado en tu dispositivo.');
        // whatsapp option available
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
      // whatsapp option available
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

  const handleCopyPublicLink = async () => {
    const token = (sale as any).receiptToken || sale.id;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/comprobante/${token}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        setCopiedLink(true);
        setStatusMessage('Enlace público copiado al portapapeles.');
        setTimeout(() => setCopiedLink(false), 2500);
      } else {
        setStatusMessage(url);
      }
    } catch {
      setStatusMessage('No se pudo copiar el enlace.');
    }
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
            Comprobante:{' '}
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
            <span>Cliente</span>
            <span className="font-semibold text-gray-800">
              {sale.customerName || 'Consumidor final'}
            </span>
          </div>

          <div className="flex justify-between items-center text-gray-600">
            <span>Forma de cobro</span>
            <span className="font-bold text-gray-900">
              {methodLabel[sale.paymentMethod] || sale.paymentMethod || 'Efectivo'}
            </span>
          </div>

          {/* Desglose de pagos si existen líneas detalladas */}
          {sale.payments && sale.payments.length > 0 && (
            <div className="pt-2 border-t border-gray-200/60 space-y-1.5">
              <span className="text-xs font-bold text-gray-500 uppercase block">
                Detalle de pagos recibidos:
              </span>
              {sale.payments.map((p, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-100">
                  <div className="min-w-0">
                    <span className="font-bold text-gray-800 block">
                      {methodLabel[p.method] || p.method}
                      {p.currency === 'USD' ? ' (US$)' : ''}
                    </span>
                    {p.reference && (
                      <span className="text-xs text-gray-500 block truncate">
                        Ref: {p.reference}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-gray-900 block">
                      {p.currency === 'USD' ? `US$ ${Number(p.amount).toFixed(2)}` : formatCurrency(p.amount)}
                    </span>
                    {p.currency === 'USD' && p.exchangeRate && (
                      <span className="text-xs text-gray-500 block">
                        Tasa: C$ {Number(p.exchangeRate).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Vuelto / Cambio */}
          {sale.change != null && Number(sale.change) > 0 && (
            <div className="flex justify-between items-center text-emerald-800 font-bold bg-emerald-100/60 p-2 rounded-xl">
              <span>Cambio / Vuelto entregado</span>
              <span className="text-sm font-black">{formatCurrency(sale.change)}</span>
            </div>
          )}

          {/* Información del plan de crédito */}
          {isCredit && (
            <div className="pt-2 border-t border-emerald-200/80 bg-emerald-50/60 p-3 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-emerald-950 font-bold">
                <span>Saldo adeudado:</span>
                <span className="text-sm font-black text-emerald-900">
                  {creditAccount?.balance != null ? formatCurrency(creditAccount.balance) : formatCurrency(total)}
                </span>
              </div>

              {installments.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-emerald-200/60">
                  <span className="text-xs font-bold text-emerald-900 uppercase block">
                    Plan de pagos ({installments.length} cuotas):
                  </span>
                  <div className="max-h-28 overflow-y-auto space-y-1 divide-y divide-emerald-100 text-xs">
                    {installments.map((inst: any) => {
                      const dueDateStr = inst.dueDate ? String(inst.dueDate).substring(0, 10) : '';
                      return (
                        <div key={inst.installmentNumber} className="flex justify-between items-center py-1">
                          <span className="text-emerald-950">
                            Cuota {inst.installmentNumber} ({dueDateStr})
                          </span>
                          <span className="font-bold text-emerald-900">
                            {formatCurrency(inst.amount)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Desglose financiero */}
          <div className="pt-2 border-t border-gray-200/80 space-y-1.5">
            {hasListDiscount ? (
              <>
                <div className="flex justify-between text-gray-600">
                  <span>Precio</span>
                  <span className="font-semibold text-gray-800">{formatCurrency(listPriceTotal)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Descuento ({listDiscountPct}%)</span>
                  <span>-{formatCurrency(listDiscountTotal)}</span>
                </div>
                {discountManual > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Descuento adicional</span>
                    <span>-{formatCurrency(discountManual)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-700 font-medium pt-1 border-t border-gray-200/60">
                  <span>Subtotal antes de IVA</span>
                  <span>{formatCurrency(subtotalBeforeTax)}</span>
                </div>
                {hasTaxable && (
                  <div className="flex justify-between text-gray-600">
                    <span>IVA 15 %</span>
                    <span>{formatCurrency(taxAmount)}</span>
                  </div>
                )}
                <div className="pt-1.5 border-t border-gray-200 flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-900">
                    {hasTaxable ? 'TOTAL A PAGAR (con IVA)' : 'Total cobrado'}
                  </span>
                  <span className="text-lg font-black text-emerald-800">
                    {formatCurrency(total)}
                  </span>
                </div>
              </>
            ) : isPerLine || hasTaxable ? (
              <>
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-gray-800">{formatCurrency(sale.subtotal)}</span>
                </div>
                {discountManual > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Descuento</span>
                    <span>-{formatCurrency(discountManual)}</span>
                  </div>
                )}
                {hasTaxable && (
                  <>
                    <div className="flex justify-between text-gray-700 font-medium pt-1 border-t border-gray-200/60">
                      <span>Subtotal antes de IVA</span>
                      <span>{formatCurrency(subtotalBeforeTax)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>IVA 15 %</span>
                      <span>{formatCurrency(taxAmount)}</span>
                    </div>
                  </>
                )}
                <div className="pt-1.5 border-t border-gray-200 flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-900">
                    {hasTaxable ? 'TOTAL A PAGAR (con IVA)' : 'Total cobrado'}
                  </span>
                  <span className="text-lg font-black text-emerald-800">
                    {formatCurrency(total)}
                  </span>
                </div>
              </>
            ) : (
              <>
                {discountManual > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Descuento</span>
                    <span>-{formatCurrency(discountManual)}</span>
                  </div>
                )}
                <div className="pt-1 border-t border-gray-200 flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-900">Total cobrado</span>
                  <span className="text-lg font-black text-emerald-800">
                    {formatCurrency(total)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Notificación de estado */}
        {statusMessage && (
          <div className="p-2.5 rounded-xl bg-gray-100 border border-gray-200 text-xs font-semibold text-gray-700 animate-in fade-in duration-150">
            {statusMessage}
          </div>
        )}

        {/* Acciones de Recibo y Comprobante */}
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

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="w-full py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-800 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs min-h-[44px]"
            >
              <WhatsappLogo size={17} weight="bold" className="text-emerald-600 shrink-0" />
              <span className="truncate">Enviar WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleCopyPublicLink}
              className="w-full py-2.5 px-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs min-h-[44px]"
            >
              {copiedLink ? (
                <Check size={16} weight="bold" className="text-emerald-600 shrink-0" />
              ) : (
                <LinkSimple size={16} weight="bold" className="text-gray-500 shrink-0" />
              )}
              <span className="truncate">{copiedLink ? '¡Copiado!' : 'Copiar enlace'}</span>
            </button>
          </div>

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
