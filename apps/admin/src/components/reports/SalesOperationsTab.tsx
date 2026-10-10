import React from 'react';
import {
  TrendUp,
  TrendDown,
  Receipt,
  Money,
  WarningCircle,
  Clock,
  CalendarBlank,
  Tag,
  Users,
  CreditCard,
  Bank,
  Coins,
  CheckCircle,
} from '@phosphor-icons/react';
import {
  ReportsSummary,
  SalesByTimeReport,
  SalesByCategoryReport,
  SalesByCashierReport,
  PeriodType,
} from '../../types/reports';
import { formatCurrency } from '../../utils/formatters';
import { formatManaguaDate } from '../../utils/dateManagua';

interface SalesOperationsTabProps {
  reportsData?: ReportsSummary | null;
  timeData?: SalesByTimeReport | null;
  categoryData?: SalesByCategoryReport | null;
  cashierData?: SalesByCashierReport | null;
  period: PeriodType;
  isLoading: boolean;
}

export const SalesOperationsTab: React.FC<SalesOperationsTabProps> = ({
  reportsData,
  timeData,
  categoryData,
  cashierData,
  period,
  isLoading,
}) => {
  const comparisonLabel =
    period === 'today'
      ? 'ayer'
      : period === 'week'
      ? 'semana anterior'
      : period === 'month'
      ? 'mes anterior'
      : 'período anterior';

  const renderComparisonBadge = (changePercent: number | null | undefined) => {
    if (changePercent === null || changePercent === undefined) return null;
    const isPositive = changePercent > 0;
    const isZero = changePercent === 0;

    return (
      <span
        className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
          isZero
            ? 'text-gray-500 bg-gray-100'
            : isPositive
            ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/60'
            : 'text-red-700 bg-red-50 border border-red-200/60'
        }`}
      >
        {isPositive && <TrendUp size={11} className="mr-0.5" weight="bold" />}
        {!isPositive && !isZero && <TrendDown size={11} className="mr-0.5" weight="bold" />}
        {isPositive ? `+${changePercent}%` : `${changePercent}%`} vs {comparisonLabel}
      </span>
    );
  };

  // Valores de Ventas Cobradas vs Ventas Netas
  const totalCollected = reportsData?.summary?.totalRevenue ?? reportsData?.totalSales ?? 0;
  const netRevenue = reportsData?.summary?.netRevenue ?? reportsData?.totalSales ?? 0;
  const totalTax = reportsData?.summary?.totalTax ?? 0;
  const totalDiscount = reportsData?.summary?.totalDiscount ?? 0;

  // Métodos de pago
  const cashAmount = reportsData?.totalCash ?? reportsData?.summary?.byPaymentMethod?.['EFECTIVO'] ?? 0;
  const cardAmount = reportsData?.totalCard ?? reportsData?.summary?.byPaymentMethod?.['TARJETA'] ?? 0;
  const transferAmount =
    reportsData?.totalTransfer ?? reportsData?.summary?.byPaymentMethod?.['TRANSFERENCIA'] ?? 0;
  const totalPaymentMethods = cashAmount + cardAmount + transferAmount;

  const cashPct = totalPaymentMethods > 0 ? (cashAmount / totalPaymentMethods) * 100 : 0;
  const cardPct = totalPaymentMethods > 0 ? (cardAmount / totalPaymentMethods) * 100 : 0;
  const transferPct = totalPaymentMethods > 0 ? (transferAmount / totalPaymentMethods) * 100 : 0;

  // Cálculos de máximos para barras visuales
  const maxHourRevenue = Math.max(...(timeData?.byHour?.map((h) => h.revenue) || [1]), 1);
  const maxDowRevenue = Math.max(...(timeData?.byDayOfWeek?.map((d) => d.revenue) || [1]), 1);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100 shadow-2xs" />
          ))}
        </div>
        <div className="h-64 bg-white rounded-2xl border border-gray-100 shadow-2xs" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-72 bg-white rounded-2xl border border-gray-100 shadow-2xs" />
          <div className="h-72 bg-white rounded-2xl border border-gray-100 shadow-2xs" />
        </div>
      </div>
    );
  }

  const hasNoSales = (reportsData?.salesCount || 0) === 0 && totalCollected === 0;

  if (hasNoSales) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-12 max-w-lg mx-auto text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 text-gray-400 flex items-center justify-center mx-auto">
          <Receipt size={24} weight="duotone" />
        </div>
        <h3 className="text-base font-bold text-gray-900">Sin ventas en este período</h3>
        <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
          No se registraron ventas ni transacciones durante el período seleccionado. Prueba
          cambiando el rango de fechas con el selector superior.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* KPI Cards Principales: Cobrado vs Neto + Tickets + Ticket Promedio */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Ventas Cobradas (con impuesto) */}
        <div className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold text-gray-700">Ventas cobradas (con impuesto)</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Coins size={16} weight="duotone" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 tracking-tight">
            {formatCurrency(totalCollected)}
          </div>
          <div className="flex items-center justify-between pt-0.5 text-[11px] text-gray-400">
            <span>Total cobrado en caja</span>
            {renderComparisonBadge(reportsData?.comparison?.totalSales?.changePercent)}
          </div>
        </div>

        {/* Ventas Netas (sin impuesto, con descuentos y devoluciones) */}
        <div className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold text-gray-700">Ventas netas (sin impuesto)</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Receipt size={16} weight="duotone" />
            </div>
          </div>
          <div className="text-2xl font-bold text-blue-900 tracking-tight">
            {formatCurrency(netRevenue)}
          </div>
          <div className="flex items-center justify-between pt-0.5 text-[11px] text-gray-400">
            <span title="Deduce impuestos, devoluciones y descuentos">
              {totalDiscount > 0 ? `Desc: -${formatCurrency(totalDiscount)}` : 'Ventas netas reales'}
            </span>
            {totalTax > 0 && <span className="text-gray-400">Imp: {formatCurrency(totalTax)}</span>}
          </div>
        </div>

        {/* Transacciones / Tickets */}
        <div className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold text-gray-700">Número de ventas</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <Receipt size={16} weight="duotone" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 tracking-tight">
            {reportsData?.salesCount || 0}
          </div>
          <div className="flex items-center justify-between pt-0.5 text-[11px] text-gray-400">
            <span>Tickets completados</span>
            {renderComparisonBadge(reportsData?.comparison?.salesCount?.changePercent)}
          </div>
        </div>

        {/* Ticket Promedio */}
        <div className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold text-gray-700">Ticket promedio</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Money size={16} weight="duotone" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 tracking-tight">
            {formatCurrency(reportsData?.averageTicket || 0)}
          </div>
          <div className="flex items-center justify-between pt-0.5 text-[11px] text-gray-400">
            <span>Por ticket concretado</span>
            {renderComparisonBadge(reportsData?.comparison?.averageTicket?.changePercent)}
          </div>
        </div>
      </div>

      {/* Métodos de Pago: Efectivo, Tarjeta, Transferencia */}
      <div className="p-4 sm:p-5 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
            Distribución por Método de Pago
          </h3>
          <span className="text-[11px] text-gray-400">
            Total recaudado: {formatCurrency(totalPaymentMethods)}
          </span>
        </div>

        {/* Barra segmentada */}
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex">
          <div
            style={{ width: `${cashPct}%` }}
            className="h-full bg-emerald-500 transition-all duration-300"
            title={`Efectivo: ${cashPct.toFixed(1)}%`}
          />
          <div
            style={{ width: `${cardPct}%` }}
            className="h-full bg-blue-500 transition-all duration-300"
            title={`Tarjeta: ${cardPct.toFixed(1)}%`}
          />
          <div
            style={{ width: `${transferPct}%` }}
            className="h-full bg-purple-500 transition-all duration-300"
            title={`Transferencia: ${transferPct.toFixed(1)}%`}
          />
        </div>

        {/* Desglose en tarjetas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <Coins size={16} weight="bold" />
              </div>
              <div>
                <span className="text-[11px] font-medium text-emerald-900 block">Efectivo</span>
                <span className="text-[10px] text-emerald-700">{cashPct.toFixed(1)}% del total</span>
              </div>
            </div>
            <span className="font-bold text-xs text-emerald-950">{formatCurrency(cashAmount)}</span>
          </div>

          <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
                <CreditCard size={16} weight="bold" />
              </div>
              <div>
                <span className="text-[11px] font-medium text-blue-900 block">Tarjeta</span>
                <span className="text-[10px] text-blue-700">{cardPct.toFixed(1)}% del total</span>
              </div>
            </div>
            <span className="font-bold text-xs text-blue-950">{formatCurrency(cardAmount)}</span>
          </div>

          <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center">
                <Bank size={16} weight="bold" />
              </div>
              <div>
                <span className="text-[11px] font-medium text-purple-900 block">Transferencia</span>
                <span className="text-[10px] text-purple-700">{transferPct.toFixed(1)}% del total</span>
              </div>
            </div>
            <span className="font-bold text-xs text-purple-950">{formatCurrency(transferAmount)}</span>
          </div>
        </div>
      </div>

      {/* Ventas por Día (si hay datos de desglose diario) */}
      {reportsData?.summary?.byDay && reportsData.summary.byDay.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarBlank size={16} className="text-gray-700" weight="bold" />
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Ventas por Día
              </h3>
            </div>
            <span className="text-[11px] text-gray-400">
              {reportsData.summary.byDay.length} días con actividad
            </span>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[500px] flex items-end gap-2 pt-4 pb-2 h-44">
              {(() => {
                const maxDayRev = Math.max(...reportsData.summary!.byDay.map((d) => d.revenue), 1);
                return reportsData.summary!.byDay.map((d) => {
                  const pct = Math.max(8, Math.round((d.revenue / maxDayRev) * 100));
                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5 group">
                      <div className="text-[10px] font-semibold text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {formatCurrency(d.revenue)}
                      </div>
                      <div className="w-full flex-1 flex items-end">
                        <div
                          style={{ height: `${pct}%` }}
                          className="w-full rounded-t-lg bg-gray-900 group-hover:bg-blue-600 transition-colors"
                          title={`${d.date}: ${formatCurrency(d.revenue)} (${d.count} tickets)`}
                        />
                      </div>
                      <span className="text-[10px] text-gray-500 font-medium truncate max-w-full">
                        {formatManaguaDate(d.date).slice(0, 5)}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Gráficos de Ventas por Hora y por Día de la Semana */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Ventas por Hora (00 a 23) */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-4 sm:p-5 shadow-2xs space-y-3 flex flex-col">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-gray-700" weight="bold" />
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Ventas por Hora (Hora Managua)
              </h3>
            </div>
            {timeData?.peakHour && timeData.peakHour.count > 0 && (
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                Pico: {String(timeData.peakHour.hour).padStart(2, '0')}:00 hrs
              </span>
            )}
          </div>

          {!timeData?.byHour || timeData.byHour.every((h) => h.count === 0) ? (
            <div className="p-8 text-center text-xs text-gray-400">
              No hay datos de horario para este período.
            </div>
          ) : (
            <div className="overflow-x-auto pt-2 flex-1">
              <div className="min-w-[480px] flex items-end gap-1.5 h-36">
                {timeData.byHour.map((h) => {
                  const pct = Math.max(4, Math.round((h.revenue / maxHourRevenue) * 100));
                  const isPeak = timeData.peakHour?.hour === h.hour && h.count > 0;
                  return (
                    <div key={h.hour} className="flex-1 flex flex-col items-center gap-1 group">
                      <div className="w-full flex-1 flex items-end">
                        <div
                          style={{ height: `${pct}%` }}
                          className={`w-full rounded-t-md transition-all ${
                            isPeak
                              ? 'bg-emerald-500'
                              : h.count > 0
                              ? 'bg-blue-600/80 group-hover:bg-blue-600'
                              : 'bg-gray-100'
                          }`}
                          title={`${String(h.hour).padStart(2, '0')}:00 - ${formatCurrency(h.revenue)} (${h.count} tickets)`}
                        />
                      </div>
                      <span className="text-[9px] text-gray-400 font-mono">
                        {h.hour % 3 === 0 ? `${h.hour}h` : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Ventas por Día de la Semana */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-4 sm:p-5 shadow-2xs space-y-3 flex flex-col">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <CalendarBlank size={16} className="text-gray-700" weight="bold" />
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Ventas por Día de la Semana
              </h3>
            </div>
            {timeData?.peakDay && timeData.peakDay.count > 0 && (
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60">
                Pico: {timeData.peakDay.dayName}
              </span>
            )}
          </div>

          {!timeData?.byDayOfWeek || timeData.byDayOfWeek.every((d) => d.count === 0) ? (
            <div className="p-8 text-center text-xs text-gray-400">
              No hay ventas por día registradas en este período.
            </div>
          ) : (
            <div className="space-y-2 pt-2 flex-1">
              {timeData.byDayOfWeek.map((d) => {
                const pct = Math.round((d.revenue / maxDowRevenue) * 100);
                const isPeak = timeData.peakDay?.dayOfWeek === d.dayOfWeek && d.count > 0;
                return (
                  <div key={d.dayOfWeek} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-semibold ${isPeak ? 'text-blue-900' : 'text-gray-700'}`}>
                        {d.dayName}
                      </span>
                      <div className="text-right space-x-2">
                        <span className="text-gray-400 text-[11px]">{d.count} tickets</span>
                        <span className="font-bold text-gray-900">{formatCurrency(d.revenue)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${Math.max(2, pct)}%` }}
                        className={`h-full rounded-full transition-all ${
                          isPeak ? 'bg-blue-600' : 'bg-gray-400'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Ventas por Categoría & Ventas por Cajero */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Ventas por Categoría */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-4 sm:p-5 shadow-2xs space-y-3 flex flex-col">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Tag size={16} className="text-gray-700" weight="bold" />
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Ventas por Categoría
              </h3>
            </div>
            <span className="text-[11px] text-gray-400">Participación en ingresos</span>
          </div>

          {!categoryData?.categories || categoryData.categories.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400">
              No hay ventas categorizadas en este período.
            </div>
          ) : (
            <div className="space-y-3 pt-2 max-h-80 overflow-y-auto flex-1">
              {categoryData.categories.map((c) => (
                <div key={c.categoryId || c.categoryName} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-900 truncate pr-2">
                      {c.categoryName}
                    </span>
                    <div className="text-right space-x-2 shrink-0">
                      <span className="text-gray-400 text-[11px]">{c.quantity} un.</span>
                      <span className="font-bold text-gray-900">{formatCurrency(c.revenue)}</span>
                      <span className="text-blue-700 font-bold text-[11px] bg-blue-50 px-1.5 py-0.5 rounded">
                        {c.percentage}%
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, Math.max(2, c.percentage))}%` }}
                      className="h-full bg-blue-600 rounded-full transition-all"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ventas por Cajero */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-4 sm:p-5 shadow-2xs space-y-3 flex flex-col">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-gray-700" weight="bold" />
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Ventas por Cajero
              </h3>
            </div>
            <span className="text-[11px] text-gray-400">Desempeño individual</span>
          </div>

          {!cashierData?.cashiers || cashierData.cashiers.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400">
              No hay ventas por cajero registradas en este período.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-80 overflow-y-auto pt-1 flex-1">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 text-[11px]">
                    <th className="py-2 px-2 font-semibold">Cajero</th>
                    <th className="py-2 px-2 font-semibold text-center">Tickets</th>
                    <th className="py-2 px-2 font-semibold text-right">Total Cobrado</th>
                    <th className="py-2 px-2 font-semibold text-right">Promedio</th>
                    <th className="py-2 px-2 font-semibold text-right">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {cashierData.cashiers.map((c) => (
                    <tr key={c.cashierId} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-2.5 px-2 font-semibold text-gray-900">{c.cashierName}</td>
                      <td className="py-2.5 px-2 text-center text-gray-600">{c.salesCount}</td>
                      <td className="py-2.5 px-2 text-right font-bold text-gray-900">
                        {formatCurrency(c.totalSales)}
                      </td>
                      <td className="py-2.5 px-2 text-right text-gray-600">
                        {formatCurrency(c.averageTicket)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-semibold text-blue-700">
                        {c.percentage}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Dos columnas inferiores: Top Productos & Alertas de Stock Bajo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Productos Más Vendidos */}
        <div className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-2xs flex flex-col">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Productos Más Vendidos
            </h3>
            <span className="text-[11px] text-gray-400">Por facturación</span>
          </div>

          {!reportsData?.topProducts || reportsData.topProducts.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400">
              No hay productos vendidos en este período.
            </div>
          ) : (
            <div className="divide-y divide-gray-100 flex-1">
              {reportsData.topProducts.map((p, idx) => (
                <div key={p.productId || p.productName} className="p-3.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-lg font-bold flex items-center justify-center text-[11px] ${
                        idx === 0
                          ? 'bg-amber-100 text-amber-900'
                          : idx === 1
                          ? 'bg-gray-200 text-gray-800'
                          : idx === 2
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-gray-900">{p.productName}</div>
                      <div className="text-[11px] text-gray-400">{p.quantity} unidades vendidas</div>
                    </div>
                  </div>
                  <div className="text-right font-bold text-gray-900">
                    {formatCurrency(p.revenue)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alertas de Stock Bajo */}
        <div className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-2xs flex flex-col">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <WarningCircle size={16} className="text-amber-500" weight="fill" />
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Alertas de Stock Bajo
              </h3>
            </div>
            <span className="text-[11px] text-gray-400">Reposición sugerida</span>
          </div>

          {!reportsData?.lowStockProducts || reportsData.lowStockProducts.length === 0 ? (
            <div className="p-8 text-center text-xs text-emerald-700 font-semibold flex items-center justify-center gap-2">
              <CheckCircle size={18} weight="bold" />
              <span>Todo el inventario se encuentra en niveles óptimos.</span>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 flex-1 max-h-80 overflow-y-auto">
              {reportsData.lowStockProducts.map((prod) => (
                <div key={prod.id} className="p-3.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-gray-900">{prod.name}</div>
                    <div className="text-[11px] text-gray-400">
                      Mínimo requerido: {prod.minStock || 0} {prod.unit || 'und'}
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        prod.stock <= 0
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {prod.stock <= 0 ? 'Agotado (0)' : `Quedan: ${prod.stock}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
