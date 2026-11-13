import { formatCurrency } from './formatters';

/**
 * Convierte el texto de un input de costo al valor numérico esperado por el API.
 * '' -> null (sin costo) · '0' -> 0 · inválido/negativo -> 'invalid'.
 */
export function parseCostInput(value: string): number | null | 'invalid' {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const num = Number(trimmed.replace(',', '.'));
  if (!Number.isFinite(num) || num < 0) return 'invalid';
  return Math.round(num * 100) / 100;
}

/**
 * Calcula el precio de venta sugerido a partir de costo y % de margen sobre costo.
 */
export function computeSuggestedPrice(
  costValue: number | null,
  effectiveMarkupPct: number | null,
): number | null {
  if (costValue === null || costValue <= 0) return null;
  if (effectiveMarkupPct === null || !Number.isFinite(effectiveMarkupPct) || effectiveMarkupPct < 0) {
    return null;
  }
  return costValue * (1 + effectiveMarkupPct / 100);
}

export interface ProfitSummary {
  hasCost: boolean;
  isPositive: boolean;
  text: string;
}

/**
 * Resume la ganancia unitaria y margen porcentual real frente al costo (paridad con el desktop).
 */
export function computeProfitSummary(
  priceValue: number | null,
  costValue: number | null,
  unit: string = 'UND',
  currency: string = 'NIO',
): ProfitSummary | null {
  if (priceValue === null || !Number.isFinite(priceValue) || priceValue <= 0) {
    return null;
  }
  if (costValue === null || !Number.isFinite(costValue)) {
    return {
      hasCost: false,
      isPositive: true,
      text: 'Sin costo cargado (no se calcula margen)',
    };
  }
  if (costValue === 0) {
    return {
      hasCost: true,
      isPositive: true,
      text: `Ganancia: +${formatCurrency(priceValue, currency)} / ${unit} (costo C$ 0)`,
    };
  }
  const profit = priceValue - costValue;
  const marginOnCost = (profit / costValue) * 100;
  const sign = profit >= 0 ? '+' : '-';
  const pctStr = Number.isInteger(Math.round(marginOnCost * 10) / 10)
    ? `${Math.round(marginOnCost)}%`
    : `${marginOnCost.toFixed(1)}%`;

  return {
    hasCost: true,
    isPositive: profit >= 0,
    text: `Ganancia: ${sign}${formatCurrency(Math.abs(profit), currency)} / ${unit} (${pctStr})`,
  };
}

/**
 * Extrae el mensaje legible de errores NestJS/Axios (string, string[] o { code, message }).
 */
export function extractApiErrorMessage(err: any, fallback: string): string {
  const raw = err?.response?.data?.message;
  if (typeof raw === 'string' && raw.trim()) return raw;
  if (Array.isArray(raw) && raw.length > 0) return raw.filter(Boolean).join('. ');
  if (raw && typeof raw === 'object' && typeof raw.message === 'string' && raw.message.trim()) {
    return raw.message;
  }
  const topError = err?.response?.data?.error;
  if (typeof topError === 'string' && err?.message && !raw) {
    return err.message;
  }
  if (typeof err?.message === 'string' && err.message.trim()) {
    return err.message;
  }
  return fallback;
}

export function generateIdempotencyKey(prefix: string = 'req'): string {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

