import React from 'react';
import {
  TrendUp,
  TrendDown,
  Percent,
  Coins,
  Package,
  WarningCircle,
  CheckCircle,
  ArrowRight,
  Wrench,
  Stack,
  ShoppingBag,
} from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { ProfitReport, PeriodType } from '../../types/reports';
import { formatCurrency } from '../../utils/formatters';

interface ProfitReportTabProps {
  profitData?: ProfitReport | null;
  period: PeriodType;
  isLoading: boolean;
}

export const ProfitReportTab: React.FC<ProfitReportTabProps> = ({
  profitData,
  period,
  isLoading,
}) => {
  const navigate = useNavigate();

  const comparisonLabel =
    period === 'today'
      ? 'ayer'
      : period === 'week'
      ? 'semana anterior'
      : period === 'month'
      ? 'mes anterior'
      : 'período anterior';

  const renderBadge = (change: number | null | undefined, isPoints = false) => {
    if (change === null || change === undefined) return null;
    const isPositive = change > 0;
    const isZero = change === 0;

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
        {isPositive ? `+${change}` : `${change}`}
        {isPoints ? ' pts' : '%'} vs {comparisonLabel}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100 shadow-2xs" />
          ))}
        </div>
        <div className="h-44 bg-white rounded-2xl border border-gray-100 shadow-2xs" />
        <div className="h-64 bg-white rounded-2xl border border-gray-100 shadow-2xs" />
      </div>
    );
  }

  const coveragePercent = profitData?.coveragePercent ?? 0;
  // REGLA CRÍTICA: Cuando coveragePercent === 0, no mostrar 0 ni 100%: mostrar "Sin datos de costo suficientes"
  const isZeroCoverage = coveragePercent === 0;
  const isPartialCoverage = coveragePercent > 0 && coveragePercent < 100;
  const isFullCoverage = coveragePercent === 100;

  const estimatedProfit = profitData?.estimatedProfit ?? 0;
  const marginPercent = profitData?.marginPercent ?? null;
  const totalCost = profitData?.totalCost ?? 0;
  const laborRevenue = profitData?.laborRevenue ?? 0;

  // Fuentes de costo
  const bySource = profitData?.bySource;
  const sourceLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    PRODUCT_COST: {
      label: 'Costo de Catálogo',
      icon: <Package size={16} weight="bold" />,
      color: 'text-blue-700 bg-blue-50 border-blue-100',
    },
    RECIPE: {
      label: 'Recetas / Componentes',
      icon: <Stack size={16} weight="bold" />,
      color: 'text-purple-700 bg-purple-50 border-purple-100',
    },
    PURCHASE: {
      label: 'Compras / Entradas',
      icon: <ShoppingBag size={16} weight="bold" />,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-100',
    },
    LABOR: {
      label: 'Mano de Obra / Servicios',
      icon: <Wrench size={16} weight="bold" />,
      color: 'text-amber-700 bg-amber-50 border-amber-100',
    },
    UNKNOWN: {
      label: 'Sin Costo Registrado',
      icon: <WarningCircle size={16} weight="bold" />,
      color: 'text-red-700 bg-red-50 border-red-100',
    },
  };

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Ganancia Estimada */}
        <div className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold text-gray-700">Ganancia estimada</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TrendUp size={16} weight="bold" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-700 tracking-tight">
            {isZeroCoverage ? '—' : formatCurrency(estimatedProfit)}
          </div>
          <div className="flex items-center justify-between pt-0.5 text-[11px] text-gray-400">
            <span>Ingresos cubiertos - Costo</span>
            {renderBadge(profitData?.comparison?.estimatedProfit?.changePercent)}
          </div>
        </div>

        {/* Margen Operativo */}
        <div className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold text-gray-700">Margen operativo</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Percent size={16} weight="bold" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 tracking-tight">
            {isZeroCoverage || marginPercent === null ? '—' : `${marginPercent.toFixed(1)}%`}
          </div>
          <div className="flex items-center justify-between pt-0.5 text-[11px] text-gray-400">
            <span>Rentabilidad s/ ventas</span>
            {renderBadge(profitData?.comparison?.marginPercent?.changePercent, true)}
          </div>
        </div>

        {/* Costo de lo Vendido (COGS) */}
        <div className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold text-gray-700">Costo de lo vendido</span>
            <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center">
              <Coins size={16} weight="bold" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 tracking-tight">
            {isZeroCoverage ? '—' : formatCurrency(totalCost)}
          </div>
          <div className="flex items-center justify-between pt-0.5 text-[11px] text-gray-400">
            <span>Reposición de inventario</span>
            {renderBadge(profitData?.comparison?.totalCost?.changePercent)}
          </div>
        </div>

        {/* Ganancia antes de Mano de Obra (laborRevenue) */}
        <div className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold text-gray-700">Mano de obra (servicios)</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Wrench size={16} weight="bold" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 tracking-tight">
            {formatCurrency(laborRevenue)}
          </div>
          <div className="flex items-center justify-between pt-0.5 text-[11px] text-gray-400">
            <span>Ganancia bruta de labor</span>
            <span className="text-[10px] text-gray-500 font-medium">100% margen</span>
          </div>
        </div>
      </div>

      {/* Alerta de Cobertura de Costos & Estado Especial coveragePercent === 0 */}
      {isZeroCoverage ? (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <WarningCircle size={20} weight="fill" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                    Sin datos de costo suficientes
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-200/80 text-amber-900 rounded-md">
                    Sin cobertura
                  </span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed max-w-2xl">
                  Los productos vendidos en este período no tienen costo de compra registrado en el catálogo.
                  Para garantizar la exactitud de tu ganancia y margen operativo, no mostramos cálculos inventados.
                  Registra el costo de compra en tu inventario o catálogo para visualizar tu ganancia real.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/pos/inventory')}
              className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-2 bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs rounded-xl transition-colors shadow-2xs shrink-0 cursor-pointer"
            >
              <span>Consultar inventario</span>
              <ArrowRight size={13} weight="bold" />
            </button>
          </div>
        </div>
      ) : isPartialCoverage ? (
        <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <WarningCircle size={20} weight="fill" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                    Ganancia parcial (Cobertura del {coveragePercent.toFixed(1)}%)
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-200/80 text-amber-900 rounded-md">
                    Faltan costos en {profitData?.missingCostCount || 0}{' '}
                    {profitData?.missingCostCount === 1 ? 'producto' : 'productos'}
                  </span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed max-w-2xl">
                  El cálculo de ganancia y margen operativo excluye las líneas de productos sin costo
                  asignado. Ingresa los costos de reposición en el sistema para reflejar tu margen exacto.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/pos/inventory')}
              className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-2 bg-gray-900 hover:bg-black text-white font-semibold text-xs rounded-xl transition-colors shadow-2xs shrink-0 cursor-pointer"
            >
              <span>Consultar inventario</span>
              <ArrowRight size={13} weight="bold" />
            </button>
          </div>

          {/* Barra de progreso de cobertura */}
          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-[11px] text-amber-900 font-semibold">
              <span>Cobertura de ventas calculada:</span>
              <span>{coveragePercent.toFixed(1)}%</span>
            </div>
            <div className="w-full h-2 bg-amber-200/60 rounded-full overflow-hidden">
              <div
                style={{ width: `${Math.min(100, Math.max(2, coveragePercent))}%` }}
                className="h-full bg-amber-600 rounded-full transition-all"
              />
            </div>
          </div>
        </div>
      ) : isFullCoverage ? (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 shadow-2xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <CheckCircle size={18} weight="bold" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-emerald-950">Cobertura de Costos del 100%</h4>
            <p className="text-[11px] text-emerald-800">
              Todos los productos vendidos en este período cuentan con costo de compra registrado. La
              ganancia estimada y el margen son 100% representativos.
            </p>
          </div>
        </div>
      ) : null}

      {/* Desglose por Fuente de Costo (bySource) */}
      {bySource && Object.keys(bySource).length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Desglose por Fuente de Costo
            </h3>
            <span className="text-[11px] text-gray-400">Distribución de reposición</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(bySource).map(([sourceKey, sourceData]) => {
              const info = sourceLabels[sourceKey] || {
                label: sourceKey,
                icon: <Coins size={16} weight="bold" />,
                color: 'text-gray-700 bg-gray-50 border-gray-100',
              };

              return (
                <div
                  key={sourceKey}
                  className={`p-3.5 rounded-xl border ${info.color} flex flex-col justify-between gap-2`}
                >
                  <div className="flex items-center gap-2">
                    <span className="shrink-0">{info.icon}</span>
                    <span className="font-bold text-xs truncate">{info.label}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-black/5">
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase block">Facturado</span>
                      <span className="font-bold text-gray-900">
                        {formatCurrency(sourceData.revenue)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-gray-500 uppercase block">Costo</span>
                      <span className="font-bold text-gray-900">{formatCurrency(sourceData.cost)}</span>
                    </div>
                  </div>

                  <div className="text-[10px] text-gray-500 flex justify-between">
                    <span>Líneas vendidas:</span>
                    <span className="font-semibold text-gray-700">{sourceData.lines}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lista de Productos Vendidos Sin Costo (missingCostProducts) */}
      <div className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-2xs flex flex-col">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-gray-700" weight="bold" />
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Productos Vendidos Sin Costo Asignado
            </h3>
          </div>
          <span className="text-[11px] text-gray-400">
            {profitData?.missingCostCount || 0} productos detectados
          </span>
        </div>

        {!profitData?.missingCostProducts || profitData.missingCostProducts.length === 0 ? (
          <div className="p-8 text-center text-xs text-emerald-700 font-semibold flex items-center justify-center gap-2">
            <CheckCircle size={18} weight="bold" />
            <span>No hay productos vendidos sin costo en este período.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 text-[11px] bg-gray-50/50">
                  <th className="py-2.5 px-4 font-semibold">Producto</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Unidades Vendidas</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Total Facturado</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Estado Costo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {profitData.missingCostProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-gray-900">{p.name}</td>
                    <td className="py-2.5 px-4 text-center text-gray-600 font-medium">
                      {p.quantitySold} un.
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-gray-900">
                      {formatCurrency(p.totalSold)}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200/80 px-2 py-0.5 rounded-full">
                        <WarningCircle size={11} weight="fill" />
                        Sin costo
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
