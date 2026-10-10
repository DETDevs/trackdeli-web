import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';
import { type SaleResponse } from 'api-client';
import { formatCurrency } from './formatters';
import { formatManaguaDateTime } from './dateManagua';
import { numberToWordsCordobas } from './numberToWordsCordobas';

export interface ReceiptBusinessInfo {
  name?: string;
  phone?: string | null;
  address?: string | null;
  taxId?: string | null;
  logoUrl?: string | null;
}

/**
 * Carga una imagen remota y la convierte en Data URL base64 usando un canvas.
 * Si falla o tarda más de 1.5s, retorna null de forma segura.
 */
async function loadImageAsDataUrl(url?: string | null): Promise<string | null> {
  if (!url || typeof document === 'undefined') return null;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';

    const timer = setTimeout(() => {
      resolve(null);
    }, 1500);

    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 120;
        canvas.height = img.naturalHeight || 120;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };

    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };

    img.src = url;
  });
}

/**
 * Genera el código de barras CODE128 en un canvas y lo exporta como PNG base64.
 */
function generateBarcodeDataUrl(text: string): string | null {
  try {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, text, {
      format: 'CODE128',
      width: 2,
      height: 40,
      displayValue: false,
      margin: 0,
      background: '#ffffff',
      lineColor: '#000000',
    });
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.warn('[receiptPdf] Error generando código de barras:', err);
    return null;
  }
}

/**
 * Dibuja una línea punteada/discontinua horizontal en el recibo
 */
function drawDashedLine(doc: jsPDF, y: number) {
  doc.setDrawColor(140, 140, 140);
  doc.setLineWidth(0.2);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(4, y, 76, y);
  doc.setLineDashPattern([], 0);
}

/**
 * Dibuja una línea continua horizontal delgada
 */
function drawSolidLine(doc: jsPDF, y: number, color = 80, width = 0.25) {
  doc.setDrawColor(color, color, color);
  doc.setLineWidth(width);
  doc.line(4, y, 76, y);
}

/**
 * Calcula con precisión la altura requerida del ticket en mm
 */
function calculateReceiptHeight(
  sale: SaleResponse,
  business: ReceiptBusinessInfo,
  hasLogo: boolean,
  measureDoc: jsPDF,
): number {
  let y = 6;

  // 1. Logo
  if (hasLogo) {
    y += 15;
  }

  // 2. Encabezado del negocio
  y += 5; // Nombre
  if (business.address) {
    const lines = measureDoc.splitTextToSize(business.address, 72);
    y += lines.length * 3.2;
  }
  if (business.phone) y += 3.2;
  if (business.taxId) y += 3.2;
  y += 3.5; // Línea divisoria

  // 3. Título del documento (mismo que el desktop)
  y += 4;

  // 4. Metadatos de la venta
  y += 4.5; // Factura
  y += 3.5; // Fecha
  y += 3.5; // Cajero
  if (sale.customerName) y += 3.5;
  if (sale.customerPhone) y += 3.2;
  y += 3.5; // Línea divisoria

  // 5. Cabecera de la tabla
  y += 4.5;
  y += 2.5; // Línea sólida

  // 6. Renglones de productos
  const items = sale.items || [];
  for (const item of items) {
    const name = item.productName || item.name || item.product?.name || 'Producto';
    const lines = measureDoc.splitTextToSize(name, 38);
    const itemHeight = Math.max(lines.length * 3.3, 4);
    const hasMultiple = (item.quantity || 1) > 1;
    y += itemHeight + (hasMultiple ? 3 : 1);
  }
  y += 3; // Línea sólida

  // 7. Totales
  y += 4; // Subtotal
  if (sale.discountAmount && sale.discountAmount > 0) y += 3.8;
  if (sale.taxAmount && sale.taxAmount > 0) y += 3.8;
  y += 5.5; // Total
  y += 3.5; // Línea divisoria

  // 8. Total en letras
  const totalWords = numberToWordsCordobas(sale.total);
  const wordLines = measureDoc.splitTextToSize(totalWords, 72);
  y += wordLines.length * 3.2 + 1;
  y += 3.5; // Línea divisoria

  // 9. Pagos
  y += 4; // Encabezado métodos
  if (sale.payments && sale.payments.length > 0) {
    for (const p of sale.payments) {
      y += 3.8;
      if (p.method === 'EFECTIVO' && p.amountTendered && p.amountTendered > p.amount) {
        y += 3.2;
      }
      if (p.reference) y += 3.2;
    }
    if (sale.change && sale.change > 0) y += 3.8;
  } else {
    y += 3.8;
    if (sale.paymentMethod === 'EFECTIVO' && sale.amountPaid) y += 3.2;
    if (sale.change && sale.change > 0) y += 3.8;
    if ((sale as any).reference) y += 3.2;
  }
  y += 3.5; // Línea divisoria

  // 10. Código de barras
  y += 16;
  y += 3.5; // Línea divisoria

  // 11. Pie de página
  y += 4; // Gracias
  y += 3.5; // NEXOL POS
  y += 6; // Margen inferior

  return Math.ceil(Math.max(130, y));
}

/**
 * Genera el documento PDF del recibo vertical de 80 mm en el navegador
 */
export async function generateReceiptPdfBlob(
  sale: SaleResponse,
  businessInfo?: ReceiptBusinessInfo,
  cashierName?: string,
): Promise<{ blob: Blob; fileName: string; doc: jsPDF }> {
  const business: ReceiptBusinessInfo = {
    name: businessInfo?.name || sale.business?.name || 'NEXOL POS',
    address: businessInfo?.address || sale.business?.address || null,
    phone: businessInfo?.phone || sale.business?.phone || null,
    taxId: businessInfo?.taxId || sale.business?.taxId || null,
    logoUrl: businessInfo?.logoUrl || sale.business?.logoUrl || null,
  };

  const cashier = cashierName || sale.cashier?.name || 'Cajero';
  const invoiceNum = sale.invoiceNumber || sale.id.slice(-6).toUpperCase();
  const fileName = `recibo-${invoiceNum}.pdf`;

  // Cargar logo si existe (en segundo plano con timeout)
  const logoDataUrl = await loadImageAsDataUrl(business.logoUrl);
  const barcodeDataUrl = generateBarcodeDataUrl(invoiceNum);

  // Documento borrador para medir dimensiones de texto
  const tempDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 250] });
  tempDoc.setFont('helvetica', 'normal');
  tempDoc.setFontSize(8);

  const totalHeight = calculateReceiptHeight(sale, business, Boolean(logoDataUrl), tempDoc);

  // Documento final con alto dinámico
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, totalHeight],
  });

  let y = 6;

  // 1. Logo
  if (logoDataUrl) {
    try {
      const logoWidth = 22;
      const logoHeight = 12;
      const logoX = (80 - logoWidth) / 2;
      doc.addImage(logoDataUrl, 'PNG', logoX, y, logoWidth, logoHeight);
      y += logoHeight + 2;
    } catch {
      // Si falla la inserción de imagen, continuar sin interrumpir
    }
  }

  // 2. Encabezado del negocio (centrado)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(20, 20, 20);
  doc.text((business.name || 'NEXOL POS').toUpperCase(), 40, y, { align: 'center' });
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(70, 70, 70);

  if (business.address) {
    const addressLines = doc.splitTextToSize(business.address, 72);
    doc.text(addressLines, 40, y, { align: 'center' });
    y += addressLines.length * 3.2;
  }

  if (business.phone) {
    doc.text(`Tel: ${business.phone}`, 40, y, { align: 'center' });
    y += 3.2;
  }

  if (business.taxId) {
    doc.text(`RUC/NIT: ${business.taxId}`, 40, y, { align: 'center' });
    y += 3.2;
  }

  y += 1;
  drawDashedLine(doc, y);
  y += 3.5;

  // 3. Título del documento (mismo texto que desktop)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(40, 40, 40);
  doc.text('*** ORIGINAL - CLIENTE ***', 40, y, { align: 'center' });
  y += 4;

  // 4. Metadatos de la venta
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 30, 30);

  // Número de factura destacado
  doc.setFont('helvetica', 'bold');
  doc.text('Factura:', 4, y);
  doc.text(invoiceNum, 76, y, { align: 'right' });
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.text('Fecha:', 4, y);
  doc.text(formatManaguaDateTime(sale.createdAt || new Date()), 76, y, { align: 'right' });
  y += 3.5;

  doc.text('Cajero:', 4, y);
  doc.text(cashier, 76, y, { align: 'right' });
  y += 3.5;

  if (sale.customerName) {
    doc.text('Cliente:', 4, y);
    doc.text(sale.customerName, 76, y, { align: 'right' });
    y += 3.5;
  }

  if (sale.customerPhone) {
    doc.text('Teléfono:', 4, y);
    doc.text(sale.customerPhone, 76, y, { align: 'right' });
    y += 3.2;
  }

  y += 1;
  drawDashedLine(doc, y);
  y += 3.5;

  // 5. Tabla de renglones
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(50, 50, 50);
  doc.text('Cant', 4, y);
  doc.text('Descripción', 16, y);
  doc.text('Total', 76, y, { align: 'right' });
  y += 2.5;

  drawSolidLine(doc, y, 100, 0.2);
  y += 3.2;

  // Renglones
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(20, 20, 20);

  const items = sale.items || [];
  for (const item of items) {
    const qty = Number(item.quantity || 1);
    const unitPrice = Number(item.unitPrice || 0);
    const itemTotal = Number(item.subtotal ?? qty * unitPrice);
    const name = item.productName || item.name || item.product?.name || 'Producto';
    const unit = item.unit && item.unit.toUpperCase() !== 'UND' ? ` ${item.unit}` : '';

    const nameLines = doc.splitTextToSize(name, 38);

    // Cantidad a la izquierda
    doc.text(`${qty}${unit}`, 4, y);

    // Nombre en renglón(es)
    doc.text(nameLines, 16, y);

    // Total de línea alineado a la derecha en la primera línea
    doc.text(formatCurrency(itemTotal), 76, y, { align: 'right' });

    y += nameLines.length * 3.3;

    // Si la cantidad es > 1, mostrar precio unitario abajo
    if (qty > 1) {
      doc.setFontSize(6.5);
      doc.setTextColor(100, 100, 100);
      doc.text(`@ ${formatCurrency(unitPrice)}`, 16, y);
      doc.setFontSize(7.5);
      doc.setTextColor(20, 20, 20);
      y += 3;
    }
    y += 0.8;
  }

  drawSolidLine(doc, y, 100, 0.2);
  y += 3.5;

  // 6. Subtotal, Descuento, Impuesto, Total
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(50, 50, 50);

  doc.text('Subtotal:', 4, y);
  doc.text(formatCurrency(sale.subtotal), 76, y, { align: 'right' });
  y += 3.5;

  if (sale.discountAmount && sale.discountAmount > 0) {
    doc.setTextColor(180, 40, 40);
    doc.text('Descuento:', 4, y);
    doc.text(`-${formatCurrency(sale.discountAmount)}`, 76, y, { align: 'right' });
    doc.setTextColor(50, 50, 50);
    y += 3.5;
  }

  if (sale.taxAmount && sale.taxAmount > 0) {
    doc.text('IVA (15%):', 4, y);
    doc.text(formatCurrency(sale.taxAmount), 76, y, { align: 'right' });
    y += 3.5;
  }

  // TOTAL destacado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(10, 10, 10);
  doc.text('TOTAL:', 4, y);
  doc.text(formatCurrency(sale.total), 76, y, { align: 'right' });
  y += 4;

  drawDashedLine(doc, y);
  y += 3.5;

  // 7. Total en letras
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(60, 60, 60);
  const totalInWords = numberToWordsCordobas(sale.total);
  const wordLines = doc.splitTextToSize(totalInWords, 72);
  doc.text(wordLines, 4, y);
  y += wordLines.length * 3.2 + 1;

  drawDashedLine(doc, y);
  y += 3.5;

  // 8. Método(s) de pago
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(40, 40, 40);
  doc.text('MÉTODOS DE PAGO:', 4, y);
  y += 3.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  const methodNames: Record<string, string> = {
    EFECTIVO: 'Efectivo',
    TARJETA: 'Tarjeta',
    TRANSFERENCIA: 'Transferencia',
  };

  if (sale.payments && sale.payments.length > 0) {
    for (const p of sale.payments) {
      const label = methodNames[p.method] || p.method;
      doc.text(`- ${label}:`, 6, y);
      doc.text(formatCurrency(p.amount), 76, y, { align: 'right' });
      y += 3.3;

      if (p.method === 'EFECTIVO' && p.amountTendered && p.amountTendered > p.amount) {
        doc.setFontSize(6.8);
        doc.setTextColor(90, 90, 90);
        doc.text(`  Recibido: ${formatCurrency(p.amountTendered)}`, 6, y);
        doc.setFontSize(7.5);
        doc.setTextColor(20, 20, 20);
        y += 3.2;
      }

      if (p.reference) {
        doc.setFontSize(6.8);
        doc.setTextColor(90, 90, 90);
        doc.text(`  Ref: ${p.reference}`, 6, y);
        doc.setFontSize(7.5);
        doc.setTextColor(20, 20, 20);
        y += 3.2;
      }
    }

    if (sale.change && sale.change > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Cambio / Vuelto:', 6, y);
      doc.text(formatCurrency(sale.change), 76, y, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      y += 3.5;
    }
  } else {
    const label = methodNames[sale.paymentMethod] || sale.paymentMethod || 'Efectivo';
    doc.text(`- ${label}:`, 6, y);
    doc.text(formatCurrency(sale.total), 76, y, { align: 'right' });
    y += 3.3;

    if (sale.paymentMethod === 'EFECTIVO' && sale.amountPaid && sale.amountPaid > sale.total) {
      doc.setFontSize(6.8);
      doc.setTextColor(90, 90, 90);
      doc.text(`  Recibido: ${formatCurrency(sale.amountPaid)}`, 6, y);
      doc.setFontSize(7.5);
      doc.setTextColor(20, 20, 20);
      y += 3.2;
    }

    if (sale.change && sale.change > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Cambio / Vuelto:', 6, y);
      doc.text(formatCurrency(sale.change), 76, y, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      y += 3.5;
    }
  }

  y += 1;
  drawDashedLine(doc, y);
  y += 3.5;

  // 9. Código de barras del número de factura
  if (barcodeDataUrl) {
    try {
      const barcodeWidth = 44;
      const barcodeHeight = 10;
      const barcodeX = (80 - barcodeWidth) / 2;
      doc.addImage(barcodeDataUrl, 'PNG', barcodeX, y, barcodeWidth, barcodeHeight);
      y += barcodeHeight + 1.5;
    } catch {
      // Ignorar si falla la imagen
    }
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(50, 50, 50);
  doc.text(`* ${invoiceNum} *`, 40, y, { align: 'center' });
  y += 4;

  drawDashedLine(doc, y);
  y += 3.5;

  // 10. Pie de página
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(40, 40, 40);
  doc.text('¡Gracias por su compra!', 40, y, { align: 'center' });
  y += 3.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('NEXOL POS — nexol.com.ni', 40, y, { align: 'center' });

  // Convertir a blob
  const pdfBlob = doc.output('blob');
  return { blob: pdfBlob, fileName, doc };
}

/**
 * Descarga directamente el recibo en PDF en el navegador y libera la memoria
 */
export async function downloadReceiptPdf(
  sale: SaleResponse,
  businessInfo?: ReceiptBusinessInfo,
  cashierName?: string,
): Promise<void> {
  const { blob, fileName } = await generateReceiptPdfBlob(sale, businessInfo, cashierName);
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
): Promise<{ shared: boolean; downloaded: boolean; error?: string }> {
  try {
    const { blob, fileName } = await generateReceiptPdfBlob(sale, businessInfo, cashierName);

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

  const text = `¡Hola! Aquí tienes el resumen de tu compra en *${name}*:\n\n📄 *Comprobante:* ${invoice}\n💰 *Total:* ${total}\n\n¡Gracias por su compra!`;

  if (rawPhone) {
    const fullPhone = rawPhone.length === 8 ? `505${rawPhone}` : rawPhone;
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
  }

  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
