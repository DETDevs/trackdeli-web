import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';
import toast from 'react-hot-toast';

export type BusinessProductType = 'DELIVERY' | 'POS';
export type BusinessProductStatus = 'ACTIVE' | 'INACTIVE';
export type PosVertical = 'RESTAURANTE' | 'RETAIL';

export type BusinessProductAction =
  | 'ACTIVATED'
  | 'DEACTIVATED'
  | 'DEACTIVATION_BLOCKED'
  | 'DEACTIVATION_FORCED'
  | 'CONFIG_UPDATED';

export interface BusinessProductDeliverySub {
  id?: string;
  productType: 'DELIVERY';
  status: BusinessProductStatus;
  commissionRate?: number;
  altCommissionRate?: number;
  altCommissionDistanceKm?: number;
  dispatchTimeoutMin?: number;
  activatedAt?: string | null;
  activatedBy?: string | null;
  deactivatedAt?: string | null;
  deactivatedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface BusinessProductPosSub {
  id?: string;
  productType: 'POS';
  status: BusinessProductStatus;
  posVertical?: PosVertical | null;
  posMonthlyFee?: number | null;
  activatedAt?: string | null;
  activatedBy?: string | null;
  deactivatedAt?: string | null;
  deactivatedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface BusinessProductsResponse {
  businessId: string;
  businessName: string;
  products: {
    DELIVERY: BusinessProductDeliverySub;
    POS: BusinessProductPosSub;
  };
}

export interface ActivateProductDto {
  commissionRate?: number;
  altCommissionRate?: number;
  altCommissionDistanceKm?: number;
  dispatchTimeoutMin?: number;
  posVertical?: PosVertical;
  posMonthlyFee?: number;
  reason?: string;
}

export interface DeactivateProductDto {
  reason?: string;
}

export interface BusinessProductAuditLogItem {
  id: string;
  businessId: string;
  productType: BusinessProductType;
  action: BusinessProductAction;
  performedBy: string;
  reason: string | null;
  metadata: any | null;
  createdAt: string;
}

export interface DeactivationConflictDetails {
  activeOrders?: number;
  activeDispatches?: number;
  openCashRegisters?: number;
  [key: string]: any;
}

export interface DeactivationConflictError {
  statusCode: number;
  message: string;
  error: string;
  details?: DeactivationConflictDetails;
}

export function useBusinessProducts(businessId: string) {
  return useQuery<BusinessProductsResponse>({
    queryKey: ['superadmin-business-products', businessId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/businesses/${businessId}/products`);
      return data;
    },
    enabled: !!businessId,
    refetchInterval: 15000,
  });
}

export function useBusinessProductAuditLog(
  businessId: string,
  productType: BusinessProductType | null,
  enabled = true
) {
  return useQuery<BusinessProductAuditLogItem[]>({
    queryKey: ['superadmin-product-audit-log', businessId, productType],
    queryFn: async () => {
      if (!productType) return [];
      const { data } = await apiClient.get(
        `/businesses/${businessId}/products/${productType}/audit-log`
      );
      return Array.isArray(data) ? data : [];
    },
    enabled: !!businessId && !!productType && enabled,
  });
}

export function useActivateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      businessId,
      productType,
      dto,
    }: {
      businessId: string;
      productType: BusinessProductType;
      dto: ActivateProductDto;
    }) => {
      const { data } = await apiClient.post(
        `/businesses/${businessId}/products/${productType}/activate`,
        dto
      );
      return data;
    },
    onSuccess: (_, variables) => {
      const label = variables.productType === 'DELIVERY' ? 'TrackDeli (Delivery)' : 'Sistema POS';
      toast.success(`Producto ${label} activado / configurado con éxito`);
      queryClient.invalidateQueries({
        queryKey: ['superadmin-business-products', variables.businessId],
      });
      queryClient.invalidateQueries({
        queryKey: ['superadmin-product-audit-log', variables.businessId, variables.productType],
      });
      queryClient.invalidateQueries({
        queryKey: ['superadmin-business', variables.businessId],
      });
      queryClient.invalidateQueries({
        queryKey: ['superadmin-businesses'],
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Error al activar el producto');
    },
  });
}

export function useDeactivateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      businessId,
      productType,
      force = false,
      reason,
    }: {
      businessId: string;
      productType: BusinessProductType;
      force?: boolean;
      reason?: string;
    }) => {
      const params = force ? { force: 'true' } : {};
      const { data } = await apiClient.post(
        `/businesses/${businessId}/products/${productType}/deactivate`,
        { reason },
        { params }
      );
      return data;
    },
    onSuccess: (data, variables) => {
      const label = variables.productType === 'DELIVERY' ? 'TrackDeli (Delivery)' : 'Sistema POS';
      if (data?.forced) {
        toast.success(`Producto ${label} desactivado de forma forzada`);
      } else {
        toast.success(`Producto ${label} desactivado con éxito`);
      }
      queryClient.invalidateQueries({
        queryKey: ['superadmin-business-products', variables.businessId],
      });
      queryClient.invalidateQueries({
        queryKey: ['superadmin-product-audit-log', variables.businessId, variables.productType],
      });
      queryClient.invalidateQueries({
        queryKey: ['superadmin-business', variables.businessId],
      });
      queryClient.invalidateQueries({
        queryKey: ['superadmin-businesses'],
      });
    },
  });
}
