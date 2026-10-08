import { useQuery } from '@tanstack/react-query';
import { apiClient } from 'api-client';

/* =========================================================================
 * 1. Tipos e Interfaces
 * ========================================================================= */

export interface PeriodMetrics {
  totalRevenue: number;
  salesCount: number;
  averageTicket: number;
}

export interface PeriodComparison {
  revenueDiff: number;
  revenueGrowthPercent: number;
  salesCountDiff: number;
  salesGrowthPercent: number;
}

export interface DashboardPeriodData extends PeriodMetrics {
  previousPeriod: PeriodMetrics;
  comparison: PeriodComparison;
}

export interface BackofficeDashboardData {
  tier: string;
  currency: string;
  salonProfile: 'RESTAURANTE' | 'TALLER';
  today: DashboardPeriodData;
  week: DashboardPeriodData;
  month: DashboardPeriodData;
  paymentMethods: {
    efectivo: number;
    tarjeta: number;
    transferencia: number;
    otros: number;
  };
}

export interface BackofficeSaleCustomer {
  id?: string | null;
  name?: string | null;
  phone?: string | null;
  ruc?: string | null;
  email?: string | null;
}

export interface BackofficeSaleTaller {
  placa: string | null;
  vehiculo: string | null;
  tecnico: string | null;
  area: string | null;
}

export interface BackofficeSaleItemSummary {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  createdAt: string;
  status: string;
  isVoided: boolean;
  voidReason?: string | null;
  voidedAt?: string | null;
  paymentMethod?: string | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  netTotal: number;
  amountPaid: number;
  change: number;
  itemsCount: number;
  cashier?: { id: string; name: string } | null;
  customer?: BackofficeSaleCustomer | null;
  taller?: BackofficeSaleTaller | null;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface SaleDetailItem {
  id: string;
  productId?: string | null;
  productName: string;
  barcode?: string | null;
  sku?: string | null;
  category: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  returnedQty: number;
  netQuantity: number;
  subtotal: number;
  total: number;
  discount?: number | null;
}

export interface SaleDetailReturn {
  id: string;
  returnNumber: string;
  refundAmount: number;
  refundMethod?: string | null;
  reason?: string | null;
  createdAt: string;
  itemsCount: number;
}

export interface SaleDetailPayment {
  id: string;
  method: string;
  amount: number;
  currency: string;
  exchangeRate: number;
  amountBase: number;
}

export interface BackofficeSaleDetail extends Omit<BackofficeSaleItemSummary, 'itemsCount'> {
  notes?: string | null;
  taxRate?: number | null;
  totalRefunded: number;
  cashRegister?: {
    id: string;
    openedAt: string;
    closedAt?: string | null;
    status: string;
  } | null;
  items: SaleDetailItem[];
  returns: SaleDetailReturn[];
  payments: SaleDetailPayment[];
}

export interface BackofficeTopProduct {
  productId: string | null;
  productName: string;
  barcode: string | null;
  category: string;
  quantity: number;
  revenue: number;
  timesSold: number;
}

export interface BackofficeCategoryItem {
  categoryId: string | null;
  categoryName: string;
  quantity: number;
  revenue: number;
  salesCount: number;
  percentage: number;
}

export interface BackofficeSalesByCategoryResponse {
  totalRevenue: number;
  categories: BackofficeCategoryItem[];
}

export interface BackofficeInventoryItem {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  category?: { id: string; name: string } | null;
  stock: number;
  unit: string;
  minStock: number;
  maxStock?: number | null;
  trackStock: boolean;
  isService: boolean;
  status: 'normal' | 'bajo' | 'agotado';
  price: number;
}

export interface BackofficeCashRegisterItem {
  id: string;
  status: string;
  openedAt: string;
  closedAt: string | null;
  openedBy?: { id: string; name: string } | null;
  closedBy?: { id: string; name: string } | null;
  openingCash: number;
  expectedCash: number;
  closingCash: number | null;
  difference: number | null;
  closingCashUsd?: number | null;
  differenceUsd?: number | null;
  totalSales: number;
  salesCount: number;
  notes?: string | null;
}

export interface CashRegisterMovement {
  id: string;
  type: string;
  amount: number;
  currency: string;
  concept?: string | null;
  user?: { id: string; name: string } | null;
  createdAt: string;
}

export interface CashRegisterSaleSummary {
  id: string;
  invoiceNumber: string;
  createdAt: string;
  total: number;
  paymentMethod?: string | null;
  customerName?: string | null;
  status: string;
}

export interface BackofficeCashRegisterDetail extends BackofficeCashRegisterItem {
  totalCash: number;
  totalCard: number;
  totalTransfer: number;
  movements: CashRegisterMovement[];
  sales: CashRegisterSaleSummary[];
}

/* =========================================================================
 * 2. Parámetros de consulta (Queries)
 * ========================================================================= */

export interface SalesQueryParams {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  paymentMethod?: string;
  cashierId?: string;
  excludeVoided?: boolean;
  status?: string;
  businessId?: string;
}

export interface DateRangeQueryParams {
  from?: string;
  to?: string;
  limit?: number;
  businessId?: string;
}

export interface InventoryQueryParams {
  search?: string;
  categoryId?: string;
  onlyLowStock?: boolean;
  page?: number;
  limit?: number;
  businessId?: string;
}

export interface CashRegisterQueryParams {
  from?: string;
  to?: string;
  cashierId?: string;
  page?: number;
  limit?: number;
  businessId?: string;
}

/* =========================================================================
 * 3. React Query Hooks
 * ========================================================================= */

export const useBackofficeDashboard = (businessId?: string) => {
  return useQuery<BackofficeDashboardData>({
    queryKey: ['backoffice', 'dashboard', businessId],
    queryFn: async () => {
      const params = businessId ? { businessId } : undefined;
      const res = await apiClient.get<BackofficeDashboardData>('/backoffice/dashboard', { params });
      return res.data;
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

export const useBackofficeSales = (params: SalesQueryParams) => {
  return useQuery<PaginatedResponse<BackofficeSaleItemSummary>>({
    queryKey: ['backoffice', 'sales', params],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<BackofficeSaleItemSummary>>('/backoffice/sales', {
        params,
      });
      return res.data;
    },
    staleTime: 15000,
  });
};

export const useBackofficeSaleDetail = (saleId: string | null, businessId?: string) => {
  return useQuery<BackofficeSaleDetail>({
    queryKey: ['backoffice', 'sale-detail', saleId, businessId],
    queryFn: async () => {
      if (!saleId) throw new Error('Sale ID requerido');
      const params = businessId ? { businessId } : undefined;
      const res = await apiClient.get<BackofficeSaleDetail>(`/backoffice/sales/${saleId}`, { params });
      return res.data;
    },
    enabled: Boolean(saleId),
    staleTime: 60000,
  });
};

export const useBackofficeTopProducts = (params: DateRangeQueryParams) => {
  return useQuery<BackofficeTopProduct[]>({
    queryKey: ['backoffice', 'top-products', params],
    queryFn: async () => {
      const res = await apiClient.get<BackofficeTopProduct[]>('/backoffice/top-products', { params });
      return res.data;
    },
    staleTime: 30000,
  });
};

export const useBackofficeSalesByCategory = (params: DateRangeQueryParams) => {
  return useQuery<BackofficeSalesByCategoryResponse>({
    queryKey: ['backoffice', 'sales-by-category', params],
    queryFn: async () => {
      const res = await apiClient.get<BackofficeSalesByCategoryResponse>('/backoffice/sales-by-category', {
        params,
      });
      return res.data;
    },
    staleTime: 30000,
  });
};

export const useBackofficeInventory = (params: InventoryQueryParams) => {
  return useQuery<PaginatedResponse<BackofficeInventoryItem>>({
    queryKey: ['backoffice', 'inventory', params],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<BackofficeInventoryItem>>('/backoffice/inventory', {
        params,
      });
      return res.data;
    },
    staleTime: 20000,
  });
};

export const useBackofficeCashRegisters = (params: CashRegisterQueryParams) => {
  return useQuery<PaginatedResponse<BackofficeCashRegisterItem>>({
    queryKey: ['backoffice', 'cash-registers', params],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<BackofficeCashRegisterItem>>(
        '/backoffice/cash-registers',
        { params }
      );
      return res.data;
    },
    staleTime: 20000,
  });
};

export const useBackofficeCashRegisterDetail = (registerId: string | null, businessId?: string) => {
  return useQuery<BackofficeCashRegisterDetail>({
    queryKey: ['backoffice', 'cash-register-detail', registerId, businessId],
    queryFn: async () => {
      if (!registerId) throw new Error('Register ID requerido');
      const params = businessId ? { businessId } : undefined;
      const res = await apiClient.get<BackofficeCashRegisterDetail>(
        `/backoffice/cash-registers/${registerId}`,
        { params }
      );
      return res.data;
    },
    enabled: Boolean(registerId),
    staleTime: 30000,
  });
};
