import { useQuery } from '@tanstack/react-query';
import { apiClient } from 'api-client';
import {
  PeriodType,
  ReportsSummary,
  SalesByTimeReport,
  SalesByCategoryReport,
  SalesByCashierReport,
  ProfitReport,
  ControlReport,
  WorkshopReport,
} from '../types/reports';

export interface ReportQueryParams {
  period: PeriodType;
  from?: string;
  to?: string;
  businessId?: string;
}

const buildReportQueryString = (params: ReportQueryParams) => {
  const query = new URLSearchParams();
  if (params.period === 'custom' && params.from && params.to) {
    query.set('from', params.from);
    query.set('to', params.to);
  } else {
    query.set('period', params.period);
  }
  if (params.businessId) {
    query.set('businessId', params.businessId);
  }
  return query.toString();
};

/**
 * Hook para obtener el resumen principal de Ventas y Operaciones
 */
export const useReportsOverview = (params: ReportQueryParams, enabled = true) => {
  return useQuery<ReportsSummary>({
    queryKey: ['pos-reports', 'overview', params],
    queryFn: async () => {
      const qs = buildReportQueryString(params);
      const res = await apiClient.get<ReportsSummary>(`/pos/reports?${qs}`);
      return res.data;
    },
    enabled,
    staleTime: 30000,
    retry: 1,
  });
};

/**
 * Hook para Ventas por hora y por día de la semana
 */
export const useSalesByTime = (params: ReportQueryParams, enabled = true) => {
  return useQuery<SalesByTimeReport>({
    queryKey: ['pos-reports', 'sales-by-time', params],
    queryFn: async () => {
      const qs = buildReportQueryString(params);
      const res = await apiClient.get<SalesByTimeReport>(`/pos/reports/sales-by-time?${qs}`);
      return res.data;
    },
    enabled,
    staleTime: 30000,
    retry: 1,
  });
};

/**
 * Hook para Ventas por categoría
 */
export const useSalesByCategory = (params: ReportQueryParams, enabled = true) => {
  return useQuery<SalesByCategoryReport>({
    queryKey: ['pos-reports', 'sales-by-category', params],
    queryFn: async () => {
      const qs = buildReportQueryString(params);
      const res = await apiClient.get<SalesByCategoryReport>(`/pos/reports/sales-by-category?${qs}`);
      return res.data;
    },
    enabled,
    staleTime: 30000,
    retry: 1,
  });
};

/**
 * Hook para Ventas por cajero
 */
export const useSalesByCashier = (params: ReportQueryParams, enabled = true) => {
  return useQuery<SalesByCashierReport>({
    queryKey: ['pos-reports', 'sales-by-cashier', params],
    queryFn: async () => {
      const qs = buildReportQueryString(params);
      const res = await apiClient.get<SalesByCashierReport>(`/pos/reports/sales-by-cashier?${qs}`);
      return res.data;
    },
    enabled,
    staleTime: 30000,
    retry: 1,
  });
};

/**
 * Hook para el reporte de Ganancias y Cobertura de Costos
 */
export const useProfitReport = (params: ReportQueryParams, enabled = true) => {
  return useQuery<ProfitReport>({
    queryKey: ['pos-reports', 'profit', params],
    queryFn: async () => {
      const qs = buildReportQueryString(params);
      const res = await apiClient.get<ProfitReport>(`/pos/reports/profit?${qs}`);
      return res.data;
    },
    enabled,
    staleTime: 30000,
    retry: 1,
  });
};

/**
 * Hook para el reporte de Control y Auditoría
 */
export const useControlReport = (params: ReportQueryParams, enabled = true) => {
  return useQuery<ControlReport>({
    queryKey: ['pos-reports', 'control', params],
    queryFn: async () => {
      const qs = buildReportQueryString(params);
      const res = await apiClient.get<ControlReport>(`/pos/reports/control?${qs}`);
      return res.data;
    },
    enabled,
    staleTime: 30000,
    retry: 1,
  });
};

/**
 * Hook para el reporte de Taller (solo negocios taller)
 */
export const useWorkshopReport = (params: ReportQueryParams, enabled = true) => {
  return useQuery<WorkshopReport>({
    queryKey: ['pos-reports', 'workshop', params],
    queryFn: async () => {
      const qs = buildReportQueryString(params);
      const res = await apiClient.get<WorkshopReport>(`/pos/reports/workshop?${qs}`);
      return res.data;
    },
    enabled,
    staleTime: 30000,
    retry: 1,
  });
};
