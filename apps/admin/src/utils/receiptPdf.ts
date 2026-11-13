import { jsPDF } from 'jspdf';
import { type SaleResponse, uploadPosReceiptPdf } from 'api-client';
import { formatCurrency } from './formatters';
import { formatManaguaDateTime } from './dateManagua';
import {
  generateReceiptHtml,
  generateReceiptPdfBlob as generateHtmlPdfBlob,
} from './receiptHtml';

export { generateReceiptHtml, generateHtmlPdfBlob };

export interface ReceiptBusinessInfo {
  name?: string;
  phone?: string | null;
  address?: string | null;
  taxId?: string | null;
  logoUrl?: string | null;
}

export interface ReceiptPdfOptions {
  isReprint?: boolean;
  isVoided?: boolean;
}

/**
 * Genera el documento PDF del recibo vertical de 80 mm en el navegador
 */
export async function generateReceiptPdfBlob(
  sale: SaleResponse,
  businessInfo?: ReceiptBusinessInfo,
  cashierName?: string,
  options?: ReceiptPdfOptions,
): Promise<{ blob: Blob; fileName: string; doc: jsPDF }> {
  const invoiceNum = sale.invoiceNumber || sale.id.slice(-6).toUpperCase();
  const fileName = `comprobante-${invoiceNum}.pdf`;

  const adaptedSale = {
    ...sale,
    cashierName: cashierName || (sale as any).cashierName || sale.cashier?.name,
  };

  // Renderizar usando la plantilla unificada idéntica al desktop
  const html = generateReceiptHtml(
    adaptedSale,
    businessInfo,
    undefined,
    undefined,
    {
      format: 'ticket',
      paperWidthMm: 80,
      isReprint: options?.isReprint,
      isVoided: Boolean(options?.isVoided || (sale as any).isVoided || sale.status === 'CANCELLED'),
    }
  );

  const blob = await generateHtmlPdfBlob(html, { format: 'ticket', paperWidthMm: 80 });
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 200] });

  return { blob, fileName, doc };
}

/**
 * Descarga directamente el recibo en PDF en el navegador y libera la memoria
 */
export async function downloadReceiptPdf(
  sale: SaleResponse,
  businessInfo?: ReceiptBusinessInfo,
  cashierName?: string,
  options?: ReceiptPdfOptions,
): Promise<void> {
  const { blob, fileName } = await generateReceiptPdfBlob(sale, businessInfo, cashierName, options);
  downloadBlob(blob, fileName);
}

/**
 * Descarga un Blob de archivo y libera inmediatamente el URL del objeto
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  if (typeof window === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Comparte el archivo PDF usando navigator.share (Android Chrome / iOS Safari).
 * Si no está soportado, descarga el PDF y reporta fallback para WhatsApp.
 */
export async function shareOrFallbackReceipt(
  sale: SaleResponse,
  businessInfo?: ReceiptBusinessInfo,
  cashierName?: string,
  options?: ReceiptPdfOptions,
): Promise<{ shared: boolean; downloaded: boolean; error?: string }> {
  try {
    const { blob, fileName } = await generateReceiptPdfBlob(sale, businessInfo, cashierName, options);

    // Verificar si el navegador soporta compartir archivos
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        const file = new File([blob], fileName, { type: 'application/pdf' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Recibo ${sale.invoiceNumber}`,
            text: `Recibo de compra ${sale.invoiceNumber} - ${businessInfo?.name || sale.business?.name || 'NEXOL POS'}`,
          });
          return { shared: true, downloaded: false };
        }
      } catch (shareErr: any) {
        // Si el usuario canceló la ventana de compartir nativa
        if (shareErr.name === 'AbortError') {
          return { shared: true, downloaded: false };
        }
        console.warn('[shareOrFallbackReceipt] navigator.share error:', shareErr);
      }
    }

    // Fallback: descargar PDF y permitir enviar resumen por WhatsApp
    downloadBlob(blob, fileName);
    return { shared: false, downloaded: true };
  } catch (err: any) {
    console.error('[shareOrFallbackReceipt] Error fatal:', err);
    return { shared: false, downloaded: false, error: err.message || 'Error al generar PDF' };
  }
}

/**
 * Genera el enlace de wa.me para enviar resumen de compra por WhatsApp
 */
export function getWhatsAppSummaryUrl(
  sale: SaleResponse,
  businessName?: string,
  customerPhone?: string | null,
): string {
  const name = businessName || 'NEXOL POS';
  const invoice = sale.invoiceNumber || sale.id.slice(-6).toUpperCase();
  const total = formatCurrency(sale.total);
  const rawPhone = (customerPhone || sale.customerPhone || '').replace(/\D/g, '');

  let creditInfo = '';
  const creditAcc = (sale as any).creditAccount;
  if (sale.paymentMethod === 'CREDITO' || creditAcc) {
    creditInfo = `\n💳 *Modalidad:* Venta al crédito`;
    if (creditAcc) {
      if (creditAcc.installments && creditAcc.installments.length > 0) {
        creditInfo += `\n📅 *Plan:* ${creditAcc.installments.length} cuotas (${creditAcc.frequency || 'periódicas'})`;
      }
      if (creditAcc.balance != null) {
        creditInfo += `\n💰 *Saldo adeudado:* ${formatCurrency(creditAcc.balance)}`;
      }
    }
  }
  const text = `¡Hola! Aquí tienes el resumen de tu compra en *${name}*:\n\n📄 *Comprobante:* ${invoice}\n💰 *Total:* ${total}${creditInfo}\n\n¡Gracias por su compra!`;

  if (rawPhone) {
    const fullPhone = rawPhone.length === 8 ? `505${rawPhone}` : rawPhone;
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
  }

  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}


// Cache en memoria para reutilizar enlaces públicos generados en la sesión
const receiptLinkCache = new Map<string, string>();

/**
 * Asegura la existencia de un enlace público seguro de 90 días en el servidor (/comprobante/:token).
 * Genera el PDF bajo demanda, valida su tamaño y lo sube al API si aún no existe.
 */
export async function ensureReceiptLink(
  sale: SaleResponse,
  businessInfo?: ReceiptBusinessInfo,
  cashierName?: string,
  options?: ReceiptPdfOptions,
): Promise<string> {
  const isVoided = Boolean(options?.isVoided || (sale as any).isVoided || sale.status === 'CANCELLED');
  if (isVoided) {
    throw new Error('No se puede generar un enlace público para un comprobante anulado.');
  }

  const cached = receiptLinkCache.get(sale.id);
  if (cached) {
    return cached;
  }

  // 1. Generar el documento PDF actual en el navegador
  const { blob } = await generateReceiptPdfBlob(sale, businessInfo, cashierName, options);

  // 2. Validar tamaño límite impuesto por el servidor (500 KB)
  const MAX_SIZE_BYTES = 500 * 1024;
  if (blob.size > MAX_SIZE_BYTES) {
    throw new Error(
      `El comprobante (${Math.round(blob.size / 1024)} KB) excede el tamaño máximo permitido de 500 KB.`
    );
  }

  // 3. Subir al API (el backend reutiliza enlace si ya existe o crea uno nuevo de 90 días)
  try {
    const res = await uploadPosReceiptPdf(sale.id, blob);
    if (!res?.url) {
      throw new Error('La respuesta del servidor no contiene una URL válida.');
    }
    receiptLinkCache.set(sale.id, res.url);
    return res.url;
  } catch (err: any) {
    const backendMsg = err.response?.data?.message || err.message;
    console.error('[ensureReceiptLink] Error al preparar enlace digital:', backendMsg);
    throw new Error(backendMsg || 'No se pudo conectar con el servidor para preparar el enlace.');
  }
}

/**
 * Arma el mensaje para WhatsApp con el enlace público real y el resumen corto de la compra.
 */
export function buildWhatsAppReceiptMessage(
  sale: SaleResponse,
  businessName: string,
  linkUrl: string,
): string {
  const name = businessName || 'NEXOL POS';
  const folio = sale.invoiceNumber || sale.id.slice(-6).toUpperCase();
  const total = formatCurrency(sale.total);

  let creditInfo = '';
  const creditAcc = (sale as any).creditAccount;
  if (sale.paymentMethod === 'CREDITO' || creditAcc) {
    creditInfo = ` · Modalidad: Crédito`;
    if (creditAcc?.balance != null) {
      creditInfo += ` (Saldo: ${formatCurrency(creditAcc.balance)})`;
    }
  }

  return (
    `¡Hola! Aquí tenés tu comprobante de compra de *${name}*:\n${linkUrl}\n\n` +
    `Comprobante: ${folio} · Total: ${total}${creditInfo}`
  );
}

/**
 * Genera la URL de wa.me. Si el teléfono es válido con código de país (o 8 dígitos locales de Nicaragua),
 * abre el chat directo; si no, abre el selector de contactos de WhatsApp.
 */
export function buildWhatsAppUrl(
  phone: string | null | undefined,
  message: string,
): string {
  const encodedText = encodeURIComponent(message);
  const cleanPhone = (phone || '').replace(/\D/g, '');

  if (cleanPhone) {
    if (cleanPhone.length === 8) {
      return `https://wa.me/505${cleanPhone}?text=${encodedText}`;
    }
    if (cleanPhone.length >= 10 && cleanPhone.length <= 15) {
      return `https://wa.me/${cleanPhone}?text=${encodedText}`;
    }
  }

  return `https://wa.me/?text=${encodedText}`;
}


// ============================================================================
// COMPROBANTE DE ABONO DE CRÉDITO
// ============================================================================

export interface CreditAbonoPrintData {
  paymentNumber?: string;
  invoiceNumber?: string;
  receivedAt: string;
  customerName: string;
  customerPhone?: string;
  amount: number;
  paymentMethod: string;
  notes?: string;
  previousBalance?: number;
  newBalance?: number;
  cashierName?: string;
  installmentsSummary?: string;
}

export async function generateAbonoReceiptPdfBlob(
  data: CreditAbonoPrintData,
  businessInfo?: ReceiptBusinessInfo,
): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 190],
  });

  const pageWidth = 80;
  const margin = 5;
  let cursorY = 8;

  const centerText = (text: string, size: number = 9, bold: boolean = false) => {
    doc.setFont('Helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.text(text, pageWidth / 2, cursorY, { align: 'center' });
    cursorY += size * 0.45;
  };

  const drawDivider = (dashed: boolean = false) => {
    cursorY += 1.5;
    if (dashed) {
      doc.setLineDashPattern([1.5, 1], 0);
    } else {
      doc.setLineDashPattern([], 0);
    }
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.2);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 3;
  };

  const drawRow = (left: string, right: string, bold: boolean = false, size: number = 8) => {
    doc.setFont('Helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.text(left, margin, cursorY);
    doc.text(right, pageWidth - margin, cursorY, { align: 'right' });
    cursorY += size * 0.45 + 1;
  };

  centerText(businessInfo?.name || 'NEXOL POS', 11, true);
  if (businessInfo?.address) centerText(businessInfo.address, 7);
  if (businessInfo?.phone) centerText(`Tel: ${businessInfo.phone}`, 7);
  cursorY += 2;

  centerText('RECIBO DE ABONO A CUENTA', 9.5, true);
  if (data.paymentNumber) centerText(`N° ${data.paymentNumber}`, 8.5, true);
  drawDivider();

  drawRow('Fecha:', formatManaguaDateTime(data.receivedAt));
  drawRow('Cliente:', data.customerName.substring(0, 24));
  if (data.invoiceNumber) drawRow('Factura crédito:', `#${data.invoiceNumber}`);
  drawRow('Método:', data.paymentMethod);
  drawRow('Cajero:', data.cashierName || 'Caja');
  if (data.notes) drawRow('Nota:', data.notes.substring(0, 30));
  drawDivider();

  drawRow('Monto abonado:', formatCurrency(data.amount), true, 10);
  if (data.previousBalance !== undefined && data.newBalance !== undefined) {
    drawRow('Saldo anterior:', formatCurrency(data.previousBalance));
    drawRow('Nuevo saldo:', formatCurrency(data.newBalance), true);
  }
  if (data.installmentsSummary) {
    drawRow('Detalle cuotas:', data.installmentsSummary.substring(0, 28));
  }
  drawDivider();

  cursorY += 8;
  doc.setLineWidth(0.3);
  doc.line(margin + 10, cursorY, pageWidth - margin - 10, cursorY);
  cursorY += 3.5;
  doc.setFontSize(7);
  doc.text('Firma de conformidad', pageWidth / 2, cursorY, { align: 'center' });

  cursorY += 6;
  centerText('¡Gracias por su puntual abono!', 7.5, false);

  return doc.output('blob');
}

export async function downloadAbonoReceiptPdf(
  data: CreditAbonoPrintData,
  businessInfo?: ReceiptBusinessInfo,
): Promise<void> {
  const blob = await generateAbonoReceiptPdfBlob(data, businessInfo);
  const fileName = `abono-${data.paymentNumber || Date.now()}.pdf`;
  downloadBlob(blob, fileName);
}

export async function shareOrFallbackAbonoReceipt(
  data: CreditAbonoPrintData,
  businessInfo?: ReceiptBusinessInfo,
): Promise<{ shared: boolean; downloaded: boolean; error?: string }> {
  try {
    const blob = await generateAbonoReceiptPdfBlob(data, businessInfo);
    const fileName = `abono-${data.paymentNumber || Date.now()}.pdf`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        const file = new File([blob], fileName, { type: 'application/pdf' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Abono de Crédito ${data.paymentNumber || ''}`,
            text: `Recibo de abono - Cliente: ${data.customerName} - Monto: ${formatCurrency(data.amount)}`,
          });
          return { shared: true, downloaded: false };
        }
      } catch (shareErr: any) {
        if (shareErr.name === 'AbortError') return { shared: true, downloaded: false };
      }
    }
    downloadBlob(blob, fileName);
    return { shared: false, downloaded: true };
  } catch (err: any) {
    return { shared: false, downloaded: false, error: err.message };
  }
}

export function getWhatsAppAbonoSummaryUrl(
  data: CreditAbonoPrintData,
  businessName?: string,
  customerPhone?: string | null,
): string {
  const name = businessName || 'NEXOL POS';
  let balanceInfo = '';
  if (data.newBalance !== undefined) {
    balanceInfo = `\n💰 *Nuevo saldo pendiente:* ${formatCurrency(data.newBalance)}`;
  }
  const text = `¡Hola ${data.customerName}! Registramos tu abono en *${name}*:\n\n💵 *Monto abonado:* ${formatCurrency(data.amount)}\n💳 *Método de pago:* ${data.paymentMethod}${data.invoiceNumber ? `\n📄 *Comprobante de crédito:* #${data.invoiceNumber}` : ''}${balanceInfo}\n\n¡Gracias por tu pago puntual!`;
  const rawPhone = (customerPhone || data.customerPhone || '').replace(/\D/g, '');
  if (rawPhone) {
    const fullPhone = rawPhone.length === 8 ? `505${rawPhone}` : rawPhone;
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
  }
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export interface ShiftClosePrintData {
  shiftId: string;
  cashierName?: string | null;
  openedAt: string;
  closedAt: string;
  openingCash: number;
  totalSales?: number;
  cashSales?: number;
  cardSales?: number;
  transferSales?: number;
  creditSales?: number;
  movementsIn?: number;
  movementsOut?: number;
  expectedCash: number;
  closingCash: number;
  difference: number;
  closingCashUsd?: number | null;
  differenceUsd?: number | null;
  notes?: string | null;
  discrepancyReason?: string | null;
  discrepancyNote?: string | null;
  authorizedByName?: string | null;
}

/**
 * Genera el PDF del comprobante de cierre de turno (formato ticket 80mm)
 */
export async function generateShiftClosePdfBlob(
  data: ShiftClosePrintData,
  businessInfo?: ReceiptBusinessInfo,
): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 200],
  });

  const pageWidth = 80;
  const margin = 5;
  let cursorY = 8;

  const centerText = (text: string, size: number = 9, bold: boolean = false) => {
    doc.setFont('Helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.text(text, pageWidth / 2, cursorY, { align: 'center' });
    cursorY += size * 0.45;
  };

  const drawDivider = (dashed: boolean = false) => {
    cursorY += 1.5;
    if (dashed) {
      doc.setLineDashPattern([1.5, 1], 0);
    } else {
      doc.setLineDashPattern([], 0);
    }
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.2);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 3;
    doc.setLineDashPattern([], 0);
  };

  const drawRow = (label: string, value: string, bold: boolean = false, size: number = 8) => {
    doc.setFont('Helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.text(label, margin, cursorY);
    doc.text(value, pageWidth - margin, cursorY, { align: 'right' });
    cursorY += size * 0.45;
  };

  // 1. Encabezado del negocio
  centerText(businessInfo?.name || 'NEXOL POS', 11, true);
  if (businessInfo?.taxId) {
    centerText(`RUC: ${businessInfo.taxId}`, 8, false);
  }
  if (businessInfo?.address) {
    centerText(businessInfo.address.substring(0, 45), 7.5, false);
  }
  if (businessInfo?.phone) {
    centerText(`Tel: ${businessInfo.phone}`, 7.5, false);
  }

  drawDivider();

  // 2. Título del Comprobante
  centerText('COMPROBANTE DE CIERRE DE CAJA', 9, true);
  centerText(`Turno: #${data.shiftId.slice(-8).toUpperCase()}`, 8, false);
  drawDivider(true);

  // 3. Información del Turno
  drawRow('Cajero:', data.cashierName || 'Cajero', true);
  drawRow('Apertura:', formatManaguaDateTime(data.openedAt), false);
  drawRow('Cierre:', formatManaguaDateTime(data.closedAt), false);

  drawDivider();

  // 4. Detalle de Efectivo
  centerText('ARQUEO DE EFECTIVO', 8.5, true);
  cursorY += 1;
  drawRow('Monto inicial:', formatCurrency(data.openingCash));
  if (data.cashSales !== undefined) {
    drawRow('Ventas en efectivo (+):', formatCurrency(data.cashSales));
  }
  if (data.movementsIn) {
    drawRow('Entradas de caja (+):', formatCurrency(data.movementsIn));
  }
  if (data.movementsOut) {
    drawRow('Salidas de caja (-):', formatCurrency(data.movementsOut));
  }
  drawDivider(true);

  drawRow('Efectivo esperado:', formatCurrency(data.expectedCash), true, 8.5);
  drawRow('Efectivo contado:', formatCurrency(data.closingCash), true, 8.5);

  const isExact = Math.abs(data.difference) < 0.01;
  const isShort = data.difference < -0.01;
  const diffLabel = isExact ? 'Diferencia (Cuadre exacto):' : isShort ? 'Faltante:' : 'Sobrante:';
  drawRow(diffLabel, formatCurrency(data.difference), true, 9);

  if (data.closingCashUsd != null && data.closingCashUsd > 0) {
    cursorY += 1;
    drawRow('Efectivo contado US$:', `$${Number(data.closingCashUsd).toFixed(2)}`, true);
  }

  // 5. Otros medios de pago si existen
  if ((data.cardSales && data.cardSales > 0) || (data.transferSales && data.transferSales > 0) || (data.creditSales && data.creditSales > 0)) {
    drawDivider();
    centerText('OTROS MEDIOS DE PAGO', 8.5, true);
    cursorY += 1;
    if (data.cardSales) drawRow('Ventas con tarjeta:', formatCurrency(data.cardSales));
    if (data.transferSales) drawRow('Ventas transferencia:', formatCurrency(data.transferSales));
    if (data.creditSales) drawRow('Ventas al crédito:', formatCurrency(data.creditSales));
    if (data.totalSales) {
      drawDivider(true);
      drawRow('Total ventas turno:', formatCurrency(data.totalSales), true, 9);
    }
  }

  // 6. Descuadre y autorización
  if (!isExact && (data.discrepancyReason || data.discrepancyNote || data.notes)) {
    drawDivider();
    centerText('DETALLE DE DESCUADRE', 8.5, true);
    cursorY += 1;
    if (data.discrepancyReason) {
      drawRow('Motivo:', data.discrepancyReason.replace(/_/g, ' '));
    }
    const note = data.discrepancyNote || data.notes;
    if (note) {
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(`Nota: ${note.substring(0, 70)}`, margin, cursorY);
      cursorY += 4;
    }
    if (data.authorizedByName) {
      drawRow('Autorizado por:', data.authorizedByName, true);
    }
  }

  // 7. Firmas
  cursorY += 10;
  doc.setLineWidth(0.3);
  doc.line(margin + 5, cursorY, margin + 30, cursorY);
  doc.line(pageWidth - margin - 30, cursorY, pageWidth - margin - 5, cursorY);
  cursorY += 3.5;
  doc.setFontSize(7);
  doc.text('Firma Cajero', margin + 17, cursorY, { align: 'center' });
  doc.text('Firma Encargado', pageWidth - margin - 17, cursorY, { align: 'center' });

  cursorY += 6;
  centerText('NEXOL POS · Control y Auditoría', 7, false);

  return doc.output('blob');
}

/**
 * Descarga directamente el PDF del cierre de turno
 */
export async function downloadShiftClosePdf(
  data: ShiftClosePrintData,
  businessInfo?: ReceiptBusinessInfo,
): Promise<void> {
  const blob = await generateShiftClosePdfBlob(data, businessInfo);
  const fileName = `cierre-caja-${data.shiftId.slice(-6)}-${Date.now()}.pdf`;
  downloadBlob(blob, fileName);
}

// ============================================================================
// COMPROBANTE DE DEVOLUCIÓN DE VENTA
// ============================================================================

export interface SaleReturnPrintData {
  returnNumber: string;
  invoiceNumber: string;
  createdAt: string;
  reason: string;
  refundMethod: string;
  refundAmount: number;
  taxRefunded?: number;
  cashierName?: string;
  approvedByName?: string;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    refundAmount: number;
  }>;
}

export async function generateReturnReceiptPdfBlob(
  data: SaleReturnPrintData,
  businessInfo?: ReceiptBusinessInfo,
): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 200],
  });

  const pageWidth = 80;
  const margin = 5;
  let cursorY = 8;

  const centerText = (text: string, size: number = 9, bold: boolean = false) => {
    doc.setFont('Helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.text(text, pageWidth / 2, cursorY, { align: 'center' });
    cursorY += size * 0.45;
  };

  const drawDivider = (dashed: boolean = false) => {
    cursorY += 1.5;
    if (dashed) {
      doc.setLineDashPattern([1.5, 1], 0);
    } else {
      doc.setLineDashPattern([], 0);
    }
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.2);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 3;
  };

  const drawRow = (left: string, right: string, bold: boolean = false, size: number = 8) => {
    doc.setFont('Helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.text(left, margin, cursorY);
    doc.text(right, pageWidth - margin, cursorY, { align: 'right' });
    cursorY += size * 0.45 + 1;
  };

  centerText(businessInfo?.name || 'NEXOL POS', 11, true);
  if (businessInfo?.address) centerText(businessInfo.address, 7);
  if (businessInfo?.phone) centerText(`Tel: ${businessInfo.phone}`, 7);
  cursorY += 2;

  centerText('COMPROBANTE DE DEVOLUCIÓN', 9.5, true);
  centerText(`N° ${data.returnNumber}`, 8.5, true);
  drawDivider();

  drawRow('Fecha:', formatManaguaDateTime(data.createdAt));
  drawRow('Factura origen:', `#${data.invoiceNumber}`);
  drawRow('Cajero:', data.cashierName || 'Caja');
  if (data.approvedByName) {
    drawRow('Aprobado por:', data.approvedByName);
  }
  drawRow('Método reembolso:', data.refundMethod);
  drawRow('Motivo:', data.reason.substring(0, 35));
  drawDivider();

  centerText('ARTÍCULOS DEVUELTOS', 8, true);
  cursorY += 1;
  for (const it of data.items) {
    drawRow(`${it.quantity}x ${it.productName.substring(0, 24)}`, formatCurrency(it.refundAmount));
  }
  drawDivider(true);

  drawRow('Total reembolsado:', formatCurrency(data.refundAmount), true, 10);
  drawDivider();

  cursorY += 8;
  doc.setLineWidth(0.3);
  doc.line(margin + 10, cursorY, pageWidth - margin - 10, cursorY);
  cursorY += 3.5;
  doc.setFontSize(7);
  doc.text('Firma de conformidad del cliente', pageWidth / 2, cursorY, { align: 'center' });

  cursorY += 6;
  centerText('NEXOL POS — Control y Auditoría', 7, false);

  return doc.output('blob');
}

export async function downloadReturnReceiptPdf(
  data: SaleReturnPrintData,
  businessInfo?: ReceiptBusinessInfo,
): Promise<void> {
  const blob = await generateReturnReceiptPdfBlob(data, businessInfo);
  const fileName = `devolucion-${data.returnNumber}-${Date.now()}.pdf`;
  downloadBlob(blob, fileName);
}

export async function shareOrFallbackReturnReceipt(
  data: SaleReturnPrintData,
  businessInfo?: ReceiptBusinessInfo,
): Promise<{ shared: boolean; downloaded: boolean; error?: string }> {
  try {
    const blob = await generateReturnReceiptPdfBlob(data, businessInfo);
    const fileName = `devolucion-${data.returnNumber}.pdf`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        const file = new File([blob], fileName, { type: 'application/pdf' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Devolución ${data.returnNumber}`,
            text: `Comprobante de devolución ${data.returnNumber} - Factura #${data.invoiceNumber}`,
          });
          return { shared: true, downloaded: false };
        }
      } catch (shareErr: any) {
        if (shareErr.name === 'AbortError') return { shared: true, downloaded: false };
      }
    }
    downloadBlob(blob, fileName);
    return { shared: false, downloaded: true };
  } catch (err: any) {
    return { shared: false, downloaded: false, error: err.message };
  }
}

export function getWhatsAppReturnSummaryUrl(
  data: SaleReturnPrintData,
  businessName?: string,
  customerPhone?: string | null,
): string {
  const name = businessName || 'NEXOL POS';
  const text = `¡Hola! Aquí tienes el comprobante de tu devolución en *${name}*:\n\n📄 *Comprobante de Devolución:* ${data.returnNumber}\n📄 *Factura origen:* #${data.invoiceNumber}\n💰 *Monto reembolsado:* ${formatCurrency(data.refundAmount)}\n💳 *Método:* ${data.refundMethod}\n📝 *Motivo:* ${data.reason}\n\n¡Gracias por tu preferencia!`;
  const rawPhone = (customerPhone || '').replace(/\D/g, '');
  if (rawPhone) {
    const fullPhone = rawPhone.length === 8 ? `505${rawPhone}` : rawPhone;
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
  }
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

