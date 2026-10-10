/**
 * Tipos de datos para el módulo de Reportes POS
 * Reutiliza y replica con exactitud los tipos del backend y del desktop
 */

export type PeriodType = 'today' | 'week' | 'month' | 'custom';

export interface ReportComparisonMetric {
  current: number;
  previous: number;
  changePercent: number | null;
}

export interface ReportOverviewComparison {
  previousPeriod: {
    from: string;
    to: string;
  };
  totalSales: ReportComparisonMetric;
  salesCount: ReportComparisonMetric;
  averageTicket: ReportComparisonMetric;
}

export interface ProductStockSummary {
  id: string;
  name: string;
  stock: number;
  minStock: number;
  unit?: string;
  category?: { id: string; name: string } | null;
}

export interface SalesSummaryDetail {
  period: { from: string; to: string };
  totalSales: number;
  totalRevenue: number;
  totalDiscount: number;
  totalTax: number;
  netRevenue: number;
  averageTicket: number;
  byPaymentMethod: Record<string, number>;
  byDay: Array<{
    date: string;
    count: number;
    revenue: number;
  }>;
}

export interface ReportsSummary {
  totalSales: number;
  salesCount: number;
  averageTicket: number;
  totalCash: number;
  totalCard: number;
  totalTransfer: number;
  topProducts: Array<{
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }>;
  lowStockProducts: ProductStockSummary[];
  summary?: SalesSummaryDetail;
  comparison?: ReportOverviewComparison;
}

export interface SalesByTimeItem {
  hour: number;
  count: number;
  revenue: number;
}

export interface SalesByDayOfWeekItem {
  dayOfWeek: number;
  dayName: string;
  count: number;
  revenue: number;
}

export interface SalesByTimeReport {
  period: { from: string; to: string };
  byHour: SalesByTimeItem[];
  peakHour: SalesByTimeItem | null;
  byDayOfWeek: SalesByDayOfWeekItem[];
  peakDay: SalesByDayOfWeekItem | null;
}

export interface SalesByCategoryItem {
  categoryId: string;
  categoryName: string;
  quantity: number;
  revenue: number;
  percentage: number;
}

export interface SalesByCategoryReport {
  period: { from: string; to: string };
  totalRevenue: number;
  categories: SalesByCategoryItem[];
}

export interface SalesByCashierItem {
  cashierId: string;
  cashierName: string;
  salesCount: number;
  totalSales: number;
  netRevenue?: number;
  averageTicket: number;
  percentage: number;
}

export interface SalesByCashierReport {
  period: { from: string; to: string };
  totalSales: number;
  cashiers: SalesByCashierItem[];
}

export interface ProfitMissingProduct {
  id: string;
  name: string;
  quantitySold: number;
  totalSold: number;
}

export interface ProfitSourceItem {
  revenue: number;
  cost: number;
  lines: number;
}

export interface ProfitReport {
  period: { from: string; to: string };
  totalRevenue: number;
  coveredRevenue: number;
  uncoveredRevenue: number;
  coveragePercent: number; // 0 a 100
  totalCost: number | null;
  estimatedProfit: number | null;
  marginPercent: number | null;
  laborRevenue: number;
  bySource?: Record<string, ProfitSourceItem>;
  uncategorizedRevenue?: number;
  missingCostCount: number;
  missingCostProducts: ProfitMissingProduct[];
  comparison?: {
    previousPeriod: { from: string; to: string };
    totalRevenue: ReportComparisonMetric;
    coveredRevenue?: ReportComparisonMetric;
    totalCost: { current: number | null; previous: number | null; changePercent: number | null };
    estimatedProfit: { current: number | null; previous: number | null; changePercent: number | null };
    marginPercent: { current: number | null; previous: number | null; changePercent: number | null };
  };
}

export interface ControlVoidedSaleItem {
  id: string;
  invoiceNumber: string;
  total: number;
  createdAt: string;
  voidedAt: string | null;
  voidReason: string | null;
  selfApproved?: boolean;
  cashier: { id: string; name: string } | null;
  voidedBy?: { id: string; name: string } | null;
  approvedBy: { id: string; name: string } | null;
}

export interface ControlReturnItem {
  id: string;
  returnNumber: string;
  refundAmount: number;
  refundMethod: string;
  reason: string;
  createdAt: string;
  selfApproved?: boolean;
  createdBy: { id: string; name: string } | null;
  approvedBy: { id: string; name: string } | null;
}

export interface ControlDiscountItem {
  id: string;
  invoiceNumber: string;
  subtotal: number;
  discountAmount: number;
  total: number;
  createdAt: string;
  cashier: { id: string; name: string } | null;
}

export interface ControlCashDiscrepancyItem {
  id: string;
  openedAt: string;
  closedAt: string;
  cashier: { id: string; name: string };
  expectedCash: number;
  closingCash: number;
  difference: number;
  notes: string | null;
}

export interface ControlReport {
  period: { from: string; to: string };
  voidedSales: {
    count: number;
    totalAmount: number;
    recent: ControlVoidedSaleItem[];
  };
  returns: {
    count: number;
    totalAmount: number;
    recent: ControlReturnItem[];
  };
  discounts: {
    count: number;
    totalAmount: number;
    recent: ControlDiscountItem[];
  };
  cashDiscrepancies: {
    closedRegistersCount: number;
    totalDifference: number;
    shortageCount: number;
    shortageTotal: number;
    overageCount: number;
    overageTotal: number;
    recent: ControlCashDiscrepancyItem[];
  };
}

export interface WorkshopServiceItem {
  productId: string;
  productName: string;
  quantity: number;
  total: number;
}

export interface WorkshopTechnicianItem {
  technicianId: string;
  technicianName: string;
  ordersCount: number;
  totalRevenue: number;
}

export interface WorkshopAttendedVehicleItem {
  vehicleId: string;
  plate: string;
  description: string | null;
  ordersCount: number;
  totalRevenue: number;
}

export interface WorkshopReport {
  isWorkshop: boolean;
  period: { from: string; to: string };
  services: WorkshopServiceItem[];
  technicians: WorkshopTechnicianItem[];
  vehiclesAttendedCount: number;
  vehiclesAttended: WorkshopAttendedVehicleItem[];
}
