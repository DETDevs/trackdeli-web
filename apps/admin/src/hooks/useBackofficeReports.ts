import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from 'api-client';
import {
  ReportsSummary,
  SalesByTimeReport,
  SalesByCategoryReport,
  SalesByCashierReport,
  ProfitReport,
  ControlReport,
  WorkshopReport,
  SalesBySellerReport,
  SalesByChannelReport,
  DomicilioReport,
  PedidosYaReport,
  PedidosYaSettlementPendingSummary,
  PedidosYaSettlementRecord,
  ChannelDriver,
  PosBank,
  ReportQueryParams,
} from '../types/reports';

export type { ReportQueryParams };

export const buildReportQueryString = (params: ReportQueryParams) => {
  const query = new URLSearchParams();
  if (params.period === 'custom' && params.from && params.to) {
    query.set('from', params.from);
    query.set('to', params.to);
  } else {
    query.set('period', params.period);
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);
  }
  if (params.businessId) {
    query.set('businessId', params.businessId);
  }
  if (params.channel) {
    query.set('channel', params.channel);
  }
  if (params.driverId) {
    query.set('driverId', params.driverId);
  }
  if (params.status) {
    query.set('status', params.status);
  }
  if (params.paymentMode) {
    query.set('paymentMode', params.paymentMode);
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

/**
 * Hook para el reporte de Venta en dos pasos por Vendedor
 */
export const useSalesBySeller = (params: ReportQueryParams, enabled = true) => {
  return useQuery<SalesBySellerReport>({
    queryKey: ['pos-reports', 'sales-by-seller', params],
    queryFn: async () => {
      const qs = buildReportQueryString(params);
      const res = await apiClient.get<SalesBySellerReport>(`/pos/reports/sales-by-seller?${qs}`);
      return res.data;
    },
    enabled,
    staleTime: 30000,
    retry: 1,
  });
};

/**
 * Hook para el reporte de Ventas por Canal (Mostrador, Domicilio, PedidosYa)
 */
export const useSalesByChannel = (params: ReportQueryParams, enabled = true) => {
  return useQuery<SalesByChannelReport>({
    queryKey: ['pos-reports', 'sales-by-channel', params],
    queryFn: async () => {
      const qs = buildReportQueryString(params);
      const res = await apiClient.get<SalesByChannelReport>(`/pos/reports/sales-by-channel?${qs}`);
      return res.data;
    },
    enabled,
    staleTime: 30000,
    retry: 1,
  });
};

/**
 * Hook para el reporte específico de A Domicilio
 */
export const useDomicilioReport = (params: ReportQueryParams, enabled = true) => {
  return useQuery<DomicilioReport>({
    queryKey: ['pos-reports', 'domicilio', params],
    queryFn: async () => {
      const qs = buildReportQueryString(params);
      const res = await apiClient.get<DomicilioReport>(`/pos/reports/domicilio?${qs}`);
      return res.data;
    },
    enabled,
    staleTime: 30000,
    retry: 1,
  });
};

/**
 * Hook para el reporte específico de PedidosYa
 */
export const usePedidosYaReport = (params: ReportQueryParams, enabled = true) => {
  return useQuery<PedidosYaReport>({
    queryKey: ['pos-reports', 'pedidosya', params],
    queryFn: async () => {
      const qs = buildReportQueryString(params);
      const res = await apiClient.get<PedidosYaReport>(`/pos/reports/pedidosya?${qs}`);
      return res.data;
    },
    enabled,
    staleTime: 30000,
    retry: 1,
  });
};

/**
 * Hook para obtener pedidos pendientes de liquidación de PedidosYa
 */
export const usePedidosYaSettlementPending = (
  dateRange?: { from?: string; to?: string },
  enabled = true
) => {
  return useQuery<PedidosYaSettlementPendingSummary>({
    queryKey: ['pos-reports', 'pedidosya-settlement-pending', dateRange],
    queryFn: async () => {
      const q = new URLSearchParams();
      q.set('status', 'PENDIENTE');
      if (dateRange?.from) q.set('from', dateRange.from);
      if (dateRange?.to) q.set('to', dateRange.to);
      const res = await apiClient.get<PedidosYaSettlementPendingSummary>(
        `/pos/pedidosya/settlement?${q.toString()}`
      );
      return res.data;
    },
    enabled,
    staleTime: 15000,
    retry: 1,
  });
};

/**
 * Hook para listar el historial de liquidaciones registradas de PedidosYa
 */
export const usePedidosYaSettlementsList = (enabled = true) => {
  return useQuery<PedidosYaSettlementRecord[]>({
    queryKey: ['pos-reports', 'pedidosya-settlements-list'],
    queryFn: async () => {
      const res = await apiClient.get<PedidosYaSettlementRecord[]>(`/pos/pedidosya/settlements`);
      return res.data;
    },
    enabled,
    staleTime: 30000,
    retry: 1,
  });
};

/**
 * Hook para obtener la lista de repartidores del negocio
 */
export const useChannelDrivers = (enabled = true) => {
  return useQuery<ChannelDriver[]>({
    queryKey: ['pos', 'channels-drivers'],
    queryFn: async () => {
      const res = await apiClient.get<ChannelDriver[]>(`/pos/channels/drivers`);
      return res.data;
    },
    enabled,
    staleTime: 60000,
    retry: 1,
  });
};

/**
 * Hook para obtener bancos configurados
 */
export const usePosBanks = (enabled = true) => {
  return useQuery<PosBank[]>({
    queryKey: ['pos', 'banks'],
    queryFn: async () => {
      const res = await apiClient.get<PosBank[]>(`/pos/banks`);
      return res.data;
    },
    enabled,
    staleTime: 60000,
    retry: 1,
  });
};

export interface CreateSettlementDto {
  depositDate: string;
  depositAmount: number;
  bankId?: string;
  reference?: string;
  notes?: string;
  saleIds: string[];
}

/**
 * Hook mutation para registrar una liquidación de PedidosYa
 */
export const useRegisterPedidosYaSettlement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateSettlementDto) => {
      const res = await apiClient.post<PedidosYaSettlementRecord>(
        `/pos/pedidosya/settlements`,
        dto
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-reports', 'pedidosya-settlement-pending'] });
      queryClient.invalidateQueries({ queryKey: ['pos-reports', 'pedidosya-settlements-list'] });
      queryClient.invalidateQueries({ queryKey: ['pos-reports', 'pedidosya'] });
      queryClient.invalidateQueries({ queryKey: ['pos-reports', 'sales-by-channel'] });
    },
  });
};

/**
 * Descarga reporte en formato CSV generado por el backend
 */
export const downloadReportCsv = async (
  endpoint: string,
  params: ReportQueryParams,
  filename: string
) => {
  const qs = buildReportQueryString(params);
  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `${endpoint}${separator}${qs ? qs + '&' : ''}format=csv`;
  const res = await apiClient.get(url, { responseType: 'blob' });
  const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', downloadUrl);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
};

