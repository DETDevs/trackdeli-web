import { useQuery } from '@tanstack/react-query';
import { apiClient } from 'api-client';

/* =========================================================================
 * 1. Tipos e Interfaces
 * ========================================================================= */

export interface PeriodMetrics {
  totalRevenue: number;
  salesCount: number;
  averageTicket: number;
  taxableSales?: number;
  exemptSales?: number;
  taxAmount?: number;
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

export interface DashboardOpenRegister {
  id: string;
  cashierName: string;
  openedAt: string;
  openingFloat: number;
  expectedCash: number;
  salesCount: number;
}

export interface DashboardTodayProfit {
  profit: number;
  cost: number;
  marginPct: number;
  itemsWithoutCost: number;
}

export interface DashboardLastSale {
  id: string;
  invoiceNumber: string;
  createdAt: string;
  total: number;
  paymentMethod: string;
  status: string;
}

export interface DashboardAlerts {
  lowStock?: { count: number };
  outOfStock?: { count: number };
  expiringBatches?: { count: number; amount: number };
  expiredBatches?: { count: number; amount: number };
  overdueCredit?: { count: number; amount: number };
  lastCashDifference?: {
    amount: number;
    cashier: string;
    date: string;
  } | null;
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
  openRegister?: DashboardOpenRegister | null;
  openRegisters?: DashboardOpenRegister[];
  todayProfit?: DashboardTodayProfit;
  lastSales?: DashboardLastSale[];
  alerts?: DashboardAlerts;
  generatedAt?: string;
  timezone?: string;
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
  listPrice?: number | null;
  listPriceDiscount?: number;
  manualDiscountShare?: number;
  taxable?: boolean;
  taxRate?: number;
  taxAmount?: number;
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
  taxModel?: string;
  listPriceTotal?: number;
  listDiscountTotal?: number;
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
  wholesalePrice?: number | null;
  wholesaleMinQty?: number | null;
  wholesale_price?: number | null;
  wholesale_min_qty?: number | null;
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
  deviceId?: string | null;
  deviceName?: string | null;
  recountAttempts?: number;
  discrepancyReason?: string | null;
  discrepancyNote?: string | null;
  discrepancyAuthorizedById?: string | null;
  discrepancyAuthorizedAt?: string | null;
  discrepancyAuthorizer?: { id: string; name: string; role?: string } | null;
}

export interface PosOpenCashRegisterItem {
  id: string;
  deviceId: string | null;
  deviceName: string | null;
  cashierId: string;
  cashierName: string;
  openedAt: string;
  openingCash: number;
  status: string;
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
  salesByChannel?: Record<string, { count: number; total: number }>;
  tipsSummary?: {
    cashNio: number;
    cashUsd: number;
    card: number;
    transfer: number;
    totalBase: number;
    byBank: Array<{
      bankId: string | null;
      bankName: string;
      card: number;
      transfer: number;
      totalBase: number;
    }>;
  } | null;
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
    staleTime: 15000,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
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

      try {
        // El endpoint /pos/cash-register/:id/summary contiene los campos completos de discrepancia y autorización
        const res = await apiClient.get<any>(
          `/pos/cash-register/${registerId}/summary`,
          { params }
        );
        const data = res.data;
        const reg = data.register || data;
        const summary = data.summary || {};

        return {
          id: reg.id,
          status: reg.status,
          openedAt: reg.openedAt,
          closedAt: reg.closedAt || null,
          openedBy: reg.openedBy || (reg.cashier ? { id: reg.cashier.id, name: reg.cashier.name } : null),
          closedBy: reg.closedBy || null,
          openingCash: reg.openingCash ?? reg.initialAmount ?? 0,
          expectedCash: reg.expectedCash ?? summary.currentCash ?? 0,
          closingCash: reg.closingCash ?? reg.actualAmount ?? null,
          difference: reg.difference ?? null,
          closingCashUsd: reg.closingCashUsd ?? null,
          differenceUsd: reg.differenceUsd ?? null,
          totalSales: summary.totalSales ?? reg.totalSales ?? 0,
          totalCash: summary.totalCash ?? reg.totalCash ?? 0,
          totalCard: summary.totalCard ?? reg.totalCard ?? 0,
          totalTransfer: summary.totalTransfer ?? reg.totalTransfer ?? 0,
          salesCount: summary.salesCount ?? reg.salesCount ?? (reg.sales?.length || 0),
          notes: reg.notes || null,
          deviceId: reg.deviceId ?? null,
          deviceName: reg.deviceName ?? null,
          recountAttempts: reg.recountAttempts ?? 0,
          discrepancyReason: reg.discrepancyReason ?? null,
          discrepancyNote: reg.discrepancyNote ?? null,
          discrepancyAuthorizedById: reg.discrepancyAuthorizedById ?? null,
          discrepancyAuthorizedAt: reg.discrepancyAuthorizedAt ?? null,
          discrepancyAuthorizer: reg.discrepancyAuthorizer ?? null,
          salesByChannel: reg.salesByChannel ?? null,
          tipsSummary:
            summary.tipsSummary !== undefined
              ? summary.tipsSummary
              : (reg.tipsSummary !== undefined ? reg.tipsSummary : null),
          movements: (reg.movements || []).map((m: any) => ({
            id: m.id,
            type: m.type === 'SALIDA' ? 'OUT' : (m.type === 'ENTRADA' ? 'IN' : m.type),
            amount: Number(m.amount ?? 0),
            currency: m.currency || 'NIO',
            concept: m.concept || m.reason || null,
            user: m.user ? { id: m.user.id, name: m.user.name } : null,
            createdAt: m.createdAt,
          })),
          sales: (reg.sales || []).map((s: any) => ({
            id: s.id,
            invoiceNumber: s.invoiceNumber || `REC-${s.id.slice(0, 8)}`,
            createdAt: s.createdAt,
            total: Number(s.total ?? 0),
            paymentMethod: s.paymentMethod || null,
            customerName: s.customerName || null,
            status: s.status,
          })),
        };
      } catch (err) {
        // Fallback al endpoint clásico de backoffice
        const res = await apiClient.get<BackofficeCashRegisterDetail>(
          `/backoffice/cash-registers/${registerId}`,
          { params }
        );
        return res.data;
      }
    },
    enabled: Boolean(registerId),
    staleTime: 30000,
  });
};

export const usePosOpenCashRegisters = (enabled: boolean = true) => {
  return useQuery<PosOpenCashRegisterItem[]>({
    queryKey: ['pos', 'cash-registers', 'open-list'],
    queryFn: async () => {
      const res = await apiClient.get<PosOpenCashRegisterItem[]>('/pos/cash-register/open-list');
      return res.data;
    },
    enabled,
    staleTime: 15000,
    refetchInterval: 30000,
  });
};
