import { useQuery } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';

export interface PendingCollectionItem {
  id: string;
  name: string;
  status: 'VENCIDO' | 'EN_GRACIA' | 'POR_VENCER' | 'VIGENTE' | string;
  due_date: string | null;
  days_until_due: number | null;
  amount: number;
}

export interface RecentPaymentItem {
  id: string;
  business_id: string;
  business_name: string;
  amount: number;
  currency: string;
  payment_method: string;
  payment_proof_url: string | null;
  paid_at: string;
  period: string;
}

export interface InactiveAdoptionBusiness {
  id: string;
  name: string;
  signal: 'last_sale' | string;
  last_activity_at: string | null;
  days_inactive: number;
}

export interface DeliverySummary {
  active_businesses_count: number;
  active_riders: number;
  orders_today: number;
  delivery_rate_30d: number;
}

export interface SuperAdminSummaryResponse {
  mrr: number;
  due_next_7_days: {
    count: number;
    amount: number;
  };
  in_grace: {
    count: number;
    amount: number;
  };
  overdue: {
    count: number;
    amount: number;
  };
  active_businesses: {
    total: number;
    new_this_month: number;
  };
  trials: number;
  by_type: Record<string, number>;
  pending_collections: PendingCollectionItem[];
  recent_payments: RecentPaymentItem[];
  inactive_adoption: {
    signal: 'last_sale' | string;
    businesses: InactiveAdoptionBusiness[];
  };
  delivery: DeliverySummary | null;
}

export function useSuperAdminSummary() {
  return useQuery<SuperAdminSummaryResponse>({
    queryKey: ['superadmin', 'summary'],
    queryFn: async () => {
      const { data } = await apiClient.get<SuperAdminSummaryResponse>('/superadmin/summary');
      return data;
    },
    refetchInterval: 30000,
  });
}
