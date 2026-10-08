import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { meseroApi } from '../services/meseroApi';
import { POLLING_CONFIG, getTablesRefetchInterval } from '../config/polling';
import toast from 'react-hot-toast';

export const useWaiters = (slugOrId: string) => {
  return useQuery({
    queryKey: ['mesero', 'waiters', slugOrId],
    queryFn: () => meseroApi.getWaiters(slugOrId),
    enabled: Boolean(slugOrId),
    staleTime: 30000,
  });
};

export const useLoginWithPin = (slugOrId: string) => {
  return useMutation({
    mutationFn: (payload: { waiterId: string; pin: string }) =>
      meseroApi.loginWithPin(slugOrId, payload),
  });
};

export interface UseTablesStatusOptions {
  enabledPolling?: boolean;
}

export const useTablesStatus = (options: UseTablesStatusOptions = {}) => {
  const { enabledPolling = true } = options;

  return useQuery({
    queryKey: ['mesero', 'tables'],
    queryFn: () => meseroApi.getTablesStatus(),
    refetchInterval: enabledPolling ? getTablesRefetchInterval : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
};

export const useZones = () => {
  return useQuery({
    queryKey: ['mesero', 'zones'],
    queryFn: () => meseroApi.getZones(),
    staleTime: 300000,
    refetchInterval: false,
  });
};

export const useCategories = () => {
  return useQuery({
    queryKey: ['mesero', 'categories'],
    queryFn: () => meseroApi.getCategories(),
    staleTime: 120000,
  });
};

export const useProducts = (params?: { categoryId?: string; search?: string }) => {
  return useQuery({
    queryKey: ['mesero', 'products', params?.categoryId, params?.search],
    queryFn: () => meseroApi.getProducts(params),
    staleTime: 60000,
  });
};

export const useActiveOrder = (tableId: string) => {
  return useQuery({
    queryKey: ['mesero', 'order', tableId],
    queryFn: () => meseroApi.getActiveOrder(tableId),
    enabled: Boolean(tableId),
    refetchInterval: () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return false;
      }
      return POLLING_CONFIG.ACTIVE_ORDER_INTERVAL_MS;
    },
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
};

export const useAddOrderItems = (tableId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      items: { productId: string; quantity: number; notes?: string }[];
    }) => meseroApi.addOrderItems(tableId, payload),
    onSuccess: () => {
      // Invalida inmediatamente el pedido activo y el estado de mesas
      queryClient.invalidateQueries({ queryKey: ['mesero', 'order', tableId] });
      queryClient.invalidateQueries({ queryKey: ['mesero', 'tables'] });
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        'Error al enviar comanda a cocina. Por favor intentá de nuevo.';
      toast.error(msg, { duration: 4000 });
    },
  });
};
