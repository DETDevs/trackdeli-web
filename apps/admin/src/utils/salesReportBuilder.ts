import {
  ReportDocument,
  ReportKeyValueRow,
  ReportPeriodInfo,
  ReportTableRow,
  ReportTableSubRow,
} from '../types/report';
import { formatCurrency } from './formatters';
import { formatDateTime } from './formatDate';
import {
  buildReportBusinessHeader,
  DEFAULT_REPORT_FOOTER_TEXT,
  formatCordobasFromCents,
  sanitizeForbiddenPrintTerms,
  toCents,
} from './reportHelpers';
import { formatManaguaDateTime } from './dateManagua';

export function formatPaymentMethodDisplay(method?: string | null): string {
  switch ((method || '').toUpperCase()) {
    case 'EFECTIVO':
      return 'Efectivo';
    case 'TARJETA':
      return 'Tarjeta';
    case 'TRANSFERENCIA':
      return 'Transferencia';
    case 'CREDITO':
      return 'Crédito';
    case 'MIXTO':
      return 'Mixto';
    case 'PEDIDOSYA_APP':
      return 'PedidosYa (App)';
    case 'OTROS':
    case 'OTRO':
      return 'Otro';
    case 'ALL':
      return 'Todos';
    default:
      return method || '—';
  }
}

export function formatSaleStatusDisplay(status?: string | null, isVoided?: boolean): string {
  if (isVoided || status === 'CANCELLED' || status === 'VOIDED') return 'Anulada';
  if (status === 'PARTIALLY_RETURNED') return 'Dev. parcial';
  if (status === 'RETURNED') return 'Devuelta';
  return 'Pagada';
}

export interface BuildSalesHistoryReportParams {
  sales: any[];
  matchingReturns: any[];
  period: ReportPeriodInfo;
  statusFilter?: string;
  methodFilter?: string;
  channelFilter?: string;
  searchQuery?: string;
  includeItems?: boolean;
  business: any;
  branchName?: string | null;
  user: any;
}

export function buildSalesHistoryReportDocument(
  params: BuildSalesHistoryReportParams
): ReportDocument {
  const {
    sales,
    matchingReturns,
    period,
    statusFilter = 'ALL',
    methodFilter = 'ALL',
    channelFilter = 'ALL',
    searchQuery = '',
    includeItems = false,
    business,
    branchName,
    user,
  } = params;

  const isSaleVoided = (s: any) =>
    s.isVoided || s.status === 'CANCELLED' || s.status === 'VOIDED';

  const nonCancelledSales = sales.filter((s) => !isSaleVoided(s));
  const cancelledSales = sales.filter((s) => isSaleVoided(s));

  const totalSalesCents = nonCancelledSales.reduce((acc, s) => acc + toCents(s.total ?? s.netTotal), 0);
  const completedCount = nonCancelledSales.length;
  const avgTicketAmount = completedCount > 0 ? totalSalesCents / 100 / completedCount : 0;

  const cancelledCount = cancelledSales.length;
  const cancelledAmountCents = cancelledSales.reduce((acc, s) => acc + toCents(s.total ?? s.netTotal), 0);

  const returnsCount = matchingReturns.length;
  const returnsAmountCents = matchingReturns.reduce(
    (acc, r) => acc + toCents(r.totalAmount ?? r.refundAmount),
    0
  );

  // Totales por método de pago sobre ventas no anuladas del filtro activo
  const methodTotalsCents: Record<string, number> = {
    EFECTIVO: 0,
    TARJETA: 0,
    TRANSFERENCIA: 0,
    CREDITO: 0,
    OTROS: 0,
  };

  for (const sale of nonCancelledSales) {
    const rawKey = String(sale.paymentMethod || 'OTROS').toUpperCase();
    const key = rawKey === 'OTRO' ? 'OTROS' : rawKey;
    const saleAmount = toCents(sale.total ?? sale.netTotal);
    if (key in methodTotalsCents) {
      methodTotalsCents[key] += saleAmount;
    } else {
      methodTotalsCents.OTROS += saleAmount;
    }
  }

  const summaryRows: ReportKeyValueRow[] = [
    {
      label: 'Ventas totales',
      value: formatCordobasFromCents(totalSalesCents),
      isTotal: true,
      doubleHeight: true,
    },
    {
      label: 'Cantidad de comprobantes',
      value: String(completedCount),
    },
    {
      label: 'Ticket promedio',
      value: formatCurrency(avgTicketAmount),
    },
    {
      label: 'Anuladas (cant. / monto)',
      value: `${cancelledCount} (${formatCordobasFromCents(cancelledAmountCents)})`,
      tone: cancelledCount > 0 ? 'negative' : 'default',
    },
    {
      label: 'Devoluciones (cant. / monto)',
      value: `${returnsCount} (${formatCordobasFromCents(returnsAmountCents)})`,
      tone: returnsCount > 0 ? 'warning' : 'default',
    },
  ];

  const paymentRows: ReportKeyValueRow[] = [
    { label: 'Efectivo', value: formatCordobasFromCents(methodTotalsCents.EFECTIVO) },
    { label: 'Tarjeta', value: formatCordobasFromCents(methodTotalsCents.TARJETA) },
    { label: 'Transferencia', value: formatCordobasFromCents(methodTotalsCents.TRANSFERENCIA) },
    { label: 'Crédito', value: formatCordobasFromCents(methodTotalsCents.CREDITO) },
  ];

  if (methodTotalsCents.OTROS > 0) {
    paymentRows.push({
      label: 'Otros',
      value: formatCordobasFromCents(methodTotalsCents.OTROS),
    });
  }

  let extraSubRowCount = 0;

  const rows: ReportTableRow[] = sales.map((sale) => {
    const isVoid = isSaleVoided(sale);
    const invoiceNum = sale.invoiceNumber ? `#${sale.invoiceNumber}` : '—';
    const clientName = sale.customer?.name || sale.customerName || 'Cliente general';
    const cashierName = sale.cashier?.name || sale.cashierName || 'Cajero';
    const netTotal = sale.total ?? sale.netTotal ?? 0;

    let subRows: ReportTableSubRow[] | undefined;
    if (includeItems && Array.isArray(sale.items) && sale.items.length > 0) {
      subRows = sale.items.map((item: any) => {
        const qty = item.quantity ?? 1;
        const pName = sanitizeForbiddenPrintTerms(
          item.productName || item.product?.name || 'Producto'
        );
        const price = item.unitPrice ?? 0;
        const subtotal = item.subtotal ?? qty * price;
        const discountVal = item.discount ?? 0;
        const descText =
          discountVal > 0 ? ` (desc: -${formatCurrency(discountVal)})` : '';

        return {
          left: `${qty} × ${pName} @ ${formatCurrency(price)}${descText}`,
          right: formatCurrency(subtotal),
        };
      });
      extraSubRowCount += (subRows as ReportTableSubRow[]).length;
    }

    return {
      cells: {
        invoice: invoiceNum,
        dateTime: formatDateTime(sale.createdAt),
        customer: sanitizeForbiddenPrintTerms(clientName),
        cashier: sanitizeForbiddenPrintTerms(cashierName),
        method: formatPaymentMethodDisplay(sale.paymentMethod),
        status: formatSaleStatusDisplay(sale.status, isVoid),
        total: formatCurrency(netTotal),
      },
      subRows,
      highlight: isVoid,
    };
  });

  const filtersParts: string[] = [];
  filtersParts.push(`Período: ${period.label || 'Personalizado'}`);
  filtersParts.push(`Estado: ${statusFilter === 'ALL' ? 'Todos' : statusFilter}`);
  filtersParts.push(`Pago: ${formatPaymentMethodDisplay(methodFilter)}`);
  if (channelFilter && channelFilter !== 'ALL') {
    filtersParts.push(`Canal: ${channelFilter}`);
  }
  filtersParts.push(`Búsqueda: ${searchQuery.trim() ? `"${searchQuery.trim()}"` : '—'}`);
  if (includeItems) {
    filtersParts.push('Detalle de productos: Sí');
  }

  const filtersText = sanitizeForbiddenPrintTerms(filtersParts.join(' · '));

  return {
    reportKey: 'sales_history',
    reportSlug: 'Historial_Ventas',
    title: 'Historial de ventas y comprobantes',
    business: buildReportBusinessHeader(business, branchName, user),
    period,
    filtersText,
    printedBy: user?.name || user?.email || 'Usuario',
    printedAt: formatManaguaDateTime(new Date()),
    rowCount: rows.length + extraSubRowCount,
    sections: [
      {
        type: 'keyValue',
        title: 'Resumen de ventas y cobros',
        emptyMessage: 'Sin datos en el período',
        rows: summaryRows,
      },
      {
        type: 'keyValue',
        title: 'Totales por método de pago',
        emptyMessage: 'Sin datos en el período',
        rows: paymentRows,
      },
      {
        type: 'table',
        title: `Detalle de comprobantes (${rows.length} comprobante(s))`,
        emptyMessage: 'Sin comprobantes en el período seleccionado',
        columns: [
          { key: 'invoice', label: 'Comprobante', align: 'left', mono: true },
          { key: 'dateTime', label: 'Fecha y Hora', align: 'left', mono: true },
          { key: 'customer', label: 'Cliente', align: 'left' },
          { key: 'cashier', label: 'Cajero', align: 'left' },
          { key: 'method', label: 'Método', align: 'left' },
          { key: 'status', label: 'Estado', align: 'center' },
          { key: 'total', label: 'Total', align: 'right', mono: true },
        ],
        rows,
        totalsRows: [
          {
            label: 'Total comprobantes válidos',
            value: formatCordobasFromCents(totalSalesCents),
            isTotal: true,
            doubleHeight: true,
          },
        ],
      },
    ],
    footerText: DEFAULT_REPORT_FOOTER_TEXT,
  };
}

export interface BuildReturnsHistoryReportParams {
  returns: any[];
  period: ReportPeriodInfo;
  searchQuery?: string;
  business: any;
  branchName?: string | null;
  user: any;
}

export function buildReturnsHistoryReportDocument(
  params: BuildReturnsHistoryReportParams
): ReportDocument {
  const { returns, period, searchQuery = '', business, branchName, user } = params;

  const totalRefundCents = returns.reduce(
    (acc, r) => acc + toCents(r.totalAmount ?? r.refundAmount),
    0
  );

  const rows: ReportTableRow[] = returns.map((r) => {
    const origInvoice = r.sale?.invoiceNumber ? `#${r.sale.invoiceNumber}` : '—';
    const productsText = Array.isArray(r.items) && r.items.length > 0
      ? r.items
          .map(
            (i: any) =>
              `${i.quantity ?? 1} × ${sanitizeForbiddenPrintTerms(i.productName || i.product?.name || 'Producto')}`
          )
          .join(', ')
      : 'Productos varios';

    const reasonText = sanitizeForbiddenPrintTerms(r.reason || 'Sin motivo');
    const refundMethod = formatPaymentMethodDisplay(r.refundMethod);
    const amountVal = r.totalAmount ?? r.refundAmount ?? 0;

    return {
      cells: {
        originalReceipt: origInvoice,
        date: formatDateTime(r.createdAt),
        products: productsText,
        reason: reasonText,
        method: refundMethod,
        amount: formatCurrency(amountVal),
      },
    };
  });

  const filtersParts: string[] = [
    `Período: ${period.label || 'Personalizado'}`,
    `Búsqueda: ${searchQuery.trim() ? `"${searchQuery.trim()}"` : '—'}`,
  ];

  return {
    reportKey: 'returns_history',
    reportSlug: 'Historial_Devoluciones',
    title: 'Historial de devoluciones',
    business: buildReportBusinessHeader(business, branchName, user),
    period,
    filtersText: sanitizeForbiddenPrintTerms(filtersParts.join(' · ')),
    printedBy: user?.name || user?.email || 'Usuario',
    printedAt: formatManaguaDateTime(new Date()),
    rowCount: rows.length,
    sections: [
      {
        type: 'keyValue',
        title: 'Resumen de devoluciones',
        emptyMessage: 'Sin devoluciones en el período',
        rows: [
          {
            label: 'Total reintegrado',
            value: formatCordobasFromCents(totalRefundCents),
            isTotal: true,
            doubleHeight: true,
            tone: 'warning',
          },
          {
            label: 'Cantidad de devoluciones',
            value: String(returns.length),
          },
        ],
      },
      {
        type: 'table',
        title: `Detalle de devoluciones (${rows.length})`,
        emptyMessage: 'Sin devoluciones registradas en el período',
        columns: [
          { key: 'originalReceipt', label: 'Comp. original', align: 'left', mono: true },
          { key: 'date', label: 'Fecha y Hora', align: 'left', mono: true },
          { key: 'products', label: 'Productos devueltos', align: 'left' },
          { key: 'reason', label: 'Motivo', align: 'left' },
          { key: 'method', label: 'Reintegro', align: 'left' },
          { key: 'amount', label: 'Monto', align: 'right', mono: true },
        ],
        rows,
        totalsRows: [
          {
            label: 'Total general de devoluciones',
            value: formatCordobasFromCents(totalRefundCents),
            isTotal: true,
            doubleHeight: true,
          },
        ],
      },
    ],
    footerText: DEFAULT_REPORT_FOOTER_TEXT,
  };
}
