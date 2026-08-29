import { useQuery } from '@tanstack/react-query';
import { getMyBusiness } from 'api-client';
import toast from 'react-hot-toast';

export const TRACKABLE_STATUSES = [
  'ACEPTADO',
  'EN_CAMINO_AL_NEGOCIO',
  'EN_EL_NEGOCIO',
  'EN_CAMINO',
  'CERCA_DEL_DESTINO',
  'VERIFICANDO_ENTREGA',
];

export interface TrackableOrder {
  id?: string;
  customerName?: string;
  customerPhone?: string;
  trackingToken?: string | null;
  status?: string;
}

export function getTrackingUrl(token: string): string {
  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ) {
    const origin = window.location.origin.replace(':5173', ':5174');
    return `${origin}/track/${token}`;
  }
  return `https://tracking.trackdeli.app/track/${token}`;
}

export function useWhatsAppTracking() {
  const { data: business } = useQuery({
    queryKey: ['business', 'me'],
    queryFn: () => getMyBusiness(),
  });

  const sendTrackingLink = (order: TrackableOrder) => {
    if (!order.trackingToken) {
      toast.error('El link de tracking aún no está disponible. El repartidor debe tomar el pedido primero.');
      return;
    }

    const trackingUrl = getTrackingUrl(order.trackingToken);
    const businessName = business?.name || 'El negocio';

    const message =
      `¡Hola ${order.customerName || 'Cliente'}! 👋\n\n` +
      `Tu pedido de *${businessName}* ya está en camino.\n\n` +
      `📍 Seguí a tu repartidor en tiempo real:\n${trackingUrl}\n\n` +
      `¡Gracias por tu compra! 🛵`;

    const cleanPhone = (order.customerPhone || '').replace(/[\+\s\-]/g, '');

    const fullPhone =
      cleanPhone.startsWith('505') || cleanPhone.length > 8
        ? cleanPhone
        : `505${cleanPhone}`;

    const waUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  const copyTrackingLink = (order: TrackableOrder) => {
    if (!order.trackingToken) {
      toast.error('El link de tracking aún no está disponible.');
      return;
    }
    const url = getTrackingUrl(order.trackingToken);
    navigator.clipboard.writeText(url);
    toast.success('Link copiado al portapapeles');
  };

  return {
    sendTrackingLink,
    copyTrackingLink,
    getTrackingUrl,
  };
}
