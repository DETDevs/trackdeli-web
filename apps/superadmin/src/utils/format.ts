import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseDateClean } from './membershipDates';

export function formatDateTime(dateString: string | Date | null | undefined): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    return format(d, 'd MMM yyyy, h:mm a', { locale: es });
  } catch {
    return String(dateString);
  }
}

export function formatDateShort(dateString: string | Date | null | undefined): string {
  if (!dateString) return '—';
  try {
    const d = parseDateClean(dateString);
    if (!d) return String(dateString);
    return format(d, 'd MMM yyyy', { locale: es });
  } catch {
    return String(dateString);
  }
}

export function formatTimeOnly(dateString: string | Date | null | undefined): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    return format(d, 'h:mm a', { locale: es });
  } catch {
    return String(dateString);
  }
}

export function formatRelativeTime(dateString: string | Date | null | undefined): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    const text = formatDistanceToNow(d, { addSuffix: true, locale: es });
    return text.replace('alrededor de ', '').replace('casi ', '');
  } catch {
    return String(dateString);
  }
}

export function getGroupDateHeader(dateString: string | Date): string {
  try {
    const d = new Date(dateString);
    if (isToday(d)) return 'HOY';
    if (isYesterday(d)) return 'AYER';
    return format(d, 'd MMMM yyyy', { locale: es }).toUpperCase();
  } catch {
    return 'ANTERIORES';
  }
}

/**
 * 244b: Formatea un monto con su símbolo de moneda (USD → US$, NIO → C$).
 */
export function formatCurrency(amount: number | null | undefined, currency: string = 'USD'): string {
  const value = Number(amount ?? 0);
  const symbol = currency.toUpperCase() === 'NIO' ? 'C$' : 'US$';
  const formatted = value.toLocaleString('es-NI', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formatted}`;
}
