import { apiClient } from '../client';
import { BusinessClient } from './businesses';
import { OrderCommission } from './commissions';

export type OrderStatus =
  | 'PENDIENTE'
  | 'OFERTADO'
  | 'COTIZANDO'
  | 'ACEPTADO'
  | 'EN_CAMINO_AL_NEGOCIO'
  | 'EN_EL_NEGOCIO'
  | 'TOMADO'
  | 'EN_CAMINO'
  | 'CERCA_DEL_DESTINO'
  | 'VERIFICANDO_ENTREGA'
  | 'ENTREGADO'
  | 'CANCELADO'
  | 'INCIDENCIA'
  | 'CERRADO';

export type QuoteStatus =
  | 'PENDING'
  | 'NEGOTIATING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'CANCELLED';

export type DispatchStatus = 'SENT' | 'ACCEPTED' | 'REJECTED' | 'TIMEOUT';

export interface OrderDispatch {
  id: string;
  orderId: string;
  riderId: string;
  rider?: {
    id: string;
    name: string;
    phone?: string;
    vehicleType?: string;
    vehicleColor?: string;
    vehiclePlate?: string;
    profilePhotoUrl?: string;
    rating?: number;
  };
  attempt: number;
  status: DispatchStatus;
  sentAt: string;
  respondedAt?: string | null;
  timeoutAt: string;
}

export interface OrderMessage {
  id: string;
  orderId: string;
  quoteId?: string | null;
  senderId: string;
  sender?: {
    id: string;
    name: string;
    role?: string;
  };
  senderRole: 'ENCARGADO' | 'REPARTIDOR' | 'SUPERADMIN' | string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface OrderQuote {
  id: string;
  orderId: string;
  riderId: string;
  rider?: {
    id: string;
    name: string;
    phone?: string;
    vehicleType?: string;
    vehicleColor?: string;
    vehiclePlate?: string;
    profilePhotoUrl?: string;
    rating?: number;
    totalRatings?: number;
  };
  proposedFee: number;
  counterFee?: number | null;
  finalFee?: number | null;
  distanceToBusinessKm?: number | null;
  etaToBusinessMin?: number | null;
  status: QuoteStatus;
  messages?: OrderMessage[];
  createdAt: string;
  updatedAt: string;
}

export type DeliveryPaymentStatus = 'PAGADO' | 'CONTRA_ENTREGA' | 'GRATIS';

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  originBusinessName?: string | null;
  originBusinessClientId?: string | null;
  originBusinessClient?: BusinessClient | null;
  destinationAddress: string;
  destinationLat?: number;
  destinationLng?: number;
  description?: string;
  status: OrderStatus;
  deliveryPaymentStatus: DeliveryPaymentStatus;
  deliveryFee: number;
  distanceKm?: number;
  priceNegotiated?: boolean;
  trackingToken?: string;
  businessId: string;
  deliveryUserId?: string;
  deliveryUser?: {
    id: string;
    name: string;
    phone?: string;
    vehicleType?: string;
    vehicleColor?: string;
    vehiclePlate?: string;
    profilePhotoUrl?: string;
  };
  quotes?: OrderQuote[];
  dispatches?: OrderDispatch[];
  commission?: OrderCommission | null;
  statusHistory?: Array<{
    status: OrderStatus;
    createdAt: string;
  }>;
  photos?: OrderPhoto[];
  createdAt: string;
  updatedAt: string;
  takenAt?: string;
  deliveredAt?: string;
}

export interface OrderPhoto {
  id: string;
  url: string;
  type: string;
  createdAt: string;
}

export interface CreateOrderDto {
  customerId?: string;
  customerName: string;
  customerPhone: string;
  originBusinessName?: string;
  originBusinessClientId?: string;
  destinationAddress: string;
  destinationLat?: number;
  destinationLng?: number;
  description?: string;
  deliveryPaymentStatus: DeliveryPaymentStatus;
  deliveryFee?: number;
}

export interface CalculateFeeResult {
  fee: number;
  distanceKm: number;
  breakdown: string;
  pricingModel: string;
  currency: string;
}

export const getOrders = async (params?: Record<string, string>): Promise<Order[]> => {
  const res = await apiClient.get('/orders', { params });
  return res.data;
};

export const getOrder = async (id: string): Promise<Order> => {
  const res = await apiClient.get(`/orders/${id}`);
  return res.data;
};

export const getOrderPhotos = async (id: string): Promise<OrderPhoto[]> => {
  const res = await apiClient.get(`/orders/${id}/photos`);
  return res.data;
};

export const calculateOrderFee = async (
  destLat: number,
  destLng: number
): Promise<CalculateFeeResult> => {
  const res = await apiClient.get('/orders/calculate-fee', {
    params: { destLat, destLng },
  });
  return res.data;
};

export const createOrder = async (data: CreateOrderDto): Promise<Order> => {
  const res = await apiClient.post('/orders', data);
  return res.data;
};

export const cancelOrder = async (id: string): Promise<Order> => {
  const res = await apiClient.patch(`/orders/${id}/status`, { status: 'CANCELADO' });
  return res.data;
};

export const getOrderQuotes = async (orderId: string): Promise<OrderQuote[]> => {
  try {
    const res = await apiClient.get(`/orders/${orderId}/quotes`);
    return Array.isArray(res.data) ? res.data : [];
  } catch (err: any) {
    if (err?.response?.status === 404) {
      try {
        const res2 = await apiClient.get(`/quotes/${orderId}`);
        return Array.isArray(res2.data) ? res2.data : [];
      } catch {
        return [];
      }
    }
    return [];
  }
};

export const acceptOrderQuote = async (orderId: string, quoteId: string): Promise<Order> => {
  try {
    const res = await apiClient.post(`/orders/${orderId}/quotes/${quoteId}/accept`);
    return res.data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      const res2 = await apiClient.post(`/quotes/${quoteId}/accept`);
      return res2.data;
    }
    throw err;
  }
};

export const getQuoteMessages = async (orderId: string, quoteId: string): Promise<OrderMessage[]> => {
  try {
    const res = await apiClient.get(`/orders/${orderId}/quotes/${quoteId}/messages`);
    return Array.isArray(res.data) ? res.data : [];
  } catch (err: any) {
    if (err?.response?.status === 404) {
      try {
        const res2 = await apiClient.get(`/quotes/${quoteId}/messages`);
        return Array.isArray(res2.data) ? res2.data : [];
      } catch {
        return [];
      }
    }
    return [];
  }
};

export const sendQuoteMessage = async (
  orderId: string,
  quoteId: string,
  data: string | { message: string; counterFee?: number }
): Promise<OrderMessage> => {
  const payload = typeof data === 'string' ? { message: data } : data;
  try {
    const res = await apiClient.post(`/orders/${orderId}/quotes/${quoteId}/messages`, payload);
    return res.data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      const res2 = await apiClient.post(`/quotes/${quoteId}/messages`, payload);
      return res2.data;
    }
    throw err;
  }
};

// Dispatches
export const getOrderDispatches = async (orderId: string): Promise<OrderDispatch[]> => {
  try {
    const res = await apiClient.get(`/orders/${orderId}/dispatches`);
    return Array.isArray(res.data) ? res.data : [];
  } catch {
    return [];
  }
};
