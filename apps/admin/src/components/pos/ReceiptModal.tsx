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
  MapPin,
} from "@phosphor-icons/react";
import { getPosSaleReceipt, updateCustomer } from "api-client";
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
import {
  enrichSaleWithCustomerAddress,
  getSaleCustomerAddress,
  getSaleCustomerReference,
  mergeCustomerIntoSale,
} from "../../utils/customerAddress";

function adaptSaleForReceipt(sale: any, cashierName?: string) {
  if (!sale) return null;
  const s = sale as any;
  const resolvedAddress = getSaleCustomerAddress(s) || null;
  const resolvedReference = getSaleCustomerReference(s) || null;

  return {
    id: s.id,
    invoiceNumber: s.invoiceNumber,
    total: Number(s.netTotal ?? s.total ?? 0),
    subtotal: Number(s.subtotal ?? 0),
    discountAmount: Number(s.discountAmount ?? s.discount ?? 0),
    taxAmount: Number(s.taxAmount ?? s.tax ?? 0),
    taxRate: s.taxRate,
    taxName: s.taxName,
    taxModel: s.taxModel,
    amountPaid: Number(s.amountPaid ?? 0),
    change: Number(s.change ?? 0),
    paymentMethod: s.paymentMethod || "EFECTIVO",
    status: s.status || (s.isVoided ? "CANCELLED" : "COMPLETED"),
    createdAt: s.createdAt || s.date,
    customerId: s.customerId || s.customer?.id || null,
    customerName: s.customer?.name || s.customerName || null,
    customerPhone: s.customer?.phone || s.customerPhone || null,
    customerTaxId:
      s.customer?.taxId || s.customer?.ruc || s.customerTaxId || s.customerRuc || null,
    customerAddress: resolvedAddress,
    customerReference: resolvedReference,
    customer: s.customer || null,
    cashier: s.cashier || cashierName || s.cashierName,
    cashierName: cashierName || s.cashier?.name || s.cashierName,
    channel: s.channel || "MOSTRADOR",
    deliveryFee: s.deliveryFee,
    deliveryAddress: s.deliveryAddress || resolvedAddress,
    deliveryPhone: s.deliveryPhone,
    deliveryReference: s.deliveryReference || resolvedReference,
    deliveryDriverName: s.deliveryDriverName || s.deliveryDriver?.name,
    pedidosYaOrderNumber: s.pedidosYaOrderNumber,
    pedidosYaPaymentMode: s.pedidosYaPaymentMode,
    items: (s.items || []).map((it: any) => ({
      productName: it.productName || it.product?.name || it.name || "Producto",
      quantity: Number(it.quantity || 1),
      unitPrice: Number(it.unitPrice || 0),
      subtotal: Number(it.subtotal || 0),
      discount: Number(it.discount || 0),
      taxable: Boolean(it.taxable),
      listPrice: it.listPrice,
      unit: it.unit,
      presentationName: it.presentationName || it.presentation?.name || null,
      batches: it.batches || it.batchAllocations,
    })),
    payments: s.payments || [],
    tip: s.tip ?? null,
    creditAccount: s.creditAccount,
    isVoided: Boolean(s.isVoided || s.status === "CANCELLED"),
  };
}

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
  const [enrichedSale, setEnrichedSale] = useState<any | null>(null);
  const [missingAddressAction, setMissingAddressAction] = useState<
    "print" | "pdf" | "share" | "edit-only" | null
  >(null);
  const [addressInput, setAddressInput] = useState("");
  const [referenceInput, setReferenceInput] = useState("");
  const [addressError, setAddressError] = useState<string | null>(null);
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setEnrichedSale(null);
      setMissingAddressAction(null);
      setAddressError(null);
      return;
    }
    setEnrichedSale(null);
    setMissingAddressAction(null);
    setAddressError(null);
  }, [isOpen, sale?.id]);

  useEffect(() => {
    let cancelled = false;
    if (
      !isOpen ||
      !sale ||
      (format !== "carta" && !receiptSettings?.showCustomerAddress)
    ) {
      return;
    }
    if (getSaleCustomerAddress(sale) && getSaleCustomerReference(sale)) {
      return;
    }
    enrichSaleWithCustomerAddress(sale).then((res) => {
      if (!cancelled && res && res !== sale) {
        setEnrichedSale(res);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, sale, format, receiptSettings?.showCustomerAddress]);

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

  const effectiveSale = enrichedSale || sale;

  // Adaptar venta para la plantilla
  const adaptedSale = useMemo(() => {
    return adaptSaleForReceipt(effectiveSale, cashierName);
  }, [effectiveSale, cashierName]);

  const isNamedCustomerWithoutAddress = useMemo(() => {
    if (format !== "carta" || !adaptedSale?.customerName) return false;
    const norm = String(adaptedSale.customerName).trim().toLowerCase();
    if (!norm || norm === "cliente general" || norm === "consumidor final") {
      return false;
    }
    return !String(adaptedSale.customerAddress || "").trim();
  }, [format, adaptedSale]);

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

  const buildHtmlForAdapted = (targetAdapted: any) => {
    if (!targetAdapted) return "";
    const htmlOpts: ReceiptHtmlOptions = {
      format,
      paperWidthMm: paperWidth,
      isReprint,
      isVoided: Boolean(targetAdapted.isVoided),
      copyType: "CLIENTE",
    };
    return generateReceiptHtml(
      targetAdapted,
      businessInfo,
      receiptSettings?.footerLines?.[0],
      receiptSettings,
      htmlOpts,
    );
  };

  // 1. Imprimir comprobante vía iframe
  const executePrint = async (htmlOverride?: string) => {
    const htmlToUse = htmlOverride || receiptHtmlContent;
    if (isPrinting || !htmlToUse) return;
    setIsPrinting(true);
    setFeedback(null);

    try {
      await auditReceiptAction();
      await printReceiptViaIframe(htmlToUse, `Comprobante-${invoiceNumber}`);
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
  const executeSavePdf = async (adaptedOverride?: any, htmlOverride?: string) => {
    const adaptedToUse = adaptedOverride || adaptedSale;
    const htmlToUse = htmlOverride || receiptHtmlContent;
    if (isSavingPdf || !htmlToUse || !adaptedToUse) return;
    setIsSavingPdf(true);
    setFeedback(null);

    try {
      await auditReceiptAction();
      await downloadReceiptPdfFile(adaptedToUse, htmlToUse, {
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
  const executeShare = async (adaptedOverride?: any, htmlOverride?: string) => {
    const adaptedToUse = adaptedOverride || adaptedSale;
    const htmlToUse = htmlOverride || receiptHtmlContent;
    if (isSharingPdf || !adaptedToUse) return;
    setIsSharingPdf(true);
    setFeedback(null);

    try {
      await auditReceiptAction();

      // En móviles con soporte de Web Share API
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          const { generateReceiptPdfBlob } =
            await import("../../utils/receiptHtml");
          const blob = await generateReceiptPdfBlob(htmlToUse, {
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
      await downloadReceiptPdfFile(adaptedToUse, htmlToUse, {
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

  const openMissingAddressModal = (
    action: "print" | "pdf" | "share" | "edit-only",
  ) => {
    setAddressInput(String(adaptedSale?.customerAddress || ""));
    setReferenceInput(String(adaptedSale?.customerReference || ""));
    setAddressError(null);
    setMissingAddressAction(action);
  };

  const handlePrint = async () => {
    if (isNamedCustomerWithoutAddress) {
      openMissingAddressModal("print");
      return;
    }
    await executePrint();
  };

  const handleSavePdf = async () => {
    if (isNamedCustomerWithoutAddress) {
      openMissingAddressModal("pdf");
      return;
    }
    await executeSavePdf();
  };

  const handleShare = async () => {
    if (isNamedCustomerWithoutAddress) {
      openMissingAddressModal("share");
      return;
    }
    await executeShare();
  };

  const handleContinueWithoutAddress = async () => {
    const action = missingAddressAction;
    setMissingAddressAction(null);
    if (action === "print") await executePrint();
    else if (action === "pdf") await executeSavePdf();
    else if (action === "share") await executeShare();
  };

  const handleSaveAddressAndContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    const addrTrim = addressInput.trim();
    const refTrim = referenceInput.trim();
    if (!addrTrim) {
      setAddressError("Ingresá la dirección del cliente para continuar.");
      return;
    }

    setIsSavingAddress(true);
    setAddressError(null);
    try {
      let nextSale: any;
      if (adaptedSale?.customerId) {
        const updatedCustomer = await updateCustomer(adaptedSale.customerId, {
          address: addrTrim,
          deliveryReference: refTrim || undefined,
        });
        nextSale = mergeCustomerIntoSale(effectiveSale, {
          ...updatedCustomer,
          lastAddressText: addrTrim,
          address: addrTrim,
          deliveryReference: refTrim || null,
        });
      } else {
        nextSale = mergeCustomerIntoSale(effectiveSale, {
          id: null,
          name: adaptedSale?.customerName,
          phone: adaptedSale?.customerPhone,
          lastAddressText: addrTrim,
          address: addrTrim,
          deliveryReference: refTrim || null,
        });
      }

      setEnrichedSale(nextSale);
      const freshAdapted = adaptSaleForReceipt(nextSale, cashierName);
      const freshHtml = buildHtmlForAdapted(freshAdapted);
      const pending = missingAddressAction;
      setMissingAddressAction(null);

      setFeedback({
        type: "success",
        message: adaptedSale?.customerId
          ? "Dirección guardada en el perfil del cliente."
          : "Dirección aplicada al comprobante.",
      });

      if (pending === "print") await executePrint(freshHtml);
      else if (pending === "pdf") await executeSavePdf(freshAdapted, freshHtml);
      else if (pending === "share") await executeShare(freshAdapted, freshHtml);
    } catch (err: any) {
      setAddressError(
        err?.response?.data?.message ||
          "No se pudo guardar la dirección del cliente.",
      );
    } finally {
      setIsSavingAddress(false);
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

        {/* Aviso si el comprobante en Hoja Carta corresponde a un cliente sin dirección */}
        {isNamedCustomerWithoutAddress && (
          <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-200 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900">
            <div className="flex items-center gap-2 min-w-0">
              <MapPin size={16} weight="fill" className="text-amber-600 shrink-0" />
              <span>
                Este comprobante para <strong>{adaptedSale?.customerName}</strong> no tiene dirección registrada.
              </span>
            </div>
            <button
              type="button"
              onClick={() => openMissingAddressModal("edit-only")}
              className="px-3 py-1 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold transition-colors cursor-pointer shrink-0"
            >
              Completar dirección
            </button>
          </div>
        )}

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

      {/* Modal de validación cuando falta la dirección del cliente en Hoja carta */}
      {missingAddressAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[1px]">
          <form
            onSubmit={handleSaveAddressAndContinue}
            className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="px-5 py-4 border-b border-gray-100 bg-amber-50/70 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <MapPin size={20} weight="fill" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Ups, este cliente aún no tiene dirección registrada
                  </h3>
                  <p className="text-xs text-gray-600">
                    Cliente: {adaptedSale?.customerName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMissingAddressAction(null)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-amber-100/60"
                aria-label="Cerrar"
              >
                <X size={17} weight="bold" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <p className="text-gray-600 leading-relaxed">
                {missingAddressAction === "edit-only"
                  ? "Completá su dirección y punto de referencia para que aparezcan en este comprobante en hoja carta."
                  : "Antes de generar este comprobante en hoja carta, completá su dirección y punto de referencia para el documento."}
              </p>

              {addressError && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 font-medium">
                  {addressError}
                </div>
              )}

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Dirección *
                </label>
                <textarea
                  rows={2}
                  maxLength={250}
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  placeholder="Ej. Barrio San Juan, de la esquina 2 cuadras al lago"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Punto de referencia
                </label>
                <input
                  type="text"
                  maxLength={150}
                  value={referenceInput}
                  onChange={(e) => setReferenceInput(e.target.value)}
                  placeholder="Ej. Portón negro frente a pulpería La Fe"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-gray-900"
                />
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50/70 flex flex-wrap items-center justify-end gap-2">
              {missingAddressAction === "edit-only" ? (
                <button
                  type="button"
                  onClick={() => setMissingAddressAction(null)}
                  disabled={isSavingAddress}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-200/70 cursor-pointer"
                >
                  Cancelar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleContinueWithoutAddress}
                  disabled={isSavingAddress}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 cursor-pointer"
                >
                  Continuar sin dirección
                </button>
              )}

              <button
                type="submit"
                disabled={isSavingAddress}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#0F0F0F] hover:bg-gray-800 text-white disabled:opacity-50 cursor-pointer"
              >
                {isSavingAddress
                  ? "Guardando..."
                  : missingAddressAction === "edit-only"
                    ? "Guardar dirección"
                    : "Guardar dirección y continuar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
