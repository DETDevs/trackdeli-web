import type {
  PosReceiptSettingsData,
  PosTableBill,
  PosTableBillSnapshot,
} from 'api-client';
import { formatCurrency } from './formatters';
import { formatManaguaDateTime } from './dateManagua';

export interface GeneratePreBillHtmlInput {
  bill: PosTableBill;
  receiptSettings?: PosReceiptSettingsData | null;
  totalSubAccounts?: number;
}

const escapeHtml = (val: unknown): string =>
  String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const sanitizeLogoSrc = (raw?: string | null): string | null => {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://')
  ) {
    return trimmed;
  }
  return null;
};

export const formatBillSubAccountLabel = (
  snapshot?: Pick<PosTableBillSnapshot, 'subAccountLabel' | 'splitMode'> | null,
  totalSubAccounts?: number,
): string | null => {
  const raw = String(snapshot?.subAccountLabel || '').trim();
  if (!raw) return null;
  if (
    snapshot?.splitMode === 'EQUAL' &&
    totalSubAccounts &&
    totalSubAccounts > 1 &&
    !raw.toLowerCase().includes(' de ')
  ) {
    return `${raw} de ${totalSubAccounts}`;
  }
  return raw;
};

export function generatePreBillHtml({
  bill,
  receiptSettings,
  totalSubAccounts,
}: GeneratePreBillHtmlInput): string {
  const snapshot = bill.snapshot;
  const currency = snapshot.currency || 'NIO';
  const paperWidthMm = receiptSettings?.paperWidthMm === 58 ? 58 : 80;
  const contentWidthMm = paperWidthMm === 58 ? 54 : 76;
  const logoMaxHeightPx = paperWidthMm === 58 ? 44 : 56;

  const isReprint = Boolean(bill.isReprint || snapshot.isReprint);
  const sequenceNumber = Number(bill.sequence || snapshot.sequence || 1);
  const legendText =
    String(snapshot.legend || '').trim() || 'Cuenta. No es un comprobante de pago.';

  const showLogo = Boolean(receiptSettings?.showLogo && receiptSettings?.logoImage);
  const safeLogoSrc = showLogo ? sanitizeLogoSrc(receiptSettings?.logoImage) : null;
  const showBusinessName = receiptSettings?.showBusinessName !== false;
  const showAddress = receiptSettings?.showAddress !== false;
  const showPhone = receiptSettings?.showPhone !== false;
  const showTaxId = receiptSettings?.showTaxId === true;
  const showCashier = receiptSettings?.showCashier !== false;
  const showCustomer = receiptSettings?.showCustomer !== false;
  const showTaxBreakdown = receiptSettings?.showTaxBreakdown !== false;

  const headerLines = Array.isArray(receiptSettings?.headerLines)
    ? receiptSettings.headerLines.map((l) => String(l || '').trim()).filter(Boolean)
    : [];
  const footerLines = Array.isArray(receiptSettings?.footerLines)
    ? receiptSettings.footerLines.map((l) => String(l || '').trim()).filter(Boolean)
    : [];

  const tableLabel = snapshot.tableLabel || `Mesa ${snapshot.tableNumber || ''}`.trim();
  const subAccountDisplay = formatBillSubAccountLabel(snapshot, totalSubAccounts);
  const requestedAtFormatted = formatManaguaDateTime(
    snapshot.requestedAt || bill.createdAt,
  );

  const lines =
    Array.isArray(snapshot.lines) && snapshot.lines.length > 0
      ? snapshot.lines
      : Array.isArray(snapshot.items)
      ? snapshot.items
      : [];

  const rowsHtml = lines
    .map((line) => {
      const qty = Number(line.quantity || 0);
      const qtyStr = Number.isInteger(qty) ? String(qty) : qty.toFixed(2);
      const noteHtml = line.notes
        ? `<div class="line-note">${escapeHtml(line.notes)}</div>`
        : '';
      return `
        <tr>
          <td class="col-qty">${escapeHtml(qtyStr)}</td>
          <td class="col-desc">${escapeHtml(line.productName)}${noteHtml}</td>
          <td class="col-amt">${escapeHtml(formatCurrency(Number(line.subtotal || 0), currency))}</td>
        </tr>
      `;
    })
    .join('');

  const discountTotal = Number(snapshot.discountTotal ?? snapshot.discountAmount ?? 0);
  const discountPercent = Number(snapshot.discountPercent || 0);
  const taxTotal = Number(snapshot.taxTotal ?? snapshot.taxAmount ?? 0);
  const taxRate = Number(snapshot.taxRate || 0);
  const taxLabel = snapshot.taxIncluded
    ? `IVA incluido (${taxRate} %)`
    : `IVA (${taxRate} %)`;

  const tipInfo =
    snapshot.tip &&
    String(snapshot.tip.mode || '').toUpperCase() !== 'NONE' &&
    Number(snapshot.tip.amount || 0) > 0
      ? snapshot.tip
      : null;

  const tipCurrency = String(tipInfo?.currency || currency).toUpperCase();
  const tipLabel =
    tipInfo?.mode === 'PERCENT' && tipInfo.percent
      ? `Propina sugerida (${tipInfo.percent} %)`
      : 'Propina sugerida';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Cuenta ${escapeHtml(tableLabel)}</title>
  <style>
    @page { size: ${paperWidthMm}mm auto; margin: 2mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      width: ${contentWidthMm}mm;
      max-width: ${paperWidthMm}mm;
      margin: 0 auto;
      padding: 6px 4px;
      color: #0f0f0f;
      font-size: 12px;
      line-height: 1.35;
      background: #ffffff;
      word-break: break-word;
    }
    .center { text-align: center; }
    .bold { font-weight: 700; }
    .logo {
      display: block;
      margin: 0 auto 6px auto;
      max-width: 100%;
      max-height: ${logoMaxHeightPx}px;
      object-fit: contain;
    }
    .biz-name { font-size: 14px; font-weight: 700; text-align: center; }
    .divider { border-top: 1px dashed #333333; margin: 6px 0; }
    .title-box {
      border: 1.5px solid #0f0f0f;
      padding: 4px 6px;
      margin: 6px 0 4px 0;
      font-size: 14px;
      font-weight: 700;
      text-align: center;
      letter-spacing: 0.4px;
    }
    .reprint-tag {
      border: 1px dashed #0f0f0f;
      padding: 2px 6px;
      margin: 4px 0;
      font-size: 12px;
      font-weight: 700;
      text-align: center;
    }
    .legend-box {
      border: 1px solid #0f0f0f;
      padding: 4px 6px;
      margin: 6px 0;
      font-size: 12px;
      font-weight: 700;
      text-align: center;
    }
    .subaccount-tag {
      font-size: 13px;
      font-weight: 700;
      text-align: center;
      margin: 4px 0;
    }
    .meta { font-size: 12px; margin: 2px 0; }
    .extra-line { font-size: 12px; text-align: center; margin: 2px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 4px; }
    th {
      text-align: left;
      border-bottom: 1px solid #333333;
      padding: 3px 0;
      font-size: 12px;
    }
    td { padding: 3px 0; vertical-align: top; font-size: 12px; }
    .col-qty { width: 16%; white-space: nowrap; padding-right: 4px; }
    .col-desc { width: 48%; padding-right: 4px; }
    .col-amt { width: 36%; text-align: right; white-space: nowrap; }
    .line-note { font-size: 12px; color: #333333; margin-top: 1px; }
    .summary-row {
      display: flex;
      justify-content: space-between;
      gap: 6px;
      margin: 2px 0;
      font-size: 12px;
    }
    .summary-total {
      display: flex;
      justify-content: space-between;
      gap: 6px;
      margin-top: 4px;
      font-size: 15px;
      font-weight: 700;
    }
    .tip-note {
      font-size: 12px;
      text-align: center;
      margin-top: 3px;
    }
  </style>
</head>
<body>
  ${safeLogoSrc ? `<img src="${escapeHtml(safeLogoSrc)}" class="logo" alt="Logo del negocio" />` : ''}
  ${showBusinessName ? `<div class="biz-name">${escapeHtml(snapshot.businessName || 'Negocio')}</div>` : ''}
  ${showAddress && snapshot.businessAddress ? `<div class="center">${escapeHtml(snapshot.businessAddress)}</div>` : ''}
  ${showPhone && snapshot.businessPhone ? `<div class="center">Tel: ${escapeHtml(snapshot.businessPhone)}</div>` : ''}
  ${showTaxId && snapshot.businessTaxId ? `<div class="center">RUC: ${escapeHtml(snapshot.businessTaxId)}</div>` : ''}
  ${headerLines.map((line) => `<div class="extra-line">${escapeHtml(line)}</div>`).join('')}

  <div class="title-box">Cuenta</div>
  ${isReprint ? `<div class="reprint-tag">Reimpresión #${escapeHtml(sequenceNumber)}</div>` : ''}
  ${subAccountDisplay ? `<div class="subaccount-tag">${escapeHtml(subAccountDisplay)}</div>` : ''}
  <div class="center bold">${escapeHtml(legendText)}</div>

  <div class="divider"></div>
  <div class="meta"><span class="bold">Mesa:</span> ${escapeHtml(tableLabel)}${snapshot.zoneName ? ` · ${escapeHtml(snapshot.zoneName)}` : ''}</div>
  ${snapshot.waiterName ? `<div class="meta"><span class="bold">Mesero:</span> ${escapeHtml(snapshot.waiterName)}</div>` : ''}
  ${showCashier && snapshot.requestedByName ? `<div class="meta"><span class="bold">Emitida por:</span> ${escapeHtml(snapshot.requestedByName)}</div>` : ''}
  ${showCustomer && snapshot.customerName ? `<div class="meta"><span class="bold">Cliente:</span> ${escapeHtml(snapshot.customerName)}</div>` : ''}
  <div class="meta"><span class="bold">Fecha:</span> ${escapeHtml(requestedAtFormatted)}</div>
  <div class="divider"></div>

  <table>
    <thead>
      <tr>
        <th class="col-qty">Cant.</th>
        <th class="col-desc">Producto</th>
        <th class="col-amt">Importe</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="divider"></div>
  <div class="summary-row">
    <span>Subtotal</span>
    <span>${escapeHtml(formatCurrency(Number(snapshot.subtotal || 0), currency))}</span>
  </div>
  ${
    discountTotal > 0
      ? `<div class="summary-row"><span>Descuento${discountPercent > 0 ? ` (${escapeHtml(discountPercent)} %)` : ''}</span><span>-${escapeHtml(formatCurrency(discountTotal, currency))}</span></div>`
      : ''
  }
  ${
    showTaxBreakdown && snapshot.taxEnabled && taxTotal > 0
      ? `<div class="summary-row"><span>${escapeHtml(taxLabel)}</span><span>${escapeHtml(formatCurrency(taxTotal, currency))}</span></div>`
      : ''
  }
  <div class="divider"></div>
  <div class="summary-total">
    <span>Total</span>
    <span>${escapeHtml(formatCurrency(Number(snapshot.total || 0), currency))}</span>
  </div>

  ${
    tipInfo
      ? `
        <div class="divider"></div>
        <div class="summary-row">
          <span>${escapeHtml(tipLabel)}</span>
          <span>${escapeHtml(formatCurrency(Number(tipInfo.amount || 0), tipCurrency))}</span>
        </div>
        ${
          tipCurrency === currency
            ? `
              <div class="summary-row bold" style="font-size: 13px;">
                <span>Total con propina sugerida</span>
                <span>${escapeHtml(formatCurrency(Number(snapshot.totalWithTip || 0), currency))}</span>
              </div>
            `
            : ''
        }
        <div class="tip-note">La propina es voluntaria y no está incluida en el total.</div>
      `
      : ''
  }

  <div class="divider"></div>
  <div class="legend-box">${escapeHtml(legendText)}</div>
  ${footerLines.map((line) => `<div class="extra-line">${escapeHtml(line)}</div>`).join('')}
</body>
</html>`;
}
