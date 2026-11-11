import {
  ReportDocument,
  ReportKeyValueRow,
  ReportPeriodInfo,
  ReportSection,
  ReportTableRow,
} from '../types/report';
import { formatCurrency } from './formatters';
import { formatManaguaDate, formatManaguaDateTime, getManaguaTodayYMD } from './dateManagua';
import {
  buildReportBusinessHeader,
  DEFAULT_REPORT_FOOTER_TEXT,
  sanitizeForbiddenPrintTerms,
} from './reportHelpers';

// ═══════════════════════════════════════════════════════════════════════════
// 1. FINANZAS — POR PAGAR (Payables)
// ═══════════════════════════════════════════════════════════════════════════

export interface BuildPayablesReportParams {
  summary: any;
  items: any[];
  statusFilter: string;
  search: string;
  business: any;
  branchName?: string | null;
  user: any;
  currency?: string;
}

function formatPayableStatusLabel(item: any): string {
  if (item.status === 'CANCELLED') return 'Anulada';
  if (item.status === 'PAID') return 'Pagada';
  if (item.isOverdue) return 'Vencida';
  if (item.status === 'PARTIALLY_PAID') return 'Abonada';
  return 'Pendiente';
}

export function buildPayablesReportDocument(
  params: BuildPayablesReportParams
): ReportDocument {
  const {
    summary,
    items,
    statusFilter,
    search,
    business,
    branchName,
    user,
    currency = 'NIO',
  } = params;

  const todayYmd = getManaguaTodayYMD();
  const periodInfo: ReportPeriodInfo = {
    label: 'Corte actual de cuentas por pagar',
    fromFormatted: 'Obligaciones registradas',
    toFormatted: formatManaguaDate(todayYmd),
    fromSlug: 'corte',
    toSlug: todayYmd,
  };

  const statusLabelMap: Record<string, string> = {
    ALL: 'Todos',
    PENDING: 'Pendientes',
    PARTIALLY_PAID: 'Abonadas',
    PAID: 'Pagadas',
    CANCELLED: 'Anuladas',
  };

  const filtersParts: string[] = [
    `Estado: ${statusLabelMap[statusFilter] || statusFilter}`,
    `Búsqueda: ${search.trim() ? `"${search.trim()}"` : '—'}`,
  ];

  const totalPayable = Number(summary?.totalPayable || 0);
  const totalOverdue = Number(summary?.totalOverdue || 0);
  const dueNext7Days = Number(summary?.dueNext7Days || 0);
  const suppliersWithDebt = Number(summary?.suppliersWithDebt || 0);

  const summaryRows: ReportKeyValueRow[] =
    !summary || (totalPayable === 0 && items.length === 0)
      ? []
      : [
          {
            label: 'Total por pagar',
            value: formatCurrency(totalPayable, currency),
            isTotal: true,
            doubleHeight: true,
          },
          {
            label: 'Total vencido',
            value: formatCurrency(totalOverdue, currency),
            tone: totalOverdue > 0 ? 'negative' : 'default',
          },
          {
            label: 'Vence en 7 días',
            value: formatCurrency(dueNext7Days, currency),
            tone: dueNext7Days > 0 ? 'warning' : 'default',
          },
          {
            label: 'Proveedores con saldo pendiente',
            value: `${suppliersWithDebt}`,
          },
        ];

  const rows: ReportTableRow[] = items.map((item) => ({
    cells: {
      supplier: sanitizeForbiddenPrintTerms(item.supplier?.name || 'Proveedor'),
      receipt: sanitizeForbiddenPrintTerms(item.invoiceNumber || 'Sin comprobante'),
      dueDate: formatManaguaDate(item.dueDate),
      status: formatPayableStatusLabel(item),
      balance: formatCurrency(item.balance || 0, currency),
    },
    highlight: Boolean(item.isOverdue && item.status !== 'PAID' && item.status !== 'CANCELLED'),
  }));

  const sections: ReportSection[] = [
    {
      type: 'keyValue',
      title: 'Totales de cuentas por pagar',
      emptyMessage: 'Sin datos en el período',
      rows: summaryRows,
    },
    {
      type: 'table',
      title: `Cuentas por pagar (${rows.length})`,
      emptyMessage: 'Sin datos en el período',
      columns: [
        { key: 'supplier', label: 'Proveedor', align: 'left' },
        { key: 'receipt', label: 'Comprobante', align: 'left', mono: true },
        { key: 'dueDate', label: 'Vencimiento', align: 'left', mono: true },
        { key: 'status', label: 'Estado', align: 'left' },
        { key: 'balance', label: 'Saldo', align: 'right', mono: true },
      ],
      rows,
      totalsRows: [
        {
          label: 'Total por pagar',
          value: formatCurrency(totalPayable, currency),
          isTotal: true,
          doubleHeight: true,
        },
      ],
    },
  ];

  return {
    reportKey: 'payables',
    reportSlug: 'Cuentas_por_pagar',
    title: 'Cuentas por pagar a proveedores',
    business: buildReportBusinessHeader(business, branchName, user),
    period: periodInfo,
    filtersText: sanitizeForbiddenPrintTerms(filtersParts.join(' · ')),
    printedBy: user?.name || user?.email || 'Usuario',
    printedAt: formatManaguaDateTime(new Date()),
    sections,
    footerText: DEFAULT_REPORT_FOOTER_TEXT,
    rowCount: rows.length,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. FINANZAS — GASTOS (Expenses)
// ═══════════════════════════════════════════════════════════════════════════

export interface BuildExpensesReportParams {
  items: any[];
  totalAmount: number;
  totalCount: number;
  categoryTotals?: Array<{ categoryName: string; amount: number; percent?: number }>;
  periodLabel: string;
  fromYmd: string;
  toYmd: string;
  categoryFilterName?: string;
  methodFilter?: string;
  search?: string;
  business: any;
  branchName?: string | null;
  user: any;
  currency?: string;
}

function formatExpenseMethodLabel(method?: string | null): string {
  if (method === 'EFECTIVO') return 'Efectivo';
  if (method === 'TARJETA') return 'Tarjeta';
  if (method === 'TRANSFERENCIA') return 'Transferencia';
  return sanitizeForbiddenPrintTerms(method || 'Otro');
}

export function buildExpensesReportDocument(
  params: BuildExpensesReportParams
): ReportDocument {
  const {
    items,
    totalAmount,
    totalCount,
    categoryTotals = [],
    periodLabel,
    fromYmd,
    toYmd,
    categoryFilterName,
    methodFilter = 'ALL',
    search = '',
    business,
    branchName,
    user,
    currency = 'NIO',
  } = params;

  const periodInfo: ReportPeriodInfo = {
    label: periodLabel,
    fromFormatted: formatManaguaDate(fromYmd),
    toFormatted: formatManaguaDate(toYmd),
    fromSlug: fromYmd,
    toSlug: toYmd,
  };

  const methodLabel =
    methodFilter === 'ALL' ? 'Todos' : formatExpenseMethodLabel(methodFilter);

  const filtersParts: string[] = [
    `Período: ${periodLabel}`,
    `Categoría: ${categoryFilterName || 'Todas'}`,
    `Método: ${methodLabel}`,
    `Búsqueda: ${search.trim() ? `"${search.trim()}"` : '—'}`,
  ];

  const categoryRows: ReportKeyValueRow[] =
    categoryTotals.length === 0 && totalAmount === 0
      ? []
      : [
          ...categoryTotals.map((cat) => ({
            label: sanitizeForbiddenPrintTerms(cat.categoryName || 'Varios'),
            value:
              cat.percent !== undefined
                ? `${formatCurrency(cat.amount, currency)} (${Number(cat.percent).toFixed(1)}%)`
                : formatCurrency(cat.amount, currency),
          })),
          {
            label: `Total general de gastos (${totalCount} registro(s))`,
            value: formatCurrency(totalAmount, currency),
            isTotal: true,
            doubleHeight: true,
          },
        ];

  const rows: ReportTableRow[] = items.map((exp) => {
    const descBase = sanitizeForbiddenPrintTerms(exp.description || 'Sin descripción');
    const descWithReceipt = exp.receiptNumber
      ? `${descBase} (Comp. ${sanitizeForbiddenPrintTerms(exp.receiptNumber)})`
      : descBase;
    const finalDesc = exp.isVoided ? `[Anulado] ${descWithReceipt}` : descWithReceipt;

    return {
      cells: {
        date: formatManaguaDate(exp.expenseDate || exp.createdAt),
        category: sanitizeForbiddenPrintTerms(exp.category?.name || 'Varios'),
        description: finalDesc,
        method: formatExpenseMethodLabel(exp.paymentMethod),
        amount: exp.isVoided
          ? `${formatCurrency(exp.amount, currency)} (Anul.)`
          : formatCurrency(exp.amount, currency),
      },
    };
  });

  const sections: ReportSection[] = [
    {
      type: 'keyValue',
      title: 'Totales por categoría y total general',
      emptyMessage: 'Sin datos en el período',
      rows: categoryRows,
    },
    {
      type: 'table',
      title: `Detalle de gastos (${rows.length})`,
      emptyMessage: 'Sin datos en el período',
      columns: [
        { key: 'date', label: 'Fecha', align: 'left', mono: true },
        { key: 'category', label: 'Categoría', align: 'left' },
        { key: 'description', label: 'Descripción', align: 'left' },
        { key: 'method', label: 'Método', align: 'left' },
        { key: 'amount', label: 'Monto', align: 'right', mono: true },
      ],
      rows,
      totalsRows: [
        {
          label: 'Total general de gastos',
          value: formatCurrency(totalAmount, currency),
          isTotal: true,
          doubleHeight: true,
        },
      ],
    },
  ];

  return {
    reportKey: 'expenses',
    reportSlug: 'Gastos_operativos',
    title: 'Gastos operativos',
    business: buildReportBusinessHeader(business, branchName, user),
    period: periodInfo,
    filtersText: sanitizeForbiddenPrintTerms(filtersParts.join(' · ')),
    printedBy: user?.name || user?.email || 'Usuario',
    printedAt: formatManaguaDateTime(new Date()),
    sections,
    footerText: DEFAULT_REPORT_FOOTER_TEXT,
    rowCount: rows.length,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. FINANZAS — POR COBRAR (Receivables / Cartera)
// ═══════════════════════════════════════════════════════════════════════════

export interface BuildReceivablesReportParams {
  metrics: {
    totalPortfolio: number;
    overduePortfolio: number;
    currentPortfolio: number;
    unpaidAccountsCount: number;
    customersCount: number;
  } | null;
  accounts: any[];
  searchQuery?: string;
  filterStatus?: string;
  business: any;
  branchName?: string | null;
  user: any;
  currency?: string;
}

export function buildReceivablesReportDocument(
  params: BuildReceivablesReportParams
): ReportDocument {
  const {
    metrics,
    accounts,
    searchQuery = '',
    filterStatus = 'ALL',
    business,
    branchName,
    user,
    currency = 'NIO',
  } = params;

  const todayYmd = getManaguaTodayYMD();
  const periodInfo: ReportPeriodInfo = {
    label: 'Corte actual de cartera',
    fromFormatted: 'Cartera activa vigente',
    toFormatted: formatManaguaDate(todayYmd),
    fromSlug: 'corte',
    toSlug: todayYmd,
  };

  const statusLabel =
    filterStatus === 'OVERDUE'
      ? 'Solo vencidas'
      : filterStatus === 'CURRENT'
      ? 'Al día'
      : 'Todas';

  const filtersParts: string[] = [
    `Estado: ${statusLabel}`,
    `Búsqueda: ${searchQuery.trim() ? `"${searchQuery.trim()}"` : '—'}`,
  ];

  const totalPortfolio = Number(metrics?.totalPortfolio || 0);
  const overduePortfolio = Number(metrics?.overduePortfolio || 0);
  const currentPortfolio = Number(metrics?.currentPortfolio || 0);
  const unpaidAccountsCount = Number(metrics?.unpaidAccountsCount || accounts.length);
  const customersCount = Number(metrics?.customersCount || 0);

  const summaryRows: ReportKeyValueRow[] =
    customersCount === 0 && totalPortfolio === 0 && accounts.length === 0
      ? []
      : [
          {
            label: 'Cartera total por cobrar',
            value: formatCurrency(totalPortfolio, currency),
            isTotal: true,
            doubleHeight: true,
            sublabel: `${unpaidAccountsCount} cuenta(s) pendiente(s)`,
          },
          {
            label: 'Cartera vencida (en mora)',
            value: formatCurrency(overduePortfolio, currency),
            tone: overduePortfolio > 0 ? 'negative' : 'default',
          },
          {
            label: 'Cartera al día (vigente)',
            value: formatCurrency(currentPortfolio, currency),
            tone: 'positive',
          },
          {
            label: 'Clientes con saldo pendiente',
            value: `${customersCount}`,
          },
        ];

  const now = new Date();

  const rows: ReportTableRow[] = accounts.map((acc) => {
    const isOverdue =
      acc.isOverdue || acc.status === 'OVERDUE' || (acc.dueDate && new Date(acc.dueDate) < now);

    const pendingInsts = (acc.installments || []).filter((i: any) => i.status !== 'PAID');
    const overdueInsts = pendingInsts.filter(
      (i: any) => i.status === 'OVERDUE' || (i.dueDate && new Date(i.dueDate) < now)
    );

    const cuotasText =
      overdueInsts.length > 0
        ? `${pendingInsts.length} (${overdueInsts.length} venc.)`
        : `${pendingInsts.length}`;

    const nextDueInst = pendingInsts[0];
    const nextDueFormatted = nextDueInst?.dueDate
      ? formatManaguaDate(nextDueInst.dueDate)
      : acc.dueDate
      ? formatManaguaDate(acc.dueDate)
      : '—';

    const overdueDebt = isOverdue ? Number(acc.balance || 0) : 0;

    return {
      cells: {
        customer: sanitizeForbiddenPrintTerms(acc.customer?.name || 'Cliente general'),
        receipt: sanitizeForbiddenPrintTerms(acc.invoiceNumber ? `#${acc.invoiceNumber}` : 'Comprobante'),
        installments: cuotasText,
        nextDue: nextDueFormatted,
        overdue: formatCurrency(overdueDebt, currency),
        balance: formatCurrency(acc.balance || 0, currency),
      },
      highlight: isOverdue,
    };
  });

  const sections: ReportSection[] = [
    {
      type: 'keyValue',
      title: 'Totales de cuentas por cobrar',
      emptyMessage: 'Sin datos en el período',
      rows: summaryRows,
    },
    {
      type: 'table',
      title: `Detalle de cuentas por cobrar (${rows.length})`,
      emptyMessage: 'Sin datos en el período',
      columns: [
        { key: 'customer', label: 'Cliente', align: 'left' },
        { key: 'receipt', label: 'Comprobante', align: 'left', mono: true },
        { key: 'installments', label: 'Cuotas pend.', align: 'right', mono: true },
        { key: 'nextDue', label: 'Próximo vencimiento', align: 'left', mono: true },
        { key: 'overdue', label: 'Vencido', align: 'right', mono: true },
        { key: 'balance', label: 'Saldo', align: 'right', mono: true },
      ],
      rows,
      totalsRows: [
        {
          label: 'Cartera total por cobrar',
          value: formatCurrency(totalPortfolio, currency),
          isTotal: true,
          doubleHeight: true,
        },
      ],
    },
  ];

  return {
    reportKey: 'receivables',
    reportSlug: 'Cuentas_por_cobrar',
    title: 'Cuentas por cobrar',
    business: buildReportBusinessHeader(business, branchName, user),
    period: periodInfo,
    filtersText: sanitizeForbiddenPrintTerms(filtersParts.join(' · ')),
    printedBy: user?.name || user?.email || 'Usuario',
    printedAt: formatManaguaDateTime(new Date()),
    sections,
    footerText: DEFAULT_REPORT_FOOTER_TEXT,
    rowCount: rows.length,
  };
}

