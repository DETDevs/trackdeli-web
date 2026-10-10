/**
 * Utilidades para fechas y horas en hora de Managua (UTC-6)
 */

export const MANAGUA_TIMEZONE = 'America/Managua';

/**
 * Obtiene la fecha actual de Managua en formato 'YYYY-MM-DD'
 */
export const getManaguaTodayYMD = (): string => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: MANAGUA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
};

/**
 * Formatea una fecha u hora ISO a fecha legible en hora de Managua (ej: 09/10/2026)
 */
export const formatManaguaDate = (dateStr?: string | null | Date): string => {
  if (!dateStr) return '—';
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
 * Formatea una fecha u hora ISO a fecha y hora en hora de Managua (ej: 09/10/2026, 09:30 PM)
 */
export const formatManaguaDateTime = (dateStr?: string | null | Date): string => {
  if (!dateStr) return '—';
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('es-NI', {
      timeZone: MANAGUA_TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return String(dateStr);
  }
};

/**
 * Formatea solo la hora en hora de Managua (ej: 08:45 PM)
 */
export const formatManaguaTime = (dateStr?: string | null | Date): string => {
  if (!dateStr) return '—';
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('es-NI', {
      timeZone: MANAGUA_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return String(dateStr);
  }
};
