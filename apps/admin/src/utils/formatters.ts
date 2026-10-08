/**
 * Utilidades de formateo para el Backoffice POS y administración general
 */

export const formatCurrency = (
  amount: number | null | undefined,
  currency: string = 'NIO'
): string => {
  const num = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  const curr = (currency || 'NIO').toUpperCase();
  const symbol = curr === 'USD' || curr === '$' ? '$' : 'C$';
  
  const formatted = num.toLocaleString('es-NI', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${symbol} ${formatted}`;
};

export const formatQuantity = (
  quantity: number | null | undefined,
  unit: string = 'UND'
): string => {
  const num = typeof quantity === 'number' && !isNaN(quantity) ? quantity : 0;
  const cleanUnit = (unit || 'UND').trim().toUpperCase();

  // Si es entero exacto, no mostrar decimales innecesarios a menos que sea una unidad fraccionaria continua
  const hasDecimals = num % 1 !== 0;
  const formatted = hasDecimals
    ? num.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : num.toString();

  return `${formatted} ${cleanUnit}`;
};

export const formatPercentage = (val: number | null | undefined): string => {
  const num = typeof val === 'number' && !isNaN(val) ? val : 0;
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(1)}%`;
};
