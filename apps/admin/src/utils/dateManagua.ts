/**
 * Utilidades para fechas y horas en hora de Managua (UTC-6)
 */

export const MANAGUA_TIMEZONE = 'America/Managua';

/**
 * Obtiene la fecha de una entrada en hora de Managua en formato 'YYYY-MM-DD'.
 * Si no se pasa parámetro o es undefined, devuelve la fecha de hoy en Managua.
 */
export const getManaguaYMD = (dateInput?: Date | string | null): string => {
  if (!dateInput) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: MANAGUA_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  }
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    return dateInput.trim();
  }
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: MANAGUA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d);
};

/**
 * Obtiene la fecha actual de Managua en formato 'YYYY-MM-DD'
 */
export const getManaguaTodayYMD = (): string => getManaguaYMD();

/**
 * Formatea una fecha u hora ISO a fecha legible en hora de Managua (ej: 24/10/2026)
 * Si ya viene en formato 'YYYY-MM-DD', no lo convierte a UTC para evitar desfase de -6h.
 */
export const formatManaguaDate = (dateStr?: string | null | Date): string => {
  if (!dateStr) return '—';
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
    const [y, m, d] = dateStr.trim().split('-');
    return `${d}/${m}/${y}`;
  }
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('es-NI', {
      timeZone: MANAGUA_TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return String(dateStr);
  }
};

/**
 * Formatea una fecha u hora ISO a fecha y hora en hora de Managua (ej: 24 oct 2026, 9:48 p. m.)
 */
export const formatManaguaDateTime = (dateStr?: string | null | Date): string => {
  if (!dateStr) return '—';
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('es-NI', {
      timeZone: MANAGUA_TIMEZONE,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return String(dateStr);
  }
};

/**
 * Formatea solo la hora en hora de Managua (ej: 9:48 p. m.)
 */
export const formatManaguaTime = (dateStr?: string | null | Date): string => {
  if (!dateStr) return '—';
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('es-NI', {
      timeZone: MANAGUA_TIMEZONE,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return String(dateStr);
  }
};
