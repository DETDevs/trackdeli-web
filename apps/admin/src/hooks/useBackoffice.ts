import { useQuery } from '@tanstack/react-query';
import {
  apiClient,
  getOpenCashRegistersList,
  type PosOpenCashRegisterItem,
} from 'api-client';

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
  channel?: 'MOSTRADOR' | 'DOMICILIO' | 'PEDIDOSYA' | string;
  deliveryFee?: number | null;
  deliveryAddress?: string | null;
  deliveryPhone?: string | null;
  deliveryReference?: string | null;
  deliveryDriverId?: string | null;
  deliveryDriverName?: string | null;
  cashier?: { id: string; name: string } | null;
  sellerId?: string | null;
  sellerName?: string | null;
  seller?: { id: string; name: string } | null;
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
  registerSource?: 'WEB' | 'DESKTOP' | 'MOBILE' | string;
  recountAttempts?: number;
  discrepancyReason?: string | null;
  discrepancyNote?: string | null;
  discrepancyAuthorizedById?: string | null;
  discrepancyAuthorizedAt?: string | null;
  discrepancyAuthorizer?: { id: string; name: string; role?: string } | null;
}

export type { PosOpenCashRegisterItem };

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
  channel?: string;
  cashierId?: string;
  staffId?: string;
  sellerId?: string;
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

const isDeliverySaleLine = (it: any): boolean =>
  !it?.productId &&
  String(it?.productName || it?.name || '')
    .trim()
    .toLowerCase()
    .startsWith('envío a domicilio');

const extractVehiclePlaca = (vehicleInfo?: string | null): string | null => {
  if (!vehicleInfo) return null;
  const parts = vehicleInfo.split('·').map((s) => s.trim());
  return parts[0] || vehicleInfo.trim() || null;
};

export const useBackofficeSales = (params: SalesQueryParams) => {
  return useQuery<PaginatedResponse<BackofficeSaleItemSummary>>({
    queryKey: ['backoffice', 'sales', params],
    queryFn: async () => {
      const page = Math.max(1, Number(params.page) || 1);
      const limit = Math.max(1, Number(params.limit) || 20);
      const batchLimit = 200;
      const maxPages = 25;
      const seenIds = new Set<string>();
      const rawSales: any[] = [];

      for (let p = 1; p <= maxPages; p++) {
        const res = await apiClient.get<any[]>('/pos/sales', {
          params: {
            from: params.from,
            to: params.to,
            paymentMethod: params.paymentMethod,
            channel: params.channel,
            staffId: params.staffId,
            sellerId: params.sellerId,
            status: params.status,
            businessId: params.businessId,
            limit: batchLimit,
            page: p,
          },
        });
        const batch = Array.isArray(res.data) ? res.data : [];
        for (const s of batch) {
          if (s && s.id && !seenIds.has(s.id)) {
            seenIds.add(s.id);
            rawSales.push(s);
          }
        }
        if (batch.length < batchLimit) break;
      }

      const mapped: BackofficeSaleItemSummary[] = rawSales.map((sale) => {
        const isVoided = sale.status === 'CANCELLED' || sale.status === 'VOIDED';
        const total = Number(sale.total ?? 0);
        const refundTotal = Number(sale.refundTotal ?? 0);
        const netTotal =
          sale.netTotal != null ? Number(sale.netTotal) : Math.max(0, total - refundTotal);
        const rawItems = Array.isArray(sale.items) ? sale.items : [];
        const itemsCount =
          rawItems.length > 0
            ? rawItems.filter((it: any) => !isDeliverySaleLine(it)).length
            : Number(sale.linesCount ?? 0);

        return {
          id: sale.id,
          invoiceNumber: sale.invoiceNumber,
          invoiceDate: sale.invoiceDate || sale.createdAt,
          createdAt: sale.createdAt,
          status: sale.status,
          isVoided,
          voidReason: sale.voidReason || null,
          voidedAt: sale.voidedAt || null,
          paymentMethod: sale.paymentMethod || null,
          subtotal: Number(sale.subtotal ?? 0),
          discountAmount: Number(sale.discountAmount ?? 0),
          taxAmount: Number(sale.taxAmount ?? 0),
          total,
          netTotal,
          amountPaid: Number(sale.amountPaid ?? 0),
          change: Number(sale.change ?? 0),
          itemsCount,
          channel: sale.channel || 'MOSTRADOR',
          deliveryFee: sale.deliveryFee != null ? Number(sale.deliveryFee) : 0,
          deliveryAddress: sale.deliveryAddress || null,
          deliveryPhone: sale.deliveryPhone || null,
          deliveryReference: sale.deliveryReference || null,
          deliveryDriverId: sale.deliveryDriverId || null,
          deliveryDriverName: sale.deliveryDriverName || null,
          cashier: sale.cashier ? { id: sale.cashier.id, name: sale.cashier.name } : null,
          sellerId: sale.sellerId || null,
          sellerName: sale.sellerName || sale.seller?.name || null,
          seller: sale.seller ? { id: sale.seller.id, name: sale.seller.name } : null,
          customer: {
            id: sale.customerId || sale.customer?.id || null,
            name: sale.customerName || sale.customer?.name || null,
            phone: sale.customerPhone || sale.customer?.phone || null,
            ruc: sale.customerRuc || sale.customer?.ruc || null,
          },
          taller: {
            placa: extractVehiclePlaca(sale.vehicleInfo),
            vehiculo: sale.vehicleInfo || null,
            tecnico: sale.waiterName || null,
            area: sale.zoneName || sale.tableNumber || null,
          },
        };
      });

      const filtered = mapped.filter((s) => {
        if (params.excludeVoided && s.isVoided) return false;
        if (params.channel && (s.channel || 'MOSTRADOR').toUpperCase() !== params.channel.toUpperCase()) {
          return false;
        }
        return true;
      });

      const total = filtered.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const startIdx = (page - 1) * limit;
      const data = filtered.slice(startIdx, startIdx + limit);

      return {
        data,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
      };
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
    queryFn: () => getOpenCashRegistersList(),
    enabled,
    staleTime: 15000,
    refetchInterval: 30000,
  });
};
