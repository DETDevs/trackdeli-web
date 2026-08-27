import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';

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
    const d = new Date(dateString);
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
    return formatDistanceToNow(d, { addSuffix: true, locale: es });
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
