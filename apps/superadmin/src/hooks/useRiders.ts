import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';
import toast from 'react-hot-toast';

export interface RiderItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  vehicleType: string | null;
  vehiclePlate: string | null;
  vehicleColor: string | null;
  profilePhotoUrl: string | null;
  isAvailable: boolean;
  isActive: boolean;
  createdAt: string;
  totalDeliveries: number;
  deliveriesToday: number;
  averageRating: number | null;
  lastDeliveryAt: string | null;
  currentLatitude: number | null;
  currentLongitude: number | null;
  lastLocationAt: string | null;
}

export interface ActiveRiderItem {
  id: string;
  name: string;
  vehicleType: string | null;
  currentLatitude: number | null;
  currentLongitude: number | null;
  lastLocationAt: string | null;
  currentOrder: {
    id: string;
    status: string;
    customerName: string;
    businessName: string;
  } | null;
}

export function useRiders() {
  return useQuery<RiderItem[]>({
    queryKey: ['superadmin-riders'],
    queryFn: async () => {
      const { data } = await apiClient.get('/superadmin/riders');
      return data;
    },
    refetchInterval: 30000,
  });
}

export function useActiveRiders() {
  return useQuery<ActiveRiderItem[]>({
    queryKey: ['superadmin-riders-active'],
    queryFn: async () => {
      const { data } = await apiClient.get('/superadmin/riders/active');
      return data;
    },
    refetchInterval: 10000,
  });
}

export function useToggleRider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.patch(`/superadmin/riders/${id}/toggle`);
      return data;
    },
    onSuccess: (data) => {
      toast.success(
        data.isActive ? 'Repartidor activado' : 'Repartidor desactivado'
      );
      queryClient.invalidateQueries({ queryKey: ['superadmin-riders'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-riders-active'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-metrics'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Error al cambiar estado del repartidor');
    },
  });
}
