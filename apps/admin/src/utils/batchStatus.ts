import type { PosBatchStatus } from 'api-client';
import { formatManaguaDate, getManaguaTodayYMD, getManaguaYMD } from './dateManagua';

export interface BatchStatusMeta {
  label: string;
  badgeClass: string;
  dotClass: string;
}

export function getBatchStatusMeta(
  status?: PosBatchStatus | string,
  expiryDate?: string | null,
): BatchStatusMeta {
  if (!expiryDate) {
    return {
      label: 'Sin fecha',
      badgeClass: 'bg-amber-50 text-amber-800 border border-amber-200',
      dotClass: 'bg-amber-600',
    };
  }
  switch (status) {
    case 'VENCIDO':
      return {
        label: 'Vencido',
        badgeClass: 'bg-red-100 text-red-800 border border-red-200',
        dotClass: 'bg-red-600',
      };
    case 'CRITICO':
      return {
        label: 'Crítico',
        badgeClass: 'bg-amber-100 text-amber-800 border border-amber-200',
        dotClass: 'bg-amber-600',
      };
    case 'PROXIMO':
      return {
        label: 'Próximo',
        badgeClass: 'bg-yellow-100 text-yellow-900 border border-yellow-300',
        dotClass: 'bg-yellow-600',
      };
    default:
      return {
        label: 'Normal',
        badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
        dotClass: 'bg-emerald-600',
      };
  }
}

export interface ExpiryRelativeInfo {
  text: string;
  badgeClass: string;
  tone: 'expired' | 'critical' | 'warning' | 'ok';
}

export function getExpiryRelativeInfo(
  nextExpiryDate: string,
  todayYmd: string = getManaguaTodayYMD(),
): ExpiryRelativeInfo {
  const ymd = getManaguaYMD(nextExpiryDate) || nextExpiryDate.slice(0, 10);
  const expMs = new Date(`${ymd}T00:00:00Z`).getTime();
  const todayMs = new Date(`${todayYmd}T00:00:00Z`).getTime();
  const diffDays = Math.round((expMs - todayMs) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const abs = Math.abs(diffDays);
    return {
      text: abs === 1 ? 'Venció ayer' : `Vencido (${abs}d)`,
      badgeClass: 'bg-red-100 text-red-800 border-red-200',
      tone: 'expired',
    };
  }
  if (diffDays === 0) {
    return {
      text: 'Vence hoy',
      badgeClass: 'bg-red-100 text-red-800 border-red-200',
      tone: 'expired',
    };
  }
  if (diffDays <= 30) {
    return {
      text: `Vence en ${diffDays}d`,
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-200',
      tone: 'critical',
    };
  }
  if (diffDays <= 60) {
    return {
      text: `Vence en ${diffDays}d`,
      badgeClass: 'bg-yellow-100 text-yellow-900 border-yellow-300',
      tone: 'warning',
    };
  }
  return {
    text: `Vence ${formatManaguaDate(ymd)}`,
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    tone: 'ok',
  };
}

