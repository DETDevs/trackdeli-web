export type BatchStatusKey = 'SIN_FECHA' | 'VENCIDO' | 'CRITICO' | 'PROXIMO' | 'NORMAL';

export function getManaguaTodayYmd(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Managua' }).format(new Date());
}

/**
 * Extrae YYYY-MM-DD de fechas calendario (@db.Date serializadas en UTC) sin desfase por zona horaria.
 */
export function extractDateYmd(isoStr: string | null | undefined): string | null {
  if (!isoStr) return null;
  const trimmed = String(isoStr).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * Formatea una fecha calendario (expiryDate) como DD/MM/YYYY sin perder un día en UTC-6.
 */
export function formatCalendarDate(isoStr: string | null | undefined): string {
  const ymd = extractDateYmd(isoStr);
  if (!ymd) return 'Sin fecha';
  const [y, m, d] = ymd.split('-');
  if (!y || !m || !d) return String(isoStr);
  return `${d}/${m}/${y}`;
}

export function getDaysToExpiry(expiryDate: string | null | undefined): number | null {
  const expiryYmd = extractDateYmd(expiryDate);
  if (!expiryYmd) return null;
  const [ey, em, ed] = expiryYmd.split('-').map(Number);
  const [ty, tm, td] = getManaguaTodayYmd().split('-').map(Number);
  if ([ey, em, ed, ty, tm, td].some((n) => isNaN(n))) return null;
  const diffMs = Date.UTC(ey, em - 1, ed) - Date.UTC(ty, tm - 1, td);
  return Math.round(diffMs / 86400000);
}

export function isBatchExpiredDate(expiryDate: string | null | undefined): boolean {
  const days = getDaysToExpiry(expiryDate);
  return days !== null && days < 0;
}

export function getBatchStatusInfo(expiryDate: string | null | undefined): {
  status: BatchStatusKey;
  daysToExpiry: number | null;
  isExpired: boolean;
} {
  const daysToExpiry = getDaysToExpiry(expiryDate);
  if (daysToExpiry === null) {
    return { status: 'SIN_FECHA', daysToExpiry: null, isExpired: false };
  }
  if (daysToExpiry < 0) {
    return { status: 'VENCIDO', daysToExpiry, isExpired: true };
  }
  if (daysToExpiry <= 30) {
    return { status: 'CRITICO', daysToExpiry, isExpired: false };
  }
  if (daysToExpiry <= 60) {
    return { status: 'PROXIMO', daysToExpiry, isExpired: false };
  }
  return { status: 'NORMAL', daysToExpiry, isExpired: false };
}

export function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function round3(n: number): number {
  return Math.round((Number(n) || 0) * 1000) / 1000;
}
