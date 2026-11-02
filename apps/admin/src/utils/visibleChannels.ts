export interface ChannelConfigLike {
  delivery?: { enabled?: boolean };
  pedidosYa?: { enabled?: boolean };
}

export interface SalesByChannelMap {
  [channelCode: string]: {
    count?: number;
    total?: number;
  };
}

export interface VisibleChannelsResult {
  isDeliveryVisible: boolean;
  isPedidosYaVisible: boolean;
  hasAnyNonMostradorChannel: boolean;
  shouldShowChannelsBlock: boolean;
  visibleChannelCodes: string[];
}

/**
 * Regla de visibilidad de canales (Ticket 232c):
 * Un canal es visible si:
 * 1. Está activo en la configuración del negocio (channelConfig), O
 * 2. Tiene ventas/movimientos en el período o conjunto consultado.
 *
 * Si sólo MOSTRADOR cumple la regla:
 * - Se oculta el bloque "Ventas por canal" (en cierres y resúmenes).
 * - Se ocultan los canales inactivos y sin movimientos de selectores, filtros y reportes.
 * - Si ningún canal adicional cumple la regla, se oculta la pestaña "Canales" en reportes.
 */
export function getVisibleChannels(
  channelConfig?: ChannelConfigLike | null,
  salesByChannel?: SalesByChannelMap | null
): VisibleChannelsResult {
  const deliveryActive = Boolean(channelConfig?.delivery?.enabled);
  const pedidosYaActive = Boolean(channelConfig?.pedidosYa?.enabled);

  const deliverySales = salesByChannel?.['DOMICILIO'] || salesByChannel?.['delivery'];
  const hasDeliverySales = Boolean(
    (deliverySales?.count && deliverySales.count > 0) ||
    (deliverySales?.total && deliverySales.total > 0)
  );

  const pedidosYaSales = salesByChannel?.['PEDIDOSYA'] || salesByChannel?.['pedidosYa'];
  const hasPedidosYaSales = Boolean(
    (pedidosYaSales?.count && pedidosYaSales.count > 0) ||
    (pedidosYaSales?.total && pedidosYaSales.total > 0)
  );

  const isDeliveryVisible = deliveryActive || hasDeliverySales;
  const isPedidosYaVisible = pedidosYaActive || hasPedidosYaSales;

  const hasAnyNonMostradorChannel = isDeliveryVisible || isPedidosYaVisible;
  const shouldShowChannelsBlock = hasAnyNonMostradorChannel;

  const visibleChannelCodes = ['MOSTRADOR'];
  if (isDeliveryVisible) visibleChannelCodes.push('DOMICILIO');
  if (isPedidosYaVisible) visibleChannelCodes.push('PEDIDOSYA');

  return {
    isDeliveryVisible,
    isPedidosYaVisible,
    hasAnyNonMostradorChannel,
    shouldShowChannelsBlock,
    visibleChannelCodes,
  };
}

export const DISCREPANCY_REASONS_MAP: Record<string, string> = {
  FALTANTE_CONTEO: 'Faltante en conteo',
  SOBRANTE_CAMBIO: 'Sobrante por cambio no reclamado',
  ERROR_DE_COBRO: 'Error de cobro',
  VUELTO_INCORRECTO: 'Vuelto incorrecto',
  GASTO_NO_REGISTRADO: 'Gasto no registrado',
  RETIRO_NO_REGISTRADO: 'Retiro no registrado',
  OTRO: 'Otro motivo',
};

export function formatDiscrepancyReason(reason?: string | null): string {
  if (!reason) return 'Descuadre';
  return DISCREPANCY_REASONS_MAP[reason] || reason;
}

