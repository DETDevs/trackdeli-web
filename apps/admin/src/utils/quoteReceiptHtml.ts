import type { PosQuote } from 'api-client';
import { formatManaguaDate, formatManaguaDateTime } from './dateManagua';
import { generateReceiptPdfBlob } from './receiptHtml';

export interface QuoteReceiptHtmlOptions {
  format?: 'ticket' | 'carta';
  paperWidthMm?: number; // 58 | 80 (por defecto 80)
  omitLogo?: boolean;
  currentUser?: { id?: string; name?: string; email?: string } | null;
}

/**
 * Resuelve el nombre visible del emisor/elaborador de la proforma, priorizando
 * siempre el nombre real de la persona o usuario frente a correos electrónicos.
 */
export function resolveQuoteCreatorName(
  quote?: Partial<PosQuote> | null,
  fallbackUser?: { id?: string; name?: string; email?: string } | null
): string {
  if (!quote) return fallbackUser?.name?.trim() || 'Usuario';

  const fromRel = (quote as any)?.createdBy?.name?.trim();
  if (fromRel) return fromRel;

  const raw = quote.createdByName?.trim();
  if (raw && !raw.includes('@')) {
    return raw;
  }

  if (fallbackUser?.name?.trim()) {
    if (
      (fallbackUser.id && quote.createdById && fallbackUser.id === quote.createdById) ||
      (fallbackUser.email && raw && fallbackUser.email.toLowerCase() === raw.toLowerCase()) ||
      !raw ||
      raw.includes('@')
    ) {
      return fallbackUser.name.trim();
    }
  }

  return raw || (quote as any)?.createdBy?.email || fallbackUser?.name?.trim() || 'Usuario';
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeImageUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^(https?:|data:image\/(png|jpeg|jpg|webp|gif);base64,|\/)/i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

export function formatQuoteMoney(amount: number | string | null | undefined, currency = 'NIO'): string {
  const num = Number(amount || 0);
  const symbol = currency === 'USD' ? '$' : 'C$';
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol} ${formatted}`;
}

function formatQty(qty: number): string {
  const n = Number(qty || 0);
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(3).replace(/\.?0+$/, '');
}

/**
 * Genera el documento HTML completo de una Proforma en formato Carta u Ticket (58mm / 80mm).
 * Redacción exclusivamente en tercera persona neutra (documento comercial, no es comprobante de venta).
 */
export function generateQuoteReceiptHtml(
  quote: PosQuote,
  options?: QuoteReceiptHtmlOptions,
): string {
  const format = options?.format === 'ticket' ? 'ticket' : 'carta';
  const paperWidthMm = options?.paperWidthMm === 58 ? 58 : 80;
  const currency = quote.currency || 'NIO';
  const isExpired = quote.status === 'EXPIRED';
  const isConverted = quote.status === 'CONVERTED';

  const issuer = quote.issuer;
  const logoSrc = options?.omitLogo ? null : sanitizeImageUrl(issuer?.logoUrl);
  const businessName = issuer?.name ? escapeHtml(issuer.name) : null;
  const businessTaxId = issuer?.taxId ? escapeHtml(issuer.taxId) : null;
  const businessAddress = issuer?.address ? escapeHtml(issuer.address) : null;
  const businessPhone = issuer?.phone ? escapeHtml(issuer.phone) : null;
  const headerLines = Array.isArray(issuer?.headerLines)
    ? issuer.headerLines.filter((l) => Boolean(l && l.trim()))
    : [];
  const footerLines = Array.isArray(issuer?.footerLines)
    ? issuer.footerLines.filter((l) => Boolean(l && l.trim()))
    : [];

  const issuedDateSource = quote.sentAt || quote.createdAt;
  const issuedAtLabel = issuedDateSource ? formatManaguaDateTime(issuedDateSource) : '—';
  const validUntilLabel = escapeHtml(quote.validUntilLabel || '—');
  const validityDays = Number(quote.validityDays || 15);
  const quoteNumber = escapeHtml(quote.quoteNumber || 'PROFORMA');
  const creatorName = resolveQuoteCreatorName(quote, options?.currentUser);

  const items = Array.isArray(quote.items) ? quote.items : [];
  const subtotal = Number(quote.subtotal || 0);
  const listDiscountTotal = Number(quote.listDiscountTotal || 0);
  const discountAmount = Number(quote.discountAmount || 0);
  const taxEnabled = Boolean(quote.taxEnabled);
  const taxIncluded = Boolean(quote.taxIncluded);
  const taxRate = Number(quote.taxRate || 0);
  const taxAmount = Number(quote.taxAmount || 0);
  const total = Number(quote.total || 0);
  const hasDiscountColumn = items.some((it) => Number(it.discount || 0) > 0);

  const hasCustomerFields = Boolean(
    quote.customerName ||
      quote.customerPhone ||
      quote.customerRuc ||
      quote.customerAddress ||
      quote.vehicleInfo,
  );

  const normalizedTaxPct = taxRate <= 0 ? 15 : taxRate <= 1 ? taxRate * 100 : taxRate;
  const taxPctLabel = `${Number(normalizedTaxPct.toFixed(2))}%`;

  if (format === 'ticket') {
    const is58 = paperWidthMm === 58;
    const widthCss = is58 ? '58mm' : '80mm';
    const fontSizeBody = is58 ? '10px' : '11px';

    const itemsHtml = items
      .map((item) => {
        const badges: string[] = [];
        if (item.itemType === 'CUSTOM') badges.push('[Libre]');
        if (item.priceTier === 'WHOLESALE') badges.push('[Mayoreo]');
        const taxableMark = taxEnabled && item.taxable ? ' (G)' : '';
        const listPriceDiff =
          item.listPrice && item.listPrice > item.unitPrice
            ? `<div class="muted strike nowrap">Lista: ${escapeHtml(formatQuoteMoney(item.listPrice, currency))}</div>`
            : '';
        const itemDiscountHtml =
          Number(item.discount || 0) > 0
            ? `<div class="muted">Desc. línea: -${escapeHtml(formatQuoteMoney(item.discount, currency))}</div>`
            : '';
        const itemNoteHtml = item.notes
          ? `<div class="muted">Nota: ${escapeHtml(item.notes)}</div>`
          : '';
        const barcodeHtml = item.barcode
          ? `<div class="muted">Cód.: ${escapeHtml(item.barcode)}</div>`
          : '';

        return `
          <div class="t-item">
            <div class="t-item-name">
              ${escapeHtml(item.productName)}${badges.length ? ` <span class="tag">${escapeHtml(badges.join(' '))}</span>` : ''}${escapeHtml(taxableMark)}
            </div>
            ${barcodeHtml}
            <div class="t-item-row">
              <span>${escapeHtml(formatQty(item.quantity))} ${escapeHtml(item.unit || 'UND')} x <span class="nowrap">${escapeHtml(formatQuoteMoney(item.unitPrice, currency))}</span></span>
              <span class="bold nowrap">${escapeHtml(formatQuoteMoney(item.total, currency))}</span>
            </div>
            ${listPriceDiff}
            ${itemDiscountHtml}
            ${itemNoteHtml}
          </div>
        `;
      })
      .join('');

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Proforma ${quoteNumber}</title>
  <style>
    @page { size: ${widthCss} auto; margin: 2mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      width: ${widthCss};
      max-width: ${widthCss};
      background: #ffffff;
      color: #0f172a;
      font-family: 'Courier New', Courier, monospace;
      font-size: ${fontSizeBody};
      line-height: 1.35;
    }
    .t-wrap { padding: 3mm 2.5mm; }
    .center { text-align: center; }
    .bold { font-weight: 700; }
    .nowrap { white-space: nowrap; }
    .muted { color: #334155; font-size: ${is58 ? '9px' : '10px'}; }
    .strike { text-decoration: line-through; }
    .logo { max-width: ${is58 ? '32mm' : '42mm'}; max-height: 18mm; object-fit: contain; margin: 0 auto 2mm auto; display: block; }
    .biz-name { font-size: ${is58 ? '12px' : '13px'}; font-weight: 700; text-transform: uppercase; margin-bottom: 1mm; }
    .doc-badge {
      border: 1.5px solid #0f172a;
      padding: 2mm;
      margin: 2mm 0;
      text-align: center;
    }
    .doc-title { font-size: ${is58 ? '13px' : '15px'}; font-weight: 700; letter-spacing: 0.08em; }
    .doc-num { font-size: ${is58 ? '12px' : '13px'}; font-weight: 700; margin-top: 0.5mm; }
    .expired-box {
      border: 1.5px dashed #b45309;
      background: #fffbeb;
      color: #92400e;
      padding: 1.5mm;
      text-align: center;
      font-weight: 700;
      margin: 2mm 0;
    }
    .converted-box {
      border: 1px solid #3730a3;
      color: #312e81;
      padding: 1.5mm;
      text-align: center;
      font-weight: 700;
      margin: 2mm 0;
    }
    .divider { border-top: 1px dashed #64748b; margin: 2mm 0; }
    .meta-row { display: flex; justify-content: space-between; gap: 2mm; }
    .section-title { font-weight: 700; text-transform: uppercase; margin-bottom: 1mm; font-size: ${is58 ? '9.5px' : '10.5px'}; }
    .t-item { padding: 1.2mm 0; border-bottom: 1px dotted #cbd5e1; }
    .t-item:last-child { border-bottom: none; }
    .t-item-name { font-weight: 700; word-break: break-word; }
    .t-item-row { display: flex; justify-content: space-between; gap: 2mm; margin-top: 0.5mm; }
    .tag { font-size: 9px; font-weight: 700; }
    .total-row { display: flex; justify-content: space-between; gap: 2mm; margin: 0.8mm 0; }
    .grand-total {
      display: flex;
      justify-content: space-between;
      gap: 2mm;
      font-size: ${is58 ? '12px' : '14px'};
      font-weight: 700;
      border-top: 1.5px solid #0f172a;
      border-bottom: 1.5px solid #0f172a;
      padding: 1.5mm 0;
      margin: 1.5mm 0;
    }
    .legal-box {
      border-top: 1px dashed #64748b;
      margin-top: 2.5mm;
      padding-top: 2mm;
      text-align: center;
      font-size: ${is58 ? '9px' : '9.5px'};
    }
    .legal-strong { font-weight: 700; margin-bottom: 1mm; }
  </style>
</head>
<body>
  <div class="t-wrap">
    <div class="center">
      ${logoSrc ? `<img class="logo" src="${escapeHtml(logoSrc)}" alt="Logo" />` : ''}
      ${businessName ? `<div class="biz-name">${businessName}</div>` : ''}
      ${businessTaxId ? `<div>RUC/Cédula: ${businessTaxId}</div>` : ''}
      ${businessAddress ? `<div>${businessAddress}</div>` : ''}
      ${businessPhone ? `<div>Tel.: ${businessPhone}</div>` : ''}
      ${headerLines.map((l) => `<div>${escapeHtml(l)}</div>`).join('')}
    </div>

    <div class="doc-badge">
      <div class="doc-title">PROFORMA</div>
      <div class="doc-num">${quoteNumber}</div>
      <div class="muted">Documento de cotización</div>
    </div>

    ${
      isExpired
        ? `<div class="expired-box">VENCIDA — Vigencia expirada el ${validUntilLabel}</div>`
        : ''
    }
    ${
      isConverted
        ? `<div class="converted-box">PROFORMA CONVERTIDA EN VENTA</div>`
        : ''
    }

    <div>
      <div><span class="bold">Fecha de emisión:</span> ${escapeHtml(issuedAtLabel)}</div>
      <div><span class="bold">Válida hasta:</span> ${validUntilLabel} (${validityDays} ${validityDays === 1 ? 'día' : 'días'})</div>
      ${creatorName ? `<div><span class="bold">Atendido por:</span> ${escapeHtml(creatorName)}</div>` : ''}
    </div>

    <div class="divider"></div>
    <div>
      <div class="section-title">Datos del cliente</div>
      ${
        hasCustomerFields
          ? `
            ${quote.customerName ? `<div><span class="bold">Cliente:</span> ${escapeHtml(quote.customerName)}</div>` : ''}
            ${quote.customerPhone ? `<div><span class="bold">Teléfono:</span> ${escapeHtml(quote.customerPhone)}</div>` : ''}
            ${quote.customerRuc ? `<div><span class="bold">RUC / Cédula:</span> ${escapeHtml(quote.customerRuc)}</div>` : ''}
            ${quote.customerAddress ? `<div><span class="bold">Dirección:</span> ${escapeHtml(quote.customerAddress)}</div>` : ''}
            ${quote.vehicleInfo ? `<div><span class="bold">Vehículo:</span> ${escapeHtml(quote.vehicleInfo)}</div>` : ''}
          `
          : `<div class="muted">Cliente general / Sin datos específicos</div>`
      }
    </div>

    <div class="divider"></div>
    <div class="section-title">Detalle cotizado</div>
    <div>
      ${itemsHtml}
    </div>

    <div class="divider"></div>
    <div>
      <div class="total-row">
        <span>Subtotal:</span>
        <span class="nowrap">${escapeHtml(formatQuoteMoney(subtotal, currency))}</span>
      </div>
      ${
        listDiscountTotal > 0
          ? `<div class="total-row">
              <span>Ahorro por tarifa / lista:</span>
              <span class="nowrap">-${escapeHtml(formatQuoteMoney(listDiscountTotal, currency))}</span>
            </div>`
          : ''
      }
      ${
        discountAmount > 0
          ? `<div class="total-row">
              <span>Descuento global:</span>
              <span class="nowrap">-${escapeHtml(formatQuoteMoney(discountAmount, currency))}</span>
            </div>`
          : ''
      }
      ${
        taxEnabled
          ? `<div class="total-row">
              <span>IVA (${escapeHtml(taxPctLabel)})${taxIncluded ? ' (incluido)' : ''}:</span>
              <span class="nowrap">${escapeHtml(formatQuoteMoney(taxAmount, currency))}</span>
            </div>`
          : ''
      }
      <div class="grand-total">
        <span>TOTAL PROFORMA:</span>
        <span class="nowrap">${escapeHtml(formatQuoteMoney(total, currency))}</span>
      </div>
    </div>

    ${
      quote.notes
        ? `<div class="divider"></div><div><span class="bold">Notas:</span> ${escapeHtml(quote.notes)}</div>`
        : ''
    }
    ${
      quote.conditions
        ? `<div class="divider"></div><div><span class="bold">Condiciones:</span> ${escapeHtml(quote.conditions)}</div>`
        : ''
    }

    ${
      footerLines.length
        ? `<div class="divider"></div><div class="center">${footerLines.map((l) => `<div>${escapeHtml(l)}</div>`).join('')}</div>`
        : ''
    }

    <div class="legal-box">
      <div class="legal-strong">Proforma. No es un comprobante de venta.</div>
      <div>Precios sujetos a disponibilidad y cambio sin previo aviso hasta su confirmación de venta.</div>
    </div>
  </div>
</body>
</html>`;
  }

  // Formato Hoja Carta (794px de referencia para impresión y PDF)
  const rowsHtml = items
    .map((item, idx) => {
      const badges: string[] = [];
      if (item.itemType === 'CUSTOM') badges.push('<span class="badge badge-custom">Libre</span>');
      if (item.priceTier === 'WHOLESALE') badges.push('<span class="badge badge-wholesale">Mayoreo</span>');
      const taxableMark = taxEnabled && item.taxable ? ' <span class="tax-mark">(G)</span>' : '';
      const subMeta: string[] = [];
      if (item.barcode) subMeta.push(`Cód.: ${escapeHtml(item.barcode)}`);
      if (item.notes) subMeta.push(`Nota: ${escapeHtml(item.notes)}`);

      return `
        <tr>
          <td class="col-num">${idx + 1}</td>
          <td class="col-desc">
            <div class="item-title">
              ${escapeHtml(item.productName)} ${badges.join(' ')}${taxableMark}
            </div>
            ${subMeta.length ? `<div class="item-sub">${subMeta.join(' · ')}</div>` : ''}
          </td>
          <td class="col-qty nowrap">${escapeHtml(formatQty(item.quantity))} ${escapeHtml(item.unit || 'UND')}</td>
          <td class="col-price nowrap">
            ${
              item.listPrice && item.listPrice > item.unitPrice
                ? `<div class="strike-muted nowrap">${escapeHtml(formatQuoteMoney(item.listPrice, currency))}</div>`
                : ''
            }
            <div>${escapeHtml(formatQuoteMoney(item.unitPrice, currency))}</div>
          </td>
          ${
            hasDiscountColumn
              ? `<td class="col-disc nowrap">${Number(item.discount || 0) > 0 ? `-${escapeHtml(formatQuoteMoney(item.discount, currency))}` : '—'}</td>`
              : ''
          }
          <td class="col-total nowrap">${escapeHtml(formatQuoteMoney(item.total, currency))}</td>
        </tr>
      `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Proforma ${quoteNumber}</title>
  <style>
    @page { size: letter portrait; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      font-size: 13px;
      line-height: 1.45;
    }
    .page {
      position: relative;
      width: 100%;
      max-width: 794px;
      margin: 0 auto;
      padding: 24px 28px;
      background: #ffffff;
    }
    .watermark {
      position: fixed;
      top: 42%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-28deg);
      font-size: 72px;
      font-weight: 800;
      letter-spacing: 0.14em;
      color: rgba(180, 83, 9, 0.12);
      border: 6px solid rgba(180, 83, 9, 0.14);
      padding: 10px 28px;
      border-radius: 12px;
      pointer-events: none;
      z-index: 0;
      text-transform: uppercase;
    }
    .content { position: relative; z-index: 1; }
    .nowrap { white-space: nowrap; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 16px;
      margin-bottom: 16px;
    }
    .biz-block { display: flex; gap: 14px; align-items: flex-start; flex: 1; }
    .logo { max-width: 84px; max-height: 84px; object-fit: contain; border-radius: 6px; }
    .biz-name { font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 4px 0; }
    .biz-line { font-size: 12px; color: #334155; margin: 2px 0; }
    .doc-box {
      min-width: 220px;
      text-align: right;
      background: #f8fafc;
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      padding: 12px 16px;
    }
    .doc-kind { font-size: 12px; font-weight: 700; letter-spacing: 0.1em; color: #475569; text-transform: uppercase; }
    .doc-number { font-size: 20px; font-weight: 800; color: #0f172a; margin: 2px 0 6px 0; }
    .doc-meta { font-size: 12px; color: #334155; margin: 2px 0; }
    .status-banner-expired {
      background: #fffbeb;
      border: 1.5px solid #f59e0b;
      color: #92400e;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 14px;
    }
    .status-banner-converted {
      background: #eef2ff;
      border: 1.5px solid #6366f1;
      color: #312e81;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 14px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1.3fr 1fr;
      gap: 14px;
      margin-bottom: 16px;
    }
    .card {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 12px 14px;
      background: #ffffff;
    }
    .card-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #475569;
      margin: 0 0 8px 0;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
    }
    .info-row { font-size: 12.5px; margin: 3px 0; color: #0f172a; }
    .info-label { font-weight: 600; color: #334155; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    thead th {
      background: #0f172a;
      color: #ffffff;
      font-size: 12px;
      font-weight: 600;
      padding: 8px 10px;
      text-align: left;
    }
    thead th.col-num { width: 34px; text-align: center; }
    thead th.col-qty,
    thead th.col-price,
    thead th.col-disc,
    thead th.col-total { text-align: right; }
    tbody td {
      padding: 9px 10px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
      font-size: 12.5px;
    }
    tbody td.col-num { text-align: center; color: #64748b; }
    tbody td.col-qty,
    tbody td.col-price,
    tbody td.col-disc,
    tbody td.col-total { text-align: right; }
    tbody td.col-total { font-weight: 700; }
    .item-title { font-weight: 600; color: #0f172a; }
    .item-sub { font-size: 12px; color: #475569; margin-top: 2px; }
    .strike-muted { font-size: 12px; color: #64748b; text-decoration: line-through; }
    .badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 4px;
      vertical-align: middle;
    }
    .badge-custom { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; }
    .badge-wholesale { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
    .tax-mark { font-size: 12px; color: #475569; font-weight: 600; }
    .bottom-grid {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      margin-bottom: 18px;
    }
    .notes-col { flex: 1; }
    .notes-box {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 10px;
      font-size: 12px;
      color: #1e293b;
      background: #f8fafc;
    }
    .notes-box strong { display: block; margin-bottom: 3px; color: #0f172a; }
    .totals-box {
      min-width: 280px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 12px 14px;
      background: #ffffff;
    }
    .t-line {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      font-size: 13px;
      padding: 4px 0;
      color: #1e293b;
    }
    .t-grand {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      border-top: 2px solid #0f172a;
      margin-top: 6px;
      padding-top: 8px;
    }
    .footer-extra {
      text-align: center;
      font-size: 12px;
      color: #334155;
      margin: 8px 0 12px 0;
    }
    .legal-notice {
      border-top: 1.5px solid #cbd5e1;
      padding-top: 10px;
      text-align: center;
      font-size: 12px;
      color: #334155;
    }
    .legal-notice strong {
      display: block;
      color: #0f172a;
      font-size: 12.5px;
      margin-bottom: 3px;
    }
  </style>
</head>
<body>
  <div class="page">
    ${isExpired ? `<div class="watermark">VENCIDA</div>` : ''}
    <div class="content">
      <div class="header">
        <div class="biz-block">
          ${logoSrc ? `<img class="logo" src="${escapeHtml(logoSrc)}" alt="Logo" />` : ''}
          <div>
            ${businessName ? `<h1 class="biz-name">${businessName}</h1>` : ''}
            ${businessTaxId ? `<div class="biz-line">RUC / Cédula: ${businessTaxId}</div>` : ''}
            ${businessAddress ? `<div class="biz-line">${businessAddress}</div>` : ''}
            ${businessPhone ? `<div class="biz-line">Tel.: ${businessPhone}</div>` : ''}
            ${headerLines.map((l) => `<div class="biz-line">${escapeHtml(l)}</div>`).join('')}
          </div>
        </div>
        <div class="doc-box">
          <div class="doc-kind">PROFORMA</div>
          <div class="doc-number">${quoteNumber}</div>
          <div class="doc-meta"><strong>Emisión:</strong> ${escapeHtml(issuedAtLabel)}</div>
          <div class="doc-meta"><strong>Válida hasta:</strong> ${validUntilLabel}</div>
        </div>
      </div>

      ${
        isExpired
          ? `<div class="status-banner-expired">VENCIDA — La vigencia de esta proforma expiró el ${validUntilLabel}. Los precios quedan sujetos a confirmación actual.</div>`
          : ''
      }
      ${
        isConverted
          ? `<div class="status-banner-converted">Estado: Esta proforma ya fue convertida en una venta.</div>`
          : ''
      }

      <div class="grid-2">
        <div class="card">
          <div class="card-title">Datos del cliente</div>
          ${
            hasCustomerFields
              ? `
                ${quote.customerName ? `<div class="info-row"><span class="info-label">Nombre:</span> ${escapeHtml(quote.customerName)}</div>` : ''}
                ${quote.customerPhone ? `<div class="info-row"><span class="info-label">Teléfono:</span> ${escapeHtml(quote.customerPhone)}</div>` : ''}
                ${quote.customerRuc ? `<div class="info-row"><span class="info-label">RUC / Cédula:</span> ${escapeHtml(quote.customerRuc)}</div>` : ''}
                ${quote.customerAddress ? `<div class="info-row"><span class="info-label">Dirección:</span> ${escapeHtml(quote.customerAddress)}</div>` : ''}
                ${quote.vehicleInfo ? `<div class="info-row"><span class="info-label">Vehículo:</span> ${escapeHtml(quote.vehicleInfo)}</div>` : ''}
              `
              : `<div class="info-row">Cliente general / Sin datos específicos registrados</div>`
          }
        </div>
        <div class="card">
          <div class="card-title">Información de la proforma</div>
          <div class="info-row"><span class="info-label">Vigencia:</span> ${validityDays} ${validityDays === 1 ? 'día calendario' : 'días calendario'}</div>
          <div class="info-row"><span class="info-label">Fecha límite:</span> ${validUntilLabel}</div>
          ${creatorName ? `<div class="info-row"><span class="info-label">Elaborada por:</span> ${escapeHtml(creatorName)}</div>` : ''}
          <div class="info-row"><span class="info-label">Moneda:</span> ${escapeHtml(currency)}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th class="col-num">#</th>
            <th>Descripción</th>
            <th class="col-qty">Cantidad</th>
            <th class="col-price">Precio unit.</th>
            ${hasDiscountColumn ? `<th class="col-disc">Desc.</th>` : ''}
            <th class="col-total">Total</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="bottom-grid">
        <div class="notes-col">
          ${
            quote.notes
              ? `<div class="notes-box"><strong>Notas</strong>${escapeHtml(quote.notes)}</div>`
              : ''
          }
          ${
            quote.conditions
              ? `<div class="notes-box"><strong>Condiciones comerciales</strong>${escapeHtml(quote.conditions)}</div>`
              : ''
          }
        </div>
        <div class="totals-box">
          <div class="t-line">
            <span>Subtotal</span>
            <span class="nowrap">${escapeHtml(formatQuoteMoney(subtotal, currency))}</span>
          </div>
          ${
            listDiscountTotal > 0
              ? `<div class="t-line">
                  <span>Ahorro por tarifa / lista</span>
                  <span class="nowrap">-${escapeHtml(formatQuoteMoney(listDiscountTotal, currency))}</span>
                </div>`
              : ''
          }
          ${
            discountAmount > 0
              ? `<div class="t-line">
                  <span>Descuento global</span>
                  <span class="nowrap">-${escapeHtml(formatQuoteMoney(discountAmount, currency))}</span>
                </div>`
              : ''
          }
          ${
            taxEnabled
              ? `<div class="t-line">
                  <span>IVA (${escapeHtml(taxPctLabel)})${taxIncluded ? ' (incluido)' : ''}</span>
                  <span class="nowrap">${escapeHtml(formatQuoteMoney(taxAmount, currency))}</span>
                </div>`
              : ''
          }
          <div class="t-grand">
            <span>Total proforma</span>
            <span class="nowrap">${escapeHtml(formatQuoteMoney(total, currency))}</span>
          </div>
        </div>
      </div>

      ${
        footerLines.length
          ? `<div class="footer-extra">${footerLines.map((l) => `<div>${escapeHtml(l)}</div>`).join('')}</div>`
          : ''
      }

      <div class="legal-notice">
        <strong>Proforma. No es un comprobante de venta.</strong>
        <span>Precios sujetos a disponibilidad y cambio sin previo aviso hasta su confirmación de venta.</span>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export const QUOTE_PDF_MAX_BYTES = 500 * 1024;

/**
 * Genera el PDF Hoja Carta de una proforma garantizando un peso <= 500 KB para subirlo y compartirlo por WhatsApp.
 */
export async function generateShareableQuotePdfBlob(quote: PosQuote): Promise<Blob> {
  const attempts: Array<{ omitLogo?: boolean; html2canvasScale?: number }> = [
    {},
    { html2canvasScale: 1.0 },
    { omitLogo: true, html2canvasScale: 0.9 },
    { omitLogo: true, html2canvasScale: 0.75 },
  ];

  let lastBlob: Blob | null = null;
  for (const attempt of attempts) {
    const html = generateQuoteReceiptHtml(quote, {
      format: 'carta',
      omitLogo: attempt.omitLogo,
    });
    const blob = await generateReceiptPdfBlob(html, {
      format: 'carta',
      html2canvasScale: attempt.html2canvasScale,
    });
    lastBlob = blob;
    if (blob.size <= QUOTE_PDF_MAX_BYTES) {
      return blob;
    }
  }

  throw new Error(
    `El PDF de la proforma pesa ${Math.round((lastBlob?.size || 0) / 1024)} KB y supera el límite de 500 KB.`,
  );
}

export function buildQuoteWhatsAppMessage(
  quote: Pick<PosQuote, 'quoteNumber' | 'expiresAt' | 'validUntilLabel' | 'issuer'>,
  url: string,
  fallbackBusinessName?: string | null,
): string {
  const businessName = (quote.issuer?.name || fallbackBusinessName || 'nuestro negocio').trim();
  const validUntilRaw = (quote.validUntilLabel || '').trim();
  const validUntil = /^\d{2}\/\d{2}\/\d{4}$/.test(validUntilRaw)
    ? validUntilRaw
    : quote.expiresAt
      ? formatManaguaDate(quote.expiresAt)
      : validUntilRaw || '—';

  return `Hola, le comparto la proforma ${quote.quoteNumber} de ${businessName}, válida hasta ${validUntil}: ${url}`;
}


