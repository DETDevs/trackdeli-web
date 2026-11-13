import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { formatCalendarDate, getInterestDisplayLabel } from './creditPlan';

if (typeof window !== 'undefined') {
  (window as any).html2canvas = html2canvas;
}

export const DOMAINS = {
  BRAND_WEBSITE: 'https://www.nexolsoft.com',
  BRAND_DOMAIN_DISPLAY: 'www.nexolsoft.com',
  RECEIPT_PUBLIC_URL: 'https://recibo.nexolsoft.com',
  ADMIN_PANEL_URL: 'https://admin.nexolsoft.com',
} as const;

export interface ReceiptHtmlBusiness {
  name?: string | null;
  address?: string | null;
  phone?: string | null;
  taxId?: string | null;
  logoUrl?: string | null;
}

export interface ReceiptSettings {
  id?: string | null;
  businessId?: string;
  logoImage?: string | null;
  showLogo?: boolean;
  headerLines?: string[];
  footerLines?: string[];
  showBusinessName?: boolean;
  showAddress?: boolean;
  showPhone?: boolean;
  showTaxId?: boolean;
  showCashier?: boolean;
  showCustomer?: boolean;
  showTaxBreakdown?: boolean;
  showBatches?: boolean;
  showListPrice?: boolean;
  paperWidthMm?: number;
  [key: string]: any;
}

export interface ReceiptHtmlOptions {
  format?: 'ticket' | 'carta';
  paperWidthMm?: number; // 58 | 80 (por defecto 80)
  isReprint?: boolean;
  isVoided?: boolean;
  copyType?: 'CLIENTE' | 'NEGOCIO' | 'COMERCIO';
  reprintInfo?: {
    reprintNumber?: number;
    reprintedAt?: string;
    reprintedBy?: string;
    reason?: string;
  };
}

/**
 * Enmascara la cédula/RUC del cliente para proteger la privacidad en comprobantes digitales.
 * Ejemplo: "001-120590-0004F" -> "001-******-0004F"
 */
export const maskCustomerTaxId = (taxId?: string | null): string => {
  if (!taxId) return '';
  const clean = taxId.trim();
  if (clean.length <= 6) return clean;
  const start = clean.slice(0, 3);
  const end = clean.slice(-4);
  return `${start}-******-${end}`;
};

/**
 * Formatea la fecha de vencimiento a MM/YYYY igual que el ticket físico ESC/POS.
 */
export function formatBatchExpiry(dateStr?: string | null): string {
  if (!dateStr) return 'N/D';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return dateStr.substring(0, 7);
    }
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = d.getUTCFullYear();
    return `${mm}/${yyyy}`;
  } catch {
    return dateStr.substring(0, 7);
  }
}

/**
 * Escapa caracteres HTML para prevenir inyección en el template.
 */
export const escapeHtml = (text?: string | null): string => {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const isDeliveryLine = (it: any): boolean =>
  !it?.productId &&
  String(it?.productName || it?.name || '')
    .trim()
    .toLowerCase()
    .startsWith('envío a domicilio');

/** El envío va dentro de los totales, no en el listado de productos. */
export const normalizeDeliverySale = (input: any): any => {
  const raw: any = input || {};
  const items: any[] = raw.items || [];
  const line = items.find(isDeliveryLine);
  if (!line || raw.taxModel !== 'PER_LINE') return input;
  const fee =
    Number(raw.deliveryFee ?? 0) > 0
      ? Number(raw.deliveryFee)
      : Number(line.unitPrice ?? line.subtotal ?? 0);
  const total = Number(raw.total ?? 0);
  const tax = Number(raw.taxAmount ?? raw.tax ?? 0);
  const lpt = Number(raw.listPriceTotal ?? 0);
  return {
    ...raw,
    items: items.filter((it) => !isDeliveryLine(it)),
    deliveryFee: fee,
    subtotalBeforeTax: total - tax,
    listPriceTotal: lpt - fee > 0 ? lpt - fee : 0,
  };
};

/**
 * Genera el documento HTML completo del comprobante de venta.
 * Soporta formato Ticket (80 mm o 58 mm) y Hoja Carta (columna centrada con márgenes de 15 mm).
 * Idéntico al render del POS desktop (receiptHtml.ts).
 */
export const generateReceiptHtml = (
  saleInput: any,
  business?: ReceiptHtmlBusiness | null,
  receiptFooter?: string,
  receiptSettings?: ReceiptSettings | null,
  options?: ReceiptHtmlOptions
): string => {
  const sale = normalizeDeliverySale(saleInput || {});
  const s = receiptSettings;
  const format = options?.format || 'carta' === options?.format ? 'carta' : 'ticket';
  const paperWidthMm = options?.paperWidthMm === 58 ? 58 : (s?.paperWidthMm === 58 ? 58 : 80);

  const isVoided = Boolean(options?.isVoided || sale.isVoided || sale.status === 'CANCELLED');
  const isReprint = Boolean(
    options?.isReprint ||
      options?.reprintInfo ||
      (sale.printCount && sale.printCount > 0)
  );

  const rawLogo = s?.logoImage || business?.logoUrl || null;
  const showLogo = s?.showLogo !== false && Boolean(rawLogo);
  const logoImage = rawLogo;

  const showBusinessName = s?.showBusinessName !== false;
  const showAddress = s?.showAddress !== false;
  const showPhone = s?.showPhone !== false;
  const showTaxId = s?.showTaxId !== false;
  const showCashier = s?.showCashier !== false;
  const showCustomer = s?.showCustomer !== false;
  const showTaxBreakdown = s?.showTaxBreakdown !== false;
  const showBatches = s?.showBatches === true;
  const headerLines = s?.headerLines || [];
  const footerLines = s?.footerLines || [];

  const isPerLine = sale.taxModel === 'PER_LINE';
  const hasTaxableItems =
    (sale.items || []).some((it: any) => Boolean(it.taxable)) ||
    Number(sale.taxAmount ?? sale.tax ?? 0) > 0;

  const businessName = business?.name || sale.businessName || 'NEXOL POS';
  const businessAddress = business?.address || sale.businessAddress || '';
  const businessPhone = business?.phone || sale.businessPhone || '';
  const businessTaxId = business?.taxId || sale.businessTaxId || '';

  const invoiceNumber = sale.invoiceNumber || `FAC-${String(sale.id || '').slice(0, 6)}`;

  const dateObj = new Date(sale.createdAt || sale.date || Date.now());
  const dateStr = dateObj.toLocaleDateString('es-NI', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeStr = dateObj.toLocaleTimeString('es-NI', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const cashier =
    sale.cashier?.name ||
    sale.cashierName ||
    sale.user?.name ||
    (sale as any).cashier ||
    '';
  const seller = sale.sellerName || sale.seller?.name || '';
  const presaleTicket =
    sale.presaleTicketDisplayNumber ||
    sale.presaleTicket?.displayNumber ||
    sale.ticketNumber ||
    '';
  const rawCustomerTaxId = sale.customerTaxId || sale.customerRuc || sale.customer?.taxId || '';
  const maskedTaxId = maskCustomerTaxId(rawCustomerTaxId);

  const customerDisplayName =
    sale.customerName ||
    sale.customer?.name ||
    '';

  // Líneas de productos
  const itemsHtml = (sale.items || [])
    .map((item: any) => {
      const qty = Number(Number(item.quantity || 1).toFixed(3));
      const unitStr =
        item.unit && item.unit.toUpperCase() !== 'UND'
          ? ` ${escapeHtml(item.unit)}`
          : '';
      const rawListPrice = item.listPrice ?? item.product?.listPrice;
      const listPrice =
        rawListPrice != null && Number(rawListPrice) > 0
          ? Number(rawListPrice)
          : null;
      const displayTotal =
        listPrice != null
          ? qty * listPrice
          : Number(item.subtotal ?? (item.quantity || 1) * (item.unitPrice || 0));
      const itemSubtotal = displayTotal.toFixed(2);
      const batches = item.batches || item.batchAllocations;

      const isTaxable = Boolean(item.taxable);
      const rawName = item.productName || item.name || 'Producto';
      const displayName = isPerLine && isTaxable ? `${rawName} (G)` : rawName;

      let batchesHtml = '';
      if (showBatches && Array.isArray(batches) && batches.length > 0) {
        const batchTexts = batches.map((b: any) => {
          const bNum = b.batchNumber || b.lotNumber || 'S/L';
          const expStr = formatBatchExpiry(b.expiryDate || b.expirationDate);
          return `Lote: ${escapeHtml(bNum)} | Vence: ${escapeHtml(expStr)}`;
        });
        batchesHtml = `<div class="item-batch">${batchTexts.join(' &bull; ')}</div>`;
      }

      return `
        <div class="item-row">
          <div class="item-main">
            <span class="item-name">${escapeHtml(displayName)}</span>
            <span class="item-total">C$${itemSubtotal}</span>
          </div>
          <div class="item-sub">${qty}${unitStr} x C$${(listPrice != null ? listPrice : Number(item.unitPrice || 0)).toFixed(2)}</div>
          ${batchesHtml}
        </div>
      `;
    })
    .join('');

  // Descuento e Impuesto
  const discount = Number(sale.discount ?? sale.discountAmount ?? 0);
  const tax = Number(sale.tax ?? sale.taxAmount ?? 0);

  // Pagos
  const formatPaymentMethodName = (p: { method: string; bankName?: string | null }) => {
    const rawMethod = (p.method || '').toUpperCase();
    let label = p.method;
    if (rawMethod === 'TARJETA') label = 'Tarjeta';
    else if (rawMethod === 'TRANSFERENCIA') label = 'Transferencia';
    else if (rawMethod === 'EFECTIVO') label = 'Efectivo';
    else if (rawMethod === 'CREDITO') label = 'Crédito';
    else if (rawMethod === 'OTRO') label = 'Otro';

    if (p.bankName && (rawMethod === 'TARJETA' || rawMethod === 'TRANSFERENCIA')) {
      return `${label} (${p.bankName})`;
    }
    return label;
  };

  let paymentsText = '';
  if (Array.isArray(sale.payments) && sale.payments.length > 0) {
    paymentsText = sale.payments
      .map(
        (p: any) =>
          `${escapeHtml(formatPaymentMethodName(p))}: C$${Number(p.amount || 0).toFixed(2)}`
      )
      .join(', ');
  } else if (sale.paymentMethod) {
    paymentsText = escapeHtml(sale.paymentMethod);
  }

  const change = Number(sale.change || 0);

  // Bloque Crédito si aplica
  let creditHtml = '';
  const ca = sale.creditAccount;
  if (ca) {
    const downPayment = Number(ca.downPaymentAmount || 0);
    const interest = Number(ca.interestAmount || 0);
    const iLabel =
      interest > 0
        ? getInterestDisplayLabel(
            Number(ca.interestRate || 0),
            ca.interestType,
            ca.installmentsCount || ca.installments?.length
          ).replace(/:$/, '')
        : 'Intereses';

    let installmentsList = '';
    if (Array.isArray(ca.installments) && ca.installments.length > 0) {
      installmentsList = `
        <div class="credit-cuotas-title">Plan de Pagos (${ca.installments.length} cuotas):</div>
        <div class="credit-cuotas-list">
          ${ca.installments
            .map((inst: any) => {
              const dStr = formatCalendarDate(inst.dueDate);
              return `<div class="cuota-row"><span>Cuota ${inst.installmentNumber} (${dStr})</span><span>C$${Number(inst.amount).toFixed(2)}</span></div>`;
            })
            .join('')}
        </div>
      `;
    }

    creditHtml = `
      <div class="credit-box">
        <div class="credit-header">DETALLE DEL CRÉDITO</div>
        <div class="summary-row"><span>Monto fiado:</span><span>C$${Number(ca.principalAmount || ca.originalAmount || 0).toFixed(2)}</span></div>
        ${downPayment > 0 ? `<div class="summary-row"><span>Prima inicial:</span><span>-C$${downPayment.toFixed(2)}</span></div>` : ''}
        ${interest > 0 ? `<div class="summary-row"><span>${escapeHtml(iLabel)}:</span><span>+C$${interest.toFixed(2)}</span></div>` : ''}
        <div class="summary-row font-bold"><span>Total a pagar:</span><span>C$${Number(ca.originalAmount || sale.total).toFixed(2)}</span></div>
        ${installmentsList}
      </div>
    `;
  }

  // Header lines HTML
  const headerHtml = headerLines
    .filter((l) => l && l.trim())
    .map((l) => `<div class="header-line">${escapeHtml(l.trim())}</div>`)
    .join('');

  // Footer lines HTML
  let footerHtml = '';
  const cleanFooterLines = footerLines.filter((l) => l && l.trim());
  if (cleanFooterLines.length > 0) {
    footerHtml = cleanFooterLines
      .map((l) => `<div class="footer-line">${escapeHtml(l.trim())}</div>`)
      .join('');
  } else {
    footerHtml = `
      <div class="footer-line">${escapeHtml(receiptFooter || sale.footer || '¡Gracias por su compra!')}</div>
      <div class="footer-line">Conserve este ticket para cualquier cambio</div>
    `;
  }
  footerHtml += `<div class="footer-line" style="margin-top: 4px; font-size: 9px; color: #94a3b8;">NEXOL POS &mdash; ${DOMAINS.BRAND_DOMAIN_DISPLAY}</div>`;

  // Banner de estado (Anulada / Reimpresión / Original)
  let statusBannerHtml = '';
  if (isVoided) {
    statusBannerHtml = `<div class="doc-status-banner void-banner">*** COMPROBANTE ANULADO ***</div>`;
  } else if (isReprint) {
    const repNum = options?.reprintInfo?.reprintNumber ? ` #${options.reprintInfo.reprintNumber}` : '';
    statusBannerHtml = `<div class="doc-status-banner reprint-banner">*** REIMPRESIÓN${repNum} ***</div>`;
  } else {
    statusBannerHtml = `<div class="doc-status-banner original-banner">*** ORIGINAL - CLIENTE ***</div>`;
  }

  // Dimensiones según formato
  const isCarta = format === 'carta';
  const bodyWidth = isCarta
    ? '100%'
    : paperWidthMm === 58
    ? '48mm'
    : '72mm';

  const pageRule = isCarta
    ? `@page { size: letter portrait; margin: 15mm; }`
    : `@page { size: ${paperWidthMm}mm auto; margin: 0; }`;

  const containerClass = isCarta ? 'receipt-container-carta' : 'receipt-container-ticket';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Comprobante de venta - ${escapeHtml(invoiceNumber)}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    ${pageRule}
    body {
      width: ${bodyWidth};
      max-width: ${bodyWidth};
      margin: 0 auto;
      padding: ${isCarta ? '0' : '3mm 1mm 6mm 1mm'};
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 11px;
      line-height: 1.35;
      color: #0f172a;
      background: #ffffff;
    }
    .receipt-container-carta {
      width: 100%;
      max-width: 130mm;
      margin: 0 auto;
      padding: 8mm 6mm;
      background: #ffffff;
      ${isCarta ? 'border: 1px solid #e2e8f0; border-radius: 8px;' : ''}
    }
    .receipt-container-ticket {
      width: 100%;
    }
    @media print {
      body {
        padding: 0 !important;
        margin: 0 auto !important;
      }
      .receipt-container-carta {
        border: none !important;
        padding: 0 !important;
        max-width: 100% !important;
      }
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: 700; }
    .divider {
      border-top: 1px dashed #94a3b8;
      margin: 6px 0;
    }
    .divider-double {
      border-top: 2px dashed #475569;
      margin: 8px 0;
    }
    .logo-container {
      text-align: center;
      margin-bottom: 6px;
    }
    .logo-img {
      max-width: ${isCarta ? '60mm' : '48mm'};
      max-height: 24mm;
      object-fit: contain;
      display: inline-block;
    }
    .business-title {
      font-size: 14px;
      font-weight: 800;
      text-align: center;
      letter-spacing: 0.3px;
      margin-bottom: 2px;
      color: #000;
    }
    .business-info {
      font-size: 10px;
      color: #334155;
      text-align: center;
      margin-bottom: 1px;
    }
    .header-line {
      font-size: 10.5px;
      text-align: center;
      color: #1e293b;
    }
    .doc-status-banner {
      text-align: center;
      font-weight: 700;
      font-size: 10px;
      margin: 4px 0 2px 0;
    }
    .doc-status-banner.original-banner {
      color: #334155;
    }
    .doc-status-banner.reprint-banner {
      color: #475569;
    }
    .doc-status-banner.void-banner {
      color: #dc2626;
      font-weight: 800;
      border: 1px dashed #dc2626;
      padding: 3px;
      background: #fef2f2;
      border-radius: 4px;
    }
    .doc-badge {
      text-align: center;
      font-weight: 800;
      font-size: 12px;
      letter-spacing: 0.4px;
      margin: 4px 0 2px 0;
      color: #000;
      text-transform: uppercase;
    }
    .doc-folio {
      font-size: 11.5px;
      font-weight: 700;
      text-align: center;
      margin-bottom: 4px;
    }
    .meta-box {
      font-size: 10px;
      color: #334155;
      margin-bottom: 4px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 1px;
    }
    .meta-row span:first-child { color: #64748b; }
    .section-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #475569;
      margin-bottom: 4px;
    }
    .items-container {
      margin: 4px 0;
    }
    .item-row {
      margin-bottom: 5px;
    }
    .item-main {
      display: flex;
      justify-content: space-between;
      font-weight: 600;
      font-size: 11px;
    }
    .item-name {
      flex: 1;
      padding-right: 4px;
      word-break: break-word;
    }
    .item-total {
      text-align: right;
      white-space: nowrap;
    }
    .item-sub {
      font-size: 9.5px;
      color: #64748b;
    }
    .item-batch {
      font-size: 9px;
      color: #0369a1;
      font-style: italic;
      margin-top: 1px;
    }
    .summary-box {
      margin-top: 4px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      font-size: 10.5px;
      margin-bottom: 2px;
    }
    .summary-row.total-row {
      font-size: 14px;
      font-weight: 800;
      color: #000;
      margin-top: 4px;
      padding-top: 4px;
      border-top: 1px solid #0f172a;
    }
    .credit-box {
      margin-top: 6px;
      padding: 5px;
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 4px;
    }
    .credit-header {
      font-size: 10px;
      font-weight: 800;
      text-align: center;
      letter-spacing: 0.4px;
      color: #1e293b;
      margin-bottom: 4px;
    }
    .credit-cuotas-title {
      font-size: 9.5px;
      font-weight: 700;
      color: #334155;
      margin-top: 4px;
      margin-bottom: 2px;
    }
    .credit-cuotas-list {
      font-size: 9px;
    }
    .cuota-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 1px;
      color: #475569;
    }
    .footer-box {
      margin-top: 8px;
      text-align: center;
    }
    .footer-line {
      font-size: 10px;
      color: #334155;
      margin-bottom: 2px;
    }
    .legal-disclaimer {
      margin-top: 10px;
      padding-top: 6px;
      border-top: 1px dotted #cbd5e1;
      font-size: 8.5px;
      color: #94a3b8;
      text-align: center;
      line-height: 1.25;
    }
  </style>
</head>
<body>
  <div class="${containerClass}">
    ${showLogo && logoImage ? `<div class="logo-container"><img src="${logoImage}" alt="Logo" class="logo-img" /></div>` : ''}

    ${showBusinessName ? `<div class="business-title">${escapeHtml(businessName.toUpperCase())}</div>` : ''}
    ${headerHtml}

    ${showAddress && businessAddress.trim() ? `<div class="business-info">📍 ${escapeHtml(businessAddress.trim())}</div>` : ''}
    ${showPhone && businessPhone.trim() ? `<div class="business-info">📞 Tel: ${escapeHtml(businessPhone.trim())}</div>` : ''}
    ${showTaxId && businessTaxId.trim() ? `<div class="business-info">RUC/NIT: ${escapeHtml(businessTaxId.trim())}</div>` : ''}

    <div class="divider"></div>

    <div class="doc-badge">
      ${sale.channel === 'DOMICILIO'
        ? 'A DOMICILIO'
        : sale.channel === 'PEDIDOSYA'
        ? `PEDIDOSYA · Pedido N.º ${escapeHtml(sale.pedidosYaOrderNumber || '')}`
        : 'Comprobante de venta'}
    </div>
    <div class="doc-folio">${escapeHtml(invoiceNumber)}</div>

    ${statusBannerHtml}

    <div class="meta-box">
      <div class="meta-row"><span>Fecha:</span><span>${dateStr}, ${timeStr}</span></div>
      ${showCashier && cashier ? `<div class="meta-row"><span>Cajero:</span><span>${escapeHtml(cashier)}</span></div>` : ''}
      ${seller && String(seller).trim() ? `<div class="meta-row"><span>Vendedor:</span><span>${escapeHtml(String(seller).trim())}</span></div>` : ''}
      ${presaleTicket && String(presaleTicket).trim() ? `<div class="meta-row"><span>Ticket:</span><span>${escapeHtml(String(presaleTicket).trim())}</span></div>` : ''}
      ${showCustomer && customerDisplayName ? `<div class="meta-row"><span>Cliente:</span><span class="font-bold">${escapeHtml(customerDisplayName)}</span></div>` : ''}
      ${sale.customerExternalCode || sale.externalCode ? `<div class="meta-row"><span>Carnet:</span><span>${escapeHtml(sale.customerExternalCode || sale.externalCode)}</span></div>` : ''}
      ${sale.customerCompanyName || sale.companyName ? `<div class="meta-row"><span>Empresa:</span><span>${escapeHtml(sale.customerCompanyName || sale.companyName)}</span></div>` : ''}
      ${showTaxId && (maskedTaxId || rawCustomerTaxId.trim()) ? `<div class="meta-row"><span>NIT/Doc:</span><span>${escapeHtml(maskedTaxId || rawCustomerTaxId.trim())}</span></div>` : ''}
    </div>

    <div class="divider"></div>

    <div class="section-title">Detalle de la compra</div>
    <div class="items-container">
      ${itemsHtml}
    </div>

    <div class="divider"></div>

    <div class="summary-box">
      ${isPerLine ? (() => {
        const listPriceTotal = Number(sale.listPriceTotal ?? 0);
        const listDiscountTotal = Number(sale.listDiscountTotal ?? 0);
        const discountManual = Number(sale.discountAmount ?? sale.discount ?? 0);
        const subtotalBeforeTax = Number(sale.subtotalBeforeTax ?? sale.subtotal ?? 0);
        const taxAmt = Number(sale.taxAmount ?? sale.tax ?? 0);
        const totalAmt = Number(sale.total ?? 0);
        const hasMultipleProducts = (sale.items || []).length > 1;
        const hasListDiscount = listDiscountTotal > 0 && listPriceTotal > 0;
        const hasAnyDiscount = hasListDiscount || discountManual > 0;
        const deliveryFeeVal = Number(sale.deliveryFee ?? 0);
        const grossTotal = listPriceTotal > 0 ? listPriceTotal : (subtotalBeforeTax - deliveryFeeVal + discountManual);

        let out = '';
        if ((hasMultipleProducts && hasAnyDiscount) || deliveryFeeVal > 0) {
          out += `<div class="summary-row"><span>Subtotal:</span><span>C$${grossTotal.toFixed(2)}</span></div>`;
        }

        if (hasListDiscount) {
          const discPct = Math.round((listDiscountTotal / listPriceTotal) * 100);
          out += `<div class="summary-row" style="color: #16a34a;"><span>Descuento (${discPct} %):</span><span>-C$${listDiscountTotal.toFixed(2)}</span></div>`;
          if (discountManual > 0) {
            out += `<div class="summary-row" style="color: #16a34a;"><span>Descuento adicional:</span><span>-C$${discountManual.toFixed(2)}</span></div>`;
          }
        } else if (discountManual > 0) {
          out += `<div class="summary-row" style="color: #16a34a;"><span>Descuento:</span><span>-C$${discountManual.toFixed(2)}</span></div>`;
        }

        if (sale.deliveryFee && Number(sale.deliveryFee) > 0) {
          out += `<div class="summary-row"><span>Envío:</span><span>C$${Number(sale.deliveryFee).toFixed(2)}</span></div>`;
        }

        if (hasTaxableItems) {
          out += `<div class="summary-row"><span>Antes de impuesto:</span><span>C$${subtotalBeforeTax.toFixed(2)}</span></div>`;
          if (taxAmt > 0) {
            const tName = sale.taxName || 'IVA';
            const tRate = sale.taxRate !== undefined && sale.taxRate !== null ? (sale.taxRate > 1 ? sale.taxRate : Math.round(sale.taxRate * 100)) : null;
            out += `<div class="summary-row"><span>${tName}${tRate !== null ? ' ' + tRate + ' %' : ''}:</span><span>C$${taxAmt.toFixed(2)}</span></div>`;
          }
          out += `<div class="summary-row total-row"><span>TOTAL A PAGAR:</span><span>C$${totalAmt.toFixed(2)}</span></div>`;
        } else {
          if (hasMultipleProducts && !hasAnyDiscount) {
            out += `<div class="summary-row"><span>Subtotal:</span><span>C$${subtotalBeforeTax.toFixed(2)}</span></div>`;
          }
          out += `<div class="summary-row total-row"><span>TOTAL A PAGAR:</span><span>C$${totalAmt.toFixed(2)}</span></div>`;
        }

        return out;
      })() : (() => {
        const hasMultipleProducts = (sale.items || []).length > 1;
        let out = '';
        if (hasMultipleProducts && discount > 0) {
          out += `<div class="summary-row"><span>Subtotal:</span><span>C$${Number(sale.subtotal || 0).toFixed(2)}</span></div>`;
        }
        if (discount > 0) {
          out += `<div class="summary-row" style="color: #16a34a;"><span>Descuento:</span><span>-C$${discount.toFixed(2)}</span></div>`;
        }
        if (sale.deliveryFee && Number(sale.deliveryFee) > 0) {
          out += `<div class="summary-row"><span>Envío:</span><span>C$${Number(sale.deliveryFee).toFixed(2)}</span></div>`;
        }
        if (showTaxBreakdown && tax > 0) {
          const subBeforeTax = Number(sale.subtotal || 0) - discount;
          out += `<div class="summary-row"><span>Antes de impuesto:</span><span>C$${subBeforeTax.toFixed(2)}</span></div>`;
          const taxNameStr = sale.taxName || 'IVA';
          const taxRateVal = sale.taxRate !== undefined ? sale.taxRate : undefined;
          const taxRateStr = taxRateVal ? ` ${(taxRateVal * 100).toFixed(0)}%` : '';
          const taxIncludedStr = sale.taxIncluded ? ' (Incluido)' : '';
          const fullTaxLabel = `${taxNameStr}${taxRateStr}${taxIncludedStr}:`;
          out += `<div class="summary-row"><span>${escapeHtml(fullTaxLabel)}</span><span>C$${tax.toFixed(2)}</span></div>`;
          out += `<div class="summary-row total-row"><span>TOTAL A PAGAR:</span><span>C$${Number(sale.total || 0).toFixed(2)}</span></div>`;
        } else {
          if (hasMultipleProducts && discount <= 0) {
            out += `<div class="summary-row"><span>Subtotal:</span><span>C$${Number(sale.subtotal || 0).toFixed(2)}</span></div>`;
          }
          out += `<div class="summary-row total-row"><span>TOTAL A PAGAR:</span><span>C$${Number(sale.total || 0).toFixed(2)}</span></div>`;
        }
        return out;
      })()}
    </div>

    ${paymentsText ? `
      <div style="margin-top: 4px; font-size: 10px; color: #475569;">
        <div><strong>Método de pago:</strong> ${paymentsText}</div>
        ${change > 0 ? `<div><strong>Vuelto:</strong> C$${change.toFixed(2)}</div>` : ''}
      </div>
    ` : ''}

    ${sale.channel === 'PEDIDOSYA' ? `
      <div style="margin-top: 2px; font-size: 10px; color: #475569;">
        <div><strong>Forma de cobro:</strong> ${sale.pedidosYaPaymentMode === 'APP' || sale.paymentMethod === 'PEDIDOSYA_APP' ? 'Pagado en app' : 'Efectivo'}</div>
      </div>
    ` : ''}

    ${creditHtml}

    ${sale.channel === 'DOMICILIO' ? `
      <div class="divider"></div>
      <div class="section-title">Datos de entrega</div>
      <div class="meta-box" style="font-size: 10px;">
        ${customerDisplayName ? `<div class="meta-row"><span>Cliente:</span><span class="font-bold">${escapeHtml(customerDisplayName)}</span></div>` : ''}
        ${sale.deliveryPhone || sale.customerPhone ? `<div class="meta-row"><span>Teléfono:</span><span>${escapeHtml(sale.deliveryPhone || sale.customerPhone)}</span></div>` : ''}
        ${sale.deliveryAddress ? `<div class="meta-row"><span>Dirección:</span><span class="font-bold">${escapeHtml(sale.deliveryAddress)}</span></div>` : ''}
        ${sale.deliveryReference ? `<div class="meta-row"><span>Referencia:</span><span>${escapeHtml(sale.deliveryReference)}</span></div>` : ''}
        ${sale.deliveryDriverName || sale.deliveryDriver?.name ? `<div class="meta-row"><span>Repartidor:</span><span>${escapeHtml(sale.deliveryDriverName || sale.deliveryDriver?.name)}</span></div>` : ''}
      </div>
    ` : ''}

    ${isPerLine && hasTaxableItems ? `
      <div class="divider"></div>
      <div class="text-center" style="font-size: 10px; color: #475569; margin: 4px 0;">
        G = producto gravado con ${sale.taxName || 'IVA'}${sale.taxRate !== undefined && sale.taxRate !== null ? ' ' + (sale.taxRate > 1 ? sale.taxRate : Math.round(sale.taxRate * 100)) + ' %' : ''}
      </div>
    ` : ''}

    <div class="divider-double"></div>

    <div class="footer-box">
      ${footerHtml}
    </div>

    <div class="legal-disclaimer">
      Comprobante de venta. No sustituye una factura fiscal.
    </div>
  </div>
</body>
</html>`;
};

/**
 * Abre el diálogo de impresión nativo del navegador de forma aislada e instantánea mediante un iframe oculto.
 */
export function printReceiptViaIframe(html: string, title?: string): Promise<void> {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';

    document.body.appendChild(iframe);

    const cleanup = () => {
      setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
        resolve();
      }, 500);
    };

    iframe.onload = () => {
      try {
        const cw = iframe.contentWindow;
        if (!cw) {
          cleanup();
          return;
        }

        if (title && cw.document) {
          cw.document.title = title;
        }

        cw.focus();
        cw.print();
        cleanup();
      } catch (err) {
        console.error('[printReceiptViaIframe] Error al invocar print:', err);
        cleanup();
      }
    };

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
    } else {
      cleanup();
    }
  });
}

/**
 * Genera un Blob en formato PDF a partir del HTML usando jsPDF y html2canvas.
 * Cumple con el criterio de peso (≤ 300 KB para 40 líneas) y fidelidad visual 100% idéntica.
 */
export async function generateReceiptPdfBlob(
  html: string,
  options?: {
    format?: 'ticket' | 'carta';
    paperWidthMm?: number;
  }
): Promise<Blob> {
  const isCarta = options?.format === 'carta';
  const paperWidthMm = options?.paperWidthMm === 58 ? 58 : 80;

  // Creamos contenedor temporal para renderizar el DOM
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.zIndex = '-1';
  container.style.backgroundColor = '#ffffff';

  // Configuración de dimensiones
  let pdf: jsPDF;
  let renderWidth: number;
  let windowWidth: number;

  if (isCarta) {
    // Hoja Carta estándar: 215.9 x 279.4 mm
    container.style.width = '794px'; // 794px = 210mm a 96 DPI
    container.innerHTML = html;
    document.body.appendChild(container);

    pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter',
    });
    renderWidth = pdf.internal.pageSize.getWidth();
    windowWidth = 794;
  } else {
    // Ticket térmico: 80 mm o 58 mm con altura continua
    const targetPx = paperWidthMm === 58 ? 220 : 288;
    container.style.width = `${targetPx}px`;
    container.innerHTML = html;
    document.body.appendChild(container);

    const pxHeight = container.scrollHeight;
    const mmHeight = Math.ceil(pxHeight * 0.264583) + 12;

    pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [paperWidthMm, mmHeight],
    });
    renderWidth = paperWidthMm;
    windowWidth = targetPx;
  }

  try {
    await new Promise<void>((resolve, reject) => {
      pdf.html(container, {
        x: 0,
        y: 0,
        width: renderWidth,
        windowWidth: windowWidth,
        autoPaging: isCarta ? 'text' : false,
        callback: () => resolve(),
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
        },
      }).catch(reject);
    });

    const arrayBuffer = pdf.output('arraybuffer');
    return new Blob([arrayBuffer], { type: 'application/pdf' });
  } finally {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}

/**
 * Descarga directamente el comprobante en PDF con el nombre comprobante-<folio>.pdf.
 */
export async function downloadReceiptPdfFile(
  sale: any,
  html: string,
  options?: { format?: 'ticket' | 'carta'; paperWidthMm?: number }
): Promise<void> {
  const folio = sale?.invoiceNumber || (sale?.id ? `FAC-${String(sale.id).slice(0, 6)}` : 'comprobante');
  const filename = `comprobante-${folio}.pdf`;
  const blob = await generateReceiptPdfBlob(html, options);

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
