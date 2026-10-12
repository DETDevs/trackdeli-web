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
        'Error al guardar productos. Por favor intentá de nuevo.';
      toast.error(msg, { duration: 4000 });
    },
  });
};

export const useTableOrderRounds = (tableId: string, enabled = true) => {
  return useQuery({
    queryKey: ['mesero', 'rounds', tableId],
    queryFn: () => meseroApi.getTableOrderRounds(tableId),
    enabled: Boolean(tableId) && enabled,
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

export const useSendToKitchen = (tableId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { clientRequestId: string; itemIds?: string[] }) =>
      meseroApi.sendToKitchen(tableId, payload),
    retry: false, // Sin reintento automático ante errores de red
    onSuccess: (data) => {
      if (data?.tableOrder) {
        queryClient.setQueryData(['mesero', 'order', tableId], data.tableOrder);
      }
      queryClient.invalidateQueries({ queryKey: ['mesero', 'order', tableId] });
      queryClient.invalidateQueries({ queryKey: ['mesero', 'rounds', tableId] });
      queryClient.invalidateQueries({ queryKey: ['mesero', 'tables'] });
    },
    onError: (err: any) => {
      const isNetworkError = !err?.response || err?.code === 'ERR_NETWORK' || err?.message?.includes('Network');
      if (isNetworkError) {
        toast.error('No se pudo enviar. Revisá tu conexión e intentá otra vez', { duration: 5000 });
      } else {
        const msg = err?.response?.data?.message || 'Error al enviar comanda a cocina.';
        toast.error(msg, { duration: 4000 });
      }
    },
  });
};

export const useVoidOrderItem = (tableId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      itemId,
      payload,
    }: {
      itemId: string;
      payload: { reason: string; authorizerPin?: string; qty?: number };
    }) => meseroApi.voidOrderItem(tableId, itemId, payload),
    retry: false,
    onSuccess: (data) => {
      if (data?.tableOrder) {
        queryClient.setQueryData(['mesero', 'order', tableId], data.tableOrder);
      }
      queryClient.invalidateQueries({ queryKey: ['mesero', 'order', tableId] });
      queryClient.invalidateQueries({ queryKey: ['mesero', 'rounds', tableId] });
      queryClient.invalidateQueries({ queryKey: ['mesero', 'tables'] });
    },
  });
};

import type {
  StartSplitPayload,
  MoveSplitItemPayload,
  AddSubAccountPayload,
  MergeSubAccountsPayload,
  UndoSplitPayload,
} from '../types/mesero';

export const useDeleteOrderItem = (tableId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => meseroApi.deleteOrderItem(tableId, itemId),
    retry: false,
    onSuccess: (data) => {
      if (data) {
        queryClient.setQueryData(['mesero', 'order', tableId], data);
      }
      queryClient.invalidateQueries({ queryKey: ['mesero', 'order', tableId] });
      queryClient.invalidateQueries({ queryKey: ['mesero', 'tables'] });
    },
  });
};

const handleSplitConflict = (err: any, queryClient: any, tableId: string) => {
  const code = err?.response?.data?.code;
  const msg = err?.response?.data?.message;
  if (
    err?.response?.status === 409 &&
    (code === 'SPLIT_VERSION_CONFLICT' || String(msg).includes('modificada'))
  ) {
    queryClient.invalidateQueries({ queryKey: ['mesero', 'order', tableId] });
    toast.error('La mesa cambió, revisá antes de continuar', { duration: 5000 });
    return true;
  }
  return false;
};

export const useStartSplitOrder = (tableId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: StartSplitPayload) => meseroApi.startSplitOrder(tableId, payload),
    retry: false,
    onSuccess: (data) => {
      if (data) {
        queryClient.setQueryData(['mesero', 'order', tableId], data);
      }
      queryClient.invalidateQueries({ queryKey: ['mesero', 'order', tableId] });
      queryClient.invalidateQueries({ queryKey: ['mesero', 'tables'] });
    },
    onError: (err: any) => {
      if (!handleSplitConflict(err, queryClient, tableId)) {
        const msg = err?.response?.data?.message || 'Error al iniciar división de cuenta';
        toast.error(msg, { duration: 4000 });
      }
    },
  });
};

export const useMoveSplitItem = (tableId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: MoveSplitItemPayload) => meseroApi.moveSplitItem(tableId, payload),
    retry: false,
    onSuccess: (data) => {
      if (data) {
        queryClient.setQueryData(['mesero', 'order', tableId], data);
      }
      queryClient.invalidateQueries({ queryKey: ['mesero', 'order', tableId] });
    },
    onError: (err: any) => {
      if (!handleSplitConflict(err, queryClient, tableId)) {
        const msg = err?.response?.data?.message || 'Error al mover producto';
        toast.error(msg, { duration: 4000 });
      }
    },
  });
};

export const useAddSubAccount = (tableId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload?: AddSubAccountPayload) => meseroApi.addSubAccount(tableId, payload),
    retry: false,
    onSuccess: (data) => {
      if (data) {
        queryClient.setQueryData(['mesero', 'order', tableId], data);
      }
      queryClient.invalidateQueries({ queryKey: ['mesero', 'order', tableId] });
    },
    onError: (err: any) => {
      if (!handleSplitConflict(err, queryClient, tableId)) {
        const msg = err?.response?.data?.message || 'Error al agregar cuenta';
        toast.error(msg, { duration: 4000 });
      }
    },
  });
};

export const useMergeSubAccounts = (tableId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: MergeSubAccountsPayload) => meseroApi.mergeSubAccounts(tableId, payload),
    retry: false,
    onSuccess: (data) => {
      if (data) {
        queryClient.setQueryData(['mesero', 'order', tableId], data);
      }
      queryClient.invalidateQueries({ queryKey: ['mesero', 'order', tableId] });
    },
    onError: (err: any) => {
      if (!handleSplitConflict(err, queryClient, tableId)) {
        const msg = err?.response?.data?.message || 'Error al combinar cuentas';
        toast.error(msg, { duration: 4000 });
      }
    },
  });
};

export const useUndoSplitOrder = (tableId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload?: UndoSplitPayload) => meseroApi.undoSplitOrder(tableId, payload),
    retry: false,
    onSuccess: (data) => {
      if (data) {
        queryClient.setQueryData(['mesero', 'order', tableId], data);
      }
      queryClient.invalidateQueries({ queryKey: ['mesero', 'order', tableId] });
      queryClient.invalidateQueries({ queryKey: ['mesero', 'tables'] });
    },
    onError: (err: any) => {
      if (handleSplitConflict(err, queryClient, tableId)) return;
      const code = err?.response?.data?.code;
      if (code === 'SPLIT_HAS_PAID_ACCOUNTS') {
        queryClient.invalidateQueries({ queryKey: ['mesero', 'order', tableId] });
      } else {
        const msg = err?.response?.data?.message || 'Error al deshacer la división';
        toast.error(msg, { duration: 4000 });
      }
    },
  });
};

