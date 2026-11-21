import type { PosTableOrder, PosTableSubAccount } from 'api-client';
import { formatCurrency } from './formatters';
import { formatManaguaDateTime } from './dateManagua';
import { calculateTipFromTotal } from './saleCalculation';

export interface PreBillBusinessInfo {
  name?: string | null;
  address?: string | null;
  phone?: string | null;
  taxId?: string | null;
}

export interface GeneratePreBillHtmlInput {
  order: PosTableOrder;
  subAccount?: PosTableSubAccount | null;
  business?: PreBillBusinessInfo | null;
  currency?: string;
}

const escapeHtml = (val: unknown): string =>
  String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatTableLabel = (raw?: string | null): string => {
  const clean = String(raw || '').trim();
  if (!clean) return 'Mesa';
  return /^mesa\s+/i.test(clean) ? clean : `Mesa ${clean}`;
};

export function generatePreBillHtml({
  order,
  subAccount,
  business,
  currency = 'NIO',
}: GeneratePreBillHtmlInput): string {
  const bizName = escapeHtml(business?.name || 'NEXOL POS');
  const tableLabel = escapeHtml(formatTableLabel(order.table?.number));
  const zoneLabel = order.table?.zoneName ? escapeHtml(order.table.zoneName) : null;
  const waiterLabel =
    order.assignedWaiter?.name || order.openedByWaiterName || null;
  const nowStr = escapeHtml(formatManaguaDateTime(new Date().toISOString()));

  const subtotal = subAccount ? Number(subAccount.subtotal || 0) : Number(order.subtotal || 0);
  const discount = subAccount ? Number(subAccount.discount || 0) : Number(order.discountTotal || 0);
  const tax = subAccount ? Number(subAccount.tax || 0) : Number(order.taxTotal || 0);
  const total = subAccount ? Number(subAccount.total || 0) : Number(order.total || 0);

  const lines = subAccount ? subAccount.items || [] : order.items || [];

  const tipSource =
    subAccount?.tipMode && subAccount.tipMode !== 'NONE' ? subAccount : order;
  const tipMode = String(tipSource.tipMode || 'NONE').toUpperCase();
  let suggestedTipLabel: string | null = null;
  let suggestedTipValue: string | null = null;

  if (tipMode === 'PERCENT') {
    const pct = Number(tipSource.tipPercent || order.tipPolicy?.tipDefaultPercent || 10);
    const tipNio = calculateTipFromTotal(total, pct);
    if (tipNio > 0) {
      suggestedTipLabel = `Propina sugerida (${pct} %)`;
      suggestedTipValue = formatCurrency(tipNio, currency);
    }
  } else if (tipMode === 'CUSTOM' && Number(tipSource.tipAmount || 0) > 0) {
    const tipCur = String(tipSource.tipCurrency || 'NIO').toUpperCase() === 'USD' ? 'USD' : currency;
    suggestedTipLabel = 'Propina indicada';
    suggestedTipValue = formatCurrency(Number(tipSource.tipAmount), tipCur);
  } else if (order.tipPolicy?.tipEnabled && Number(order.tipPolicy.tipDefaultPercent || 0) > 0 && total > 0) {
    const pct = Number(order.tipPolicy.tipDefaultPercent);
    const tipNio = calculateTipFromTotal(total, pct);
    if (tipNio > 0) {
      suggestedTipLabel = `Propina sugerida (${pct} %)`;
      suggestedTipValue = formatCurrency(tipNio, currency);
    }
  }

  const rowsHtml =
    lines.length > 0
      ? lines
          .map((item) => {
            const qty = Number(item.quantity || 0);
            const qtyStr = Number.isInteger(qty) ? String(qty) : qty.toFixed(2);
            const unitPrice = Number(item.unitPrice || 0);
            const lineSubtotal =
              item.subtotal !== undefined
                ? Number(item.subtotal)
                : Math.round(qty * unitPrice * 100) / 100;
            return `
              <tr>
                <td class="col-qty">${escapeHtml(qtyStr)}</td>
                <td class="col-desc">${escapeHtml(item.productName)}</td>
                <td class="col-amt">${escapeHtml(formatCurrency(lineSubtotal, currency))}</td>
              </tr>
            `;
          })
          .join('')
      : `
        <tr>
          <td class="col-qty">1</td>
          <td class="col-desc">${escapeHtml(subAccount ? subAccount.label : 'Consumo de mesa')}</td>
          <td class="col-amt">${escapeHtml(formatCurrency(subtotal, currency))}</td>
        </tr>
      `;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Pre-cuenta ${tableLabel}</title>
  <style>
    @page { size: 80mm auto; margin: 2mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      width: 76mm;
      max-width: 80mm;
      margin: 0 auto;
      padding: 6px 4px;
      color: #0f0f0f;
      font-size: 12px;
      line-height: 1.35;
      background: #ffffff;
    }
    .center { text-align: center; }
    .bold { font-weight: 700; }
    .divider { border-top: 1px dashed #333333; margin: 6px 0; }
    .badge {
      border: 1px solid #0f0f0f;
      padding: 3px 6px;
      margin: 6px 0;
      font-size: 13px;
      font-weight: 700;
      text-align: center;
      letter-spacing: 0.5px;
    }
    .warning {
      font-size: 12px;
      font-weight: 700;
      text-align: center;
      margin-bottom: 4px;
    }
    .meta { font-size: 12px; margin: 2px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 4px; }
    th { text-align: left; border-bottom: 1px solid #333333; padding: 3px 0; font-size: 12px; }
    td { padding: 3px 0; vertical-align: top; font-size: 12px; }
    .col-qty { width: 14%; white-space: nowrap; }
    .col-desc { width: 52%; padding-right: 4px; }
    .col-amt { width: 34%; text-align: right; white-space: nowrap; }
    .summary-row { display: flex; justify-content: space-between; margin: 2px 0; font-size: 12px; }
    .summary-total { display: flex; justify-content: space-between; margin-top: 4px; font-size: 15px; font-weight: 700; }
  </style>
</head>
<body>
  <div class="center bold" style="font-size: 14px;">${bizName}</div>
  ${business?.address ? `<div class="center">${escapeHtml(business.address)}</div>` : ''}
  ${business?.phone ? `<div class="center">Tel: ${escapeHtml(business.phone)}</div>` : ''}
  ${business?.taxId ? `<div class="center">RUC: ${escapeHtml(business.taxId)}</div>` : ''}

  <div class="badge">PRE-CUENTA</div>
  <div class="warning">No es un comprobante de venta</div>

  <div class="divider"></div>
  <div class="meta"><span class="bold">Mesa:</span> ${tableLabel}${zoneLabel ? ` · ${zoneLabel}` : ''}</div>
  ${subAccount ? `<div class="meta"><span class="bold">Cuenta:</span> ${escapeHtml(subAccount.label)}</div>` : ''}
  ${waiterLabel ? `<div class="meta"><span class="bold">Atendió:</span> ${escapeHtml(waiterLabel)}</div>` : ''}
  <div class="meta"><span class="bold">Fecha:</span> ${nowStr}</div>
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
    <span>${escapeHtml(formatCurrency(subtotal, currency))}</span>
  </div>
  ${
    discount > 0
      ? `<div class="summary-row"><span>Descuento</span><span>-${escapeHtml(formatCurrency(discount, currency))}</span></div>`
      : ''
  }
  ${
    tax > 0
      ? `<div class="summary-row"><span>Impuesto${order.taxRate ? ` (${order.taxRate}%)` : ''}</span><span>${escapeHtml(formatCurrency(tax, currency))}</span></div>`
      : ''
  }
  <div class="divider"></div>
  <div class="summary-total">
    <span>TOTAL</span>
    <span>${escapeHtml(formatCurrency(total, currency))}</span>
  </div>

  ${
    suggestedTipLabel && suggestedTipValue
      ? `
        <div class="divider"></div>
        <div class="summary-row">
          <span>${escapeHtml(suggestedTipLabel)}</span>
          <span>${escapeHtml(suggestedTipValue)}</span>
        </div>
        <div class="center" style="font-size: 12px;">(Voluntaria · no incluida en el total)</div>
      `
      : ''
  }

  <div class="divider"></div>
  <div class="warning">No es un comprobante de venta</div>
  <div class="center">Revisá tu consumo antes de pagar.</div>
</body>
</html>`;
}
