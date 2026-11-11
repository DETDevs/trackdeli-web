import {
  ReportChartTableRow,
  ReportDocument,
  ReportKeyValueRow,
  ReportPeriodInfo,
  ReportSection,
  ReportTableRow,
} from '../types/report';
import {
  ReportsSummary,
  SalesByTimeReport,
  SalesByCategoryReport,
  SalesByCashierReport,
  PeriodType,
  ProfitReport,
} from '../types/reports';
import { formatCurrency } from './formatters';
import {
  DEFAULT_REPORT_FOOTER_TEXT,
  buildPeriodFromIsoRange,
  buildPeriodFromYmdRange,
  buildReportBusinessHeader,
  sanitizeForbiddenPrintTerms,
} from './reportHelpers';
import {
  formatManaguaDateTime,
  formatManaguaDate,
  getManaguaTodayYMD,
} from './dateManagua';

// ═══════════════════════════════════════════════════════════════════════════
// MAPA OFICIAL DE FUENTES DE COSTO (INGLÉS → ESPAÑOL)
// ═══════════════════════════════════════════════════════════════════════════

export const COST_SOURCE_LABELS_ES: Record<string, string> = {
  PRODUCT: 'Costo de catálogo',
  PRODUCT_COST: 'Costo de catálogo',
  RECIPE: 'Recetas / Componentes',
  PURCHASE: 'Compras / Entradas',
  LABOR: 'Mano de obra / Servicios',
  BATCH: 'Lote / Vencimiento',
  MANUAL: 'Ajuste manual',
  UNKNOWN: 'Sin costo registrado',
};

export function formatCostSourceEs(source: string | null | undefined): string {
  if (!source) return 'Sin costo';
  const clean = source.trim().toUpperCase();
  return COST_SOURCE_LABELS_ES[clean] || sanitizeForbiddenPrintTerms(source);
}

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS AUXILIARES PARA GANANCIAS COMPLETO (PROFIT SUMMARY & PRODUCTS)
// ═══════════════════════════════════════════════════════════════════════════

export interface ProfitSummaryTotals {
  sales: number;
  coveredSales: number;
  cost: number | null;
  grossProfit: number;
  marginPercent: number | null;
  discounts: number;
  receipts: number;
  uncoveredRevenue: number;
}

export interface ProfitByDayItem {
  date: string;
  sales: number;
  coveredSales: number;
  cost: number;
  profit: number;
  marginPercent: number | null;
}

export interface ProfitByHourItem {
  hour: number;
  date: string;
  sales: number;
  coveredSales: number;
  cost: number;
  profit: number;
  marginPercent: number | null;
}

export interface ProfitByCategoryItem {
  categoryId: string | null;
  name: string;
  sales: number;
  coveredSales: number;
  cost: number;
  profit: number;
  marginPercent: number | null;
  salesSharePercent?: number;
  sharePercent?: number | null;
}

export interface ProfitByCustomerItem {
  customerId: string | null;
  name: string;
  receipts: number;
  sales: number;
  profit: number;
}

export interface ProfitAlerts {
  lossProducts?: {
    count: number;
    lossAmount: number;
  };
  lowMarginProducts?: {
    count: number;
  };
  missingCost?: {
    count: number;
    revenue: number;
    products?: Array<{ productId: string | null; name: string }>;
  };
}

export interface ProfitSummaryReport {
  period: { from: string; to: string };
  previousPeriod?: { from: string; to: string };
  totals: ProfitSummaryTotals;
  previous?: {
    sales: number;
    coveredSales?: number;
    cost: number | null;
    grossProfit: number;
    marginPercent: number | null;
    discounts?: number;
    receipts?: number;
    uncoveredRevenue?: number;
  } | null;
  costBasis?: 'HISTORICAL' | 'CURRENT' | 'MIXED';
  historicalSharePercent?: number;
  costBasisNote?: string;
  expenses?: { total: number; categories?: any[] } | null;
  netProfit?: number | null;
  netProfitNote?: string | null;
  byDay?: ProfitByDayItem[];
  byHour?: ProfitByHourItem[];
  byCategory?: ProfitByCategoryItem[];
  byCustomer?: ProfitByCustomerItem[];
  counterSales?: {
    receipts: number;
    sales: number;
    profit: number;
  };
  alerts?: ProfitAlerts;
  bestDay?: { date: string; profit: number } | null;
}

export interface ProfitProductItem {
  productId: string | null;
  name: string;
  category?: string;
  categoryId?: string | null;
  unit?: string;
  unitsSold: number;
  sales: number;
  cost: number | null;
  profit: number | null;
  marginPercent: number | null;
  hasCost: boolean;
  cost_source?: string;
  costSource?: string;
}

export interface ProfitProductsResponse {
  items: ProfitProductItem[];
  page: number;
  pageSize: number;
  total: number;
  totals?: {
    sales: number;
    coveredSales: number;
    cost: number | null;
    profit: number | null;
    marginPercent: number | null;
    unitsSold: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER PERÍODO ESTÁNDAR
// ═══════════════════════════════════════════════════════════════════════════

export function buildStandardPeriodInfo(
  period: PeriodType | string,
  customFrom?: string,
  customTo?: string,
  apiPeriod?: { from?: string; to?: string } | null
): { periodInfo: ReportPeriodInfo; periodLabel: string } {
  const periodLabel =
    period === 'today'
      ? 'Hoy'
      : period === 'week'
      ? 'Esta semana'
      : period === 'month'
      ? 'Este mes'
      : period === 'custom' && customFrom && customTo
      ? `Personalizado (${customFrom} a ${customTo})`
      : 'Personalizado';

  if (apiPeriod?.from && apiPeriod?.to) {
    return {
      periodInfo: buildPeriodFromIsoRange(apiPeriod.from, apiPeriod.to, periodLabel),
      periodLabel,
    };
  }

  if (period === 'custom' && customFrom && customTo) {
    return {
      periodInfo: buildPeriodFromYmdRange(customFrom, customTo, periodLabel),
      periodLabel,
    };
  }

  const today = getManaguaTodayYMD();
  if (period === 'today') {
    return {
      periodInfo: buildPeriodFromYmdRange(today, today, periodLabel),
      periodLabel,
    };
  }

  if (period === 'week') {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    const fromYmd = d.toISOString().slice(0, 10);
    return {
      periodInfo: buildPeriodFromYmdRange(fromYmd, today, periodLabel),
      periodLabel,
    };
  }

  if (period === 'month') {
    const [y, m] = today.split('-');
    return {
      periodInfo: buildPeriodFromYmdRange(`${y}-${m}-01`, today, periodLabel),
      periodLabel,
    };
  }

  return {
    periodInfo: buildPeriodFromYmdRange(today, today, periodLabel),
    periodLabel,
  };
}

function formatComparisonNote(
  changePercent: number | null | undefined,
  comparisonLabel = 'período anterior'
): string | undefined {
  if (changePercent === null || changePercent === undefined || Number.isNaN(Number(changePercent))) {
    return undefined;
  }
  const prefix = changePercent > 0 ? `+${changePercent}%` : `${changePercent}%`;
  return `${prefix} vs ${comparisonLabel}`;
}

function formatShortDateEs(ymd: string): string {
  if (!ymd) return '—';
  const parts = ymd.split('-');
  if (parts.length < 3) return ymd;
  const monthNum = parseInt(parts[1], 10);
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const monthName = months[monthNum - 1] || parts[1];
  return `${parseInt(parts[2], 10)} ${monthName}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. REPORTES — VENTAS Y OPERACIONES
// ═══════════════════════════════════════════════════════════════════════════

export interface BuildSalesOperationsReportParams {
  reportsData?: ReportsSummary | null;
  timeData?: SalesByTimeReport | null;
  categoryData?: SalesByCategoryReport | null;
  cashierData?: SalesByCashierReport | null;
  period: PeriodType | string;
  from?: string;
  to?: string;
  channel?: string;
  business: any;
  branchName?: string | null;
  user: any;
}

export function buildSalesOperationsReportDocument(
  params: BuildSalesOperationsReportParams
): ReportDocument {
  const {
    reportsData,
    timeData,
    categoryData,
    cashierData,
    period,
    from,
    to,
    channel,
    business,
    branchName,
    user,
  } = params;

  const apiPeriod =
    (reportsData as any)?.summary?.period || timeData?.period || categoryData?.period || null;
  const { periodInfo, periodLabel } = buildStandardPeriodInfo(period, from, to, apiPeriod);

  const totalSales = Number(reportsData?.totalSales ?? reportsData?.summary?.totalRevenue ?? 0);
  const salesCount = Number(reportsData?.salesCount || 0);
  const averageTicket = Number(reportsData?.averageTicket || 0);
  const lowStockList = reportsData?.lowStockProducts || [];

  const comparisonPeriodLabel =
    period === 'today'
      ? 'ayer'
      : period === 'week'
      ? 'semana anterior'
      : period === 'month'
      ? 'mes anterior'
      : 'período anterior';

  const kpiRows: ReportKeyValueRow[] =
    salesCount === 0 && totalSales === 0
      ? []
      : [
          {
            label: 'Ventas totales cobradas',
            value: formatCurrency(totalSales),
            isTotal: true,
            doubleHeight: true,
            comparisonText: formatComparisonNote(
              reportsData?.comparison?.totalSales?.changePercent,
              comparisonPeriodLabel
            ),
          },
          {
            label: 'Transacciones registradas',
            value: `${salesCount} ${salesCount === 1 ? 'comprobante' : 'comprobantes'}`,
            comparisonText: formatComparisonNote(
              reportsData?.comparison?.salesCount?.changePercent,
              comparisonPeriodLabel
            ),
          },
          {
            label: 'Ticket promedio',
            value: formatCurrency(averageTicket),
            comparisonText: formatComparisonNote(
              reportsData?.comparison?.averageTicket?.changePercent,
              comparisonPeriodLabel
            ),
          },
          {
            label: 'Alertas de stock bajo',
            value: `${lowStockList.length} ${lowStockList.length === 1 ? 'producto' : 'productos'}`,
            tone: lowStockList.length > 0 ? 'warning' : 'positive',
          },
        ];

  const taxAmount = Number(reportsData?.totalTax ?? reportsData?.summary?.totalTax ?? 0);
  const taxableSales = Number(reportsData?.taxableSales ?? reportsData?.summary?.taxableSales ?? 0);
  const exemptSales = Number(reportsData?.exemptSales ?? reportsData?.summary?.exemptSales ?? 0);

  const fiscalRows: ReportKeyValueRow[] =
    salesCount === 0 && totalSales === 0
      ? []
      : [
          {
            label: 'Ventas gravadas',
            value: formatCurrency(taxableSales),
          },
          {
            label: 'Ventas exentas',
            value: formatCurrency(exemptSales),
          },
          {
            label: 'IVA recaudado',
            value: formatCurrency(taxAmount),
            isTotal: true,
          },
        ];

  const cashAmt = Number(reportsData?.totalCash ?? reportsData?.summary?.byPaymentMethod?.['EFECTIVO'] ?? 0);
  const cardAmt = Number(reportsData?.totalCard ?? reportsData?.summary?.byPaymentMethod?.['TARJETA'] ?? 0);
  const transferAmt = Number(
    reportsData?.totalTransfer ?? reportsData?.summary?.byPaymentMethod?.['TRANSFERENCIA'] ?? 0
  );
  const totalPaymentMethods = cashAmt + cardAmt + transferAmt;

  const cashPct = totalPaymentMethods > 0 ? (cashAmt / totalPaymentMethods) * 100 : 0;
  const cardPct = totalPaymentMethods > 0 ? (cardAmt / totalPaymentMethods) * 100 : 0;
  const transferPct = totalPaymentMethods > 0 ? (transferAmt / totalPaymentMethods) * 100 : 0;

  const paymentRows: ReportKeyValueRow[] =
    salesCount === 0 && totalSales === 0
      ? []
      : [
          {
            label: 'Efectivo',
            value: `${formatCurrency(cashAmt)} (${cashPct.toFixed(1)}%)`,
          },
          {
            label: 'Tarjeta',
            value: `${formatCurrency(cardAmt)} (${cardPct.toFixed(1)}%)`,
          },
          {
            label: 'Transferencia',
            value: `${formatCurrency(transferAmt)} (${transferPct.toFixed(1)}%)`,
          },
        ];

  // Si existen otros métodos (por ejemplo CREDITO o MIXTO), agregarlos
  const byMethodMap = (reportsData as any)?.summary?.byPaymentMethod as
    | Record<string, number>
    | undefined;
  if (byMethodMap && totalPaymentMethods > 0) {
    for (const [mKey, rawAmt] of Object.entries(byMethodMap)) {
      if (mKey === 'EFECTIVO' || mKey === 'TARJETA' || mKey === 'TRANSFERENCIA') continue;
      const amt = Number(rawAmt || 0);
      if (amt > 0) {
        const pct = (amt / totalSales) * 100;
        const friendly =
          mKey === 'CREDITO'
            ? 'Crédito'
            : mKey === 'MIXTO'
            ? 'Pago mixto'
            : sanitizeForbiddenPrintTerms(mKey);
        paymentRows.push({
          label: friendly,
          value: `${formatCurrency(amt)} (${pct.toFixed(1)}%)`,
        });
      }
    }
  }

  // Ventas por hora (solo las horas con ventas > 0 o count > 0)
  const hoursWithSales = (timeData?.byHour || []).filter(
    (h) => Number(h.revenue || 0) > 0 || Number(h.count || 0) > 0
  );
  const hourlyRows: ReportChartTableRow[] = hoursWithSales.map((h) => ({
    label: `${String(h.hour).padStart(2, '0')}:00 - ${String((h.hour + 1) % 24).padStart(2, '0')}:00`,
    count: String(h.count || 0),
    value: formatCurrency(h.revenue || 0),
  }));

  // Ventas por día de la semana
  const dowList = timeData?.byDayOfWeek || [];
  const hasAnyDowSales = dowList.some((d) => Number(d.revenue || 0) > 0 || Number(d.count || 0) > 0);
  const dowRows: ReportChartTableRow[] = hasAnyDowSales
    ? dowList.map((d) => ({
        label: d.dayName,
        count: String(d.count || 0),
        value: formatCurrency(d.revenue || 0),
      }))
    : [];

  // Ventas por categoría
  const categories = categoryData?.categories || [];
  const categoryRows: ReportTableRow[] = categories.map((c) => ({
    cells: {
      category: sanitizeForbiddenPrintTerms(c.categoryName || 'Sin categoría'),
      quantity: `${c.quantity}`,
      pct: `${Number(c.percentage || 0).toFixed(1)}%`,
      revenue: formatCurrency(c.revenue || 0),
    },
  }));

  // Ventas por cajero
  const cashiers = cashierData?.cashiers || [];
  const cashierRows: ReportTableRow[] = cashiers.map((c) => ({
    cells: {
      cashier: sanitizeForbiddenPrintTerms(c.cashierName || 'Usuario'),
      count: `${c.salesCount}`,
      avg: formatCurrency(c.averageTicket || 0),
      pct: `${Number(c.percentage || 0).toFixed(1)}%`,
      total: formatCurrency(c.totalSales || 0),
    },
  }));

  // Alertas de stock bajo
  const lowStockRows: ReportTableRow[] = lowStockList.map((prod) => ({
    cells: {
      product: sanitizeForbiddenPrintTerms(prod.name),
      minStock: `${prod.minStock ?? 0}`,
      stock: `${prod.stock ?? 0}`,
      status: Number(prod.stock ?? 0) <= 0 ? 'Agotado' : 'Stock bajo',
    },
    highlight: Number(prod.stock ?? 0) <= 0,
  }));

  const sections: ReportSection[] = [
    {
      type: 'keyValue',
      title: 'Indicadores de ventas y operaciones',
      emptyMessage: 'Sin datos en el período',
      rows: kpiRows,
    },
    {
      type: 'keyValue',
      title: 'Ventas gravadas, exentas e IVA',
      emptyMessage: 'Sin datos en el período',
      rows: fiscalRows,
    },
    {
      type: 'keyValue',
      title: 'Distribución por método de pago',
      emptyMessage: 'Sin datos en el período',
      rows: paymentRows,
    },
    {
      type: 'chartTable',
      title: 'Ventas por hora (horas con movimiento)',
      subtitle:
        timeData?.peakHour && timeData.peakHour.revenue > 0
          ? `Hora pico: ${String(timeData.peakHour.hour).padStart(2, '0')}:00 (${formatCurrency(
              timeData.peakHour.revenue
            )})`
          : undefined,
      emptyMessage: 'Sin datos en el período',
      headers: {
        label: 'Franja horaria',
        countLabel: 'Comprobantes',
        valueLabel: 'Ventas',
      },
      rows: hourlyRows,
    },
    {
      type: 'chartTable',
      title: 'Ventas por día de la semana',
      subtitle:
        timeData?.peakDay && timeData.peakDay.revenue > 0
          ? `Día pico: ${timeData.peakDay.dayName} (${formatCurrency(timeData.peakDay.revenue)})`
          : undefined,
      emptyMessage: 'Sin datos en el período',
      headers: {
        label: 'Día',
        countLabel: 'Comprobantes',
        valueLabel: 'Ventas',
      },
      rows: dowRows,
    },
    {
      type: 'table',
      title: 'Ventas por categoría',
      emptyMessage: 'Sin datos en el período',
      columns: [
        { key: 'category', label: 'Categoría', align: 'left' },
        { key: 'quantity', label: 'Unidades', align: 'right', mono: true },
        { key: 'pct', label: '% total', align: 'right', mono: true },
        { key: 'revenue', label: 'Ventas', align: 'right', mono: true },
      ],
      rows: categoryRows,
      totalsRows:
        categories.length > 0 && categoryData?.totalRevenue !== undefined
          ? [
              {
                label: 'Total categorizado',
                value: formatCurrency(categoryData.totalRevenue),
                isTotal: true,
              },
            ]
          : undefined,
    },
    {
      type: 'table',
      title: 'Ventas por cajero o usuario',
      emptyMessage: 'Sin datos en el período',
      columns: [
        { key: 'cashier', label: 'Cajero / usuario', align: 'left' },
        { key: 'count', label: 'Comprobantes', align: 'right', mono: true },
        { key: 'avg', label: 'Ticket prom.', align: 'right', mono: true },
        { key: 'pct', label: '% total', align: 'right', mono: true },
        { key: 'total', label: 'Ventas', align: 'right', mono: true },
      ],
      rows: cashierRows,
    },
    {
      type: 'table',
      title: `Alertas de stock bajo (${lowStockList.length})`,
      emptyMessage: 'Sin alertas de stock bajo actualmente',
      columns: [
        { key: 'product', label: 'Producto', align: 'left' },
        { key: 'minStock', label: 'Mínimo', align: 'right', mono: true },
        { key: 'stock', label: 'Stock actual', align: 'right', mono: true },
        { key: 'status', label: 'Estado', align: 'right' },
      ],
      rows: lowStockRows,
    },
  ];

  const rowCount =
    hourlyRows.length +
    dowRows.length +
    categoryRows.length +
    cashierRows.length +
    lowStockRows.length;

  const channelText = channel
    ? ` · Canal: ${channel === 'MOSTRADOR' ? 'Mostrador' : channel === 'DOMICILIO' ? 'Domicilio' : channel === 'PEDIDOSYA' ? 'PedidosYa' : channel}`
    : '';

  return {
    reportKey: 'sales_operations',
    title: 'Ventas y Operaciones',
    reportSlug: 'Ventas_y_operaciones',
    business: buildReportBusinessHeader(business, branchName, user),
    period: periodInfo,
    filtersText: `Período: ${periodLabel}${channelText}`,
    printedBy: user?.name || user?.email || 'Usuario',
    printedAt: formatManaguaDateTime(new Date()),
    sections,
    footerText: DEFAULT_REPORT_FOOTER_TEXT,
    rowCount,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. REPORTES — CANALES
// ═══════════════════════════════════════════════════════════════════════════

export interface BuildChannelsReportParams {
  channelSummary?: any;
  domicilioData?: any;
  pedidosYaData?: any;
  settlementData?: any;
  period: PeriodType | string;
  from?: string;
  to?: string;
  business: any;
  branchName?: string | null;
  user: any;
}

function formatChannelLabel(ch: string): string {
  if (ch === 'MOSTRADOR') return 'Mostrador';
  if (ch === 'DOMICILIO') return 'A domicilio';
  if (ch === 'PEDIDOSYA') return 'PedidosYa';
  return sanitizeForbiddenPrintTerms(ch);
}

export function buildChannelsReportDocument(params: BuildChannelsReportParams): ReportDocument {
  const {
    channelSummary,
    domicilioData,
    pedidosYaData,
    settlementData,
    period,
    from,
    to,
    business,
    branchName,
    user,
  } = params;

  const apiPeriod =
    channelSummary?.period || domicilioData?.period || pedidosYaData?.period || null;
  const { periodInfo, periodLabel } = buildStandardPeriodInfo(period, from, to, apiPeriod);

  const summaries: any[] = channelSummary?.summary || [];
  const hasAnyChannelSale = summaries.some(
    (s) => Number(s.count || 0) > 0 || Number(s.gross || 0) > 0
  );

  const channelRows: ReportTableRow[] = hasAnyChannelSale
    ? summaries.map((s) => ({
        cells: {
          channel: formatChannelLabel(s.channel),
          count: `${s.count || 0}`,
          units: `${s.units || 0}`,
          gross: formatCurrency(s.gross || 0),
          tax: formatCurrency(s.tax || 0),
          net: formatCurrency(s.net || 0),
          pct: `${Number(s.pctOfTotal || 0).toFixed(1)}%`,
        },
      }))
    : [];

  // Comisiones y neto de PedidosYa
  const pyOrders: any[] = settlementData?.orders || pedidosYaData?.orders || [];
  const pyGross = Number(settlementData?.grossTotal ?? pedidosYaData?.summary?.grossTotal ?? 0);
  const pyAppGross = Number(
    settlementData?.appSales?.gross ?? pedidosYaData?.byPaymentMode?.APP?.total ?? 0
  );
  const pyAppCount = Number(
    settlementData?.appSales?.ordersCount ?? pedidosYaData?.byPaymentMode?.APP?.count ?? 0
  );
  const pyCashGross = Number(
    settlementData?.cashSales?.gross ?? pedidosYaData?.byPaymentMode?.EFECTIVO?.total ?? 0
  );
  const pyCashCount = Number(
    settlementData?.cashSales?.ordersCount ?? pedidosYaData?.byPaymentMode?.EFECTIVO?.count ?? 0
  );
  const pyCommission = Number(
    settlementData?.commissionTotal ?? pedidosYaData?.summary?.totalCommission ?? 0
  );
  const pyTax = Number(settlementData?.taxTotal ?? pedidosYaData?.summary?.totalTax ?? 0);
  const pyNetPayout = Number(
    settlementData?.netPayout ?? pedidosYaData?.summary?.netPayout ?? 0
  );
  const pyOrdersCount = Number(
    settlementData?.ordersCount ?? pedidosYaData?.summary?.totalOrders ?? pyOrders.length
  );

  const pySummaryRows: ReportKeyValueRow[] =
    pyOrdersCount === 0 && pyGross === 0
      ? []
      : [
          {
            label: 'Pedidos procesados en PedidosYa',
            value: `${pyOrdersCount}`,
          },
          {
            label: '(+) Ventas brutas PedidosYa',
            value: formatCurrency(pyGross),
          },
          {
            label: '(-) Efectivo cobrado en caja',
            value: `-${formatCurrency(pyCashGross)}`,
            sublabel: `${pyCashCount} ${
              pyCashCount === 1
                ? 'pedido en efectivo (no lo deposita PedidosYa)'
                : 'pedidos en efectivo (no los deposita PedidosYa)'
            }`,
            tone: pyCashGross > 0 ? 'warning' : 'default',
          },
          {
            label: '(=) Cobrado por la app',
            value: formatCurrency(pyAppGross),
            sublabel: `${pyAppCount} ${
              pyAppCount === 1 ? 'pedido cobrado en la app' : 'pedidos cobrados en la app'
            }`,
            isTotal: true,
          },
          {
            label: '(-) Comisión PedidosYa',
            value: `-${formatCurrency(pyCommission)}`,
            tone: 'negative',
          },
          {
            label: '(-) Impuesto PedidosYa sobre la venta',
            value: `-${formatCurrency(pyTax)}`,
            tone: 'negative',
          },
          {
            label:
              pyNetPayout >= 0
                ? '(=) Pago neto a recibir de PedidosYa'
                : '(=) Saldo neto por pagar a PedidosYa',
            value:
              pyNetPayout < 0
                ? `-${formatCurrency(Math.abs(pyNetPayout))}`
                : formatCurrency(pyNetPayout),
            isTotal: true,
            doubleHeight: true,
            tone: pyNetPayout >= 0 ? 'positive' : 'negative',
          },
        ];

  const pyOrderRows: ReportTableRow[] = pyOrders.map((o) => {
    const isCash = (o.paymentMode || o.pedidosYaPaymentMode) === 'EFECTIVO';
    const refunded = Number(o.refundedAmount || 0);
    const orderNetNum = Number(o.netPayout || 0);
    const subRows: Array<{ left: string; right: string; tone?: 'warning' | 'negative' }> = [];
    if (refunded > 0) {
      subRows.push({
        left: `Original ${formatCurrency(o.originalTotal || 0)} — Devolución`,
        right: `-${formatCurrency(refunded)}`,
        tone: 'negative',
      });
    }
    if (isCash) {
      subRows.push({
        left: '(-) Efectivo cobrado en caja',
        right: `-${formatCurrency(o.grossTotal ?? o.total ?? 0)}`,
        tone: 'warning',
      });
    }

    return {
      cells: {
        receipt: sanitizeForbiddenPrintTerms(o.invoiceNumber || '—'),
        pyOrder: o.orderNumber || o.pedidosYaOrderNumber ? `#${o.orderNumber || o.pedidosYaOrderNumber}` : '—',
        date: o.createdAt ? formatManaguaDate(o.createdAt) : '—',
        mode: isCash ? 'Efectivo' : 'App',
        gross: formatCurrency(o.grossTotal ?? o.total ?? 0),
        commission: `-${formatCurrency(o.commissionAmount || 0)}`,
        tax: `-${formatCurrency(o.taxAmount || 0)}`,
        net:
          orderNetNum < 0
            ? `-${formatCurrency(Math.abs(orderNetNum))}`
            : formatCurrency(orderNetNum),
        status: o.settlementStatus === 'LIQUIDADO' ? 'Liquidado' : 'Pendiente',
      },
      ...(subRows.length > 0 ? { subRows } : {}),
    };
  });

  // Repartidores y pedidos de domicilio
  const domDrivers: any[] = domicilioData?.byDriver || [];
  const domOrders: any[] = domicilioData?.orders || [];
  const domDriverRows: ReportTableRow[] = domDrivers.map((d) => ({
    cells: {
      driver: sanitizeForbiddenPrintTerms(d.driverName || 'Sin asignar'),
      orders: `${d.ordersCount || 0}`,
      fees: formatCurrency(d.totalFees || 0),
      sales: formatCurrency(d.totalSales || 0),
    },
  }));

  const domOrderRows: ReportTableRow[] = domOrders.map((o) => ({
    cells: {
      receipt: sanitizeForbiddenPrintTerms(o.invoiceNumber || '—'),
      date: o.createdAt ? formatManaguaDate(o.createdAt) : '—',
      customer: sanitizeForbiddenPrintTerms(o.customerName || 'Mostrador'),
      driver: sanitizeForbiddenPrintTerms(o.driverName || 'Sin asignar'),
      fee: formatCurrency(o.deliveryFee || 0),
      total: formatCurrency(o.total || 0),
    },
  }));

  const sections: ReportSection[] = [
    {
      type: 'table',
      title: 'Ventas por canal',
      emptyMessage: 'Sin datos en el período',
      columns: [
        { key: 'channel', label: 'Canal', align: 'left' },
        { key: 'count', label: 'Comprobantes', align: 'right', mono: true },
        { key: 'units', label: 'Unidades', align: 'right', mono: true },
        { key: 'gross', label: 'Venta bruta', align: 'right', mono: true },
        { key: 'tax', label: 'IVA', align: 'right', mono: true },
        { key: 'net', label: 'Venta neta', align: 'right', mono: true },
        { key: 'pct', label: '% total', align: 'right', mono: true },
      ],
      rows: channelRows,
      totalsRows:
        hasAnyChannelSale && channelSummary?.totalGross !== undefined
          ? [
              {
                label: 'Total ventas brutas (todos los canales)',
                value: formatCurrency(channelSummary.totalGross || 0),
                isTotal: true,
                doubleHeight: true,
              },
            ]
          : undefined,
    },
    {
      type: 'keyValue',
      title: 'Comisiones y neto de PedidosYa',
      emptyMessage: 'Sin datos en el período',
      rows: pySummaryRows,
    },
    {
      type: 'table',
      title: `Detalle de pedidos PedidosYa (${pyOrderRows.length})`,
      emptyMessage: 'Sin pedidos de PedidosYa en el período',
      columns: [
        { key: 'receipt', label: 'Comprobante', align: 'left', mono: true },
        { key: 'pyOrder', label: 'N.º PedidosYa', align: 'left', mono: true },
        { key: 'date', label: 'Fecha', align: 'left', mono: true },
        { key: 'mode', label: 'Cobro', align: 'left' },
        { key: 'gross', label: 'Bruto', align: 'right', mono: true },
        { key: 'commission', label: 'Comisión', align: 'right', mono: true },
        { key: 'tax', label: 'Impuesto PedidosYa', align: 'right', mono: true },
        { key: 'net', label: 'Neto', align: 'right', mono: true },
        { key: 'status', label: 'Estado', align: 'right' },
      ],
      rows: pyOrderRows,
    },
    {
      type: 'table',
      title: 'Entregas a domicilio por repartidor',
      emptyMessage: 'Sin entregas a domicilio en el período',
      columns: [
        { key: 'driver', label: 'Repartidor', align: 'left' },
        { key: 'orders', label: 'Entregas', align: 'right', mono: true },
        { key: 'fees', label: 'Tarifas envío', align: 'right', mono: true },
        { key: 'sales', label: 'Ventas', align: 'right', mono: true },
      ],
      rows: domDriverRows,
      totalsRows:
        domDriverRows.length > 0
          ? [
              {
                label: `Total entregas a domicilio (${domicilioData?.totalOrders || 0})`,
                value: formatCurrency(domicilioData?.totalSales || 0),
                isTotal: true,
              },
              {
                label: 'Total tarifas de envío cobradas',
                value: formatCurrency(domicilioData?.totalDeliveryFees || 0),
              },
            ]
          : undefined,
    },
  ];

  if (domOrderRows.length > 0) {
    sections.push({
      type: 'table',
      title: `Pedidos a domicilio (${domOrderRows.length})`,
      emptyMessage: 'Sin pedidos a domicilio en el período',
      columns: [
        { key: 'receipt', label: 'Comprobante', align: 'left', mono: true },
        { key: 'date', label: 'Fecha', align: 'left', mono: true },
        { key: 'customer', label: 'Cliente', align: 'left' },
        { key: 'driver', label: 'Repartidor', align: 'left' },
        { key: 'fee', label: 'Envío', align: 'right', mono: true },
        { key: 'total', label: 'Total', align: 'right', mono: true },
      ],
      rows: domOrderRows,
    });
  }

  const rowCount =
    channelRows.length + pyOrderRows.length + domDriverRows.length + domOrderRows.length;

  return {
    reportKey: 'channels',
    title: 'Canales',
    reportSlug: 'Canales',
    business: buildReportBusinessHeader(business, branchName, user),
    period: periodInfo,
    filtersText: `Período: ${periodLabel}`,
    printedBy: user?.name || user?.email || 'Usuario',
    printedAt: formatManaguaDateTime(new Date()),
    sections,
    footerText: DEFAULT_REPORT_FOOTER_TEXT,
    rowCount,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. REPORTES — GANANCIAS
// ═══════════════════════════════════════════════════════════════════════════

export interface BuildProfitReportParams {
  summary?: ProfitSummaryReport | null;
  profitData?: ProfitReport | null;
  allProductsResponse?: ProfitProductsResponse | null;
  period: PeriodType | string;
  from?: string;
  to?: string;
  business: any;
  branchName?: string | null;
  user: any;
}

export function buildProfitReportDocument(params: BuildProfitReportParams): ReportDocument {
  const {
    summary,
    profitData,
    allProductsResponse,
    period,
    from,
    to,
    business,
    branchName,
    user,
  } = params;

  const apiPeriod = summary?.period || profitData?.period || null;
  const { periodInfo, periodLabel } = buildStandardPeriodInfo(period, from, to, apiPeriod);

  const totals = summary?.totals;
  const hasSales = Boolean(totals && (totals.sales > 0 || totals.receipts > 0));

  // Evaluar cobertura de costos
  const coveragePercent = profitData?.coveragePercent ?? (totals && totals.sales > 0 ? (totals.coveredSales / totals.sales) * 100 : 0);
  const isZeroCoverage = coveragePercent === 0 || (totals?.coveredSales === 0 && (totals?.sales || 0) > 0);

  const periodHuman =
    period === 'today'
      ? 'hoy'
      : period === 'week'
      ? 'esta semana'
      : period === 'month'
      ? 'este mes'
      : 'este período';

  let narrativeSummary = 'Sin datos en el período';
  if (hasSales && totals) {
    if (isZeroCoverage) {
      narrativeSummary = `En ${periodHuman} se vendieron ${formatCurrency(totals.sales)}, pero ningún producto cuenta con costo de compra registrado en el catálogo. No se calcula ganancia inventada.`;
    } else if (totals.uncoveredRevenue > 0) {
      narrativeSummary = `De ${formatCurrency(totals.coveredSales)} vendidos con costo conocido, la mercadería te costó ${formatCurrency(
        totals.cost || 0
      )} y te quedó una ganancia de ${formatCurrency(totals.grossProfit)}. Además vendiste ${formatCurrency(
        totals.uncoveredRevenue
      )} en productos sin costo registrado, que no entran en la ganancia.`;
    } else {
      const marginStr =
        totals.marginPercent !== null && totals.marginPercent !== undefined
          ? Number(totals.marginPercent).toFixed(2)
          : '0.00';
      narrativeSummary = `En ${periodHuman} vendiste ${formatCurrency(totals.sales)}. Esa mercadería te costó ${formatCurrency(
        totals.cost || 0
      )}. Te quedó una ganancia de ${formatCurrency(totals.grossProfit)}: por cada C$100 que vendés, ganás C$${marginStr}.`;
    }
  }

  const sanitizedCostNote = sanitizeForbiddenPrintTerms(summary?.costBasisNote);

  const indicatorRows: ReportKeyValueRow[] = [];
  if (hasSales && totals) {
    const summaryUncovered = totals.uncoveredRevenue ?? 0;

    indicatorRows.push(
      {
        label: 'Ventas',
        value: formatCurrency(totals.sales),
        sublabel: `${totals.receipts} ${totals.receipts === 1 ? 'comprobante' : 'comprobantes'}`,
      },
      {
        label: 'Ventas sin costo registrado:',
        value: formatCurrency(summaryUncovered),
        sublabel: '(no entran en la ganancia)',
        tone: summaryUncovered > 0 ? 'warning' : 'default',
      },
      {
        label: 'Ventas con costo',
        value: formatCurrency(totals.coveredSales),
        isTotal: true,
      },
      {
        label: 'Costo de lo vendido',
        value: isZeroCoverage ? '—' : `-${formatCurrency(totals.cost || 0)}`,
        tone: isZeroCoverage ? 'default' : 'negative',
      },
      {
        label: summary?.costBasis === 'HISTORICAL' ? 'Ganancia' : 'Ganancia estimada',
        value: isZeroCoverage ? '—' : formatCurrency(totals.grossProfit),
        isTotal: true,
        doubleHeight: summary?.netProfit === null || summary?.netProfit === undefined,
        tone: isZeroCoverage ? 'default' : totals.grossProfit >= 0 ? 'positive' : 'negative',
      },
      {
        label: 'Margen',
        value:
          isZeroCoverage || totals.marginPercent === null || totals.marginPercent === undefined
            ? '—'
            : `${Number(totals.marginPercent).toFixed(1)}%`,
      },
      {
        label: 'Descuentos otorgados',
        value: formatCurrency(totals.discounts || 0),
      }
    );

    if (summary?.expenses !== null && summary?.expenses !== undefined) {
      indicatorRows.push({
        label: 'Gastos del período',
        value: formatCurrency(summary.expenses.total || 0),
      });
    }

    if (summary?.netProfit !== null && summary?.netProfit !== undefined) {
      indicatorRows.push({
        label: 'Utilidad neta',
        value: isZeroCoverage ? '—' : formatCurrency(summary.netProfit),
        isTotal: true,
        doubleHeight: true,
        tone: isZeroCoverage ? 'default' : summary.netProfit >= 0 ? 'positive' : 'negative',
        sublabel: summary.netProfitNote
          ? sanitizeForbiddenPrintTerms(summary.netProfitNote)
          : undefined,
      });
    }
  }

  // Alertas accionables (pérdida, margen bajo, sin costo)
  const alerts = summary?.alerts;
  const alertRows: ReportKeyValueRow[] =
    hasSales && alerts
      ? [
          {
            label: 'Productos vendidos con pérdida',
            value:
              (alerts.lossProducts?.count ?? 0) > 0
                ? `${alerts.lossProducts?.count} (${formatCurrency(alerts.lossProducts?.lossAmount || 0)})`
                : '0',
            tone: (alerts.lossProducts?.count ?? 0) > 0 ? 'negative' : 'default',
          },
          {
            label: 'Productos con margen bajo (< 10%)',
            value: `${alerts.lowMarginProducts?.count ?? 0}`,
            tone: (alerts.lowMarginProducts?.count ?? 0) > 0 ? 'warning' : 'default',
          },
          {
            label: 'Productos sin costo registrado',
            value:
              (alerts.missingCost?.count ?? 0) > 0
                ? `${alerts.missingCost?.count} (${formatCurrency(alerts.missingCost?.revenue || 0)})`
                : '0',
            tone: (alerts.missingCost?.count ?? 0) > 0 ? 'warning' : 'default',
            sublabel:
              alerts.missingCost?.products && alerts.missingCost.products.length > 0
                ? `Ejemplos: ${alerts.missingCost.products
                    .slice(0, 5)
                    .map((p) => sanitizeForbiddenPrintTerms(p.name))
                    .join(', ')}`
                : undefined,
          },
        ]
      : [];

  // Desglose por fuente de costo (traducidas al español)
  const bySource = profitData?.bySource;
  const sourceRows: ReportTableRow[] =
    bySource && Object.keys(bySource).length > 0
      ? Object.entries(bySource).map(([srcKey, srcVal]) => ({
          cells: {
            source: formatCostSourceEs(srcKey),
            lines: `${srcVal.lines || 0}`,
            revenue: formatCurrency(srcVal.revenue || 0),
            cost: formatCurrency(srcVal.cost || 0),
          },
        }))
      : [];

  // Ganancia por día (o por hora si es un solo día)
  const byHourActive = (summary?.byHour || []).filter((h) => h.sales > 0 || h.profit !== 0);
  const byDayActive = (summary?.byDay || []).filter((d) => d.sales > 0 || d.profit !== 0);
  const useHourlySeries = Boolean(
    summary?.byHour && summary.byHour.length > 0 && (summary.byDay?.length || 0) <= 1
  );

  const timeSeriesRows: ReportTableRow[] = useHourlySeries
    ? byHourActive.map((h) => ({
        cells: {
          date: h.date || `${String(h.hour).padStart(2, '0')}:00`,
          sales: formatCurrency(h.sales),
          cost: formatCurrency(h.cost),
          margin: h.marginPercent != null ? `${Number(h.marginPercent).toFixed(1)}%` : '—',
          profit: formatCurrency(h.profit),
        },
      }))
    : byDayActive.map((d) => ({
        cells: {
          date: formatShortDateEs(d.date),
          sales: formatCurrency(d.sales),
          cost: formatCurrency(d.cost),
          margin: d.marginPercent != null ? `${Number(d.marginPercent).toFixed(1)}%` : '—',
          profit: formatCurrency(d.profit),
        },
      }));

  // Tabla completa de productos (pageSize=5000)
  const productItems = allProductsResponse?.items || [];
  const productTotals = allProductsResponse?.totals;
  const productRows: ReportTableRow[] = productItems.map((it) => {
    const rawCostSource = (it as any).cost_source || (it as any).costSource || (it.hasCost ? 'PRODUCT' : 'UNKNOWN');
    return {
      cells: {
        name: sanitizeForbiddenPrintTerms(it.name),
        category: sanitizeForbiddenPrintTerms(it.category || 'Sin categoría'),
        units: `${it.unitsSold} ${it.unit || 'UND'}`,
        sales: formatCurrency(it.sales),
        cost: it.hasCost && it.cost !== null ? formatCurrency(it.cost) : 'Sin costo',
        margin:
          it.hasCost && it.marginPercent !== null ? `${Number(it.marginPercent).toFixed(1)}%` : '—',
        profit: it.hasCost && it.profit !== null ? formatCurrency(it.profit) : 'Sin costo',
        source: formatCostSourceEs(rawCostSource),
      },
      highlight: Boolean(it.hasCost && it.profit !== null && it.profit < 0),
    };
  });

  const productTotalsRows: ReportKeyValueRow[] =
    productItems.length > 0 && productTotals
      ? [
          {
            label: `Total productos (${productItems.length}) — Unidades`,
            value: `${productTotals.unitsSold ?? productItems.reduce((acc, it) => acc + (it.unitsSold || 0), 0)}`,
          },
          {
            label: 'Ventas',
            value: formatCurrency(productTotals.sales ?? 0),
          },
          {
            label: 'Ventas con costo',
            value: formatCurrency(productTotals.coveredSales ?? 0),
            isTotal: true,
          },
          {
            label: 'Costo de lo vendido',
            value:
              productTotals.cost !== null && productTotals.cost !== undefined
                ? `-${formatCurrency(productTotals.cost)}`
                : 'Sin costo',
            tone: productTotals.cost !== null ? 'negative' : 'default',
          },
          {
            label:
              productTotals.profit !== null &&
              productTotals.marginPercent !== null &&
              productTotals.marginPercent !== undefined
                ? `Ganancia (${Number(productTotals.marginPercent).toFixed(1)}%)`
                : 'Ganancia',
            value:
              productTotals.profit !== null && productTotals.profit !== undefined
                ? formatCurrency(productTotals.profit)
                : 'Sin costo',
            isTotal: true,
            doubleHeight: true,
            tone:
              productTotals.profit !== null
                ? productTotals.profit >= 0
                  ? 'positive'
                  : 'negative'
                : 'default',
          },
        ]
      : [];

  // Ventas por categoría
  const categoryList = summary?.byCategory || [];
  const categoryRows: ReportTableRow[] = categoryList.map((c) => ({
    cells: {
      category: sanitizeForbiddenPrintTerms(c.name || 'Sin categoría'),
      sales: formatCurrency(c.sales),
      cost: formatCurrency(c.cost),
      margin: c.marginPercent != null ? `${Number(c.marginPercent).toFixed(1)}%` : '—',
      profit: formatCurrency(c.profit),
    },
  }));

  // Clientes principales y ventas de mostrador
  const customerList = summary?.byCustomer || [];
  const counterSales = summary?.counterSales;
  const customerRows: ReportTableRow[] = customerList.map((c) => ({
    cells: {
      customer: sanitizeForbiddenPrintTerms(c.name || 'Cliente'),
      receipts: `${c.receipts}`,
      sales: formatCurrency(c.sales),
      profit: formatCurrency(c.profit),
    },
  }));

  if (counterSales && (counterSales.receipts > 0 || counterSales.sales > 0)) {
    customerRows.push({
      cells: {
        customer: 'Ventas de mostrador (sin cliente)',
        receipts: `${counterSales.receipts}`,
        sales: formatCurrency(counterSales.sales),
        profit: formatCurrency(counterSales.profit),
      },
      highlight: true,
    });
  }

  // Banner obligatorio cuando no hay datos de costo
  const zeroCoverageBanner = isZeroCoverage
    ? 'Sin datos de costo suficientes para calcular la ganancia real. Los productos vendidos en este período no tienen costo de compra registrado en el catálogo. Registrá el costo en tu inventario para visualizar la ganancia real.'
    : undefined;

  const sections: ReportSection[] = [
    {
      type: 'keyValue',
      title: 'Resumen de ganancias',
      notice: zeroCoverageBanner || (hasSales ? narrativeSummary : undefined),
      subtitle: sanitizedCostNote ? `Base del costo: ${sanitizedCostNote}` : undefined,
      emptyMessage: 'Sin datos en el período',
      rows: indicatorRows,
    },
  ];

  if (alertRows.length > 0) {
    sections.push({
      type: 'keyValue',
      title: 'Alertas de rentabilidad y costos',
      emptyMessage: 'Sin datos en el período',
      rows: alertRows,
    });
  }

  if (sourceRows.length > 0) {
    sections.push({
      type: 'table',
      title: 'Desglose por fuente de costo',
      emptyMessage: 'Sin datos en el período',
      columns: [
        { key: 'source', label: 'Fuente de costo', align: 'left' },
        { key: 'lines', label: 'Líneas vendidas', align: 'right', mono: true },
        { key: 'revenue', label: 'Venta', align: 'right', mono: true },
        { key: 'cost', label: 'Costo de lo vendido', align: 'right', mono: true },
      ],
      rows: sourceRows,
    });
  }

  sections.push(
    {
      type: 'table',
      title: useHourlySeries ? 'Ganancia por día (detalle horario de hoy)' : 'Ganancia por día',
      subtitle:
        summary?.bestDay && summary.bestDay.profit > 0
          ? `Mejor día: ${formatShortDateEs(summary.bestDay.date)} (${formatCurrency(summary.bestDay.profit)})`
          : undefined,
      emptyMessage: 'Sin datos en el período',
      columns: [
        { key: 'date', label: useHourlySeries ? 'Hora' : 'Fecha', align: 'left' },
        { key: 'sales', label: 'Ventas', align: 'right', mono: true },
        { key: 'cost', label: 'Costo de lo vendido', align: 'right', mono: true },
        { key: 'margin', label: 'Margen', align: 'right', mono: true },
        { key: 'profit', label: 'Ganancia', align: 'right', mono: true },
      ],
      rows: timeSeriesRows,
    },
    {
      type: 'table',
      title: `Rentabilidad por producto (${productItems.length})`,
      emptyMessage: 'Sin datos en el período',
      columns: [
        { key: 'name', label: 'Producto', align: 'left' },
        { key: 'category', label: 'Categoría', align: 'left' },
        { key: 'units', label: 'Unidades', align: 'right', mono: true },
        { key: 'sales', label: 'Ventas', align: 'right', mono: true },
        { key: 'cost', label: 'Costo de lo vendido', align: 'right', mono: true },
        { key: 'margin', label: 'Margen', align: 'right', mono: true },
        { key: 'profit', label: 'Ganancia', align: 'right', mono: true },
        { key: 'source', label: 'Fuente de costo', align: 'left' },
      ],
      rows: productRows,
      totalsRows: productTotalsRows,
    }
  );

  if (categoryRows.length > 0) {
    sections.push({
      type: 'table',
      title: 'Ganancia por categoría',
      emptyMessage: 'Sin datos en el período',
      columns: [
        { key: 'category', label: 'Categoría', align: 'left' },
        { key: 'sales', label: 'Ventas', align: 'right', mono: true },
        { key: 'cost', label: 'Costo de lo vendido', align: 'right', mono: true },
        { key: 'margin', label: 'Margen', align: 'right', mono: true },
        { key: 'profit', label: 'Ganancia', align: 'right', mono: true },
      ],
      rows: categoryRows,
    });
  }

  if (customerRows.length > 0) {
    sections.push({
      type: 'table',
      title: 'Top de clientes y ventas de mostrador',
      emptyMessage: 'Sin datos en el período',
      columns: [
        { key: 'customer', label: 'Cliente', align: 'left' },
        { key: 'receipts', label: 'Comprobantes', align: 'right', mono: true },
        { key: 'sales', label: 'Ventas', align: 'right', mono: true },
        { key: 'profit', label: 'Ganancia', align: 'right', mono: true },
      ],
      rows: customerRows,
    });
  }

  const rowCount =
    sourceRows.length +
    timeSeriesRows.length +
    productRows.length +
    categoryRows.length +
    customerRows.length;

  return {
    reportKey: 'profit',
    title: 'Ganancias',
    reportSlug: 'Ganancias',
    business: buildReportBusinessHeader(business, branchName, user),
    period: periodInfo,
    filtersText: `Período: ${periodLabel}`,
    printedBy: user?.name || user?.email || 'Usuario',
    printedAt: formatManaguaDateTime(new Date()),
    sections,
    footerText: DEFAULT_REPORT_FOOTER_TEXT,
    rowCount,
  };
}
