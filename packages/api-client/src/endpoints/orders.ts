import { apiClient } from '../client';

export type OrderStatus =
  | 'PENDIENTE'
  | 'TOMADO'
  | 'EN_CAMINO'
  | 'CERCA_DEL_DESTINO'
  | 'VERIFICANDO_ENTREGA'
  | 'ENTREGADO'
  | 'CANCELADO'
  | 'INCIDENCIA'
  | 'CERRADO';

export type DeliveryPaymentStatus = 'PAGADO' | 'CONTRA_ENTREGA' | 'GRATIS';

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  destinationAddress: string;
  destinationLat?: number;
  destinationLng?: number;
  description?: string;
  status: OrderStatus;
  deliveryPaymentStatus: DeliveryPaymentStatus;
  deliveryFee: number;
  distanceKm?: number;
  trackingToken?: string;
  businessId: string;
  deliveryUserId?: string;
  deliveryUser?: {
    id: string;
    name: string;
  };
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
  customerName: string;
  customerPhone: string;
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
