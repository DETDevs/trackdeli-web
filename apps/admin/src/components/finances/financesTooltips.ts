/**
 * Textos explicativos (Tooltips) para el Estado de Resultados Gerencial
 * Ticket 192b: Finanzas → Estado de resultados: tooltips, comparativas claras y acentos
 */

export const INCOME_STATEMENT_TOOLTIPS = {
  // Selector de período
  periodSelector:
    'Filtra las operaciones comerciales, compras y gastos dentro del período seleccionado.',

  // Tarjetas KPI superiores
  netSalesKpi:
    'Ventas brutas menos descuentos otorgados y devoluciones realizadas en el período.',
  grossProfitKpi:
    'Ventas netas menos el costo de la mercadería vendida (COGS). Refleja la ganancia directa generada por las ventas antes de gastos operativos.',
  operatingExpensesKpi:
    'Total de egresos operativos (alquiler, nómina, servicios básicos, etc.) no relacionados directamente con la compra de productos.',
  netProfitKpi:
    'Resultado final del negocio en el período: Utilidad Operativa sumando los ingresos por intereses cobrados.',

  // 1. Ingresos Operacionales / Ventas
  salesSection:
    'Ingresos totales generados por la actividad comercial del negocio en el período.',
  grossSales:
    'Suma total de todas las ventas antes de aplicar descuentos o devoluciones.',
  discounts:
    'Monto total de rebajas y promociones aplicadas a las ventas en este período.',
  returns:
    'Monto total devuelto a clientes por cancelaciones o devoluciones de productos.',
  netSales:
    'Ingreso real por ventas: Ventas Brutas menos descuentos y devoluciones.',

  // 2. Costo de Mercancía Vendida (COGS)
  cogsSection:
    'Costo directo de adquisición o producción de los productos y recetas efectivamente vendidos en el período.',
  costOfGoodsSold:
    'Suma del costo unitario registrado de cada producto o receta vendido en el período.',
  uncoveredRevenue:
    'Ventas de productos que aún no tienen costo cargado en el sistema; la utilidad real podría ser menor a la estimada.',
  grossProfit:
    'Ganancia bruta de las ventas: Ventas Netas menos Costo de Mercancía Vendida.',
  grossMargin:
    'Porcentaje de las ventas netas que queda como utilidad bruta ((Utilidad Bruta / Ventas Netas) × 100).',
  grossProfitComparison:
    'Variación porcentual de la Utilidad Bruta respecto al período anterior equivalente.',

  // 3. Gastos Operativos (Opex)
  expensesSection:
    'Egresos necesarios para mantener el negocio en marcha, excluyendo el costo de mercadería.',
  totalOperatingExpenses:
    'Suma de todos los gastos operativos registrados en el período.',

  // 4. Utilidad Operativa
  operatingProfit:
    'Utilidad Bruta menos Total Gastos Operativos. Mide el desempeño del negocio estrictamente por su operación comercial.',
  operatingMargin:
    'Porcentaje de las ventas netas que representa la Utilidad Operativa ((Utilidad Operativa / Ventas Netas) × 100).',

  // 5. Ingresos por Intereses
  interestIncomeSection:
    'Ingresos adicionales cobrados en concepto de intereses en ventas al crédito o cuotas en este período.',
  interestIncome:
    'Total de intereses cobrados a clientes durante el período.',

  // 6. Utilidad Neta del Período
  netProfitSection:
    'Resultado gerencial final del período: Utilidad Operativa más Ingresos por Intereses cobrados.',
  netProfit:
    'Ganancia neta final disponible tras deducir costos de compra, gastos operativos e incorporar intereses cobrados.',

  // Comparativas
  salesComparison:
    'Variación porcentual de las ventas netas respecto al período anterior equivalente.',
} as const;
