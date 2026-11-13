import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X,
  Receipt,
  CircleNotch,
  ShareNetwork,
  DownloadSimple,
  WhatsappLogo,
  CheckCircle,
  WarningCircle,
  ClockCounterClockwise,
  Eye,
  LinkSimple,
} from '@phosphor-icons/react';
import { getRecentPosSales, getPosSaleReceipt, type SaleResponse } from 'api-client';
import { formatCurrency } from '../../../utils/formatters';
import { formatManaguaDateTime } from '../../../utils/dateManagua';
import {
  shareOrFallbackReceipt,
  downloadReceiptPdf,
  ensureReceiptLink,
  buildWhatsAppReceiptMessage,
  buildWhatsAppUrl,
  type ReceiptBusinessInfo,
} from '../../../utils/receiptPdf';
import { SaleDetailModal } from '../SaleDetailModal';
import { ReceiptModal } from '../ReceiptModal';

interface RecentSalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessInfo?: ReceiptBusinessInfo;
  cashierName?: string;
}

export const RecentSalesModal: React.FC<RecentSalesModalProps> = ({
  isOpen,
  onClose,
  businessInfo,
  cashierName,
}) => {
  const [activeSaleActionId, setActiveSaleActionId] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [selectedSaleIdForDetail, setSelectedSaleIdForDetail] = useState<string | null>(null);
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<SaleResponse | null>(null);


  const {
    data: recentSales = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['pos', 'sales', 'recent-modal'],
    queryFn: () => getRecentPosSales(10),
    enabled: isOpen,
    staleTime: 10000,
  });

  if (!isOpen) return null;

  const handleShare = async (sale: SaleResponse) => {
    setActiveSaleActionId(sale.id);
    setActionSuccessMessage(null);
    try {
      getPosSaleReceipt(sale.id).catch(() => {});
      const result = await shareOrFallbackReceipt(sale, businessInfo, cashierName, { isReprint: true });
      if (result.shared) {
        setActionSuccessMessage('Comprobante compartido exitosamente');
      } else if (result.downloaded) {
        setActionSuccessMessage('Comprobante descargado');
      }
      setTimeout(() => setActionSuccessMessage(null), 3000);
    } catch {
      setActionSuccessMessage('Error al compartir comprobante');
      setTimeout(() => setActionSuccessMessage(null), 3000);
    } finally {
      setActiveSaleActionId(null);
    }
  };

  const handleDownload = async (sale: SaleResponse) => {
    setActiveSaleActionId(sale.id);
    setActionSuccessMessage(null);
    try {
      getPosSaleReceipt(sale.id).catch(() => {});
      await downloadReceiptPdf(sale, businessInfo, cashierName, { isReprint: true });
      setActionSuccessMessage('Comprobante descargado');
      setTimeout(() => setActionSuccessMessage(null), 3000);
    } catch {
      setActionSuccessMessage('Error al descargar comprobante');
      setTimeout(() => setActionSuccessMessage(null), 3000);
    } finally {
      setActiveSaleActionId(null);
    }
  };

  const handleWhatsApp = async (sale: SaleResponse) => {
    setActiveSaleActionId(sale.id);
    setActionSuccessMessage('Preparando enlace digital...');
    try {
      getPosSaleReceipt(sale.id).catch(() => {});
      const publicUrl = await ensureReceiptLink(sale, businessInfo, cashierName, { isReprint: true });
      const message = buildWhatsAppReceiptMessage(sale, businessInfo?.name || 'NEXOL POS', publicUrl);
      const waUrl = buildWhatsAppUrl(sale.customerPhone, message);
      window.open(waUrl, '_blank', 'noopener,noreferrer');
      setActionSuccessMessage('WhatsApp abierto con el comprobante');
      setTimeout(() => setActionSuccessMessage(null), 3000);
    } catch (err: any) {
      setActionSuccessMessage(err.message || 'Error al preparar enlace para WhatsApp');
      setTimeout(() => setActionSuccessMessage(null), 4000);
    } finally {
      setActiveSaleActionId(null);
    }
  };

  const handleCopyLink = async (sale: SaleResponse) => {
    setActiveSaleActionId(sale.id);
    setActionSuccessMessage('Preparando enlace digital...');
    try {
      getPosSaleReceipt(sale.id).catch(() => {});
      const publicUrl = await ensureReceiptLink(sale, businessInfo, cashierName, { isReprint: true });
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(publicUrl);
        setActionSuccessMessage('Enlace copiado al portapapeles. Funciona por 90 días.');
        setTimeout(() => setActionSuccessMessage(null), 3500);
      } else {
        setActionSuccessMessage(`Enlace: ${publicUrl}`);
      }
    } catch (err: any) {
      setActionSuccessMessage(err.message || 'Error al obtener el enlace del comprobante');
      setTimeout(() => setActionSuccessMessage(null), 4000);
    } finally {
      setActiveSaleActionId(null);
    }
  };

  const methodLabel: Record<string, string> = {
    EFECTIVO: 'Efectivo',
    TARJETA: 'Tarjeta',
    TRANSFERENCIA: 'Transferencia',
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl border border-gray-200 w-full max-w-lg max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gray-900 text-white flex items-center justify-center">
              <ClockCounterClockwise size={20} weight="bold" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900">Ventas Recientes</h3>
              <p className="text-xs text-gray-500">Reimpresión y reenvío de recibos</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-gray-200 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Feedback message */}
        {actionSuccessMessage && (
          <div className="mx-4 mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-medium animate-in fade-in duration-150">
            <CheckCircle size={16} weight="fill" className="text-emerald-600 shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
        )}

        {/* Content list */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 min-h-[220px]">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-gray-400 text-xs">
              <CircleNotch size={24} className="animate-spin mb-2" />
              <span>Consultando últimas ventas...</span>
            </div>
          ) : isError ? (
            <div className="py-12 text-center text-xs text-gray-500 space-y-2">
              <WarningCircle size={28} className="text-amber-500 mx-auto" />
              <p>No se pudieron cargar las ventas recientes.</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl"
              >
                Reintentar
              </button>
            </div>
          ) : recentSales.length === 0 ? (
            <div className="py-16 text-center text-xs text-gray-400 space-y-2">
              <Receipt size={32} className="mx-auto text-gray-300" />
              <p>No hay ventas registradas recientemente.</p>
            </div>
          ) : (
            recentSales.map((sale: SaleResponse) => {
              const invoice = sale.invoiceNumber || sale.id.slice(-6).toUpperCase();
              const isWorking = activeSaleActionId === sale.id;

              return (
                <div
                  key={sale.id}
                  className="p-3.5 bg-gray-50/90 hover:bg-gray-50 border border-gray-200/80 rounded-2xl space-y-2.5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs sm:text-sm text-gray-900">
                          {invoice}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-200/80 text-gray-700">
                          {methodLabel[sale.paymentMethod] || sale.paymentMethod}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {formatManaguaDateTime(sale.createdAt)}
                      </div>
                      {sale.customerName && (
                        <div className="text-xs text-gray-600 mt-0.5">
                          Cliente: <span className="font-medium text-gray-800">{sale.customerName}</span>
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="text-sm sm:text-base font-black text-gray-900">
                        {formatCurrency(sale.total)}
                      </div>
                      <div className="text-xs text-gray-400">
                        {(sale.items || []).length} {(sale.items || []).length === 1 ? 'ítem' : 'ítems'}
                      </div>
                    </div>
                  </div>

                  {/* Acciones del recibo */}
                  <div className="pt-2 border-t border-gray-200/70 flex flex-wrap items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedSaleForReceipt(sale)}
                      className="px-2.5 py-1.5 rounded-xl bg-gray-900 hover:bg-black text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      title="Ver e imprimir comprobante (Ticket o Carta)"
                    >
                      <Receipt size={15} weight="bold" />
                      <span>Comprobante</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedSaleIdForDetail(sale.id)}
                      className="px-2.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Ver detalle, anular o devolver"
                    >
                      <Eye size={15} weight="bold" />
                      <span>Detalle</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleWhatsApp(sale)}
                      disabled={isWorking}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      title="Enviar resumen por WhatsApp"
                    >
                      <WhatsappLogo size={15} weight="bold" />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownload(sale)}
                      disabled={isWorking}
                      className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                      title="Descargar PDF"
                    >
                      {isWorking ? (
                        <CircleNotch size={14} className="animate-spin" />
                      ) : (
                        <DownloadSimple size={15} weight="bold" />
                      )}
                      <span>PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleShare(sale)}
                      disabled={isWorking}
                      className="px-3 py-1.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                      title="Compartir recibo"
                    >
                      {isWorking ? (
                        <CircleNotch size={14} className="animate-spin" />
                      ) : (
                        <ShareNetwork size={15} weight="bold" />
                      )}
                      <span>Compartir</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyLink(sale)}
                      disabled={isWorking}
                      className="px-2.5 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                      title="Copiar enlace público de 90 días"
                    >
                      <LinkSimple size={15} weight="bold" />
                      <span>Copiar link</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-11 px-4 bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-2xs flex items-center justify-center"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Modal de Detalle, Anulación y Devolución */}
      {selectedSaleIdForDetail && (
        <SaleDetailModal
          saleId={selectedSaleIdForDetail}
          onClose={() => {
            setSelectedSaleIdForDetail(null);
            refetch();
          }}
        />
      )}

      {/* Modal de Comprobante (Ticket térmico y Hoja Carta) */}
      {selectedSaleForReceipt && (
        <ReceiptModal
          isOpen={Boolean(selectedSaleForReceipt)}
          onClose={() => setSelectedSaleForReceipt(null)}
          sale={selectedSaleForReceipt}
          businessInfo={businessInfo}
          cashierName={cashierName}
          isReprint={true}
          onPrintRecorded={() => refetch()}
        />
      )}
    </div>
  );
};
