import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';
import toast from 'react-hot-toast';

export type BusinessType = 'NEGOCIO' | 'EMPRESA_RIDERS';

export interface BusinessItem {
  id: string;
  name: string;
  type: string | null;
  businessType?: BusinessType;
  commissionRate?: number;
  altCommissionRate?: number;
  altCommissionDistanceKm?: number;
  dispatchTimeoutMin?: number;
  logoUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
  createdAt: string;
  _count: {
    orders: number;
    users: number;
  };
  ordersToday: number;
  ordersThisMonth: number;
  activeOrders: number;
  whatsappNumber?: string | null;
  whatsappDisplay?: string | null;
  membership?: {
    status: 'ACTIVE' | 'EXPIRED' | 'NONE' | 'NOT_CONTRACTED';
    endDate: string | null;
    daysLeft: number | null;
  };
  productSubscriptions?: Array<{
    id?: string;
    productType: 'DELIVERY' | 'POS' | 'CARTERA_COBRO' | 'CITAS';
    status: 'ACTIVE' | 'INACTIVE';
    deliveryMonthlyFee?: number | null;
    posVertical?: 'RESTAURANTE' | 'RETAIL' | null;
    salonProfile?: 'RESTAURANTE' | 'TALLER' | null;
    maxDevices?: number | null;
    webBillingEnabled?: boolean;
    maxWebDevices?: number | null;
    trialHours?: number | null;
    trialStartedAt?: string | null;
    trialEndsAt?: string | null;
    posMonthlyFee?: number | null;
    carteraMonthlyFee?: number | null;
    citasMonthlyFee?: number | null;
  }>;
  industry?: {
    id: string;
    name: string;
  };
  hasPOS?: boolean;
  hasTrackDeli?: boolean;
  hasCarteraCobro?: boolean;
  hasCitas?: boolean;
  salonProfile?: 'RESTAURANTE' | 'TALLER' | null;
  maxDevices?: number | null;
  webBillingEnabled?: boolean;
  maxWebDevices?: number | null;
  trialHours?: number | null;
  trialStartedAt?: string | null;
  trialEndsAt?: string | null;
  activeDevices?: number;
}

export interface BusinessDetail extends BusinessItem {
  defaultGeofenceRadiusM: number;
  encargados: Array<{
    id: string;
    name: string;
    email: string;
    phone: string | null;
    isActive: boolean;
    createdAt: string;
  }>;
  riders: Array<{
    id: string;
    name: string;
    email: string;
    phone: string | null;
    vehicleType: string | null;
    vehiclePlate: string | null;
    profilePhotoUrl: string | null;
  }>;
  recentOrders: Array<{
    id: string;
    status: string;
    customerName: string;
    customerPhone: string;
    destinationAddress: string | null;
    deliveryFee: number;
    createdAt: string;
    takenAt: string | null;
    deliveredAt: string | null;
    deliveryUser?: {
      id: string;
      name: string;
      phone: string | null;
      vehicleType: string | null;
    } | null;
  }>;
  monthlyMetrics: {
    ordersCreated: number;
    ordersDelivered: number;
    ordersCancelled: number;
    deliveryRate: number;
  };
  userUsage?: {
    used: number;
    base: number;
    extra: number;
    limit: number;
    remaining: number;
  };
}

export interface CreateBusinessInput {
  name: string;
  type?: string;
  businessType?: BusinessType;
  commissionRate?: number;
  altCommissionRate?: number;
  altCommissionDistanceKm?: number;
  dispatchTimeoutMin?: number;
  industryId?: string;
  hasDelivery?: boolean;
  deliveryMonthlyFee?: number;
  hasPOS?: boolean;
  posVertical?: string;
  salonProfile?: 'RESTAURANTE' | 'TALLER' | null;
  maxDevices?: number | null;
  trialHours?: number | null;
  posMonthlyFee?: number;
  hasCarteraCobro?: boolean;
  carteraMonthlyFee?: number;
  hasCitas?: boolean;
  citasMonthlyFee?: number;
  encargado?: {
    name: string;
    email: string;
    password: string;
  };
}

export interface CreateBusinessResult {
  business: {
    id: string;
    name: string;
    type: string | null;
    businessType?: BusinessType;
    isActive: boolean;
    createdAt: string;
  };
  encargado: {
    id: string;
    name: string;
    email: string;
    temporaryPassword: string;
    role: string;
    isActive: boolean;
  };
}

export function useBusinesses() {
  return useQuery<BusinessItem[]>({
    queryKey: ['superadmin-businesses'],
    queryFn: async () => {
      const { data } = await apiClient.get('/superadmin/businesses');
      return data;
    },
    refetchInterval: 30000,
  });
}

export function useBusinessDetail(id: string) {
  return useQuery<BusinessDetail>({
    queryKey: ['superadmin-business', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/superadmin/businesses/${id}`);
      return data;
    },
    enabled: !!id,
    refetchInterval: 20000,
  });
}

export function useToggleBusiness() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.patch(`/superadmin/businesses/${id}/toggle`);
      return data;
    },
    onSuccess: (data) => {
      toast.success(
        data.isActive ? 'Negocio activado' : 'Negocio desactivado'
      );
      queryClient.invalidateQueries({ queryKey: ['superadmin-businesses'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-business', data.id] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-metrics'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Error al cambiar estado del negocio');
    },
  });
}

export function useCreateBusiness() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateBusinessInput) => {
      const { data } = await apiClient.post('/superadmin/businesses', input);
      return data;
    },
    onSuccess: () => {
      toast.success('Negocio y encargado creados exitosamente');
      queryClient.invalidateQueries({ queryKey: ['superadmin-metrics'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message;
      const errorText = Array.isArray(msg) ? msg.join(', ') : msg || 'Error al crear el negocio';
      toast.error(errorText);
    },
  });
}

export interface UpdateBusinessInput {
  name?: string;
  type?: string;
  businessType?: BusinessType;
  commissionRate?: number;
  altCommissionRate?: number;
  altCommissionDistanceKm?: number;
  dispatchTimeoutMin?: number;
  isActive?: boolean;
}

export function useUpdateBusiness() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateBusinessInput }) => {
      try {
        const res = await apiClient.patch(`/superadmin/businesses/${id}`, data);
        return res.data;
      } catch (err: any) {
        if (err?.response?.status === 404) {
          const res2 = await apiClient.patch(`/businesses/${id}`, data);
          return res2.data;
        }
        throw err;
      }
    },
    onSuccess: (data) => {
      toast.success('Configuración del negocio actualizada');
      queryClient.invalidateQueries({ queryKey: ['superadmin-businesses'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-business', data.id] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Error al actualizar el negocio');
    },
  });
}

export function useUpdateUserQuota() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, extraUserSlots }: { id: string; extraUserSlots: number }) => {
      const { data } = await apiClient.patch(`/superadmin/businesses/${id}/user-quota`, { extraUserSlots });
      return data;
    },
    onSuccess: (_, variables) => {
      toast.success('Cupo de usuarios actualizado');
      queryClient.invalidateQueries({ queryKey: ['superadmin-business', variables.id] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Error al actualizar cupo');
    },
  });
}

export function useBusinessCommissions(businessId: string, month?: number, year?: number) {
  return useQuery({
    queryKey: ['superadmin-business-commissions', businessId, month, year],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get(`/superadmin/businesses/${businessId}/commissions`, {
          params: { month, year },
        });
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
    enabled: !!businessId,
  });
}

export function useBusinessStatements(businessId: string) {
  return useQuery({
    queryKey: ['superadmin-business-statements', businessId],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get(`/superadmin/businesses/${businessId}/statements`);
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
    enabled: !!businessId,
  });
}

export interface PosDeviceItem {
  id: string;
  businessId: string;
  deviceId: string;
  name: string;
  status: 'ACTIVE' | 'REVOKED';
  lastSeenAt: string | null;
  createdAt: string;
  revokedAt?: string | null;
}

export interface UpdatePosSubscriptionInput {
  salonProfile?: 'RESTAURANTE' | 'TALLER' | null;
  maxDevices?: number | null;
  webBillingEnabled?: boolean;
  maxWebDevices?: number | null;
  backofficeTier?: 'BASIC' | 'PRO' | null;
  trialHours?: number | null;
  trialAction?: 'extend' | 'reset' | 'terminate' | null;
  extendHours?: number;
}

export function useUpdatePosSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      businessId,
      data,
    }: {
      businessId: string;
      data: UpdatePosSubscriptionInput;
    }) => {
      const res = await apiClient.patch(
        `/superadmin/businesses/${businessId}/pos-subscription`,
        data
      );
      return res.data;
    },
    onSuccess: (_, variables) => {
      toast.success('Configuración POS actualizada');
      queryClient.invalidateQueries({ queryKey: ['superadmin-business', variables.businessId] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-businesses'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-business-products', variables.businessId] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message;
      const errorText = Array.isArray(msg) ? msg.join(', ') : msg || 'Error al actualizar configuración POS';
      toast.error(errorText);
    },
  });
}

export function useBusinessDevices(businessId: string) {
  return useQuery<PosDeviceItem[]>({
    queryKey: ['superadmin-business-devices', businessId],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get(`/superadmin/businesses/${businessId}/devices`);
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
    enabled: !!businessId,
    refetchInterval: 15000,
  });
}

export function useUpdateBusinessDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      businessId,
      deviceId,
      data,
    }: {
      businessId: string;
      deviceId: string;
      data: { status?: 'ACTIVE' | 'REVOKED'; name?: string };
    }) => {
      const res = await apiClient.patch(
        `/superadmin/businesses/${businessId}/devices/${deviceId}`,
        data
      );
      return res.data;
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.data.status === 'REVOKED'
          ? 'Computadora revocada exitosamente'
          : 'Computadora reactivada exitosamente'
      );
      queryClient.invalidateQueries({ queryKey: ['superadmin-business-devices', variables.businessId] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-business', variables.businessId] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-businesses'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message;
      const errorText = Array.isArray(msg) ? msg.join(', ') : msg || 'Error al actualizar dispositivo';
      toast.error(errorText);
    },
  });
}

export interface PosWebDeviceItem {
  id: string;
  businessId: string;
  deviceId: string;
  name: string;
  platform?: string | null;
  appVersion?: string | null;
  status: 'ACTIVE' | 'REVOKED';
  category?: string;
  userId?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
  firstSeenAt: string;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt?: string;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export function useBusinessWebDevices(businessId: string) {
  return useQuery<PosWebDeviceItem[]>({
    queryKey: ['superadmin-business-web-devices', businessId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/superadmin/businesses/${businessId}/web-devices`);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!businessId,
    refetchInterval: 15000,
  });
}

export function useUpdateBusinessWebDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      businessId,
      deviceId,
      data,
    }: {
      businessId: string;
      deviceId: string;
      data: { status?: 'ACTIVE' | 'REVOKED'; name?: string };
    }) => {
      const res = await apiClient.patch(
        `/superadmin/businesses/${businessId}/web-devices/${deviceId}`,
        data
      );
      return res.data;
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.data.status === 'REVOKED'
          ? 'Dispositivo web revocado exitosamente'
          : 'Dispositivo web reactivado exitosamente'
      );
      queryClient.invalidateQueries({ queryKey: ['superadmin-business-web-devices', variables.businessId] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-business', variables.businessId] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-businesses'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message;
      const errorText = Array.isArray(msg) ? msg.join(', ') : msg || 'Error al actualizar dispositivo web';
      toast.error(errorText);
    },
  });
}


