import React, { useState } from 'react';
import {
  ChartBar,
  TrendUp,
  TrendDown,
  WarningCircle,
  Receipt,
  Package,
  Coins,
  Percent,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import { useIncomeStatement } from '../../hooks/useFinances';
import { formatCurrency, formatPercentage } from '../../utils/formatters';
import { formatManaguaDate } from '../../utils/dateManagua';

interface IncomeStatementTabProps {
  currency?: string;
}

export const IncomeStatementTab: React.FC<IncomeStatementTabProps> = ({ currency = 'NIO' }) => {
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'year' | 'custom'>('month');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');

  const {
    data: statement,
    isLoading,
    isFetching,
    refetch,
  } = useIncomeStatement({
    period: period === 'custom' ? undefined : period,
    from: period === 'custom' ? customFrom || undefined : undefined,
    to: period === 'custom' ? customTo || undefined : undefined,
  });

  const hasMissingCost = Boolean(
    statement?.isPartial ||
    (statement?.coverage?.coveragePercent !== undefined && statement.coverage.coveragePercent < 100)
  );

  const interestIncome = statement?.interestIncome ?? 0;
  const netProfit = statement?.netProfit ?? ((statement?.operatingProfit || 0) + interestIncome);

  const renderComparisonBadge = (changeVal: number | undefined) => {
    if (changeVal === undefined || changeVal === null) return null;
    const isPositive = changeVal > 0;
    const isZero = changeVal === 0;

    return (
      <span
        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
          isZero
            ? 'bg-gray-100 text-gray-600'
            : isPositive
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-rose-50 text-rose-700'
        }`}
      >
        {isPositive ? (
          <TrendUp size={11} weight="bold" />
        ) : !isZero ? (
          <TrendDown size={11} weight="bold" />
        ) : null}
        <span>{formatPercentage(changeVal)}</span>
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Controles: Selector de periodo y botón refrescar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Pills de periodo */}
        <div className="inline-flex items-center bg-gray-100 p-1 rounded-xl gap-0.5 overflow-x-auto max-w-full">
          {[
            { id: 'today', label: 'Hoy' },
            { id: 'week', label: 'Esta semana' },
            { id: 'month', label: 'Este mes' },
            { id: 'year', label: 'Este año' },
            { id: 'custom', label: 'Personalizado' },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                period === p.id
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Refrescar */}
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer self-end sm:self-auto shadow-2xs disabled:opacity-50"
        >
          <ArrowsClockwise size={14} className={isFetching ? 'animate-spin' : ''} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Rango de fechas personalizado si aplica */}
      {period === 'custom' && (
        <div className="p-3 bg-white rounded-xl border border-gray-200 flex flex-wrap items-center gap-3 text-xs animate-fade-in">
          <span className="font-semibold text-gray-700">Rango personalizado:</span>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Desde</span>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-gray-200 text-xs bg-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Hasta</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-gray-200 text-xs bg-white"
            />
          </div>
        </div>
      )}

      {/* Banner de Resultado Parcial cuando faltan costos (Ticket 183d) */}
      {hasMissingCost && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-3 text-amber-900 animate-fade-in shadow-2xs">
          <WarningCircle size={20} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1.5">
            <p className="font-bold text-amber-950 leading-relaxed">
              {statement?.uncoveredRevenue !== undefined && statement?.uncoveredRevenue !== null ? (
                <>
                  Hay {formatCurrency(statement.uncoveredRevenue, currency)} en ventas de productos sin costo registrado ({statement.coverage?.coveragePercent || 0}% de cobertura). Esas ventas se muestran sin costo, así que la utilidad real puede ser MENOR a la que ves aquí. Carga el costo de esos productos para ver la cifra exacta.
                </>
              ) : (
                <>
                  Hay ventas de productos sin costo registrado ({statement?.coverage?.coveragePercent || 0}% de cobertura). Esas ventas se muestran sin costo, así que la utilidad real puede ser MENOR a la que ves aquí. Carga el costo de esos productos para ver la cifra exacta.
                </>
              )}
            </p>
            <p className="text-[11px] text-amber-800/90">
              La pestaña Ganancias calcula la utilidad solo sobre las ventas con costo, por eso puede mostrar otra cifra.
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20 bg-white rounded-2xl border border-gray-200/80">
          <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !statement ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-200/80 space-y-2">
          <ChartBar size={32} className="text-gray-300 mx-auto" />
          <p className="text-sm font-semibold text-gray-700">Sin datos para el período</p>
        </div>
      ) : (
        <>
          {/* Tarjetas KPI de Resumen Superior */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Ventas Netas */}
            <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">Ventas Netas</span>
                {renderComparisonBadge(statement.comparison?.netSalesChange)}
              </div>
              <div className="text-lg sm:text-xl font-bold text-gray-900 font-mono">
                {formatCurrency(statement.netSales, currency)}
              </div>
              <p className="text-[10px] text-gray-400">Ventas brutas menos descuentos y devoluciones</p>
            </div>

            {/* Utilidad Bruta */}
            <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">
                  {hasMissingCost ? 'Utilidad bruta (estimada)' : 'Utilidad Bruta'}
                </span>
                {renderComparisonBadge(statement.comparison?.grossProfitChange)}
              </div>
              <div className="text-lg sm:text-xl font-bold text-emerald-700 font-mono">
                {formatCurrency(statement.grossProfit, currency)}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
                <span>Margen Bruto:</span>
                <span className="text-emerald-700 font-bold">{statement.grossMarginPercent}%</span>
              </div>
            </div>

            {/* Gastos Operativos */}
            <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">Gastos Operativos</span>
                <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
                  <Receipt size={14} weight="duotone" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-bold text-rose-700 font-mono">
                {formatCurrency(statement.operatingExpenses?.total || 0, currency)}
              </div>
              <p className="text-[10px] text-gray-400">Alquiler, servicios, planilla, etc.</p>
            </div>

            {/* Utilidad Neta / del Periodo (Ticket 189c) */}
            <div
              className={`p-4 rounded-2xl border shadow-2xs space-y-1.5 ${
                netProfit >= 0
                  ? 'bg-emerald-50/40 border-emerald-200'
                  : 'bg-rose-50/40 border-rose-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold ${
                    netProfit >= 0 ? 'text-emerald-950' : 'text-rose-950'
                  }`}
                >
                  {hasMissingCost ? 'Utilidad del periodo (estimada)' : 'Utilidad Neta'}
                </span>
                {renderComparisonBadge(statement.comparison?.netProfitChange ?? statement.comparison?.operatingProfitChange)}
              </div>
              <div
                className={`text-lg sm:text-xl font-bold font-mono ${
                  netProfit >= 0 ? 'text-emerald-800' : 'text-rose-800'
                }`}
              >
                {formatCurrency(netProfit, currency)}
              </div>
              <div className="flex items-center justify-between text-[11px] font-semibold">
                <div className="flex items-center gap-1">
                  <span className="text-gray-600">Margen Op.:</span>
                  <span
                    className={`font-bold ${
                      statement.operatingProfit >= 0 ? 'text-emerald-800' : 'text-rose-800'
                    }`}
                  >
                    {statement.operatingMarginPercent}%
                  </span>
                </div>
                {interestIncome > 0 && (
                  <span className="text-[10px] text-purple-700 font-bold truncate">
                    +{formatCurrency(interestIncome, currency)} int.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Cascada Financiera (Estructura de Resultados Simplificada) */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-gray-900">Estado de Resultados Gerencial</h3>
                <p className="text-xs text-gray-400">
                  Período: {formatManaguaDate(statement.period?.from)} al{' '}
                  {formatManaguaDate(statement.period?.to)}
                </p>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Sección 1: Ingresos de Venta */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <Package size={14} weight="bold" />
                  <span>1. Ingresos por Ventas</span>
                </div>
                <div className="bg-gray-50/70 rounded-xl p-3.5 space-y-2 text-xs border border-gray-100">
                  <div className="flex justify-between items-center text-gray-700">
                    <span>Ventas Brutas</span>
                    <span className="font-mono font-medium">
                      +{formatCurrency(statement.grossSales, currency)}
                    </span>
                  </div>
                  {statement.discounts > 0 && (
                    <div className="flex justify-between items-center text-gray-500">
                      <span className="pl-3">— Descuentos aplicados</span>
                      <span className="font-mono text-rose-600">
                        -{formatCurrency(statement.discounts, currency)}
                      </span>
                    </div>
                  )}
                  {statement.returns > 0 && (
                    <div className="flex justify-between items-center text-gray-500">
                      <span className="pl-3">— Devoluciones / Reembolsos</span>
                      <span className="font-mono text-rose-600">
                        -{formatCurrency(statement.returns, currency)}
                      </span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-gray-200/60 flex justify-between items-center font-bold text-gray-900 text-sm">
                    <span>= Ventas Netas</span>
                    <span className="font-mono text-gray-900">
                      {formatCurrency(statement.netSales, currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sección 2: Costo de Ventas */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <Coins size={14} weight="bold" />
                  <span>2. Costo de Mercadería Vendida</span>
                </div>
                <div className="bg-gray-50/70 rounded-xl p-3.5 space-y-2 text-xs border border-gray-100">
                  <div className="flex justify-between items-center text-gray-700">
                    <div>
                      <span>Costo de adquisición de productos vendidos (COGS)</span>
                      {statement.coverage && (
                        <div className="text-[10px] text-gray-400">
                          Cobertura: {statement.coverage.coveragePercent}%
                        </div>
                      )}
                    </div>
                    <span className="font-mono font-medium text-rose-700">
                      -{formatCurrency(statement.costOfGoodsSold, currency)}
                    </span>
                  </div>
                  {/* Línea secundaria cuando hay ventas sin costo */}
                  {hasMissingCost && (
                    <div className="flex justify-between items-center text-amber-800 text-xs pt-1.5 border-t border-gray-200/40 font-medium">
                      <span>Ventas sin costo registrado:</span>
                      <span className="font-mono font-bold">
                        {statement.uncoveredRevenue !== undefined && statement.uncoveredRevenue !== null
                          ? formatCurrency(statement.uncoveredRevenue, currency)
                          : 'Cifra no disponible'}
                      </span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-200/60 flex justify-between items-center font-bold text-emerald-800 text-sm">
                    <span>
                      = {hasMissingCost ? 'Utilidad bruta (estimada)' : 'Utilidad Bruta (Ganancia sobre ventas)'}
                    </span>
                    <div className="text-right">
                      <span className="font-mono block">
                        {formatCurrency(statement.grossProfit, currency)}
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-700">
                        Margen: {statement.grossMarginPercent}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección 3: Gastos Operativos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Receipt size={14} weight="bold" />
                    <span>3. Gastos Operativos</span>
                  </div>
                  <span className="text-rose-700 font-mono">
                    -{formatCurrency(statement.operatingExpenses?.total || 0, currency)}
                  </span>
                </div>

                <div className="bg-gray-50/70 rounded-xl p-3.5 space-y-3 text-xs border border-gray-100">
                  {(!statement.operatingExpenses?.byCategory ||
                    statement.operatingExpenses.byCategory.length === 0) ? (
                    <p className="text-gray-400 italic text-center py-2">
                      No hay gastos operativos registrados en este período.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {statement.operatingExpenses.byCategory.map((cat) => (
                        <div key={cat.categoryId || cat.category} className="space-y-1">
                          <div className="flex justify-between items-center text-gray-800">
                            <span className="font-medium">{cat.category}</span>
                            <div className="font-mono font-semibold">
                              {formatCurrency(cat.amount, currency)}{' '}
                              <span className="text-[10px] text-gray-400 font-normal">
                                ({cat.percent}%)
                              </span>
                            </div>
                          </div>
                          {/* Barra de progreso de participación de gasto */}
                          <div className="w-full bg-gray-200/80 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-rose-500 h-full rounded-full transition-all"
                              style={{ width: `${Math.min(100, cat.percent)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-200/60 flex justify-between items-center font-bold text-rose-800 text-sm">
                    <span>Total Gastos Operativos</span>
                    <span className="font-mono">
                      -{formatCurrency(statement.operatingExpenses?.total || 0, currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sección 4: Utilidad Operativa */}
              <div className="space-y-2">
                <div className="bg-gray-50/80 rounded-xl p-3.5 flex justify-between items-center text-xs border border-gray-200/70 font-bold">
                  <span className="text-gray-800">
                    = {hasMissingCost ? 'Utilidad operativa (estimada)' : 'Utilidad Operativa'}
                  </span>
                  <div className="text-right">
                    <span className={`font-mono text-sm ${statement.operatingProfit >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                      {formatCurrency(statement.operatingProfit, currency)}
                    </span>
                    <span className="text-[10px] text-gray-400 block font-normal">
                      Margen operativo: {statement.operatingMarginPercent}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Sección 5: Ingresos por Intereses (Ticket 189c) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Percent size={14} weight="bold" />
                    <span>4. Ingresos por Intereses</span>
                  </div>
                  <span className="text-purple-700 font-mono font-bold">
                    +{formatCurrency(interestIncome, currency)}
                  </span>
                </div>

                <div className="bg-gray-50/70 rounded-xl p-3.5 space-y-1 text-xs border border-gray-100">
                  <div className="flex justify-between items-center text-gray-700">
                    <div>
                      <span className="font-semibold text-gray-900">Ingresos por intereses</span>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Intereses cobrados en el periodo
                      </p>
                    </div>
                    <span className="font-mono font-bold text-purple-700 text-sm">
                      +{formatCurrency(interestIncome, currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sección 6: Utilidad Neta del Período */}
              <div
                className={`rounded-2xl p-5 border shadow-xs transition-colors ${
                  netProfit >= 0
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : 'bg-rose-50/50 border-rose-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-base font-bold ${
                          netProfit >= 0 ? 'text-emerald-950' : 'text-rose-950'
                        }`}
                      >
                        = {hasMissingCost ? 'Utilidad neta del periodo (estimada)' : 'Utilidad Neta del Período'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Utilidad Operativa más Ingresos por Intereses cobrados
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <div
                      className={`text-2xl font-bold font-mono ${
                        netProfit >= 0 ? 'text-emerald-800' : 'text-rose-800'
                      }`}
                    >
                      {formatCurrency(netProfit, currency)}
                    </div>
                    {interestIncome > 0 && (
                      <div className="text-[11px] font-semibold text-purple-700 mt-0.5">
                        Incluye {formatCurrency(interestIncome, currency)} de intereses cobrados
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer explicativo */}
            <div className="px-6 py-3 bg-gray-50/60 border-t border-gray-100 text-[11px] text-gray-400">
              💡 Reporte gerencial para control operativo del dueño. Representa las ventas netas menos el costo de compra y los gastos operativos devengados.
            </div>
          </div>
        </>
      )}
    </div>
  );
};
