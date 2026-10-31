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
  const base =
    (import.meta as any).env?.VITE_TRACKING_URL ||
    'https://trackdeli-web-tracking.vercel.app';

  const cleanBase = base.replace(/\/+$/, '');
  return `${cleanBase}/track/${token}`;
}

export function useWhatsAppTracking() {
  const { data: business } = useQuery({
    queryKey: ['business', 'me'],
    queryFn: () => getMyBusiness(),
  });

  const sendTrackingLink = (order: TrackableOrder) => {
    if (!order.trackingToken) {
      toast.error('Tracking aún no disponible');
      return;
    }

    const trackingUrl = getTrackingUrl(order.trackingToken);
    const businessName = business?.name || 'Tu negocio';

    const message =
      `Tu pedido de *${businessName}* está en camino.\n\n` +
      `Seguilo en tiempo real:\n` +
      `${trackingUrl}\n\n` +
      `— TrackDeli`;

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
      toast.error('Tracking aún no disponible');
      return;
    }
    const url = getTrackingUrl(order.trackingToken);
    navigator.clipboard.writeText(url);
    toast.success('Link copiado');
  };

  return {
    sendTrackingLink,
    copyTrackingLink,
    getTrackingUrl,
  };
}
