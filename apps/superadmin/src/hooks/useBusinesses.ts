import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';
import toast from 'react-hot-toast';

export interface BusinessItem {
  id: string;
  name: string;
  type: string | null;
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
  membership?: {
    status: 'ACTIVE' | 'EXPIRED' | 'NONE';
    endDate: string | null;
    daysLeft: number | null;
  };
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
}

export interface CreateBusinessInput {
  name: string;
  type?: string;
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
      queryClient.invalidateQueries({ queryKey: ['superadmin-businesses'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-metrics'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Error al crear el negocio');
    },
  });
}
