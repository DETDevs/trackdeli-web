import { apiClient } from '../client';
import { Order } from './orders';

export type CommissionStatus = 'PENDING' | 'INCLUDED' | 'PAID';
export type StatementStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';

export interface OrderCommission {
  id: string;
  orderId: string;
  order?: Order;
  businessId: string;
  deliveryFee: number;
  distanceKm: number;
  commissionRate: number;
  commissionAmount: number;
  status: CommissionStatus;
  statementId?: string | null;
  createdAt: string;
}

export interface MonthlyStatement {
  id: string;
  businessId: string;
  month: number;
  year: number;
  totalDeliveries: number;
  totalDeliveryFee: number;
  totalCommission: number;
  status: StatementStatus;
  dueDate: string;
  paidAt?: string | null;
  paidAmount?: number | null;
  notes?: string | null;
  commissions?: OrderCommission[];
  createdAt: string;
}

export const getMonthlyStatements = async (): Promise<MonthlyStatement[]> => {
  try {
    const res = await apiClient.get('/commissions/statements');
    return Array.isArray(res.data) ? res.data : [];
  } catch (err: any) {
    if (err?.response?.status === 404) {
      try {
        const res2 = await apiClient.get('/monthly-statements');
        return Array.isArray(res2.data) ? res2.data : [];
      } catch {
        return [];
      }
    }
    return [];
  }
};

export const getMonthlyStatement = async (month: number, year: number): Promise<MonthlyStatement | null> => {
  try {
    const res = await apiClient.get(`/commissions/statements/${year}/${month}`);
    return res.data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      try {
        const res2 = await apiClient.get(`/monthly-statements/${year}/${month}`);
        return res2.data;
      } catch {
        return null;
      }
    }
    return null;
  }
};

export const getOrderCommissions = async (params?: {
  month?: number;
  year?: number;
  status?: CommissionStatus;
}): Promise<OrderCommission[]> => {
  try {
    const res = await apiClient.get('/commissions', { params });
    return Array.isArray(res.data) ? res.data : [];
  } catch (err: any) {
    if (err?.response?.status === 404) {
      try {
        const res2 = await apiClient.get('/order-commissions', { params });
        return Array.isArray(res2.data) ? res2.data : [];
      } catch {
        return [];
      }
    }
    return [];
  }
};
