import { useQuery } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';

export interface GlobalMetrics {
  totals: {
    businesses: number;
    businessesActive: number;
    riders: number;
    ridersActive: number;
    ordersAllTime: number;
  };
  today: {
    ordersCreated: number;
    ordersDelivered: number;
    ordersCancelled: number;
    ordersActive: number;
    newRiders: number;
  };
  last30Days: {
    ordersCreated: number;
    ordersDelivered: number;
    ordersCancelled: number;
    deliveryRate: number;
    avgDeliveryTimeMinutes: number;
  };
  topBusinesses: Array<{
    id: string;
    name: string;
    ordersCount: number;
  }>;
  topRiders: Array<{
    id: string;
    name: string;
    deliveriesCount: number;
    averageRating: number | null;
  }>;
  ordersPerDay: Array<{
    date: string;
    created: number;
    delivered: number;
  }>;
}

export function useGlobalMetrics() {
  return useQuery<GlobalMetrics>({
    queryKey: ['superadmin-metrics'],
    queryFn: async () => {
      const { data } = await apiClient.get('/superadmin/metrics');
      return data;
    },
    refetchInterval: 30000,
  });
}

export interface OrdersMetricsFilter {
  businessId?: string;
  riderId?: string;
  from?: string;
  to?: string;
  status?: string;
}

export function useOrdersMetrics(filters?: OrdersMetricsFilter) {
  return useQuery({
    queryKey: ['superadmin-orders-metrics', filters],
    queryFn: async () => {
      const { data } = await apiClient.get('/superadmin/metrics/orders', {
        params: filters,
      });
      return data;
    },
  });
}
