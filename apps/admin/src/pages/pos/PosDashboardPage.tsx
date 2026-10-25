import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CurrencyCircleDollar,
  Receipt,
  TrendUp,
  TrendDown,
  ArrowsClockwise,
  Package,
  CashRegister,
  CalendarBlank,
  ArrowRight,
  Storefront,
  Wrench,
  WarningCircle,
} from '@phosphor-icons/react';
import { useBackofficeDashboard, useBackofficeSales } from '../../hooks/useBackoffice';
import { formatCurrency, formatPercentage } from '../../utils/formatters';
import { ModuleNotEnabledAlert } from '../../components/pos/ModuleNotEnabledAlert';
import { WebAccessDisabledView } from '../../components/pos/WebAccessDisabledView';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getManaguaTodayYMD, getManaguaYMD } from '../../utils/dateManagua';
import { TooltipInfo } from '../../components/finances/TooltipInfo';

export const PosDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: dashboard, isLoading, isError, error, refetch } = useBackofficeDashboard();

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

  // Etiquetas de comparación con fechas explícitas (ej: vs ayer (23 oct), vs 11–17 oct)
  const comparisonLabels = useMemo(() => {
    const today = getManaguaTodayYMD();
    const [y, m, d] = today.split('-').map(Number);
    const baseDate = new Date(y, m - 1, d, 12, 0, 0);

    const yestDate = new Date(baseDate);
    yestDate.setDate(baseDate.getDate() - 1);
    const yesterday = format(yestDate, 'd MMM', { locale: es });

    const p7StartDate = new Date(baseDate);
    p7StartDate.setDate(baseDate.getDate() - 13);
    const p7EndDate = new Date(baseDate);
    p7EndDate.setDate(baseDate.getDate() - 7);
    const prev7 = `${format(p7StartDate, 'd', { locale: es })}–${format(p7EndDate, 'd MMM', { locale: es })}`;

    const pMonthDate = new Date(baseDate);
    pMonthDate.setMonth(baseDate.getMonth() - 1);
    const prevMonth = format(pMonthDate, 'MMM', { locale: es });

    return {
      yesterday: `vs ayer (${yesterday})`,
      prev7: `vs ${prev7}`,
      prevMonth: `vs mes ant. (${prevMonth})`,
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

  return (
    <div className="space-y-5 pb-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-base shadow-2xs">
            <Storefront size={22} weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
                Resumen de Punto de Venta (POS)
              </h2>
              {dashboard?.salonProfile === 'TALLER' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                  <Wrench size={11} />
                  Perfil Taller
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Métricas consolidadas de ventas, comprobantes y arqueo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-medium text-gray-700 transition-colors shadow-2xs"
          >
            <ArrowsClockwise size={13} className={isLoading ? 'animate-spin' : ''} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-white rounded-2xl border border-gray-100 p-5 animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <WarningCircle size={22} weight="duotone" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-gray-900">Error al cargar resumen del POS</p>
            <p className="text-xs text-red-600">
              {(error as any)?.response?.data?.message || 'No se pudieron consultar los datos del panel. Intente nuevamente más tarde.'}
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <ArrowsClockwise size={13} weight="bold" />
              <span>Reintentar</span>
            </button>
          </div>
        </div>
      ) : dashboard ? (
        <>
          {/* Métricas Principales (Hoy, Semana, Mes, Ticket Promedio) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Ventas Hoy */}
            <div className="bg-white border border-gray-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Ventas cobradas (hoy)
                  </span>
                  <TooltipInfo
                    text="Total facturado y cobrado con impuesto neto de devoluciones en la jornada actual de Managua."
                    align="left"
                  />
                </div>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <CurrencyCircleDollar size={16} weight="duotone" />
                </div>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                  {formatCurrency(dashboard.today.totalRevenue, currency)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                <span className="text-gray-500 text-[11px]">
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

            {/* 2. Ventas Esta Semana */}
            <div className="bg-white border border-gray-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Ventas cobradas (7 días)
                  </span>
                  <TooltipInfo
                    text="Total facturado y cobrado con impuesto en los últimos 7 días netos de devoluciones."
                    align="left"
                  />
                </div>
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                  <CalendarBlank size={16} weight="duotone" />
                </div>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                  {formatCurrency(dashboard.week.totalRevenue, currency)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                <span className="text-gray-500 text-[11px]">
                  {dashboard.week.salesCount} {dashboard.week.salesCount === 1 ? 'venta' : 'ventas'}
                </span>

                <div
                  className={`flex items-center gap-1 font-semibold text-[11px] ${
                    dashboard.week.comparison.revenueGrowthPercent >= 0
                      ? 'text-emerald-700'
                      : 'text-red-700'
                  }`}
                >
                  {dashboard.week.comparison.revenueGrowthPercent >= 0 ? (
                    <TrendUp size={13} weight="bold" />
                  ) : (
                    <TrendDown size={13} weight="bold" />
                  )}
                  <span>{formatPercentage(dashboard.week.comparison.revenueGrowthPercent)}</span>
                  <span className="text-gray-400 font-normal">{comparisonLabels.prev7}</span>
                </div>
              </div>
            </div>

            {/* 3. Ventas Este Mes */}
            <div className="bg-white border border-gray-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Ventas cobradas del mes
                  </span>
                  <TooltipInfo
                    text="Total facturado y cobrado acumulado con impuesto en el mes calendario en curso."
                    align="left"
                  />
                </div>
                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                  <Receipt size={16} weight="duotone" />
                </div>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                  {formatCurrency(dashboard.month.totalRevenue, currency)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                <span className="text-gray-500 text-[11px]">
                  {dashboard.month.salesCount} {dashboard.month.salesCount === 1 ? 'venta' : 'ventas'}
                </span>

                <div
                  className={`flex items-center gap-1 font-semibold text-[11px] ${
                    dashboard.month.comparison.revenueGrowthPercent >= 0
                      ? 'text-emerald-700'
                      : 'text-red-700'
                  }`}
                >
                  {dashboard.month.comparison.revenueGrowthPercent >= 0 ? (
                    <TrendUp size={13} weight="bold" />
                  ) : (
                    <TrendDown size={13} weight="bold" />
                  )}
                  <span>{formatPercentage(dashboard.month.comparison.revenueGrowthPercent)}</span>
                  <span className="text-gray-400 font-normal">{comparisonLabels.prevMonth}</span>
                </div>
              </div>
            </div>

            {/* 4. Ticket Promedio */}
            <div className="bg-white border border-gray-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Ticket Promedio
                  </span>
                  <TooltipInfo
                    text="Monto promedio cobrado por comprobante emitido."
                    align="left"
                  />
                </div>
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                  <TrendUp size={16} weight="duotone" />
                </div>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                  {formatCurrency(dashboard.today.averageTicket || dashboard.week.averageTicket, currency)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                <span className="text-gray-500 text-[11px]">
                  {dashboard.today.salesCount > 0 ? 'Promedio hoy' : 'Promedio 7 días'}
                </span>
                <span className="text-gray-400 text-[11px]">
                  Mes: {formatCurrency(dashboard.month.averageTicket, currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Gráfico de Ventas Diarias & Desglose por Método de Pago */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Gráfico de Ventas Diarias (Últimos 7 días) */}
            <div className="lg:col-span-2 bg-white border border-gray-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Ventas Diarias (Últimos 7 días)
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Comportamiento de ventas netas por jornada
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/pos/sales')}
                  className="text-xs text-gray-600 hover:text-gray-900 font-medium flex items-center gap-1"
                >
                  <span>Ver ventas</span>
                  <ArrowRight size={12} />
                </button>
              </div>

              {/* Bar Chart Container */}
              <div className="pt-4">
                <div className="h-44 flex items-end justify-between gap-2 sm:gap-4 px-2 border-b border-gray-100">
                  {dailySales.map((item) => {
                    const heightPercent = maxDailyTotal > 0
                      ? Math.max(6, Math.round((item.total / maxDailyTotal) * 100))
                      : 6;

                    return (
                      <div
                        key={item.date}
                        className="flex-1 flex flex-col items-center gap-2 group relative h-full justify-end"
                      >
                        {/* Tooltip on hover */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md pointer-events-none whitespace-nowrap z-10 shadow-xs">
                          {formatCurrency(item.total, currency)} ({item.count} ventas)
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

            {/* Desglose por Método de Pago */}
            <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-2xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Métodos de Pago (Mes Actual)
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
                    { label: 'Efectivo', val: pm.efectivo, pct: getPct(pm.efectivo), color: 'bg-emerald-500', text: 'text-emerald-700' },
                    { label: 'Tarjeta', val: pm.tarjeta, pct: getPct(pm.tarjeta), color: 'bg-blue-500', text: 'text-blue-700' },
                    { label: 'Transferencia', val: pm.transferencia, pct: getPct(pm.transferencia), color: 'bg-purple-500', text: 'text-purple-700' },
                    { label: 'Otros / Mixto', val: pm.otros, pct: getPct(pm.otros), color: 'bg-amber-500', text: 'text-amber-700' },
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
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-xs font-medium text-gray-700 transition-colors"
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

          {/* Accesos Rápidos de Consulta */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
            <button
              type="button"
              onClick={() => navigate('/pos/sales')}
              className="p-4 rounded-2xl bg-white border border-gray-200/80 hover:border-gray-300 text-left transition-all shadow-2xs hover:shadow-xs group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                  <Receipt size={18} weight="duotone" />
                </div>
                <ArrowRight size={14} className="text-gray-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <h4 className="font-semibold text-xs text-gray-900">Historial de Ventas</h4>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Comprobantes, devoluciones y detalle de órdenes
              </p>
            </button>

            <button
              type="button"
              onClick={() => navigate('/pos/analytics')}
              className="p-4 rounded-2xl bg-white border border-gray-200/80 hover:border-gray-300 text-left transition-all shadow-2xs hover:shadow-xs group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <TrendUp size={18} weight="duotone" />
                </div>
                <ArrowRight size={14} className="text-gray-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <h4 className="font-semibold text-xs text-gray-900">Más Vendidos y Categorías</h4>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Ranking de productos por volumen y ventas
              </p>
            </button>

            <button
              type="button"
              onClick={() => navigate('/pos/inventory')}
              className="p-4 rounded-2xl bg-white border border-gray-200/80 hover:border-gray-300 text-left transition-all shadow-2xs hover:shadow-xs group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Package size={18} weight="duotone" />
                </div>
                <ArrowRight size={14} className="text-gray-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <h4 className="font-semibold text-xs text-gray-900">Estado de Inventario</h4>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Existencias, productos bajo mínimo y agotados
              </p>
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
};
