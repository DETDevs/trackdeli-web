/**
 * Configuración centralizada de sondeo (polling), intervalos y backoff
 * para la aplicación del Comandero (meseros).
 */

export const POLLING_CONFIG = {
  /**
   * Intervalo base cuando el mesero tiene el listado de mesas visible (20 s).
   */
  TABLES_BASE_INTERVAL_MS: 20000,

  /**
   * Intervalos de reintento progresivo (backoff) en caso de error de red o desconexión:
   * 1er intento: 20 s -> 2do intento: 40 s -> 3er intento+: 60 s.
   */
  TABLES_ERROR_BACKOFF_STEPS_MS: [20000, 40000, 60000] as const,

  /**
   * Intervalo de sondeo cuando la comanda de una mesa está abierta (6 s).
   * Solo actualiza el pedido de la mesa activa, sin refrescar el listado general.
   */
  ACTIVE_ORDER_INTERVAL_MS: 6000,

  /**
   * Umbral para considerar que la conexión está "En vivo" (45 s).
   * Si la última respuesta exitosa ocurrió hace menos de 45 s, el indicador se muestra en verde.
   */
  LIVE_INDICATOR_FRESH_THRESHOLD_MS: 45000,
} as const;

/**
 * Calcula el intervalo de refresco para el listado de mesas con base en:
 * 1. Page Visibility API: si la app está oculta o el celular bloqueado, retorna false (pausado).
 * 2. Conectividad: si el dispositivo está offline, retorna false (pausado hasta evento online).
 * 3. Backoff de errores: escala 20s -> 40s -> 60s según la cantidad de fallos consecutivos.
 */
export function getTablesRefetchInterval(query: {
  state: {
    status: string;
    errorUpdateCount?: number;
  };
}): number | false {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    return false;
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }

  const consecutiveErrors = query.state.errorUpdateCount || 0;
  if (consecutiveErrors <= 0) {
    return POLLING_CONFIG.TABLES_BASE_INTERVAL_MS;
  }

  const stepIndex = Math.min(
    consecutiveErrors - 1,
    POLLING_CONFIG.TABLES_ERROR_BACKOFF_STEPS_MS.length - 1
  );
  return POLLING_CONFIG.TABLES_ERROR_BACKOFF_STEPS_MS[stepIndex];
}
