import {
  ReportDocument,
  ReportKeyValueRow,
  ReportPeriodInfo,
  ReportSection,
} from '../types/report';
import { IncomeStatementResponse } from '../types/finances';
import { formatCurrency } from './formatters';
import { formatManaguaDate, formatManaguaDateTime } from './dateManagua';
import {
  buildReportBusinessHeader,
  DEFAULT_REPORT_FOOTER_TEXT,
  sanitizeForbiddenPrintTerms,
} from './reportHelpers';

export type IncomeStatementPeriodType = 'today' | 'week' | 'month' | 'year' | 'custom';

function getPeriodDisplayLabel(period: IncomeStatementPeriodType): string {
  switch (period) {
    case 'today':
      return 'Hoy';
    case 'week':
      return 'Esta semana';
    case 'month':
      return 'Este mes';
    case 'year':
      return 'Este año';
    case 'custom':
      return 'Personalizado';
  }
}

function formatComparisonDatesLabel(from?: string, to?: string): string {
  if (!from || !to) return '';
  return `${formatManaguaDate(from)} al ${formatManaguaDate(to)}`;
}

function formatChangeText(
  change: number | null | undefined,
  prevDates: string,
  emptyText = 'Sin datos en el período anterior'
): string {
  if (change === null || change === undefined) {
    return emptyText;
  }
  const sign = change > 0 ? '+' : '';
  const vsSuffix = prevDates ? ` vs ${prevDates}` : '';
  return `${sign}${change.toFixed(2)}%${vsSuffix}`;
}

export interface BuildIncomeStatementReportParams {
  data: IncomeStatementResponse;
  periodType: IncomeStatementPeriodType;
  customFrom?: string;
  customTo?: string;
  business: any;
  branchName?: string | null;
  user: any;
  currency?: string;
}

/**
 * Construye el `ReportDocument` del Estado de resultados tomando exactamente las cifras
 * entregadas por el API sin recalcular nada en la web, omitiendo tooltips y textos en inglés,
 * y reemplazando "COGS" por "Costo de lo vendido".
 */
export function buildIncomeStatementReportDocument(
  params: BuildIncomeStatementReportParams
): ReportDocument {
  const {
    data,
    periodType,
    customFrom,
    customTo,
    business,
    branchName,
    user,
    currency = 'NIO',
  } = params;

  const periodLabel = getPeriodDisplayLabel(periodType);
  const fromStr = periodType === 'custom' && customFrom ? customFrom : data.period?.from;
  const toStr = periodType === 'custom' && customTo ? customTo : data.period?.to;

  const periodInfo: ReportPeriodInfo = {
    label: periodLabel,
    fromFormatted: fromStr ? formatManaguaDate(fromStr) : '—',
    toFormatted: toStr ? formatManaguaDate(toStr) : '—',
    fromSlug: fromStr ? fromStr.slice(0, 10) : 'inicio',
    toSlug: toStr ? toStr.slice(0, 10) : 'fin',
  };

  const prevDates = formatComparisonDatesLabel(
    data.comparison?.previousPeriod?.from,
    data.comparison?.previousPeriod?.to
  );

  const isPartial = Boolean(
    data.isPartial || (data.coverage && data.coverage.coveragePercent < 100)
  );
  const uncoveredRevenue = data.uncoveredRevenue;
  const hasUncoveredRevenue =
    typeof uncoveredRevenue === 'number' && !Number.isNaN(uncoveredRevenue) && uncoveredRevenue > 0;

  const interestIncome = data.interestIncome ?? 0;
  const netProfit = data.netProfit ?? data.operatingProfit;

  // 1. Ingresos operacionales por ventas
  const ingresosRows: ReportKeyValueRow[] = [
    {
      label: '(+) Ventas Brutas:',
      value: formatCurrency(data.grossSales, currency),
    },
  ];

  if (data.discounts > 0) {
    ingresosRows.push({
      label: '(-) Descuentos aplicados:',
      value: `-${formatCurrency(data.discounts, currency)}`,
      tone: 'warning',
    });
  }

  if (data.returns > 0) {
    ingresosRows.push({
      label: '(-) Devoluciones / Reembolsos:',
      value: `-${formatCurrency(data.returns, currency)}`,
      tone: 'negative',
    });
  }

  ingresosRows.push({
    label: '(=) Ventas Netas:',
    value: formatCurrency(data.netSales, currency),
    isTotal: true,
    comparisonText: `Comparativa ventas: ${formatChangeText(
      data.comparison?.netSalesChange,
      prevDates
    )}`,
  });

  // 2. Costo de lo vendido y utilidad bruta con su margen
  const cogsRows: ReportKeyValueRow[] = [
    {
      label: '(-) Costo de productos vendidos (Costo de lo vendido):',
      value: `-${formatCurrency(data.costOfGoodsSold, currency)}`,
      tone: 'negative',
      comparisonText:
        data.comparison?.grossProfitChange !== undefined
          ? `Comparativa utilidad: ${formatChangeText(
              data.comparison?.grossProfitChange,
              prevDates
            )}`
          : undefined,
    },
  ];

  if (data.channelFees !== null && data.channelFees !== undefined) {
    cogsRows.push({
      label: '(−) Comisión e impuesto de PedidosYa:',
      sublabel: `Comisión: ${formatCurrency(data.channelFees.commission, currency)} · Impuesto: ${formatCurrency(data.channelFees.tax, currency)}`,
      value: `-${formatCurrency(data.channelFees.total, currency)}`,
      tone: 'negative',
    });
  }

  if (isPartial && hasUncoveredRevenue) {
    cogsRows.push({
      label: 'Ventas sin costo registrado:',
      value: formatCurrency(uncoveredRevenue, currency),
      indent: true,
      tone: 'warning',
    });
  }

  cogsRows.push({
    label: isPartial ? '(=) Utilidad bruta (estimada):' : '(=) Utilidad Bruta:',
    value: formatCurrency(data.grossProfit, currency),
    isTotal: true,
    tone: data.grossProfit >= 0 ? 'positive' : 'negative',
    sublabel: `Margen Bruto: ${data.grossMarginPercent.toFixed(2)}%`,
    comparisonText: `Comparativa utilidad: ${formatChangeText(
      data.comparison?.grossProfitChange,
      prevDates
    )}`,
  });

  // 3. Gastos operativos
  const gastosRows: ReportKeyValueRow[] = [];
  const byCat = data.operatingExpenses?.byCategory || [];

  if (byCat.length === 0 || data.operatingExpenses?.total === 0) {
    gastosRows.push({
      label: 'Sin gastos registrados en el período',
      value: formatCurrency(0, currency),
    });
  } else {
    for (const cat of byCat) {
      gastosRows.push({
        label: sanitizeForbiddenPrintTerms(cat.category || 'Varios'),
        value: `${formatCurrency(cat.amount, currency)} (${cat.percent.toFixed(1)}%)`,
        indent: true,
      });
    }
  }

  gastosRows.push({
    label: '(=) Total Gastos Operativos:',
    value: `-${formatCurrency(data.operatingExpenses?.total || 0, currency)}`,
    isTotal: true,
    tone: 'negative',
  });

  // 4. Resultado operativo
  const opIncomeRows: ReportKeyValueRow[] = [
    {
      label: isPartial
        ? '(=) Utilidad Operativa (estimada):'
        : '(=) Utilidad Operativa:',
      value: formatCurrency(data.operatingProfit, currency),
      isTotal: true,
      doubleHeight: true,
      tone: data.operatingProfit >= 0 ? 'positive' : 'negative',
      sublabel: `Margen Operativo: ${data.operatingMarginPercent.toFixed(2)}%`,
      comparisonText: `Comparativa operativa: ${formatChangeText(
        data.comparison?.operatingProfitChange,
        prevDates
      )}`,
    },
  ];

  // 5. Otros ingresos / Intereses de Cartera (si aplica)
  const otrosRows: ReportKeyValueRow[] = [];
  if (interestIncome > 0) {
    otrosRows.push({
      label: '(+) Ingresos por intereses y mora (Cartera de crédito):',
      value: `+${formatCurrency(interestIncome, currency)}`,
      tone: 'positive',
    });
  }

  // 6. Utilidad Neta final
  const netIncomeRows: ReportKeyValueRow[] = [
    {
      label: isPartial ? '(=) Utilidad Neta (estimada):' : '(=) Utilidad Neta:',
      value: formatCurrency(netProfit, currency),
      isTotal: true,
      doubleHeight: true,
      tone: netProfit >= 0 ? 'positive' : 'negative',
      comparisonText: `Comparativa neta: ${formatChangeText(
        data.comparison?.netProfitChange,
        prevDates
      )}`,
    },
  ];

  const sections: ReportSection[] = [
    {
      type: 'keyValue',
      title: '1. Ingresos por Ventas',
      rows: ingresosRows,
    },
    {
      type: 'keyValue',
      title: '2. Costo de lo vendido y Utilidad Bruta',
      rows: cogsRows,
    },
    {
      type: 'keyValue',
      title: '3. Gastos Operativos',
      rows: gastosRows,
    },
    {
      type: 'keyValue',
      title: '4. Resultado Operativo',
      rows: opIncomeRows,
    },
  ];

  if (otrosRows.length > 0) {
    sections.push({
      type: 'keyValue',
      title: '5. Otros Ingresos',
      rows: otrosRows,
    });
  }

  sections.push({
    type: 'keyValue',
    title: otrosRows.length > 0 ? '6. Utilidad Neta del Ejercicio' : '5. Utilidad Neta del Ejercicio',
    rows: netIncomeRows,
  });

  const filtersParts: string[] = [
    `Período: ${periodLabel}`,
    `Rango: ${periodInfo.fromFormatted} al ${periodInfo.toFormatted}`,
  ];
  if (prevDates) {
    filtersParts.push(`Comparado con: ${prevDates}`);
  }

  return {
    reportKey: 'income_statement',
    reportSlug: 'Estado_de_Resultados',
    title: 'Estado de resultados',
    business: buildReportBusinessHeader(business, branchName, user),
    period: periodInfo,
    filtersText: sanitizeForbiddenPrintTerms(filtersParts.join(' · ')),
    printedBy: user?.name || user?.email || 'Usuario',
    printedAt: formatManaguaDateTime(new Date()),
    sections,
    footerText: DEFAULT_REPORT_FOOTER_TEXT,
    rowCount: sections.reduce((acc, s) => acc + (s.type === 'keyValue' ? s.rows.length : 0), 0),
  };
}

