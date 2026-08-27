import { useQuery } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';

export interface SystemLog {
  id: string;
  type:
    | 'ORDER_CREATED'
    | 'ORDER_DELIVERED'
    | 'ORDER_CANCELLED'
    | 'RIDER_REGISTERED'
    | 'BUSINESS_CREATED'
    | 'INCIDENCIA';
  description: string;
  businessName: string | null;
  riderName: string | null;
  orderId: string | null;
  createdAt: string;
}

export function useLogs() {
  return useQuery<SystemLog[]>({
    queryKey: ['superadmin-logs'],
    queryFn: async () => {
      const { data } = await apiClient.get('/superadmin/logs');
      return data;
    },
    refetchInterval: 15000,
  });
}
