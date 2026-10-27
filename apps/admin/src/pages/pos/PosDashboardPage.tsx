import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CurrencyCircleDollar,
  Receipt,
  TrendUp,
  TrendDown,
  ArrowsClockwise,
  Package,
  CashRegister,
  ArrowRight,
  Storefront,
  Wrench,
  WarningCircle,
  CheckCircle,
  Warning,
  Clock,
  Bank,
  CaretRight,
} from '@phosphor-icons/react';
import { useBackofficeDashboard, useBackofficeSales } from '../../hooks/useBackoffice';
import { formatCurrency, formatPercentage } from '../../utils/formatters';
import { ModuleNotEnabledAlert } from '../../components/pos/ModuleNotEnabledAlert';
import { WebAccessDisabledView } from '../../components/pos/WebAccessDisabledView';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getManaguaTodayYMD, getManaguaYMD, formatManaguaDate, formatManaguaTime } from '../../utils/dateManagua';
import { formatRelativeCompact } from '../../utils/formatDate';
import { TooltipInfo } from '../../components/finances/TooltipInfo';
import { SaleDetailModal } from '../../components/pos/SaleDetailModal';

export const PosDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    data: dashboard,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
    dataUpdatedAt,
  } = useBackofficeDashboard();

  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  // Contador para texto discreto: "Actualizado hace 1 min"
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    setSecondsAgo(0);
  }, [dashboard?.generatedAt, dataUpdatedAt]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const updatedText = useMemo(() => {
    if (secondsAgo < 10) return 'Actualizado hace un momento';
    const mins = Math.floor(secondsAgo / 60);
    if (mins === 0) return 'Actualizado hace menos de 1 min';
    if (mins === 1) return 'Actualizado hace 1 min';
    return `Actualizado hace ${mins} min`;
  }, [secondsAgo]);

  // Fechas de los últimos 7 días según hora de negocio Managua
  const { weekFrom, weekTo, last7Days } = useMemo(() => {
    const today = getManaguaTodayYMD();
    const [y, m, d] = today.split('-').map(Number);
    const baseDate = new Date(y, m - 1, d, 12, 0, 0);
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const cur = new Date(baseDate);
      cur.setDate(baseDate.getDate() - i);
      const curYmd = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
      days.push(curYmd);
    }
    return { weekFrom: days[0], weekTo: days[days.length - 1], last7Days: days };
  }, []);

  // Etiquetas de comparación con fechas explícitas (ej: vs ayer (23 oct))
  const comparisonLabels = useMemo(() => {
    const today = getManaguaTodayYMD();
    const [y, m, d] = today.split('-').map(Number);
    const baseDate = new Date(y, m - 1, d, 12, 0, 0);

    const yestDate = new Date(baseDate);
    yestDate.setDate(baseDate.getDate() - 1);
    const yesterday = format(yestDate, 'd MMM', { locale: es });

    return {
      yesterday: `vs ayer (${yesterday})`,
    };
  }, []);

  const { data: weekSalesData } = useBackofficeSales({
    from: weekFrom,
    to: weekTo,
    limit: 100,
  });

  // Agrupar ventas de los últimos 7 días con fecha local Managua
  const dailySales = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    last7Days.forEach((d) => {
      map[d] = { total: 0, count: 0 };
    });

    if (weekSalesData?.data) {
      weekSalesData.data.forEach((s) => {
        if (s.isVoided) return;
        const dayStr = getManaguaYMD(s.createdAt);
        if (map[dayStr]) {
          map[dayStr].total += s.netTotal;
          map[dayStr].count += 1;
        }
      });
    }

    return last7Days.map((d) => {
      const [year, month, day] = d.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day, 12, 0, 0);
      const dayName = format(dateObj, 'EEE', { locale: es });
      const dayNum = format(dateObj, 'd MMM', { locale: es });
      return {
        date: d,
        dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
        dayNum,
        total: map[d]?.total || 0,
        count: map[d]?.count || 0,
      };
    });
  }, [last7Days, weekSalesData]);

  const maxDailyTotal = useMemo(() => {
    const max = Math.max(...dailySales.map((d) => d.total), 0);
    return max > 0 ? max : 1000;
  }, [dailySales]);

  if (
    (error as any)?.response?.data?.code === 'WEB_ACCESS_DISABLED' ||
    (error as any)?.response?.status === 403
  ) {
    return <WebAccessDisabledView />;
  }

  if ((error as any)?.response?.data?.code === 'MODULE_NOT_ENABLED') {
    return <ModuleNotEnabledAlert message="El módulo de Punto de Venta no está habilitado para este negocio." />;
  }

  const currency = dashboard?.currency || 'NIO';

  // Configuración de alertas reactivas
  const alertItems = useMemo(() => {
    if (!dashboard?.alerts) return [];
    const items: Array<{
      id: string;
      type: 'danger' | 'warning' | 'info';
      icon: React.ReactNode;
      title: string;
      description: string;
      actionText: string;
      onAction: () => void;
    }> = [];

    const alerts = dashboard.alerts;

    // 1. Stock bajo / agotado
    const outOfStock = alerts.outOfStock?.count || 0;
    const lowStock = alerts.lowStock?.count || 0;
    if (outOfStock > 0 || lowStock > 0) {
      const parts: string[] = [];
      if (outOfStock > 0) parts.push(`${outOfStock} agotado${outOfStock > 1 ? 's' : ''}`);
      if (lowStock > 0) parts.push(`${lowStock} bajo mínimo`);
      items.push({
        id: 'stock',
        type: outOfStock > 0 ? 'danger' : 'warning',
        icon: <Package size={18} weight="duotone" />,
        title: 'Inventario crítico',
        description: parts.join(' · '),
        actionText: 'Ver en inventario',
        onAction: () => navigate('/pos/inventory?onlyLowStock=true'),
      });
    }

    // 2. Lotes por vencer o vencidos (solo si la API reporta lotes)
    if (alerts.expiredBatches !== undefined || alerts.expiringBatches !== undefined) {
      const expired = alerts.expiredBatches?.count || 0;
      const expiring = alerts.expiringBatches?.count || 0;
      if (expired > 0 || expiring > 0) {
        const parts: string[] = [];
        if (expired > 0) {
          parts.push(`${expired} lote${expired > 1 ? 's' : ''} vencido${expired > 1 ? 's' : ''} (${formatCurrency(alerts.expiredBatches?.amount || 0, currency)})`);
        }
        if (expiring > 0) {
          parts.push(`${expiring} lote${expiring > 1 ? 's' : ''} por vencer en 30 días`);
        }
        items.push({
          id: 'batches',
          type: expired > 0 ? 'danger' : 'warning',
          icon: <Clock size={18} weight="duotone" />,
          title: 'Lotes por vencer o vencidos',
          description: parts.join(' · '),
          actionText: 'Revisar inventario',
          onAction: () => navigate('/pos/inventory'),
        });
      }
    }

    // 3. Por cobrar vencido (solo si la API reporta módulo de Cartera/Finanzas)
    if (alerts.overdueCredit !== undefined) {
      const overdueCount = alerts.overdueCredit?.count || 0;
      const overdueAmount = alerts.overdueCredit?.amount || 0;
      if (overdueCount > 0) {
        items.push({
          id: 'credit',
          type: 'danger',
          icon: <Bank size={18} weight="duotone" />,
          title: 'Cuentas por cobrar vencidas',
          description: `${overdueCount} cuenta${overdueCount > 1 ? 's' : ''} vencida${overdueCount > 1 ? 's' : ''} (${formatCurrency(overdueAmount, currency)})`,
          actionText: 'Ir a Finanzas',
          onAction: () => navigate('/finances'),
        });
      }
    }

    // 4. Última diferencia de caja (solo si existe y fue != 0)
    if (alerts.lastCashDifference && alerts.lastCashDifference.amount !== 0) {
      const diff = alerts.lastCashDifference.amount;
      const cashier = alerts.lastCashDifference.cashier;
      const dateFormatted = formatManaguaDate(alerts.lastCashDifference.date);
      const isMissing = diff < 0;
      items.push({
        id: 'cash-diff',
        type: isMissing ? 'warning' : 'info',
        icon: <CashRegister size={18} weight="duotone" />,
        title: isMissing ? 'Diferencia de caja (faltante)' : 'Diferencia de caja (sobrante)',
        description: `${isMissing ? 'Faltante' : 'Sobrante'} de ${formatCurrency(Math.abs(diff), currency)} con ${cashier} (${dateFormatted})`,
        actionText: 'Ver cierres de caja',
        onAction: () => navigate('/pos/cash-registers'),
      });
    }

    return items;
  }, [dashboard?.alerts, currency, navigate]);

  return (
    <div className="space-y-4 sm:space-y-5 pb-8 max-w-7xl mx-auto overflow-x-hidden">
      {/* 0. Header con Título, Estado de actualización y Botón Actualizar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-base shadow-2xs shrink-0">
            <Storefront size={22} weight="duotone" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
                Resumen del negocio
              </h2>
              {dashboard?.salonProfile === 'TALLER' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                  <Wrench size={11} />
                  Perfil Taller
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              Métricas consolidadas de ventas, comprobantes y arqueo
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
          <span className="text-[11px] text-gray-400 font-medium">
            {updatedText}
          </span>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors shadow-2xs shrink-0 cursor-pointer disabled:opacity-60"
          >
            <ArrowsClockwise size={13} className={isFetching ? 'animate-spin' : ''} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        /* Estados de carga: Esqueletos elegantes */
        <div className="space-y-4">
          <div className="h-28 bg-white rounded-2xl border border-gray-200/80 p-5 animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="h-32 bg-white rounded-2xl border border-gray-200/80 p-5 animate-pulse" />
            <div className="h-32 bg-white rounded-2xl border border-gray-200/80 p-5 animate-pulse" />
          </div>
          <div className="h-24 bg-white rounded-2xl border border-gray-200/80 p-5 animate-pulse" />
          <div className="h-44 bg-white rounded-2xl border border-gray-200/80 p-5 animate-pulse" />
        </div>
      ) : isError ? (
        /* Estado de Error con Reintentar */
        <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-center space-y-3 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <WarningCircle size={22} weight="duotone" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-gray-900">Error al consultar el resumen del negocio</p>
            <p className="text-xs text-red-600">
              {(error as any)?.response?.data?.message || 'No se pudieron consultar los datos del panel en este momento.'}
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <ArrowsClockwise size={13} weight="bold" />
              <span>Reintentar</span>
            </button>
          </div>
        </div>
      ) : dashboard ? (
        <>
          {/* =========================================================================
           * 1. Bloque Caja (Estado en vivo)
           * ========================================================================= */}
          {dashboard.openRegister ? (
            <div className="bg-white border border-emerald-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="relative flex h-3 w-3 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-gray-900 leading-snug">
                      Caja abierta — Cajero {dashboard.openRegister.cashierName}, desde las {formatManaguaTime(dashboard.openRegister.openedAt)}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/pos/cash-registers')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 hover:text-purple-900 transition-colors self-start sm:self-auto cursor-pointer shrink-0"
                >
                  <span>Ver cierres de caja</span>
                  <ArrowRight size={13} weight="bold" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 pt-1 border-t border-gray-100">
                <div className="bg-gray-50/80 rounded-xl p-3">
                  <div className="flex items-center gap-1 text-[11px] font-medium text-gray-500">
                    <span>Fondo inicial</span>
                    <TooltipInfo text="Efectivo en gaveta registrado al iniciar el turno." align="left" />
                  </div>
                  <p className="text-base sm:text-lg font-bold text-gray-900 mt-0.5 tracking-tight truncate">
                    {formatCurrency(dashboard.openRegister.openingFloat, currency)}
                  </p>
                </div>

                <div className="bg-emerald-50/70 border border-emerald-100/70 rounded-xl p-3">
                  <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-800">
                    <span>Efectivo esperado</span>
                    <TooltipInfo text="Fondo inicial + ventas en efectivo en caja + entradas − salidas de efectivo." align="left" />
                  </div>
                  <p className="text-base sm:text-lg font-bold text-emerald-950 mt-0.5 tracking-tight truncate">
                    {formatCurrency(dashboard.openRegister.expectedCash, currency)}
                  </p>
                </div>

                <div className="col-span-2 sm:col-span-1 bg-gray-50/80 rounded-xl p-3 flex sm:flex-col justify-between items-center sm:items-start">
                  <span className="text-[11px] font-medium text-gray-500">Ventas en el turno</span>
                  <p className="text-xs sm:text-sm font-semibold text-gray-800 mt-0.5">
                    {dashboard.openRegister.salesCount} {dashboard.openRegister.salesCount === 1 ? 'comprobante' : 'comprobantes'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
                  <CashRegister size={20} weight="duotone" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-gray-400"></span>
                    <h3 className="text-sm sm:text-base font-bold text-gray-900">Sin caja abierta</h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    No hay turnos activos de caja en este momento.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/pos/cash-registers')}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
              >
                <span>Consultar cierres de caja</span>
                <ArrowRight size={13} weight="bold" />
              </button>
            </div>
          )}

          {/* =========================================================================
           * 2. Bloque Ventas de hoy & Ganancia estimada
           * ========================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* 2.1 Ventas de hoy */}
            <div className="bg-white border border-gray-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-2.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                      Ventas de hoy
                    </span>
                    <TooltipInfo
                      text="Total vendido y cobrado en comprobantes con impuesto neto de devoluciones en la jornada actual de Managua."
                      align="left"
                    />
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <CurrencyCircleDollar size={18} weight="duotone" />
                  </div>
                </div>

                <div className="mt-1">
                  <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                    {formatCurrency(dashboard.today.totalRevenue, currency)}
                  </span>
                </div>
              </div>

              {/* Desglose Gravado / Exento / IVA de hoy */}
              <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-gray-100/80">
                <div className="bg-gray-50/80 rounded-xl p-2">
                  <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium">
                    <span>Gravadas</span>
                    <TooltipInfo
                      text="Ventas netas gravadas con IVA (15%) de la jornada de hoy. En comprobantes con impuesto global anterior (LEGACY), se incluye su monto gravado sin duplicar."
                      align="left"
                    />
                  </div>
                  <div className="font-bold text-gray-900 text-xs mt-0.5 truncate">
                    {formatCurrency(dashboard.today.taxableSales ?? 0, currency)}
                  </div>
                </div>

                <div className="bg-gray-50/80 rounded-xl p-2">
                  <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium">
                    <span>Exentas</span>
                    <TooltipInfo
                      text="Ventas netas exentas de IVA (medicamentos y productos exentos de IVA) de la jornada de hoy."
                      align="left"
                    />
                  </div>
                  <div className="font-bold text-gray-900 text-xs mt-0.5 truncate">
                    {formatCurrency(dashboard.today.exemptSales ?? 0, currency)}
                  </div>
                </div>

                <div className="bg-purple-50/50 rounded-xl p-2 border border-purple-100/60">
                  <div className="flex items-center gap-1 text-[10px] text-purple-700 font-medium">
                    <span>IVA</span>
                    <TooltipInfo
                      text="IVA (15%) cobrado a clientes en comprobantes emitidos en la jornada de hoy, deduciendo devoluciones."
                      align="left"
                    />
                  </div>
                  <div className="font-bold text-purple-900 text-xs mt-0.5 truncate">
                    {formatCurrency(dashboard.today.taxAmount ?? 0, currency)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-2.5 border-t border-gray-100 flex-wrap gap-2">
                <span className="text-gray-500 text-[11px] font-medium">
                  {dashboard.today.salesCount} {dashboard.today.salesCount === 1 ? 'venta' : 'ventas'}
                </span>

                <div
                  className={`flex items-center gap-1 font-semibold text-[11px] ${
                    dashboard.today.comparison.revenueGrowthPercent >= 0
                      ? 'text-emerald-700'
                      : 'text-red-700'
                  }`}
                >
                  {dashboard.today.comparison.revenueGrowthPercent >= 0 ? (
                    <TrendUp size={13} weight="bold" />
                  ) : (
                    <TrendDown size={13} weight="bold" />
                  )}
                  <span>{formatPercentage(dashboard.today.comparison.revenueGrowthPercent)}</span>
                  <span className="text-gray-400 font-normal">{comparisonLabels.yesterday}</span>
                </div>
              </div>
            </div>

            {/* 2.2 Ganancia estimada */}
            <div className="bg-white border border-gray-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-2.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                      Ganancia estimada
                    </span>
                    <TooltipInfo
                      text="Ganancia bruta estimada hoy: ventas netas sin impuesto menos costo registrado de productos."
                      align="left"
                    />
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                    <Receipt size={18} weight="duotone" />
                  </div>
                </div>

                <div className="mt-1 flex items-baseline gap-2 flex-wrap">
                  <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                    {formatCurrency(dashboard.todayProfit?.profit ?? 0, currency)}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200/60">
                    {dashboard.todayProfit?.marginPct ?? 0}% margen
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 pt-2.5 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 text-[11px]">
                    Costo estimado: {formatCurrency(dashboard.todayProfit?.cost ?? 0, currency)}
                  </span>
                </div>

                {dashboard.todayProfit && dashboard.todayProfit.itemsWithoutCost > 0 && (
                  <div className="flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50/80 border border-amber-200/60 rounded-lg px-2 py-1">
                    <Warning size={13} weight="bold" className="shrink-0 text-amber-600" />
                    <span className="truncate">
                      {dashboard.todayProfit.itemsWithoutCost} {dashboard.todayProfit.itemsWithoutCost === 1 ? 'producto vendido sin costo registrado' : 'productos vendidos sin costo registrado'}
                    </span>
                    <TooltipInfo
                      text="Productos vendidos que no tienen costo asignado en el inventario. El cálculo de ganancia asume costo 0 para ellos."
                      align="left"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* =========================================================================
           * 3. Bloque Atención (Alertas)
           * ========================================================================= */}
          <div className="bg-white border border-gray-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900">Atención y Alertas</h3>
                {alertItems.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900">
                    {alertItems.length}
                  </span>
                )}
              </div>
            </div>

            {alertItems.length === 0 ? (
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle size={16} weight="duotone" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-emerald-950">Todo en orden</p>
                  <p className="text-[11px] text-emerald-800">
                    No hay alertas pendientes de inventario, vencimientos, diferencias de caja ni créditos vencidos.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {alertItems.map((item) => {
                  const isDanger = item.type === 'danger';
                  const isWarning = item.type === 'warning';
                  const bgClass = isDanger
                    ? 'bg-red-50/70 border-red-200/80 hover:bg-red-50'
                    : isWarning
                    ? 'bg-amber-50/70 border-amber-200/80 hover:bg-amber-50'
                    : 'bg-blue-50/70 border-blue-200/80 hover:bg-blue-50';

                  const iconColor = isDanger ? 'text-red-700 bg-red-100' : isWarning ? 'text-amber-700 bg-amber-100' : 'text-blue-700 bg-blue-100';

                  return (
                    <div
                      key={item.id}
                      onClick={item.onAction}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer shadow-2xs group ${bgClass}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconColor}`}>
                          {item.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate">{item.title}</p>
                          <p className="text-[11px] text-gray-600 truncate">{item.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-xs font-semibold text-gray-700 shrink-0 ml-2 group-hover:translate-x-0.5 transition-transform">
                        <span className="hidden sm:inline text-[11px] text-gray-500 font-medium">{item.actionText}</span>
                        <CaretRight size={14} className="text-gray-400 group-hover:text-gray-700" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* =========================================================================
           * 4. Bloque Últimas 5 ventas
           * ========================================================================= */}
          <div className="bg-white border border-gray-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Últimas 5 ventas</h3>
                <p className="text-[11px] text-gray-400">
                  Comprobantes emitidos recientemente en el punto de venta
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate('/pos/sales')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 hover:text-purple-900 transition-colors cursor-pointer shrink-0"
              >
                <span>Ver todas las ventas</span>
                <ArrowRight size={13} weight="bold" />
              </button>
            </div>

            {dashboard.lastSales && dashboard.lastSales.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {dashboard.lastSales.map((sale) => (
                  <div
                    key={sale.id || sale.invoiceNumber}
                    onClick={() => sale.id && setSelectedSaleId(sale.id)}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-gray-50/80 rounded-xl px-2.5 -mx-2.5 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                        <Receipt size={16} weight="duotone" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-gray-900 truncate">
                            #{sale.invoiceNumber}
                          </span>
                          {sale.status === 'CANCELLED' || sale.status === 'VOIDED' ? (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-red-50 text-red-700">
                              Anulado
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[11px] text-gray-400">
                          {formatRelativeCompact(sale.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs sm:text-sm font-bold text-gray-900">
                        {formatCurrency(sale.total, currency)}
                      </p>
                      <span className="inline-block text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                        {sale.paymentMethod || 'Efectivo'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-gray-400">
                No hay ventas registradas aún hoy.
              </div>
            )}
          </div>

          {/* =========================================================================
           * 5. Bloque Métodos de cobro del mes y gráfico de 7 días
           * ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            {/* Gráfico de Ventas Diarias (7 Días) */}
            <div className="bg-white border border-gray-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Ventas Diarias (Últimos 7 Días)
                    </h3>
                    <TooltipInfo
                      text="Total vendido y cobrado en comprobantes con impuesto neto de devoluciones por cada día en hora de Managua."
                      align="left"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Comportamiento de comprobantes emitidos en la última semana
                  </p>
                </div>
              </div>

              {/* Contenedor de Gráfico de Barras */}
              <div className="pt-2">
                <div className="h-44 sm:h-52 flex items-end justify-between gap-2 sm:gap-4 px-2 pb-2 border-b border-gray-100">
                  {dailySales.map((item) => {
                    const heightPercent =
                      maxDailyTotal > 0
                        ? Math.max(Math.round((item.total / maxDailyTotal) * 100), 4)
                        : 4;

                    return (
                      <div
                        key={item.date}
                        className="flex-1 flex flex-col items-center h-full justify-end group relative"
                      >
                        {/* Tooltip con valores */}
                        <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-gray-900 text-white text-[10px] rounded-lg py-1 px-2 whitespace-nowrap z-10 shadow-lg">
                          <p className="font-semibold">{formatCurrency(item.total, currency)}</p>
                          <p className="text-gray-300 text-[9px]">{item.count} comprobantes</p>
                        </div>

                        {/* Bar */}
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full max-w-[40px] rounded-t-lg transition-all duration-300 ${
                            item.total > 0
                              ? 'bg-purple-600 hover:bg-purple-700'
                              : 'bg-gray-100 hover:bg-gray-200'
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Day Labels below bars */}
                <div className="flex items-center justify-between gap-2 sm:gap-4 px-2 pt-2.5">
                  {dailySales.map((item) => (
                    <div key={item.date} className="flex-1 text-center">
                      <p className="text-[11px] font-semibold text-gray-700 truncate">{item.dayName}</p>
                      <p className="text-[10px] text-gray-400 truncate">{item.dayNum}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Desglose por Método de Cobro */}
            <div className="bg-white border border-gray-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Métodos de Cobro (Mes Actual)
                    </h3>
                    <TooltipInfo
                      text="Total ingresado por métodos de pago en caja. Puede diferir de las ventas cobradas si se realizaron ventas al crédito (cuentas por cobrar) cuyo pago aún no ingresa a caja."
                      align="left"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-gray-400">
                  Distribución de ingresos recaudados por modalidad de cobro
                </p>

                {(() => {
                  const pm = dashboard.paymentMethods;
                  const total = pm.efectivo + pm.tarjeta + pm.transferencia + pm.otros;
                  const getPct = (val: number) => (total > 0 ? Math.round((val / total) * 100) : 0);

                  const methods = [
                    { label: 'Efectivo', val: pm.efectivo, pct: getPct(pm.efectivo), color: 'bg-emerald-500' },
                    { label: 'Tarjeta', val: pm.tarjeta, pct: getPct(pm.tarjeta), color: 'bg-blue-500' },
                    { label: 'Transferencia', val: pm.transferencia, pct: getPct(pm.transferencia), color: 'bg-purple-500' },
                    { label: 'Otros / Mixto', val: pm.otros, pct: getPct(pm.otros), color: 'bg-amber-500' },
                  ];

                  return (
                    <div className="space-y-3.5 mt-5">
                      {methods.map((m) => (
                        <div key={m.label} className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium text-gray-700">{m.label}</span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-gray-900">
                                {formatCurrency(m.val, currency)}
                              </span>
                              <span className="text-gray-400 text-[11px]">({m.pct}%)</span>
                            </div>
                          </div>

                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${m.pct}%` }}
                              className={`h-full ${m.color} rounded-full transition-all duration-300`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Botón rápido a cierres de caja */}
              <div className="pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => navigate('/pos/cash-registers')}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-xs font-medium text-gray-700 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <CashRegister size={16} className="text-gray-500" />
                    <span>Consultar Cierres de Caja</span>
                  </div>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* =========================================================================
           * 6. Aviso de datos sincronizados al pie
           * ========================================================================= */}
          <div className="pt-2 text-center">
            <p className="text-[11px] text-gray-600 bg-gray-50/80 border border-gray-200/60 rounded-xl py-2 px-3 inline-block leading-relaxed max-w-2xl mx-auto">
              Muestra lo sincronizado con el servidor. Las ventas hechas sin internet en una caja aparecen cuando esa caja vuelva a conectarse.
            </p>
          </div>
        </>
      ) : null}

      {/* Modal de Detalle de Venta al pulsar en últimas ventas */}
      {selectedSaleId && (
        <SaleDetailModal
          saleId={selectedSaleId}
          onClose={() => setSelectedSaleId(null)}
          currency={currency}
          isTallerProfile={dashboard?.salonProfile === 'TALLER'}
        />
      )}
    </div>
  );
};
