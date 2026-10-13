import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Parsea una fecha de forma segura evitando desplazamientos por zona horaria.
 * Si es un string YYYY-MM-DD o ISO con medianoche, lo fija a las 12:00:00 del día
 * para que ninguna zona horaria (como America/Managua UTC-6) lo traslade al día anterior.
 */
export function parseDateClean(dateInput: string | Date | null | undefined): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return null;
    return dateInput;
  }
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (!trimmed) return null;

    // Formato exacto YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-').map(Number);
      return new Date(y, m - 1, d, 12, 0, 0);
    }

    // Formato ISO que empieza con YYYY-MM-DD
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const y = parseInt(isoMatch[1], 10);
      const m = parseInt(isoMatch[2], 10);
      const d = parseInt(isoMatch[3], 10);

      // Si tiene medianoche UTC (ej. 2026-11-10T00:00:00.000Z), en UTC-6 caería en el día 9 si usamos new Date() directo.
      if (trimmed.includes('T00:00:00') || trimmed.endsWith('Z')) {
        return new Date(y, m - 1, d, 12, 0, 0);
      }
    }

    const parsed = new Date(trimmed);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

/**
 * Formatea una fecha en español (ej. "10 nov 2026").
 */
export function formatDateClean(dateInput: string | Date | null | undefined): string {
  const d = parseDateClean(dateInput);
  if (!d) return '—';
  try {
    return format(d, 'd MMM yyyy', { locale: es });
  } catch {
    return String(dateInput);
  }
}

/**
 * Retorna los días de un mes dado (1 a 12).
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Retorna el siguiente mes y año calendario.
 */
export function getNextMonth(year: number, month: number): { year: number; month: number } {
  if (month === 12) return { year: year + 1, month: 1 };
  return { year, month: month + 1 };
}

/**
 * Calcula la fecha de vencimiento (due_date) según el día ancla en el mes siguiente.
 */
export function calculateDueDateFromAnchor(startDate: Date, anchorDay: number): Date {
  const year = startDate.getFullYear();
  const month = startDate.getMonth() + 1; // 1-12
  const next = getNextMonth(year, month);
  const maxDays = getDaysInMonth(next.year, next.month);
  const dueDay = Math.min(anchorDay, maxDays);
  return new Date(next.year, next.month - 1, dueDay, 12, 0, 0);
}

/**
 * Calcula la fecha límite de gracia sumando 3 días a la fecha de vencimiento (ej. 10 nov -> 13 nov 2026).
 */
export function getGraceDateStr(dueDateInput: string | Date | null | undefined): string {
  const d = parseDateClean(dueDateInput);
  if (!d) return '';
  const graceDate = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 3, 12, 0, 0);
  return formatDateClean(graceDate);
}

export type MembershipUIStatus = 'VIGENTE' | 'POR_VENCER' | 'EN_GRACIA' | 'VENCIDO' | 'SIN_MEMBRESIA';

export interface MembershipPeriodResult {
  startFormatted: string;
  dueFormatted: string;
  periodStr: string;
}

/**
 * Obtiene el período formateado y la fecha de vencimiento para una membresía,
 * asegurando que nunca muestre '9 nov' cuando el ancla de cobro es el día 10.
 */
export function getMembershipPeriodDates(
  membership: {
    current_period_start?: string | null;
    due_date?: string | null;
    startDate: string;
    endDate: string;
    billing_anchor_day?: number | null;
  },
  fallbackAnchorDay?: number | null
): MembershipPeriodResult {
  const startRaw = membership.current_period_start || membership.startDate;
  const startDate = parseDateClean(startRaw);

  const anchorDay =
    membership.billing_anchor_day ??
    fallbackAnchorDay ??
    (startDate ? startDate.getDate() : 1);

  let dueDate: Date | null = null;
  if (membership.due_date) {
    dueDate = parseDateClean(membership.due_date);
  }

  // Si no hay due_date explícito o la fecha termina en 9 siendo el ancla 10 (antiguo bug de 30 días),
  // recalculamos a partir del día ancla del mes siguiente.
  if (!dueDate && startDate) {
    dueDate = calculateDueDateFromAnchor(startDate, anchorDay);
  } else if (dueDate && startDate && anchorDay) {
    // Si por desfase de zona horaria o cálculo de 30 días quedó en el día anterior al ancla
    if (dueDate.getDate() === anchorDay - 1) {
      dueDate = calculateDueDateFromAnchor(startDate, anchorDay);
    }
  }

  const startFormatted = formatDateClean(startRaw);
  const dueFormatted = dueDate ? formatDateClean(dueDate) : formatDateClean(membership.due_date || membership.endDate);

  return {
    startFormatted,
    dueFormatted,
    periodStr: `${startFormatted} → ${dueFormatted}`,
  };
}

export interface BusinessBillingResolved {
  status: MembershipUIStatus;
  label: string;
  variant: 'success' | 'warning' | 'orange' | 'danger' | 'neutral';
  daysUntilDue: number;
  daysRemainingText: string;
  dueDateFormatted: string;
  periodStartFormatted: string;
  periodStr: string;
  graceDateFormatted: string;
  graceText: string;
  anchorDay: number;
  planAmount: number;
  priceFormatted: string;
  isGraceOrExpired: boolean;
  hasMembership: boolean;
  statusBadge: {
    text: string;
    variant: 'success' | 'warning' | 'orange' | 'danger' | 'neutral';
    dotClass: string;
  };
}

/**
 * Resuelve el estado de facturación y membresía de un negocio integrando los campos de 175a.
 */
export function resolveBusinessBillingInfo(
  business: any,
  latestMembership: any,
  productsData: any
): BusinessBillingResolved {
  const hasMembership = Boolean(latestMembership || business?.membership?.status || business?.membership_status);

  // Ancla de facturación
  const anchorDay =
    business?.billing_anchor_day ??
    business?.membership?.billing_anchor_day ??
    latestMembership?.billing_anchor_day ??
    (latestMembership?.startDate ? parseDateClean(latestMembership.startDate)?.getDate() : null) ??
    10;

  // Fechas del período actual
  const periodStartRaw =
    business?.current_period_start ??
    business?.membership?.current_period_start ??
    latestMembership?.current_period_start ??
    latestMembership?.startDate ??
    null;

  const dueDateRaw =
    business?.due_date ??
    business?.membership?.due_date ??
    latestMembership?.due_date ??
    latestMembership?.endDate ??
    null;

  let periodInfo: MembershipPeriodResult;
  if (latestMembership || periodStartRaw || dueDateRaw) {
    periodInfo = getMembershipPeriodDates(
      {
        current_period_start: periodStartRaw,
        due_date: dueDateRaw,
        startDate: periodStartRaw || latestMembership?.startDate || '',
        endDate: dueDateRaw || latestMembership?.endDate || '',
        billing_anchor_day: anchorDay,
      },
      anchorDay
    );
  } else {
    periodInfo = {
      startFormatted: '—',
      dueFormatted: '—',
      periodStr: 'Sin período',
    };
  }

  // Días hasta el vencimiento
  let daysUntilDue =
    business?.days_until_due ??
    business?.membership?.days_until_due ??
    latestMembership?.days_until_due ??
    business?.membership?.daysLeft ??
    latestMembership?.daysLeft ??
    null;

  if (daysUntilDue === null && dueDateRaw) {
    const dueD = parseDateClean(periodInfo.dueFormatted ? dueDateRaw : null);
    if (dueD) {
      const today = new Date();
      const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0);
      daysUntilDue = Math.round((dueD.getTime() - todayMid.getTime()) / (1000 * 60 * 60 * 24));
    }
  }

  // Estado derivado
  const rawStatus = (
    business?.membership_status ||
    business?.membership?.status ||
    latestMembership?.membership_status ||
    latestMembership?.status ||
    ''
  ).toUpperCase();

  let status: MembershipUIStatus = 'VIGENTE';
  let label = 'Vigente';
  let variant: 'success' | 'warning' | 'orange' | 'danger' | 'neutral' = 'success';

  if (!hasMembership || rawStatus === 'NOT_CONTRACTED' || rawStatus === 'NONE') {
    status = 'SIN_MEMBRESIA';
    label = 'Sin membresía registrada';
    variant = 'neutral';
  } else if (rawStatus === 'EN_GRACIA' || (daysUntilDue !== null && daysUntilDue < 0 && daysUntilDue >= -3)) {
    status = 'EN_GRACIA';
    label = 'En gracia';
    variant = 'orange';
  } else if (rawStatus === 'VENCIDO' || rawStatus === 'EXPIRED' || (daysUntilDue !== null && daysUntilDue < -3)) {
    status = 'VENCIDO';
    label = 'Vencido';
    variant = 'danger';
  } else if (rawStatus === 'POR_VENCER' || (daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 5)) {
    status = 'POR_VENCER';
    label = 'Por vencer';
    variant = 'warning';
  } else {
    status = 'VIGENTE';
    label = 'Vigente';
    variant = 'success';
  }

  // Cálculo del monto del plan mensual (ej. 45.00)
  let planAmount = 0;
  if (latestMembership?.amount && Number(latestMembership.amount) > 0) {
    planAmount = Number(latestMembership.amount);
  } else if (productsData?.products) {
    const posFee = Number(productsData.products.POS?.posMonthlyFee || 0);
    const delFee = Number(productsData.products.DELIVERY?.deliveryMonthlyFee || 0);
    const carteraFee = Number(productsData.products.CARTERA_COBRO?.carteraMonthlyFee || 0);
    const citasFee = Number(productsData.products.CITAS?.citasMonthlyFee || 0);
    planAmount = posFee + delFee + carteraFee + citasFee;
    if (planAmount === 0 && posFee > 0) planAmount = posFee;
  }
  if (planAmount === 0 && business?.posMonthlyFee) {
    planAmount = Number(business.posMonthlyFee);
  }
  if (planAmount === 0) {
    planAmount = 45.0; // Tarifa sugerida base del plan POS
  }

  const graceDateFormatted = getGraceDateStr(dueDateRaw || periodInfo.dueFormatted);
  const graceText = graceDateFormatted ? `Gracia hasta el ${graceDateFormatted}` : '3 días de gracia';

  const isGraceOrExpired = status === 'EN_GRACIA' || status === 'VENCIDO';

  let daysRemainingText = '';
  if (daysUntilDue !== null) {
    if (daysUntilDue > 1) {
      daysRemainingText = `faltan ${daysUntilDue} días`;
    } else if (daysUntilDue === 1) {
      daysRemainingText = 'falta 1 día';
    } else if (daysUntilDue === 0) {
      daysRemainingText = 'vence hoy';
    } else if (daysUntilDue < 0 && daysUntilDue >= -3) {
      daysRemainingText = `vencido hace ${Math.abs(daysUntilDue)} día(s)`;
    } else {
      daysRemainingText = 'vencido';
    }
  }

  const dotClasses: Record<string, string> = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    orange: 'bg-orange-500',
    danger: 'bg-red-500',
    neutral: 'bg-gray-400',
  };

  const statusBadge = {
    text: label,
    variant,
    dotClass: dotClasses[variant] || 'bg-gray-400',
  };

  return {
    status,
    label,
    variant,
    daysUntilDue: daysUntilDue ?? 0,
    daysRemainingText,
    dueDateFormatted: periodInfo.dueFormatted,
    periodStartFormatted: periodInfo.startFormatted,
    periodStr: periodInfo.periodStr,
    graceDateFormatted,
    graceText,
    anchorDay,
    planAmount,
    priceFormatted: planAmount > 0 ? `$${planAmount.toFixed(2)}` : '—',
    isGraceOrExpired,
    hasMembership,
    statusBadge,
  };
}

/**
 * Formatea una fecha de vencimiento y días restantes de forma humana.
 * Ej: "Vence 10 nov · en 29 días", "Vence hoy · 10 nov", "Venció hace 2 días · 10 oct".
 */
export function formatDueText(
  dueDate: string | null | undefined,
  daysUntilDue: number | null | undefined,
): string {
  if (!dueDate) return 'Sin fecha de vencimiento';
  const d = parseDateClean(dueDate);
  if (!d) return 'Sin fecha de vencimiento';
  const shortDate = format(d, 'd MMM', { locale: es });

  if (daysUntilDue === undefined || daysUntilDue === null) {
    return `Vence ${shortDate}`;
  }

  if (daysUntilDue < 0) {
    const absDays = Math.abs(daysUntilDue);
    return `Venció hace ${absDays} ${absDays === 1 ? 'día' : 'días'} · ${shortDate}`;
  }
  if (daysUntilDue === 0) {
    return `Vence hoy · ${shortDate}`;
  }
  if (daysUntilDue === 1) {
    return `Vence mañana · ${shortDate}`;
  }
  return `Vence ${shortDate} · en ${daysUntilDue} días`;
}

/**
 * Retorna la variante de Badge y etiqueta en español según el estado de membresía.
 * Colores:
 * VIGENTE: verde (success)
 * POR_VENCER: ámbar (warning)
 * EN_GRACIA: naranja (orange)
 * VENCIDO: rojo (danger)
 * PRUEBA: púrpura (purple)
 * INACTIVO: gris (neutral)
 */
export function getMembershipPillInfo(
  status?: string | null,
  isTrial?: boolean,
  isActive: boolean = true,
): { variant: 'success' | 'warning' | 'orange' | 'danger' | 'purple' | 'neutral'; label: string } {
  if (!isActive) {
    return { variant: 'neutral', label: 'Inactivo' };
  }
  if (isTrial) {
    return { variant: 'purple', label: 'En prueba' };
  }

  const s = (status || '').toUpperCase().trim();
  switch (s) {
    case 'VIGENTE':
      return { variant: 'success', label: 'Vigente' };
    case 'POR_VENCER':
      return { variant: 'warning', label: 'Por vencer' };
    case 'EN_GRACIA':
      return { variant: 'orange', label: 'En gracia' };
    case 'VENCIDO':
      return { variant: 'danger', label: 'Vencido' };
    case 'NOT_CONTRACTED':
      return { variant: 'neutral', label: 'Sin contrato' };
    default:
      return { variant: 'neutral', label: status || 'Sin membresía' };
  }
}

