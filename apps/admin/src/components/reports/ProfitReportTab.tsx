import React, { useEffect, useMemo, useState } from 'react';
import {
  TrendUp,
  Percent,
  Coins,
  WarningCircle,
  CheckCircle,
  ArrowRight,
  Printer,
  MagnifyingGlass,
  DownloadSimple,
  CaretUp,
  CaretDown,
  CalendarBlank,
  Clock,
  Tag,
  User,
  Receipt,
  Sparkle,
  Info,
  ArrowsClockwise,
  Storefront,
  DeviceMobile,
} from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from 'api-client';
import {
  PeriodType,
  ProfitChannelColumn,
  ProfitProductsResponse,
  ProfitSummaryReport,
} from '../../types/reports';
import { useProfitProducts } from '../../hooks/useBackofficeReports';
import { formatCurrency } from '../../utils/formatters';
import { TooltipInfo } from '../finances/TooltipInfo';
import { sanitizeForbiddenPrintTerms } from '../../utils/reportHelpers';

interface ProfitReportTabProps {
  summaryData?: ProfitSummaryReport | null;
  period: PeriodType;
  from?: string;
  to?: string;
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  hasActiveDelivery?: boolean;
  hasActivePedidosYa?: boolean;
  onPrint?: () => void;
  isPreparingPrint?: boolean;
}

type ProductFilterType = 'all' | 'lowmargin' | 'loss' | 'nocost';
type ProductSortCol =
  | 'profit'
  | 'sales'
  | 'cost'
  | 'margin'
  | 'units'
  | 'name'
  | 'salesshare';

const formatMoneyOrDash = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(Number(val))) return '—';
  return formatCurrency(Number(val));
};

const formatNegativeOrDash = (
  val: number | null | undefined,
  treatAsMissing = false
): string => {
  if (treatAsMissing || val === null || val === undefined || isNaN(Number(val))) {
    return '—';
  }
  const num = Number(val);
  return num > 0 ? `-${formatCurrency(num)}` : formatCurrency(num);
};

const formatPercentOrDash = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(Number(val))) return '—';
  return `${Number(val).toFixed(1)}%`;
};

const formatShortDateEs = (ymd: string): string => {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}/.test(ymd)) return ymd || '—';
  const parts = ymd.slice(0, 10).split('-').map(Number);
  const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  return dt
    .toLocaleDateString('es-NI', {
      day: '2-digit',
      month: 'short',
      timeZone: 'UTC',
    })
    .replace('.', '');
};

const colHasZeroCoverage = (col: ProfitChannelColumn): boolean =>
  Boolean((col.sales > 0 && col.coveredSales === 0) || col.productProfit === null);

export const ProfitReportTab: React.FC<ProfitReportTabProps> = ({
  summaryData,
  period,
  from,
  to,
  isLoading,
  isError = false,
  onRetry,
  hasActiveDelivery = false,
  hasActivePedidosYa = false,
  onPrint,
  isPreparingPrint = false,
}) => {
  const navigate = useNavigate();

  // Estado de tabla de productos
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortCol, setSortCol] = useState<ProductSortCol>('profit');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [activeFilter, setActiveFilter] = useState<ProductFilterType>('all');
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  // Toggles UI
  const [showDaysTable, setShowDaysTable] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [period, from, to, debouncedSearch, selectedCategory, activeFilter, sortCol, sortDir, pageSize]);

  const productsQueryParams = useMemo(
    () => ({
      period,
      from,
      to,
      page,
      pageSize,
      sort: sortCol,
      dir: sortDir,
      search: debouncedSearch || undefined,
      categoryId: selectedCategory || undefined,
      filter: activeFilter,
    }),
    [period, from, to, page, pageSize, sortCol, sortDir, debouncedSearch, selectedCategory, activeFilter]
  );

  const {
    data: productsData,
    isLoading: isLoadingProducts,
    isError: isErrorProducts,
    refetch: refetchProducts,
  } = useProfitProducts(productsQueryParams, true);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100 shadow-2xs" />
          ))}
        </div>
        <div className="h-52 bg-white rounded-2xl border border-gray-100 shadow-2xs" />
        <div className="h-64 bg-white rounded-2xl border border-gray-100 shadow-2xs" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-800">
        <span>No se pudo cargar el resumen de ganancias. Verificá tu conexión e intentá de nuevo.</span>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl transition-colors cursor-pointer self-start sm:self-auto"
          >
            <ArrowsClockwise size={14} weight="bold" />
            <span>Reintentar</span>
          </button>
        )}
      </div>
    );
  }

  const totals = summaryData?.totals;
  const channelSummary = summaryData?.channelSummary;
  const pyCol = channelSummary?.pedidosYa ?? null;
  const hasPedidosYa = Boolean(pyCol);
  const deliveryRevenue =
    channelSummary?.deliveryRevenue ?? totals?.deliveryRevenue ?? 0;
  const showDelivery = Boolean(hasActiveDelivery || deliveryRevenue > 0);
  const showChannelSummary = Boolean(
    channelSummary && (hasPedidosYa || hasActivePedidosYa || showDelivery)
  );

  const resolvedTotalProfit =
    channelSummary?.totalProfit !== undefined
      ? channelSummary.totalProfit
      : totals?.totalProfit !== undefined
      ? totals.totalProfit
      : totals?.grossProfit ?? null;

  const hasZeroSales = Boolean(
    !totals || (totals.sales === 0 && totals.receipts === 0 && deliveryRevenue === 0)
  );

  const isZeroCoverage = Boolean(
    totals &&
      ((totals.coveredSales === 0 && totals.sales > 0) ||
        (resolvedTotalProfit === null && totals.sales > 0))
  );

  const periodHuman =
    period === 'today'
      ? 'hoy'
      : period === 'week'
      ? 'esta semana'
      : period === 'month'
      ? 'este mes'
      : 'este período';
  const periodIntro = period === 'today' ? 'Hoy' : `En ${periodHuman}`;

  const handleSort = (col: ProductSortCol) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir(col === 'name' ? 'asc' : 'desc');
    }
  };

  const getAriaSort = (col: ProductSortCol) => {
    if (sortCol !== col) return 'none';
    return sortDir === 'asc' ? 'ascending' : 'descending';
  };

  const handleExportCSV = async () => {
    setIsExportingCsv(true);
    try {
      const q = new URLSearchParams();
      if (period === 'custom' && from && to) {
        q.set('from', from);
        q.set('to', to);
      } else {
        q.set('period', period);
      }
      q.set('page', '1');
      q.set('pageSize', '5000');
      q.set('sort', sortCol);
      q.set('dir', sortDir);
      if (debouncedSearch) q.set('search', debouncedSearch);
      if (selectedCategory) q.set('categoryId', selectedCategory);
      if (activeFilter !== 'all') q.set('filter', activeFilter);

      const res = await apiClient.get<ProfitProductsResponse>(
        `/pos/reports/profit/products?${q.toString()}`
      );
      const items = res.data.items || [];

      let csv = '\uFEFF';
      csv += 'REPORTE DE GANANCIAS POR PRODUCTO\n';
      csv += `Período,${
        period === 'today'
          ? 'Hoy'
          : period === 'week'
          ? 'Esta semana'
          : period === 'month'
          ? 'Este mes'
          : `${from || ''} a ${to || ''}`
      }\n\n`;
      csv += 'Producto,Categoría,Unidades,Unidad,Ventas,Costo de lo vendido,Ganancia,Margen %,% Ventas\n';

      for (const it of items) {
        const prodName = `"${(it.name || '').replace(/"/g, '""')}"`;
        const catName = `"${(it.category || 'Sin categoría').replace(/"/g, '""')}"`;
        const unit = `"${it.unit || 'UND'}"`;
        const sales = Number(it.sales ?? 0).toFixed(2);
        const cost = it.hasCost && it.cost !== null ? Number(it.cost).toFixed(2) : '';
        const profit = it.hasCost && it.profit !== null ? Number(it.profit).toFixed(2) : '';
        const margin =
          it.hasCost && it.marginPercent !== null ? `${Number(it.marginPercent).toFixed(1)}%` : '';
        const shareRaw = it.salesSharePercent ?? it.sharePercent;
        const share = shareRaw !== null && shareRaw !== undefined ? `${Number(shareRaw).toFixed(1)}%` : '0.0%';

        csv += `${prodName},${catName},${it.unitsSold ?? 0},${unit},${sales},${cost},${profit},${margin},${share}\n`;
      }

      const t = res.data.totals;
      if (t) {
        csv += `\n"TOTALES","${res.data.total ?? items.length} productos",${t.unitsSold ?? 0},"",${Number(
          t.sales ?? 0
        ).toFixed(2)},${t.cost !== null && t.cost !== undefined ? Number(t.cost).toFixed(2) : ''},${
          t.profit !== null && t.profit !== undefined ? Number(t.profit).toFixed(2) : ''
        },${t.marginPercent !== null && t.marginPercent !== undefined ? `${Number(t.marginPercent).toFixed(1)}%` : ''},"100%"\n`;
      }

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `ganancias_productos_${period === 'custom' ? `${from}_${to}` : period}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exportando CSV de ganancias:', err);
    } finally {
      setIsExportingCsv(false);
    }
  };

  const renderMarginBadge = (hasCost?: boolean, marginPercent?: number | null) => {
    if (!hasCost || marginPercent === null || marginPercent === undefined || isNaN(Number(marginPercent))) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 whitespace-nowrap">
          Sin costo
        </span>
      );
    }
    const m = Number(marginPercent);
    if (m < 0) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 whitespace-nowrap tabular-nums">
          Pérdida ({m.toFixed(1)}%)
        </span>
      );
    }
    if (m < 10) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 whitespace-nowrap tabular-nums">
          Bajo ({m.toFixed(1)}%)
        </span>
      );
    }
    if (m < 30) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 whitespace-nowrap tabular-nums">
          Medio ({m.toFixed(1)}%)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 whitespace-nowrap tabular-nums">
        Alto ({m.toFixed(1)}%)
      </span>
    );
  };

  const profitSubtitle = (() => {
    if (isZeroCoverage || resolvedTotalProfit === null) {
      return 'Sin costo registrado en productos';
    }
    if (showDelivery && hasPedidosYa) {
      return 'Incluye envíos y descuenta PedidosYa';
    }
    if (showDelivery) {
      return 'Incluye ingresos por envío cobrados';
    }
    if (hasPedidosYa) {
      return 'Descuenta comisión de PedidosYa';
    }
    return 'Sobre ventas con costo conocido';
  })();

  const renderMobileChannelCard = (
    title: string,
    icon: React.ReactNode,
    col: ProfitChannelColumn,
    options?: {
      isTotalCard?: boolean;
      showFeesRow?: boolean;
      showDeliveryRow?: boolean;
      deliveryAmount?: number;
      totalProfit?: number | null;
      accentClass?: string;
    }
  ) => {
    const colZero = colHasZeroCoverage(col);
    const showFeesRow = Boolean(options?.showFeesRow);
    const showDelivRow = Boolean(options?.showDeliveryRow);

    return (
      <div
        className={`rounded-2xl border p-4 space-y-2.5 ${
          options?.accentClass || 'bg-white border-gray-200/80'
        }`}
      >
        <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
          <span className="shrink-0">{icon}</span>
          <h4 className="text-sm font-bold text-gray-900">{title}</h4>
        </div>

        <dl className="space-y-2 text-xs">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-gray-600">Ventas</dt>
            <dd className="font-semibold text-gray-900 font-mono whitespace-nowrap tabular-nums">
              {formatCurrency(col.sales)}
            </dd>
          </div>

          {showFeesRow && (
            <div className="space-y-0.5">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-600">(−) Comisión e impuesto de PedidosYa</dt>
                <dd className="font-semibold text-rose-700 font-mono whitespace-nowrap tabular-nums">
                  {col.channelFees
                    ? col.channelFees.total > 0
                      ? `-${formatCurrency(col.channelFees.total)}`
                      : formatCurrency(0)
                    : '—'}
                </dd>
              </div>
              {col.channelFees && col.channelFees.total > 0 && (
                <p className="text-xs text-gray-500 flex flex-wrap justify-end gap-x-2">
                  <span className="whitespace-nowrap">
                    Comisión: {formatCurrency(col.channelFees.commission)}
                  </span>
                  <span className="whitespace-nowrap">
                    Impuesto: {formatCurrency(col.channelFees.tax)}
                  </span>
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-1 border-t border-gray-100">
            <dt className="font-semibold text-gray-800">Ventas netas</dt>
            <dd className="font-bold text-gray-900 font-mono whitespace-nowrap tabular-nums">
              {formatCurrency(col.netSales)}
            </dd>
          </div>

          <div className="flex items-center justify-between gap-3">
            <dt className="text-gray-600">(−) Costo de lo vendido</dt>
            <dd className="font-semibold text-gray-800 font-mono whitespace-nowrap tabular-nums">
              {formatNegativeOrDash(col.cost, colZero)}
            </dd>
          </div>

          <div className="flex items-center justify-between gap-3">
            <dt className="font-semibold text-gray-800">Ganancia de productos</dt>
            <dd
              className={`font-bold font-mono whitespace-nowrap tabular-nums ${
                col.productProfit === null
                  ? 'text-gray-400'
                  : col.productProfit < 0
                  ? 'text-rose-700'
                  : 'text-emerald-700'
              }`}
            >
              {formatMoneyOrDash(col.productProfit)}
            </dd>
          </div>

          <div className="flex items-center justify-between gap-3">
            <dt className="text-gray-600">Margen</dt>
            <dd className="font-semibold text-gray-800 font-mono whitespace-nowrap tabular-nums">
              {formatPercentOrDash(col.marginPercent)}
            </dd>
          </div>

          {options?.isTotalCard && showDelivRow && (
            <div className="flex items-center justify-between gap-3 pt-1 border-t border-gray-100">
              <dt className="text-gray-700">(+) Ingresos por envío cobrados</dt>
              <dd className="font-semibold text-emerald-700 font-mono whitespace-nowrap tabular-nums">
                {(options.deliveryAmount ?? 0) > 0
                  ? `+${formatCurrency(options.deliveryAmount)}`
                  : formatCurrency(0)}
              </dd>
            </div>
          )}

          {options?.isTotalCard && (
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-200">
              <dt className="text-sm font-bold text-gray-900">Ganancia total</dt>
              <dd
                className={`text-sm font-bold font-mono whitespace-nowrap tabular-nums ${
                  options.totalProfit === null || options.totalProfit === undefined
                    ? 'text-gray-400'
                    : options.totalProfit < 0
                    ? 'text-rose-700'
                    : 'text-emerald-700'
                }`}
              >
                {formatMoneyOrDash(options.totalProfit)}
              </dd>
            </div>
          )}
        </dl>
      </div>
    );
  };

  const totalProductItems = productsData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalProductItems / pageSize));
  const seriesItems =
    summaryData?.byHour && summaryData.byHour.length > 0
      ? summaryData.byHour
      : summaryData?.byDay || [];
  const hasSeriesData = seriesItems.some((item) => item.sales > 0 || item.profit !== 0);

  return (
    <div className="space-y-5">
      {/* Cabecera de acción Imprimir */}
      {onPrint && (
        <div className="flex justify-end">
          <button
            type="button"
            disabled={isPreparingPrint || isLoading}
            onClick={onPrint}
            className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 text-xs font-semibold transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
            title="Imprimir reporte en PDF carta"
          >
            <Printer size={16} weight="bold" />
            <span>{isPreparingPrint ? 'Preparando...' : 'Imprimir'}</span>
          </button>
        </div>
      )}

      {/* Estado vacío sin ventas */}
      {hasZeroSales ? (
        <div className="p-8 bg-white rounded-2xl border border-gray-200/80 shadow-2xs text-center space-y-3">
          <div className="w-12 h-12 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto">
            <Receipt size={24} weight="duotone" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              No se registraron ventas {period === 'today' ? 'hoy' : `en ${periodHuman}`}
            </h3>
            <p className="text-xs text-gray-600 max-w-md mx-auto mt-1">
              Cuando registrés comprobantes en caja, verás acá tus ventas, costos, ganancias por
              canal y rentabilidad por producto.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* 1. Resumen narrativo */}
          {totals && (
            <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-white rounded-2xl border border-emerald-200/80 shadow-2xs">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                  <Sparkle size={18} weight="fill" />
                </div>
                <div className="text-xs leading-relaxed text-gray-800 min-w-0">
                  <span className="font-bold text-gray-900 text-sm block mb-1">
                    Resumen de ganancias
                  </span>
                  {isZeroCoverage || resolvedTotalProfit === null ? (
                    <p>
                      {periodIntro} se vendieron{' '}
                      <strong className="font-bold text-gray-900 whitespace-nowrap">
                        {formatCurrency(totals.sales)}
                      </strong>
                      , pero ningún producto tiene costo registrado en el catálogo. No se muestra
                      ganancia inventada.
                    </p>
                  ) : totals.uncoveredRevenue > 0 ? (
                    <p>
                      De{' '}
                      <strong className="text-emerald-950 font-bold whitespace-nowrap">
                        {formatCurrency(totals.coveredSales)}
                      </strong>{' '}
                      vendidos con costo conocido, la mercadería te costó{' '}
                      <strong className="text-gray-950 font-bold whitespace-nowrap">
                        {formatCurrency(totals.cost)}
                      </strong>{' '}
                      y te quedó una ganancia total de{' '}
                      <strong className="text-emerald-700 font-bold whitespace-nowrap">
                        {formatCurrency(resolvedTotalProfit)}
                      </strong>
                      . Además vendiste{' '}
                      <strong className="text-amber-900 font-bold whitespace-nowrap">
                        {formatCurrency(totals.uncoveredRevenue)}
                      </strong>{' '}
                      en productos sin costo registrado, que no entran en la ganancia.
                    </p>
                  ) : (
                    <p>
                      {periodIntro} vendiste{' '}
                      <strong className="text-emerald-950 font-bold whitespace-nowrap">
                        {formatCurrency(totals.sales)}
                      </strong>
                      . Esa mercadería te costó{' '}
                      <strong className="text-gray-950 font-bold whitespace-nowrap">
                        {formatCurrency(totals.cost)}
                      </strong>
                      . Te quedó una ganancia total de{' '}
                      <strong className="text-emerald-700 font-bold whitespace-nowrap">
                        {formatCurrency(resolvedTotalProfit)}
                      </strong>
                      {totals.marginPercent !== null && totals.marginPercent !== undefined
                        ? `: por cada C$100 en ventas con costo, ganás C$${Number(
                            totals.marginPercent
                          ).toFixed(2)} sobre productos.`
                        : '.'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 2. KPIs principales (Ganancia = totalProfit, Margen, Ventas, Costo de lo vendido) */}
          {totals && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* Ganancia total */}
                <div className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-1.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 text-gray-500">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="text-xs font-semibold text-gray-700">
                          {summaryData?.costBasis === 'HISTORICAL'
                            ? 'Ganancia total'
                            : 'Ganancia total estimada'}
                        </span>
                        <TooltipInfo
                          text="Ganancia de productos con costo (descontando comisión de PedidosYa si aplica) más los ingresos por envío cobrados."
                          align="left"
                        />
                      </div>
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                        <TrendUp size={16} weight="bold" />
                      </div>
                    </div>
                    <div
                      className={`text-2xl font-bold tracking-tight font-mono whitespace-nowrap tabular-nums mt-1 ${
                        resolvedTotalProfit === null
                          ? 'text-gray-400'
                          : resolvedTotalProfit < 0
                          ? 'text-rose-700'
                          : 'text-emerald-700'
                      }`}
                    >
                      {isZeroCoverage ? '—' : formatMoneyOrDash(resolvedTotalProfit)}
                    </div>
                  </div>
                  <div className="pt-1 border-t border-gray-100 text-xs text-gray-500 space-y-0.5">
                    <div>{profitSubtitle}</div>
                    {summaryData?.previous &&
                      summaryData.previous.totalProfit !== null &&
                      summaryData.previous.totalProfit !== undefined && (
                        <div className="text-gray-500 whitespace-nowrap tabular-nums">
                          Período anterior: {formatCurrency(summaryData.previous.totalProfit)}
                        </div>
                      )}
                  </div>
                </div>

                {/* Margen */}
                <div className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-1.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 text-gray-500">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="text-xs font-semibold text-gray-700">Margen</span>
                        <TooltipInfo
                          text="Porcentaje de rentabilidad sobre las ventas netas con costo conocido."
                          align="left"
                        />
                      </div>
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                        <Percent size={16} weight="bold" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 tracking-tight font-mono whitespace-nowrap tabular-nums mt-1">
                      {isZeroCoverage ? '—' : formatPercentOrDash(totals.marginPercent)}
                    </div>
                  </div>
                  <div className="pt-1 border-t border-gray-100 text-xs text-gray-500 space-y-0.5">
                    <div>
                      {!isZeroCoverage &&
                      totals.marginPercent !== null &&
                      totals.marginPercent !== undefined
                        ? `Ganás C$${Number(totals.marginPercent).toFixed(2)} por cada C$100`
                        : 'Sin costo registrado'}
                    </div>
                    {summaryData?.previous &&
                      summaryData.previous.marginPercent !== null &&
                      summaryData.previous.marginPercent !== undefined && (
                        <div className="text-gray-500 whitespace-nowrap tabular-nums">
                          Período anterior: {Number(summaryData.previous.marginPercent).toFixed(1)}%
                        </div>
                      )}
                  </div>
                </div>

                {/* Ventas */}
                <div className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-1.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 text-gray-500">
                      <span className="text-xs font-semibold text-gray-700">Ventas</span>
                      <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center shrink-0">
                        <Receipt size={16} weight="bold" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 tracking-tight font-mono whitespace-nowrap tabular-nums mt-1">
                      {formatCurrency(totals.sales)}
                    </div>
                  </div>
                  <div className="pt-1 border-t border-gray-100 text-xs text-gray-500 space-y-0.5">
                    <div className="whitespace-nowrap">
                      {totals.receipts}{' '}
                      {totals.receipts === 1 ? 'comprobante' : 'comprobantes'}
                    </div>
                    {totals.uncoveredRevenue > 0 && (
                      <div className="text-amber-800 font-medium whitespace-nowrap tabular-nums">
                        · {formatCurrency(totals.uncoveredRevenue)} sin costo registrado
                      </div>
                    )}
                  </div>
                </div>

                {/* Costo de lo vendido */}
                <div className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-1.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 text-gray-500">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="text-xs font-semibold text-gray-700">
                          Costo de lo vendido
                        </span>
                        <TooltipInfo
                          text="Costo total de compra o receta de la mercadería vendida en el período."
                          align="right"
                        />
                      </div>
                      <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center shrink-0">
                        <Coins size={16} weight="bold" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 tracking-tight font-mono whitespace-nowrap tabular-nums mt-1">
                      {isZeroCoverage ? '—' : formatMoneyOrDash(totals.cost)}
                    </div>
                  </div>
                  <div className="pt-1 border-t border-gray-100 text-xs text-gray-500 space-y-0.5">
                    <div>Costo de mercadería vendida</div>
                    {summaryData?.previous &&
                      summaryData.previous.cost !== null &&
                      summaryData.previous.cost !== undefined && (
                        <div className="text-gray-500 whitespace-nowrap tabular-nums">
                          Período anterior: {formatCurrency(summaryData.previous.cost)}
                        </div>
                      )}
                  </div>
                </div>
              </div>

              {/* KPIs secundarios: descuentos + Finanzas si aplica */}
              {(totals.discounts > 0 ||
                (summaryData?.expenses !== null && summaryData?.expenses !== undefined)) && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-200/70 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-gray-700">
                      Descuentos otorgados
                    </span>
                    <span className="text-sm font-bold text-gray-900 font-mono whitespace-nowrap tabular-nums">
                      {formatCurrency(totals.discounts)}
                    </span>
                  </div>

                  {summaryData?.expenses !== null && summaryData?.expenses !== undefined && (
                    <div className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-200/70 flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-gray-700">
                        Gastos del período
                      </span>
                      <span className="text-sm font-bold text-gray-900 font-mono whitespace-nowrap tabular-nums">
                        {formatCurrency(summaryData.expenses.total)}
                      </span>
                    </div>
                  )}

                  {summaryData?.expenses !== null &&
                    summaryData?.expenses !== undefined &&
                    summaryData?.netProfit !== undefined && (
                      <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200/80 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-emerald-950 block">
                            Utilidad neta
                          </span>
                          {summaryData.netProfitNote && (
                            <span className="text-xs text-amber-800 block mt-0.5">
                              {sanitizeForbiddenPrintTerms(summaryData.netProfitNote)}
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-sm font-bold font-mono whitespace-nowrap tabular-nums ${
                            summaryData.netProfit === null
                              ? 'text-gray-400'
                              : summaryData.netProfit < 0
                              ? 'text-rose-700'
                              : 'text-emerald-700'
                          }`}
                        >
                          {isZeroCoverage ? '—' : formatMoneyOrDash(summaryData.netProfit)}
                        </span>
                      </div>
                    )}
                </div>
              )}

              {/* Nota de base de costo */}
              {summaryData?.costBasisNote && (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/70 text-xs text-gray-600 flex items-start gap-2">
                  <Info size={16} className="text-gray-500 shrink-0 mt-0.5" />
                  <span>
                    {sanitizeForbiddenPrintTerms(summaryData.costBasisNote)}{' '}
                    {summaryData.costBasis === 'MIXED' &&
                      summaryData.historicalSharePercent !== undefined && (
                        <strong>
                          El {summaryData.historicalSharePercent}% de las ventas usa el costo que
                          tenía cada producto al venderse; el resto usa el costo actual.
                        </strong>
                      )}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 3. Tabla "Resumen por canal" (solo si hay PedidosYa o envíos) */}
          {showChannelSummary && channelSummary && (
            <section className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-4 sm:p-5 space-y-4">
              <div className="pb-2 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900">Resumen por canal</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {hasPedidosYa
                    ? 'Desglose de tus ventas propias, PedidosYa e ingresos por envío.'
                    : 'Detalle de tus ventas e ingresos por envío incluidos en la ganancia.'}
                </p>
              </div>

              {/* Móvil (375 px): tarjetas apiladas, cero scroll horizontal */}
              <div className="md:hidden space-y-3">
                {hasPedidosYa && pyCol ? (
                  <>
                    {renderMobileChannelCard(
                      'Ventas propias',
                      <Storefront size={16} weight="bold" className="text-gray-700" />,
                      channelSummary.own,
                      { showFeesRow: true }
                    )}
                    {renderMobileChannelCard(
                      'PedidosYa',
                      <DeviceMobile size={16} weight="bold" className="text-rose-700" />,
                      pyCol,
                      { showFeesRow: true }
                    )}
                    {renderMobileChannelCard(
                      'Total',
                      <TrendUp size={16} weight="bold" className="text-emerald-700" />,
                      channelSummary.total,
                      {
                        isTotalCard: true,
                        showFeesRow: true,
                        showDeliveryRow: showDelivery,
                        deliveryAmount: deliveryRevenue,
                        totalProfit: channelSummary.totalProfit,
                        accentClass: 'bg-emerald-50/35 border-emerald-200/80',
                      }
                    )}
                  </>
                ) : (
                  renderMobileChannelCard(
                    'Total del período',
                    <TrendUp size={16} weight="bold" className="text-emerald-700" />,
                    channelSummary.total,
                    {
                      isTotalCard: true,
                      showFeesRow: false,
                      showDeliveryRow: showDelivery,
                      deliveryAmount: deliveryRevenue,
                      totalProfit: channelSummary.totalProfit,
                      accentClass: 'bg-emerald-50/35 border-emerald-200/80',
                    }
                  )
                )}
              </div>

              {/* Desktop: tabla comparativa de 3 columnas o columna única */}
              <div className="hidden md:block overflow-x-auto border border-gray-100 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-4">Concepto</th>
                      {hasPedidosYa && (
                        <>
                          <th className="py-2.5 px-4 text-right whitespace-nowrap">
                            Ventas propias
                          </th>
                          <th className="py-2.5 px-4 text-right whitespace-nowrap">PedidosYa</th>
                        </>
                      )}
                      <th className="py-2.5 px-4 text-right whitespace-nowrap">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-800">
                    <tr className="hover:bg-gray-50/50">
                      <td className="py-2.5 px-4 font-medium">Ventas</td>
                      {hasPedidosYa && pyCol && (
                        <>
                          <td className="py-2.5 px-4 text-right font-mono whitespace-nowrap tabular-nums">
                            {formatCurrency(channelSummary.own.sales)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono whitespace-nowrap tabular-nums">
                            {formatCurrency(pyCol.sales)}
                          </td>
                        </>
                      )}
                      <td className="py-2.5 px-4 text-right font-semibold font-mono whitespace-nowrap tabular-nums text-gray-900">
                        {formatCurrency(channelSummary.total.sales)}
                      </td>
                    </tr>

                    {hasPedidosYa && pyCol && (
                      <tr className="hover:bg-gray-50/50">
                        <td className="py-2.5 px-4 font-medium text-gray-700">
                          <div>(−) Comisión e impuesto de PedidosYa</div>
                          {pyCol.channelFees && pyCol.channelFees.total > 0 && (
                            <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-3">
                              <span className="whitespace-nowrap">
                                Comisión: {formatCurrency(pyCol.channelFees.commission)}
                              </span>
                              <span className="whitespace-nowrap">
                                Impuesto: {formatCurrency(pyCol.channelFees.tax)}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono whitespace-nowrap text-gray-400">
                          —
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono whitespace-nowrap tabular-nums text-rose-700 font-semibold">
                          {pyCol.channelFees
                            ? pyCol.channelFees.total > 0
                              ? `-${formatCurrency(pyCol.channelFees.total)}`
                              : formatCurrency(0)
                            : '—'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono whitespace-nowrap tabular-nums text-rose-700 font-semibold">
                          {channelSummary.total.channelFees
                            ? channelSummary.total.channelFees.total > 0
                              ? `-${formatCurrency(channelSummary.total.channelFees.total)}`
                              : formatCurrency(0)
                            : '—'}
                        </td>
                      </tr>
                    )}

                    <tr className="bg-gray-50/60 font-semibold">
                      <td className="py-2.5 px-4 text-gray-900">Ventas netas</td>
                      {hasPedidosYa && pyCol && (
                        <>
                          <td className="py-2.5 px-4 text-right font-mono whitespace-nowrap tabular-nums text-gray-900">
                            {formatCurrency(channelSummary.own.netSales)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono whitespace-nowrap tabular-nums text-gray-900">
                            {formatCurrency(pyCol.netSales)}
                          </td>
                        </>
                      )}
                      <td className="py-2.5 px-4 text-right font-mono whitespace-nowrap tabular-nums text-gray-900">
                        {formatCurrency(channelSummary.total.netSales)}
                      </td>
                    </tr>

                    <tr className="hover:bg-gray-50/50">
                      <td className="py-2.5 px-4 text-gray-700">(−) Costo de lo vendido</td>
                      {hasPedidosYa && pyCol && (
                        <>
                          <td className="py-2.5 px-4 text-right font-mono whitespace-nowrap tabular-nums text-gray-700">
                            {formatNegativeOrDash(
                              channelSummary.own.cost,
                              colHasZeroCoverage(channelSummary.own)
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono whitespace-nowrap tabular-nums text-gray-700">
                            {formatNegativeOrDash(pyCol.cost, colHasZeroCoverage(pyCol))}
                          </td>
                        </>
                      )}
                      <td className="py-2.5 px-4 text-right font-mono whitespace-nowrap tabular-nums text-gray-700">
                        {formatNegativeOrDash(
                          channelSummary.total.cost,
                          colHasZeroCoverage(channelSummary.total)
                        )}
                      </td>
                    </tr>

                    <tr className="hover:bg-gray-50/50 font-semibold">
                      <td className="py-2.5 px-4 text-gray-900">Ganancia de productos</td>
                      {hasPedidosYa && pyCol && (
                        <>
                          <td
                            className={`py-2.5 px-4 text-right font-mono whitespace-nowrap tabular-nums ${
                              channelSummary.own.productProfit === null
                                ? 'text-gray-400'
                                : channelSummary.own.productProfit < 0
                                ? 'text-rose-700'
                                : 'text-emerald-700'
                            }`}
                          >
                            {formatMoneyOrDash(channelSummary.own.productProfit)}
                          </td>
                          <td
                            className={`py-2.5 px-4 text-right font-mono whitespace-nowrap tabular-nums ${
                              pyCol.productProfit === null
                                ? 'text-gray-400'
                                : pyCol.productProfit < 0
                                ? 'text-rose-700'
                                : 'text-emerald-700'
                            }`}
                          >
                            {formatMoneyOrDash(pyCol.productProfit)}
                          </td>
                        </>
                      )}
                      <td
                        className={`py-2.5 px-4 text-right font-mono whitespace-nowrap tabular-nums ${
                          channelSummary.total.productProfit === null
                            ? 'text-gray-400'
                            : channelSummary.total.productProfit < 0
                            ? 'text-rose-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {formatMoneyOrDash(channelSummary.total.productProfit)}
                      </td>
                    </tr>

                    <tr className="hover:bg-gray-50/50">
                      <td className="py-2.5 px-4 text-gray-700">Margen</td>
                      {hasPedidosYa && pyCol && (
                        <>
                          <td className="py-2.5 px-4 text-right font-mono whitespace-nowrap tabular-nums">
                            {formatPercentOrDash(channelSummary.own.marginPercent)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono whitespace-nowrap tabular-nums">
                            {formatPercentOrDash(pyCol.marginPercent)}
                          </td>
                        </>
                      )}
                      <td className="py-2.5 px-4 text-right font-mono whitespace-nowrap tabular-nums font-semibold">
                        {formatPercentOrDash(channelSummary.total.marginPercent)}
                      </td>
                    </tr>

                    {showDelivery && (
                      <tr className="hover:bg-gray-50/50">
                        <td className="py-2.5 px-4 font-medium text-gray-800">
                          (+) Ingresos por envío cobrados
                        </td>
                        {hasPedidosYa && (
                          <>
                            <td className="py-2.5 px-4 text-right font-mono whitespace-nowrap text-gray-400">
                              —
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono whitespace-nowrap text-gray-400">
                              —
                            </td>
                          </>
                        )}
                        <td className="py-2.5 px-4 text-right font-mono whitespace-nowrap tabular-nums font-semibold text-emerald-700">
                          {deliveryRevenue > 0
                            ? `+${formatCurrency(deliveryRevenue)}`
                            : formatCurrency(0)}
                        </td>
                      </tr>
                    )}

                    <tr className="bg-emerald-50/70 font-bold border-t-2 border-emerald-200">
                      <td className="py-3 px-4 text-sm text-gray-900">Ganancia total</td>
                      {hasPedidosYa && (
                        <>
                          <td className="py-3 px-4 text-right font-mono whitespace-nowrap text-gray-400">
                            —
                          </td>
                          <td className="py-3 px-4 text-right font-mono whitespace-nowrap text-gray-400">
                            —
                          </td>
                        </>
                      )}
                      <td
                        className={`py-3 px-4 text-right text-sm font-mono whitespace-nowrap tabular-nums ${
                          isZeroCoverage || channelSummary.totalProfit === null
                            ? 'text-gray-400'
                            : channelSummary.totalProfit < 0
                            ? 'text-rose-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {isZeroCoverage ? '—' : formatMoneyOrDash(channelSummary.totalProfit)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Textos de apoyo */}
              <div className="space-y-1 text-xs text-gray-600 bg-gray-50/80 rounded-xl px-3.5 py-2.5 border border-gray-200/60">
                {hasPedidosYa && (
                  <p>
                    Las ventas se muestran sin IVA; PedidosYa calcula su comisión sobre el total
                    cobrado.
                  </p>
                )}
                {showDelivery && (
                  <p>
                    Incluye lo cobrado por envío. Si pagás al repartidor por aparte, registralo en
                    Gastos.
                  </p>
                )}
              </div>
            </section>
          )}

          {/* 4. Cobertura y alertas accionables */}
          {isZeroCoverage ? (
            <div className="bg-amber-50/85 border border-amber-200 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <WarningCircle size={20} weight="fill" />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                      Sin datos de costo suficientes
                    </h4>
                    <span className="text-xs font-semibold px-2 py-0.5 bg-amber-200/80 text-amber-900 rounded-md">
                      Cobertura 0 %
                    </span>
                  </div>
                  <p className="text-xs text-amber-900 leading-relaxed max-w-2xl">
                    Los productos vendidos en este período no tienen costo registrado en el
                    catálogo. Mostramos «—» en ganancia y margen para no mostrar cifras inventadas.
                    Registrá el costo en tu inventario para ver la ganancia real.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/pos/inventory')}
                className="self-start sm:self-auto inline-flex items-center gap-1.5 min-h-[44px] px-4 bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs rounded-xl transition-colors shadow-2xs shrink-0 cursor-pointer"
              >
                <span>Consultar inventario</span>
                <ArrowRight size={14} weight="bold" />
              </button>
            </div>
          ) : (
            summaryData?.alerts && (
              <div className="space-y-2.5">
                {(summaryData.alerts.lossProducts?.count ?? 0) > 0 && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-rose-900">
                    <div className="flex items-start sm:items-center gap-2">
                      <WarningCircle size={18} className="text-rose-600 shrink-0 mt-0.5 sm:mt-0" weight="fill" />
                      <span>
                        Vendiste con pérdida{' '}
                        <strong>{summaryData.alerts.lossProducts?.count}</strong>{' '}
                        {summaryData.alerts.lossProducts?.count === 1 ? 'producto' : 'productos'}{' '}
                        (
                        <span className="font-mono font-semibold whitespace-nowrap">
                          -{formatCurrency(summaryData.alerts.lossProducts?.lossAmount || 0)}
                        </span>
                        ).
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveFilter('loss')}
                      className="self-start sm:self-auto min-h-[36px] px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-2xs whitespace-nowrap"
                    >
                      Ver productos con pérdida
                    </button>
                  </div>
                )}

                {(summaryData.alerts.lowMarginProducts?.count ?? 0) > 0 && (
                  <div className="p-3.5 bg-amber-50/85 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-amber-900">
                    <div className="flex items-start sm:items-center gap-2">
                      <WarningCircle size={18} className="text-amber-600 shrink-0 mt-0.5 sm:mt-0" weight="fill" />
                      <span>
                        <strong>{summaryData.alerts.lowMarginProducts?.count}</strong>{' '}
                        {summaryData.alerts.lowMarginProducts?.count === 1
                          ? 'producto tiene'
                          : 'productos tienen'}{' '}
                        margen menor al 10 %.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveFilter('lowmargin')}
                      className="self-start sm:self-auto min-h-[36px] px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-2xs whitespace-nowrap"
                    >
                      Ver margen bajo
                    </button>
                  </div>
                )}

                {(summaryData.alerts.missingCost?.count ?? 0) > 0 ? (
                  <div className="p-3.5 bg-amber-50/85 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-amber-900">
                    <div className="flex items-start gap-2">
                      <WarningCircle size={18} className="text-amber-600 shrink-0 mt-0.5" weight="fill" />
                      <span>
                        <strong>{summaryData.alerts.missingCost?.count}</strong>{' '}
                        {summaryData.alerts.missingCost?.count === 1
                          ? 'producto vendido'
                          : 'productos vendidos'}{' '}
                        sin costo registrado.{' '}
                        <strong className="whitespace-nowrap">
                          {formatCurrency(summaryData.alerts.missingCost?.revenue || 0)}
                        </strong>{' '}
                        en ventas no entran en la ganancia.
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setActiveFilter('nocost')}
                        className="min-h-[36px] px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap"
                      >
                        Ver sin costo
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/pos/inventory')}
                        className="min-h-[36px] px-3 py-1.5 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-semibold cursor-pointer inline-flex items-center gap-1 whitespace-nowrap"
                      >
                        <span>Consultar inventario</span>
                        <ArrowRight size={13} weight="bold" />
                      </button>
                    </div>
                  </div>
                ) : (
                  (summaryData.alerts.lossProducts?.count ?? 0) === 0 &&
                  (summaryData.alerts.lowMarginProducts?.count ?? 0) === 0 && (
                    <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-xs text-emerald-900">
                      <CheckCircle size={18} className="text-emerald-700 shrink-0" weight="bold" />
                      <span>
                        Cobertura de costos del 100 %: todos los productos vendidos en este período
                        cuentan con costo registrado.
                      </span>
                    </div>
                  )
                )}
              </div>
            )
          )}

          {/* 5. Tabla de Ganancia por producto (/pos/reports/profit/products) */}
          <section className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Ganancia por producto</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {hasPedidosYa
                    ? 'Ganancia de productos antes de la comisión del canal.'
                    : 'Desglose por producto con unidades vendidas, costos, ganancia y margen.'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportCSV}
                disabled={isExportingCsv || !productsData?.items?.length}
                className="self-start sm:self-auto inline-flex items-center gap-1.5 min-h-[40px] px-3.5 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 text-gray-700 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                <DownloadSimple size={15} weight="bold" />
                <span>{isExportingCsv ? 'Exportando...' : 'Exportar CSV'}</span>
              </button>
            </div>

            {/* Filtros */}
            <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-2 flex-1">
                <div className="relative flex-1">
                  <MagnifyingGlass
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Buscar producto por nombre..."
                    aria-label="Buscar producto por nombre"
                    className="w-full min-h-[40px] pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:bg-white text-gray-800"
                  />
                </div>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  aria-label="Filtrar por categoría"
                  className="min-h-[40px] sm:w-56 px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:bg-white text-gray-800 cursor-pointer"
                >
                  <option value="">Todas las categorías</option>
                  {summaryData?.byCategory?.map((cat, idx) => (
                    <option key={cat.categoryId || `cat-${idx}`} value={cat.categoryId || ''}>
                      {cat.name}{' '}
                      {cat.salesSharePercent !== undefined
                        ? `(${Number(cat.salesSharePercent).toFixed(1)}%)`
                        : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { key: 'all', label: 'Todos' },
                    { key: 'lowmargin', label: 'Margen bajo (< 10%)' },
                    { key: 'loss', label: 'Con pérdida' },
                    { key: 'nocost', label: 'Sin costo' },
                  ] as const
                ).map((pill) => (
                  <button
                    key={pill.key}
                    type="button"
                    onClick={() => setActiveFilter(pill.key)}
                    className={`min-h-[36px] px-3 py-1 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      activeFilter === pill.key
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>

            {isLoadingProducts ? (
              <div className="py-10 text-center text-xs text-gray-500 animate-pulse">
                Cargando productos...
              </div>
            ) : isErrorProducts ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-2 text-xs text-rose-800">
                <span>No se pudo cargar la tabla de productos.</span>
                <button
                  type="button"
                  onClick={() => refetchProducts()}
                  className="inline-flex items-center gap-1 font-semibold hover:underline cursor-pointer"
                >
                  <ArrowsClockwise size={14} /> Reintentar
                </button>
              </div>
            ) : !productsData?.items?.length ? (
              <div className="py-10 text-center text-xs text-gray-500">
                No se encontraron productos para los filtros seleccionados.
              </div>
            ) : (
              <>
                {/* Vista móvil a 375 px: tarjetas apiladas */}
                <div className="md:hidden space-y-2.5">
                  {productsData.items.map((prod, idx) => (
                    <div
                      key={prod.productId || `mprod-${idx}`}
                      className="p-3.5 rounded-xl border border-gray-200/80 space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-bold text-gray-900 break-words">{prod.name}</div>
                          <div className="text-gray-500 mt-0.5">
                            {prod.category || 'Sin categoría'} ·{' '}
                            {(prod.unitsSold ?? 0).toLocaleString('es-NI', {
                              maximumFractionDigits: 3,
                            })}{' '}
                            {prod.unit || 'UND'}
                          </div>
                        </div>
                        {renderMarginBadge(prod.hasCost, prod.marginPercent)}
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
                        <div>
                          <span className="text-gray-500 block">Ventas</span>
                          <span className="font-semibold text-gray-900 font-mono whitespace-nowrap tabular-nums">
                            {formatCurrency(prod.sales)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Costo</span>
                          <span className="font-medium text-gray-700 font-mono whitespace-nowrap tabular-nums">
                            {prod.hasCost ? formatMoneyOrDash(prod.cost) : '—'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-gray-500 block">Ganancia</span>
                          <span
                            className={`font-bold font-mono whitespace-nowrap tabular-nums ${
                              !prod.hasCost || prod.profit === null
                                ? 'text-gray-400'
                                : prod.profit < 0
                                ? 'text-rose-700'
                                : 'text-emerald-700'
                            }`}
                          >
                            {prod.hasCost ? formatMoneyOrDash(prod.profit) : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {productsData.totals && (
                    <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-1.5">
                      <div className="font-bold text-gray-900">
                        TOTALES ({productsData.total}{' '}
                        {productsData.total === 1 ? 'producto' : 'productos'})
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <span className="text-gray-500 block">Ventas</span>
                          <span className="font-bold text-gray-900 font-mono whitespace-nowrap tabular-nums">
                            {formatCurrency(productsData.totals.sales)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Costo</span>
                          <span className="font-semibold text-gray-700 font-mono whitespace-nowrap tabular-nums">
                            {formatMoneyOrDash(productsData.totals.cost)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-gray-500 block">Ganancia</span>
                          <span className="font-bold text-emerald-700 font-mono whitespace-nowrap tabular-nums">
                            {formatMoneyOrDash(productsData.totals.profit)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Vista desktop */}
                <div className="hidden md:block overflow-x-auto border border-gray-100 rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-100">
                      <tr>
                        <th
                          className="px-3.5 py-2.5 cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleSort('name')}
                          aria-sort={getAriaSort('name')}
                        >
                          <div className="flex items-center gap-1">
                            <span>Producto</span>
                            {sortCol === 'name' &&
                              (sortDir === 'asc' ? <CaretUp size={12} /> : <CaretDown size={12} />)}
                          </div>
                        </th>
                        <th className="px-3.5 py-2.5">Categoría</th>
                        <th
                          className="px-3.5 py-2.5 text-right cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleSort('units')}
                          aria-sort={getAriaSort('units')}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>Unidades</span>
                            {sortCol === 'units' &&
                              (sortDir === 'asc' ? <CaretUp size={12} /> : <CaretDown size={12} />)}
                          </div>
                        </th>
                        <th
                          className="px-3.5 py-2.5 text-right cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleSort('sales')}
                          aria-sort={getAriaSort('sales')}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>Ventas</span>
                            {sortCol === 'sales' &&
                              (sortDir === 'asc' ? <CaretUp size={12} /> : <CaretDown size={12} />)}
                          </div>
                        </th>
                        <th
                          className="px-3.5 py-2.5 text-right cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleSort('cost')}
                          aria-sort={getAriaSort('cost')}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>Costo de lo vendido</span>
                            {sortCol === 'cost' &&
                              (sortDir === 'asc' ? <CaretUp size={12} /> : <CaretDown size={12} />)}
                          </div>
                        </th>
                        <th
                          className="px-3.5 py-2.5 text-right cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleSort('profit')}
                          aria-sort={getAriaSort('profit')}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>Ganancia</span>
                            {sortCol === 'profit' &&
                              (sortDir === 'asc' ? <CaretUp size={12} /> : <CaretDown size={12} />)}
                          </div>
                        </th>
                        <th
                          className="px-3.5 py-2.5 text-center cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleSort('margin')}
                          aria-sort={getAriaSort('margin')}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span>Margen</span>
                            {sortCol === 'margin' &&
                              (sortDir === 'asc' ? <CaretUp size={12} /> : <CaretDown size={12} />)}
                          </div>
                        </th>
                        <th
                          className="px-3.5 py-2.5 text-right cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleSort('salesshare')}
                          aria-sort={getAriaSort('salesshare')}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>% Ventas</span>
                            {sortCol === 'salesshare' &&
                              (sortDir === 'asc' ? <CaretUp size={12} /> : <CaretDown size={12} />)}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-800">
                      {productsData.items.map((prod, idx) => (
                        <tr key={prod.productId || `prod-${idx}`} className="hover:bg-gray-50/60">
                          <td className="px-3.5 py-2.5 font-medium text-gray-900 max-w-[240px] truncate">
                            {prod.name}
                          </td>
                          <td className="px-3.5 py-2.5 text-gray-500 max-w-[140px] truncate">
                            {prod.category || 'Sin categoría'}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-medium whitespace-nowrap tabular-nums">
                            {(prod.unitsSold ?? 0).toLocaleString('es-NI', {
                              maximumFractionDigits: 3,
                            })}{' '}
                            <span className="text-gray-400 font-normal">{prod.unit || 'UND'}</span>
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-semibold text-gray-900 font-mono whitespace-nowrap tabular-nums">
                            {formatCurrency(prod.sales)}
                          </td>
                          <td className="px-3.5 py-2.5 text-right text-gray-600 font-mono whitespace-nowrap tabular-nums">
                            {prod.hasCost ? formatMoneyOrDash(prod.cost) : '—'}
                          </td>
                          <td
                            className={`px-3.5 py-2.5 text-right font-bold font-mono whitespace-nowrap tabular-nums ${
                              !prod.hasCost || prod.profit === null
                                ? 'text-gray-400'
                                : prod.profit < 0
                                ? 'text-rose-700'
                                : 'text-emerald-700'
                            }`}
                          >
                            {prod.hasCost ? formatMoneyOrDash(prod.profit) : '—'}
                          </td>
                          <td className="px-3.5 py-2.5 text-center">
                            {renderMarginBadge(prod.hasCost, prod.marginPercent)}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-medium text-gray-700 whitespace-nowrap tabular-nums">
                            {formatPercentOrDash(prod.salesSharePercent ?? prod.sharePercent)}
                          </td>
                        </tr>
                      ))}
                    </tbody>

                    {productsData.totals && (
                      <tfoot className="bg-gray-50/90 font-bold border-t-2 border-gray-200 text-gray-900">
                        <tr>
                          <td className="px-3.5 py-2.5">
                            TOTALES ({productsData.total}{' '}
                            {productsData.total === 1 ? 'producto' : 'productos'})
                          </td>
                          <td className="px-3.5 py-2.5"></td>
                          <td className="px-3.5 py-2.5 text-right whitespace-nowrap tabular-nums">
                            {(productsData.totals.unitsSold ?? 0).toLocaleString('es-NI', {
                              maximumFractionDigits: 3,
                            })}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-mono whitespace-nowrap tabular-nums">
                            {formatCurrency(productsData.totals.sales)}
                          </td>
                          <td className="px-3.5 py-2.5 text-right text-gray-700 font-mono whitespace-nowrap tabular-nums">
                            {formatMoneyOrDash(productsData.totals.cost)}
                          </td>
                          <td
                            className={`px-3.5 py-2.5 text-right font-mono whitespace-nowrap tabular-nums ${
                              productsData.totals.profit === null
                                ? 'text-gray-400'
                                : productsData.totals.profit < 0
                                ? 'text-rose-700'
                                : 'text-emerald-700'
                            }`}
                          >
                            {formatMoneyOrDash(productsData.totals.profit)}
                          </td>
                          <td className="px-3.5 py-2.5 text-center whitespace-nowrap tabular-nums">
                            {formatPercentOrDash(productsData.totals.marginPercent)}
                          </td>
                          <td className="px-3.5 py-2.5 text-right whitespace-nowrap">100%</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* Paginación */}
                {totalProductItems > 0 && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-gray-100 text-xs text-gray-600">
                    <div className="flex items-center gap-2">
                      <span>Filas por página:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => setPageSize(Number(e.target.value))}
                        aria-label="Filas por página"
                        className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 cursor-pointer"
                      >
                        {[10, 20, 50].map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                      <span className="text-gray-500">
                        · {totalProductItems}{' '}
                        {totalProductItems === 1 ? 'producto' : 'productos'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="min-h-[36px] px-3 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 font-semibold cursor-pointer"
                      >
                        Anterior
                      </button>
                      <span className="px-2 whitespace-nowrap tabular-nums">
                        Página {page} de {totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        className="min-h-[36px] px-3 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 font-semibold cursor-pointer"
                      >
                        Siguiente
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>

          {/* 6. Ganancia por día / hora (sin librerías nuevas) */}
          {hasSeriesData && (
            <section className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 shrink-0">
                    {summaryData?.byHour ? (
                      <Clock size={16} weight="bold" />
                    ) : (
                      <CalendarBlank size={16} weight="bold" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">
                      {summaryData?.byHour ? 'Ganancia por hora' : 'Ganancia por día'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {summaryData?.byHour
                        ? 'Evolución por hora del día (ya incluye comisión y envío)'
                        : 'Evolución diaria (ya incluye comisión y envío)'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {summaryData?.bestDay && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                      <Sparkle size={13} weight="fill" className="text-emerald-600 shrink-0" />
                      <span>
                        Mejor día: {formatShortDateEs(summaryData.bestDay.date)} (
                        <span className="whitespace-nowrap">
                          {formatCurrency(summaryData.bestDay.profit)}
                        </span>
                        )
                      </span>
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowDaysTable((v) => !v)}
                    className="min-h-[36px] text-xs font-semibold text-gray-700 hover:text-gray-900 px-3 py-1 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors cursor-pointer"
                  >
                    {showDaysTable ? 'Ocultar tabla' : 'Ver tabla'}
                  </button>
                </div>
              </div>

              {/* Barras puras sin librerías */}
              {(() => {
                const maxVal = Math.max(
                  ...seriesItems.map((i) => Math.max(i.sales || 0, Math.abs(i.profit || 0), 1))
                );

                return (
                  <div className="space-y-2">
                    <div className="overflow-x-auto pb-1">
                      <div className="min-w-[300px] h-36 flex items-end gap-1 px-1 border-b border-gray-100">
                        {seriesItems.map((item: any, idx: number) => {
                          const salesVal = Number(item.sales ?? 0);
                          const profitVal = Number(item.profit ?? 0);
                          const salesPct = Math.round((Math.max(salesVal, 0) / maxVal) * 100);
                          const profitPct = Math.round((Math.max(profitVal, 0) / maxVal) * 100);
                          const isBest =
                            summaryData?.bestDay && item.date === summaryData.bestDay.date;

                          return (
                            <div
                              key={idx}
                              title={`${
                                item.hour !== undefined ? item.date : formatShortDateEs(item.date)
                              }: Ventas ${formatCurrency(salesVal)} · Ganancia ${formatCurrency(
                                profitVal
                              )}`}
                              className="flex-1 min-w-[8px] flex flex-col items-center h-full justify-end"
                            >
                              <div className="w-full flex items-end justify-center gap-0.5 h-full">
                                <div
                                  style={{
                                    height: `${salesVal > 0 ? Math.max(salesPct, 4) : 0}%`,
                                  }}
                                  className="w-1/2 max-w-[12px] bg-blue-200 rounded-t-xs"
                                />
                                <div
                                  style={{
                                    height: `${profitVal > 0 ? Math.max(profitPct, 4) : 0}%`,
                                  }}
                                  className={`w-1/2 max-w-[12px] rounded-t-xs ${
                                    isBest
                                      ? 'bg-emerald-600'
                                      : profitVal > 0
                                      ? 'bg-emerald-500'
                                      : profitVal < 0
                                      ? 'bg-rose-400 h-1.5'
                                      : ''
                                  }`}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                      <div className="flex items-center gap-4">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 bg-blue-200 rounded-xs" /> Ventas
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-xs" /> Ganancia
                        </span>
                      </div>
                      <span>Tocá «Ver tabla» para el detalle exacto</span>
                    </div>
                  </div>
                );
              })()}

              {showDaysTable && (
                <div className="overflow-x-auto border border-gray-100 rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-100">
                      <tr>
                        <th className="px-3.5 py-2.5">
                          {summaryData?.byHour ? 'Hora' : 'Fecha'}
                        </th>
                        <th className="px-3.5 py-2.5 text-right">Ventas</th>
                        <th className="px-3.5 py-2.5 text-right">Costo</th>
                        <th className="px-3.5 py-2.5 text-right">Ganancia</th>
                        <th className="px-3.5 py-2.5 text-right">Margen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-800">
                      {seriesItems
                        .filter((r) => r.sales > 0 || r.profit !== 0)
                        .map((row: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="px-3.5 py-2 font-medium whitespace-nowrap">
                              {row.hour !== undefined ? row.date : formatShortDateEs(row.date)}
                            </td>
                            <td className="px-3.5 py-2 text-right font-mono whitespace-nowrap tabular-nums">
                              {formatCurrency(row.sales)}
                            </td>
                            <td className="px-3.5 py-2 text-right text-gray-600 font-mono whitespace-nowrap tabular-nums">
                              {formatCurrency(row.cost)}
                            </td>
                            <td
                              className={`px-3.5 py-2 text-right font-bold font-mono whitespace-nowrap tabular-nums ${
                                row.profit < 0 ? 'text-rose-700' : 'text-emerald-700'
                              }`}
                            >
                              {formatMoneyOrDash(row.profit)}
                            </td>
                            <td className="px-3.5 py-2 text-right whitespace-nowrap tabular-nums">
                              {formatPercentOrDash(row.marginPercent)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* 7. Ganancia por categoría y Top de clientes */}
          {(Boolean(summaryData?.byCategory?.length) ||
            Boolean(summaryData?.byCustomer?.length) ||
            Boolean(summaryData?.counterSales && summaryData.counterSales.receipts > 0)) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Boolean(summaryData?.byCategory?.length) && (
                <section className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-4 sm:p-5 space-y-3">
                  <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100 shrink-0">
                      <Tag size={16} weight="bold" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">Ganancia por categoría</h3>
                      <p className="text-xs text-gray-500">
                        {hasPedidosYa
                          ? 'Ganancia de productos antes de la comisión del canal.'
                          : 'Rentabilidad agrupada por categoría'}
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="text-gray-500 font-semibold border-b border-gray-100">
                        <tr>
                          <th className="py-2 pr-3">Categoría</th>
                          <th className="py-2 px-2 text-right">Ventas</th>
                          <th className="py-2 px-2 text-right">Ganancia</th>
                          <th className="py-2 pl-2 text-right">Margen</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-gray-800">
                        {summaryData?.byCategory?.map((cat, idx) => (
                          <tr key={cat.categoryId || `cat-row-${idx}`} className="hover:bg-gray-50/50">
                            <td className="py-2 pr-3 font-medium max-w-[140px] truncate">
                              {cat.name}
                            </td>
                            <td className="py-2 px-2 text-right font-mono whitespace-nowrap tabular-nums">
                              {formatCurrency(cat.sales)}
                            </td>
                            <td
                              className={`py-2 px-2 text-right font-semibold font-mono whitespace-nowrap tabular-nums ${
                                cat.profit < 0 ? 'text-rose-700' : 'text-emerald-700'
                              }`}
                            >
                              {formatMoneyOrDash(cat.profit)}
                            </td>
                            <td className="py-2 pl-2 text-right whitespace-nowrap tabular-nums">
                              {formatPercentOrDash(cat.marginPercent)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {(Boolean(summaryData?.byCustomer?.length) ||
                Boolean(
                  summaryData?.counterSales &&
                    (summaryData.counterSales.receipts > 0 || summaryData.counterSales.sales > 0)
                )) && (
                <section className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-4 sm:p-5 space-y-3">
                  <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
                    <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100 shrink-0">
                      <User size={16} weight="bold" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">Ganancia por cliente</h3>
                      <p className="text-xs text-gray-500">
                        {hasPedidosYa
                          ? 'Ganancia de productos antes de la comisión del canal.'
                          : 'Top 10 de clientes y ventas de mostrador'}
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="text-gray-500 font-semibold border-b border-gray-100">
                        <tr>
                          <th className="py-2 pr-3">Cliente</th>
                          <th className="py-2 px-2 text-center whitespace-nowrap">Comprobantes</th>
                          <th className="py-2 px-2 text-right">Ventas</th>
                          <th className="py-2 pl-2 text-right">Ganancia</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-gray-800">
                        {summaryData?.byCustomer?.map((cust, idx) => (
                          <tr
                            key={cust.customerId || `cust-${idx}`}
                            className="hover:bg-gray-50/50"
                          >
                            <td className="py-2 pr-3 font-medium max-w-[140px] truncate">
                              {cust.name || 'Sin nombre'}
                            </td>
                            <td className="py-2 px-2 text-center text-gray-600 tabular-nums">
                              {cust.receipts ?? 0}
                            </td>
                            <td className="py-2 px-2 text-right font-mono whitespace-nowrap tabular-nums">
                              {formatCurrency(cust.sales)}
                            </td>
                            <td
                              className={`py-2 pl-2 text-right font-semibold font-mono whitespace-nowrap tabular-nums ${
                                cust.profit < 0 ? 'text-rose-700' : 'text-emerald-700'
                              }`}
                            >
                              {formatMoneyOrDash(cust.profit)}
                            </td>
                          </tr>
                        ))}

                        {summaryData?.counterSales &&
                          (summaryData.counterSales.receipts > 0 ||
                            summaryData.counterSales.sales > 0) && (
                            <tr className="bg-gray-50/80 font-medium">
                              <td className="py-2 pr-3 text-gray-700">
                                Ventas de mostrador (sin cliente)
                              </td>
                              <td className="py-2 px-2 text-center text-gray-600 tabular-nums">
                                {summaryData.counterSales.receipts}
                              </td>
                              <td className="py-2 px-2 text-right text-gray-800 font-mono whitespace-nowrap tabular-nums">
                                {formatCurrency(summaryData.counterSales.sales)}
                              </td>
                              <td
                                className={`py-2 pl-2 text-right font-semibold font-mono whitespace-nowrap tabular-nums ${
                                  summaryData.counterSales.profit < 0
                                    ? 'text-rose-700'
                                    : 'text-emerald-800'
                                }`}
                              >
                                {formatMoneyOrDash(summaryData.counterSales.profit)}
                              </td>
                            </tr>
                          )}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
