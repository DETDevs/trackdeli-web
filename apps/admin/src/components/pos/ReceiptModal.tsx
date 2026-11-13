import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  X,
  Printer,
  FilePdf,
  ShareNetwork,
  WhatsappLogo,
  Copy,
  CheckCircle,
  WarningCircle,
  ArrowsClockwise,
  Receipt,
  FileText,
} from "@phosphor-icons/react";
import { getPosSaleReceipt } from "api-client";
import {
  generateReceiptHtml,
  printReceiptViaIframe,
  downloadReceiptPdfFile,
  ReceiptHtmlOptions,
  ReceiptHtmlBusiness,
} from "../../utils/receiptHtml";
import { useReceiptSettings } from "../../hooks/useReceiptSettings";
import {
  ensureReceiptLink,
  buildWhatsAppReceiptMessage,
  buildWhatsAppUrl,
} from "../../utils/receiptPdf";

export interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: any; // SaleResponse o BackofficeSaleDetail
  businessInfo?: ReceiptHtmlBusiness;
  cashierName?: string;
  isReprint?: boolean;
  initialFormat?: "ticket" | "carta";
  onPrintRecorded?: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  sale,
  businessInfo,
  cashierName,
  isReprint = false,
  initialFormat = "ticket",
  onPrintRecorded,
}) => {
  const { settings: receiptSettings } = useReceiptSettings();

  const [format, setFormat] = useState<"ticket" | "carta">(initialFormat);
  const [paperWidth, setPaperWidth] = useState<number>(80);

  // Estados de carga de acciones
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSavingPdf, setIsSavingPdf] = useState(false);
  const [isSharingPdf, setIsSharingPdf] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [isCopyingLink, setIsCopyingLink] = useState(false);

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Sincronizar ancho de papel desde la configuración del negocio si está disponible
  useEffect(() => {
    if (
      receiptSettings?.paperWidthMm === 58 ||
      receiptSettings?.paperWidthMm === 80
    ) {
      setPaperWidth(receiptSettings.paperWidthMm);
    }
  }, [receiptSettings?.paperWidthMm]);

  // Limpiar feedback tras 4 segundos
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Adaptar venta para la plantilla
  const adaptedSale = useMemo(() => {
    if (!sale) return null;
    const s = sale as any;
    return {
      id: sale.id,
      invoiceNumber: sale.invoiceNumber,
      total: Number(sale.netTotal ?? sale.total ?? 0),
      subtotal: Number(sale.subtotal ?? 0),
      discountAmount: Number(sale.discountAmount ?? sale.discount ?? 0),
      taxAmount: Number(sale.taxAmount ?? sale.tax ?? 0),
      taxRate: sale.taxRate,
      taxName: sale.taxName,
      taxModel: sale.taxModel,
      amountPaid: Number(sale.amountPaid ?? 0),
      change: Number(sale.change ?? 0),
      paymentMethod: sale.paymentMethod || "EFECTIVO",
      status: sale.status || (sale.isVoided ? "CANCELLED" : "COMPLETED"),
      createdAt: sale.createdAt || sale.date,
      customerName: sale.customer?.name || s.customerName || null,
      customerPhone: sale.customer?.phone || s.customerPhone || null,
      customerTaxId:
        sale.customer?.taxId || s.customerTaxId || s.customerRuc || null,
      cashier: sale.cashier || cashierName || s.cashierName,
      cashierName: cashierName || sale.cashier?.name || s.cashierName,
      channel: sale.channel || "MOSTRADOR",
      deliveryFee: sale.deliveryFee,
      deliveryAddress: sale.deliveryAddress,
      deliveryPhone: sale.deliveryPhone,
      deliveryReference: sale.deliveryReference,
      deliveryDriverName: sale.deliveryDriverName || sale.deliveryDriver?.name,
      pedidosYaOrderNumber: sale.pedidosYaOrderNumber,
      pedidosYaPaymentMode: sale.pedidosYaPaymentMode,
      items: (sale.items || []).map((it: any) => ({
        productName:
          it.productName || it.product?.name || it.name || "Producto",
        quantity: Number(it.quantity || 1),
        unitPrice: Number(it.unitPrice || 0),
        subtotal: Number(it.subtotal || 0),
        discount: Number(it.discount || 0),
        taxable: Boolean(it.taxable),
        listPrice: it.listPrice,
        unit: it.unit,
        batches: it.batches || it.batchAllocations,
      })),
      payments: sale.payments || [],
      creditAccount: sale.creditAccount,
      isVoided: Boolean(sale.isVoided || sale.status === "CANCELLED"),
    };
  }, [sale, cashierName]);

  const isVoided = Boolean(adaptedSale?.isVoided);
  const invoiceNumber =
    adaptedSale?.invoiceNumber ||
    (sale?.id ? `FAC-${String(sale.id).slice(0, 6)}` : "0000");

  // Generar HTML completo de la plantilla
  const receiptHtmlContent = useMemo(() => {
    if (!adaptedSale) return "";
    const htmlOpts: ReceiptHtmlOptions = {
      format,
      paperWidthMm: paperWidth,
      isReprint,
      isVoided,
      copyType: "CLIENTE",
    };
    return generateReceiptHtml(
      adaptedSale,
      businessInfo,
      receiptSettings?.footerLines?.[0],
      receiptSettings,
      htmlOpts,
    );
  }, [
    adaptedSale,
    businessInfo,
    receiptSettings,
    format,
    paperWidth,
    isReprint,
    isVoided,
  ]);

  // Auditoría: Registrar reimpresión al interactuar (imprimir, guardar, compartir, copiar)
  const auditReceiptAction = async () => {
    if (!sale?.id) return;
    try {
      await getPosSaleReceipt(sale.id);
      onPrintRecorded?.();
    } catch (err) {
      console.warn(
        "[ReceiptModal] No se pudo registrar auditoría de impresión:",
        err,
      );
    }
  };

  if (!isOpen || !sale) return null;

  // 1. Imprimir comprobante vía iframe
  const handlePrint = async () => {
    if (isPrinting || !receiptHtmlContent) return;
    setIsPrinting(true);
    setFeedback(null);

    try {
      await auditReceiptAction();
      await printReceiptViaIframe(
        receiptHtmlContent,
        `Comprobante-${invoiceNumber}`,
      );
      setFeedback({
        type: "success",
        message: "Diálogo de impresión del navegador abierto.",
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "No se pudo abrir el diálogo de impresión.",
      });
    } finally {
      setIsPrinting(false);
    }
  };

  // 2. Guardar comprobante como PDF
  const handleSavePdf = async () => {
    if (isSavingPdf || !receiptHtmlContent) return;
    setIsSavingPdf(true);
    setFeedback(null);

    try {
      await auditReceiptAction();
      await downloadReceiptPdfFile(adaptedSale, receiptHtmlContent, {
        format,
        paperWidthMm: paperWidth,
      });
      setFeedback({
        type: "success",
        message: `Comprobante guardado como PDF (comprobante-${invoiceNumber}.pdf).`,
      });
    } catch (err: any) {
      console.error("[ReceiptModal] Error guardando PDF:", err);
      setFeedback({
        type: "error",
        message: err?.message || "Error al generar el archivo PDF.",
      });
    } finally {
      setIsSavingPdf(false);
    }
  };

  // 3. Compartir
  const handleShare = async () => {
    if (isSharingPdf || !adaptedSale) return;
    setIsSharingPdf(true);
    setFeedback(null);

    try {
      await auditReceiptAction();

      // En móviles con soporte de Web Share API
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          const { generateReceiptPdfBlob } =
            await import("../../utils/receiptHtml");
          const blob = await generateReceiptPdfBlob(receiptHtmlContent, {
            format,
            paperWidthMm: paperWidth,
          });
          const file = new File([blob], `comprobante-${invoiceNumber}.pdf`, {
            type: "application/pdf",
          });

          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: `Comprobante ${invoiceNumber}`,
              text: `Comprobante de compra ${invoiceNumber}`,
            });
            setFeedback({
              type: "success",
              message: "Comprobante compartido con éxito.",
            });
            return;
          }
        } catch (shareErr: any) {
          if (shareErr.name === "AbortError") return;
        }
      }

      // Fallback a descarga directa
      await downloadReceiptPdfFile(adaptedSale, receiptHtmlContent, {
        format,
        paperWidthMm: paperWidth,
      });
      setFeedback({
        type: "success",
        message: "Archivo descargado en el dispositivo.",
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "No se pudo compartir el comprobante.",
      });
    } finally {
      setIsSharingPdf(false);
    }
  };

  // 4. Enviar WhatsApp
  const handleSendWhatsApp = async () => {
    if (isSendingWhatsApp || !adaptedSale) return;
    setIsSendingWhatsApp(true);
    setFeedback(null);

    try {
      await auditReceiptAction();

      let linkUrl = "";
      if (!isVoided) {
        try {
          linkUrl = await ensureReceiptLink(
            adaptedSale as any,
            businessInfo as any,
            cashierName,
            { isReprint, isVoided },
          );
        } catch (linkErr: any) {
          console.warn(
            "[ReceiptModal] No se pudo generar enlace público de recibo:",
            linkErr,
          );
        }
      }

      const bName =
        businessInfo?.name || receiptSettings?.showBusinessName
          ? businessInfo?.name || "NEXOL POS"
          : "NEXOL POS";
      const message = buildWhatsAppReceiptMessage(
        adaptedSale as any,
        bName,
        linkUrl,
      );
      const targetPhone = adaptedSale.customerPhone || "";
      const whatsappUrl = buildWhatsAppUrl(targetPhone, message);

      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      setFeedback({
        type: "success",
        message: "Abriendo WhatsApp con el mensaje del comprobante.",
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "Error al preparar el envío por WhatsApp.",
      });
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  // 5. Copiar enlace público
  const handleCopyLink = async () => {
    if (isCopyingLink || !adaptedSale) return;

    if (isVoided) {
      setFeedback({
        type: "error",
        message:
          "No se puede generar un enlace público para una venta anulada.",
      });
      return;
    }

    setIsCopyingLink(true);
    setFeedback(null);

    try {
      await auditReceiptAction();

      const linkUrl = await ensureReceiptLink(
        adaptedSale as any,
        businessInfo as any,
        cashierName,
        { isReprint, isVoided },
      );

      await navigator.clipboard.writeText(linkUrl);
      setFeedback({
        type: "success",
        message: "Enlace copiado al portapapeles. Funciona por 90 días.",
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "No se pudo generar el enlace público.",
      });
    } finally {
      setIsCopyingLink(false);
    }
  };

  const isWorking =
    isPrinting ||
    isSavingPdf ||
    isSharingPdf ||
    isSendingWhatsApp ||
    isCopyingLink;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-modal-title"
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center shadow-xs">
              <Receipt size={18} weight="bold" />
            </div>
            <div>
              <h2
                id="receipt-modal-title"
                className="text-sm sm:text-base font-bold text-gray-900 tracking-tight"
              >
                Comprobante de venta
              </h2>
              <p className="text-[11px] text-gray-500">
                Folio:{" "}
                <span className="font-semibold text-gray-800">
                  {invoiceNumber}
                </span>
                {isReprint && " · Reimpresión"}
                {isVoided && " · Anulado"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            title="Cerrar vista"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Barra de opciones de formato */}
        <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
          {/* Selector de formato (Ticket vs Hoja carta) */}
          <div className="flex items-center gap-1.5 p-1 bg-gray-200/80 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFormat("ticket")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                format === "ticket"
                  ? "bg-white text-gray-900 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Receipt size={14} weight="bold" />
              <span>Ticket térmico</span>
            </button>

            <button
              type="button"
              onClick={() => setFormat("carta")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                format === "carta"
                  ? "bg-white text-gray-900 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <FileText size={14} weight="bold" />
              <span>Hoja carta</span>
            </button>
          </div>

          {/* Si es ticket, selector de ancho 80 mm vs 58 mm */}
          {format === "ticket" && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500 font-medium">Ancho de papel:</span>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={() => setPaperWidth(80)}
                  className={`px-2.5 py-1 text-xs font-semibold transition-colors ${
                    paperWidth === 80
                      ? "bg-gray-900 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  80 mm
                </button>
                <button
                  type="button"
                  onClick={() => setPaperWidth(58)}
                  className={`px-2.5 py-1 text-xs font-semibold border-l border-gray-300 transition-colors ${
                    paperWidth === 58
                      ? "bg-gray-900 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  58 mm
                </button>
              </div>
            </div>
          )}

          {/* Feedback inline */}
          {feedback && (
            <div
              className={`text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-medium ${
                feedback.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {feedback.type === "success" ? (
                <CheckCircle
                  size={14}
                  weight="bold"
                  className="text-emerald-600 shrink-0"
                />
              ) : (
                <WarningCircle
                  size={14}
                  weight="bold"
                  className="text-red-600 shrink-0"
                />
              )}
              <span>{feedback.message}</span>
            </div>
          )}
        </div>

        {/* Contenedor de Vista Previa fiel */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200/70 flex justify-center items-start min-h-[320px]">
          <div
            className={`transition-all duration-200 bg-white shadow-xl rounded-lg overflow-hidden border border-gray-300/80 ${
              format === "carta"
                ? "w-full max-w-[640px] p-6"
                : paperWidth === 58
                  ? "w-[240px] p-2"
                  : "w-[320px] p-3"
            }`}
          >
            <iframe
              ref={iframeRef}
              srcDoc={receiptHtmlContent}
              title="Vista previa de comprobante"
              className="w-full border-none"
              style={{
                height: format === "carta" ? "560px" : "480px",
                backgroundColor: "#ffffff",
              }}
            />
          </div>
        </div>

        {/* Barra de Acciones del comprobante */}
        <div className="px-5 py-3.5 bg-white border-t border-gray-100 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Imprimir */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={isWorking}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gray-900 hover:bg-black disabled:opacity-50 transition-colors shadow-xs"
            >
              {isPrinting ? (
                <ArrowsClockwise size={15} className="animate-spin" />
              ) : (
                <Printer size={15} weight="bold" />
              )}
              <span>Imprimir</span>
            </button>

            {/* Guardar PDF */}
            <button
              type="button"
              onClick={handleSavePdf}
              disabled={isWorking}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              {isSavingPdf ? (
                <ArrowsClockwise size={15} className="animate-spin" />
              ) : (
                <FilePdf size={15} weight="bold" />
              )}
              <span>Guardar PDF</span>
            </button>

            {/* Compartir */}
            <button
              type="button"
              onClick={handleShare}
              disabled={isWorking}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              {isSharingPdf ? (
                <ArrowsClockwise size={15} className="animate-spin" />
              ) : (
                <ShareNetwork size={15} weight="bold" />
              )}
              <span>Compartir</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* WhatsApp */}
            <button
              type="button"
              onClick={handleSendWhatsApp}
              disabled={isWorking}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 disabled:opacity-50 transition-colors"
            >
              {isSendingWhatsApp ? (
                <ArrowsClockwise
                  size={15}
                  className="animate-spin text-emerald-600"
                />
              ) : (
                <WhatsappLogo
                  size={15}
                  weight="bold"
                  className="text-emerald-600"
                />
              )}
              <span>WhatsApp</span>
            </button>

            {/* Copiar enlace */}
            <button
              type="button"
              onClick={handleCopyLink}
              disabled={isWorking || isVoided}
              title={
                isVoided ? "Venta anulada" : "Copiar enlace público seguro"
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 disabled:opacity-50 transition-colors"
            >
              {isCopyingLink ? (
                <ArrowsClockwise size={15} className="animate-spin" />
              ) : (
                <Copy size={15} weight="bold" />
              )}
              <span>Copiar enlace</span>
            </button>

            {/* Botón cerrar */}
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
