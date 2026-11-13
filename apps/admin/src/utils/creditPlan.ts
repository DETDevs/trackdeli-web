/**
 * Utilidades para cálculo de vista previa de planes de pago a crédito
 * Replica exactamente la lógica del backend (sales.service.ts / creditPlan).
 */

export interface CreditPlanPreviewInput {
  total: number;
  downPayment: number;
  mode: 'SINGLE' | 'INSTALLMENTS';
  installmentsCount: number;
  frequency: 'SEMANAL' | 'QUINCENAL' | 'MENSUAL';
  firstDueDate: string;
  interestEnabled: boolean;
  interestType: 'FLAT' | 'MONTHLY';
  interestRate: number;
}

export interface CreditPlanPreviewResult {
  totalProducts: number;
  prima: number;
  fiado: number;
  interestRate: number;
  interestType: 'FLAT' | 'MONTHLY' | null;
  interestAmount: number;
  interestMonths?: number;
  totalAPagar: number;
  installmentsCount: number;
  frequency: 'SEMANAL' | 'QUINCENAL' | 'MENSUAL' | null;
  firstDueDate: string;
  finalDueDate: string;
  cuotas: Array<{
    installmentNumber: number;
    dueDate: string;
    amount: number;
  }>;
}

/**
 * Formatea una fecha de calendario (sin conversión de zona horaria).
 */
export function formatCalendarDate(
  dateInput: string | Date | null | undefined,
  format: 'numeric' | 'short' | 'medium' = 'numeric'
): string {
  if (!dateInput) return '';

  let year: number;
  let month: number;
  let day: number;

  if (typeof dateInput === 'string') {
    const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      year = parseInt(match[1], 10);
      month = parseInt(match[2], 10);
      day = parseInt(match[3], 10);
    } else {
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return '';
      year = d.getUTCFullYear();
      month = d.getUTCMonth() + 1;
      day = d.getUTCDate();
    }
  } else if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return '';
    year = dateInput.getUTCFullYear();
    month = dateInput.getUTCMonth() + 1;
    day = dateInput.getUTCDate();
  } else {
    return '';
  }

  const dayStr = String(day).padStart(2, '0');
  const monthStr = String(month).padStart(2, '0');
  const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  if (format === 'short') {
    return `${dayStr} ${monthNames[month - 1] || ''}`;
  }
  if (format === 'medium') {
    return `${dayStr} ${monthNames[month - 1] || ''} ${year}`;
  }

  return `${dayStr}/${monthStr}/${year}`;
}

export function calculateInstallmentDate(base: Date, idx: number, freq: string | null): Date {
  if (idx === 0) return new Date(base.getTime());
  const d = new Date(base.getTime());
  if (freq === 'SEMANAL') {
    d.setUTCDate(d.getUTCDate() + idx * 7);
    return d;
  }
  if (freq === 'QUINCENAL') {
    d.setUTCDate(d.getUTCDate() + idx * 15);
    return d;
  }
  // MENSUAL con ajuste de fin de mes usando UTC
  const year = base.getUTCFullYear();
  const month = base.getUTCMonth();
  const day = base.getUTCDate();
  const lastDayOfBase = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const isEndOfMonth = day === lastDayOfBase;

  const targetMonthFirst = new Date(Date.UTC(year, month + idx, 1));
  const targetLastDay = new Date(Date.UTC(targetMonthFirst.getUTCFullYear(), targetMonthFirst.getUTCMonth() + 1, 0)).getUTCDate();
  const targetDay = isEndOfMonth ? targetLastDay : Math.min(day, targetLastDay);

  return new Date(
    Date.UTC(
      targetMonthFirst.getUTCFullYear(),
      targetMonthFirst.getUTCMonth(),
      targetDay,
      0,
      0,
      0,
      0
    )
  );
}

/**
 * Fecha sugerida para la 1ª cuota: un período (según frecuencia) a partir de hoy.
 */
export function getDefaultFirstDueDate(freq: 'SEMANAL' | 'QUINCENAL' | 'MENSUAL' | string | null): string {
  const now = new Date();
  const base = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
  const d = calculateInstallmentDate(base, 1, freq || 'MENSUAL');
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getInterestDisplayLabel(
  rate: number,
  type: 'FLAT' | 'MONTHLY' | string | null | undefined,
  months?: number
): string {
  if (type === 'MONTHLY') {
    const m = months !== undefined && months !== null ? months : 1;
    const mLabel = m === 1 ? '1 mes' : `${Number(m.toFixed(1))} meses`;
    return `Interés (${rate}% × ${mLabel}):`;
  }
  return `Interés (${rate}% fijo):`;
}

export function computeCreditPlanPreview(input: CreditPlanPreviewInput): CreditPlanPreviewResult {
  const total = Math.round(Number(input.total || 0) * 100) / 100;
  const prima = Math.max(0, Math.min(Math.round(Number(input.downPayment || 0) * 100) / 100, Math.max(0, total - 0.01)));
  const fiado = Math.max(0, Math.round((total - prima) * 100) / 100);

  const isInstallments = input.mode === 'INSTALLMENTS';
  const numCuotas = isInstallments ? Math.max(2, Number(input.installmentsCount || 2)) : 1;
  const frequency = isInstallments ? input.frequency : null;
  const rate = input.interestEnabled ? Math.max(0, Number(input.interestRate || 0)) : 0;
  const interestType = rate > 0 ? (input.interestType || 'FLAT') : null;

  let baseDate: Date;
  if (typeof input.firstDueDate === 'string') {
    const m = input.firstDueDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      baseDate = new Date(Date.UTC(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10), 0, 0, 0, 0));
    } else {
      const d = new Date(input.firstDueDate);
      baseDate = isNaN(d.getTime()) ? new Date() : d;
    }
  } else {
    baseDate = new Date();
  }

  let calculatedInterest = 0;
  let interestMonths: number | undefined = undefined;
  if (rate > 0) {
    if (interestType === 'FLAT') {
      calculatedInterest = Math.round(fiado * (rate / 100) * 100) / 100;
    } else if (interestType === 'MONTHLY') {
      let meses = 1;
      if (!isInstallments) {
        const diffMs = baseDate.getTime() - Date.now();
        const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
        meses = Math.max(1, Math.round(diffDays / 30));
      } else {
        if (frequency === 'SEMANAL') meses = (numCuotas * 7) / 30;
        else if (frequency === 'QUINCENAL') meses = (numCuotas * 15) / 30;
        else meses = numCuotas;
      }
      interestMonths = meses;
      calculatedInterest = Math.round(fiado * (rate / 100) * meses * 100) / 100;
    }
  }

  const totalAPagar = Math.round((fiado + calculatedInterest) * 100) / 100;
  const cuotaBase = Math.floor((totalAPagar / numCuotas) * 100) / 100;
  const cuotasList: Array<{ installmentNumber: number; dueDate: string; amount: number }> = [];

  for (let i = 1; i <= numCuotas; i++) {
    const isLast = i === numCuotas;
    const instAmount = isLast
      ? Math.round((totalAPagar - cuotaBase * (numCuotas - 1)) * 100) / 100
      : cuotaBase;
    const instDate = calculateInstallmentDate(baseDate, i - 1, frequency);
    cuotasList.push({
      installmentNumber: i,
      dueDate: instDate.toISOString(),
      amount: instAmount,
    });
  }

  return {
    totalProducts: total,
    prima,
    fiado,
    interestRate: rate,
    interestType,
    interestAmount: calculatedInterest,
    interestMonths,
    totalAPagar,
    installmentsCount: numCuotas,
    frequency,
    firstDueDate: cuotasList[0].dueDate,
    finalDueDate: cuotasList[cuotasList.length - 1].dueDate,
    cuotas: cuotasList,
  };
}

