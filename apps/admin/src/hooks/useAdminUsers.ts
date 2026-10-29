import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminUsers,
  createAdminUser,
  resetAdminUserPassword,
  updateAdminUserStatus,
  apiClient,
  type AdminUser,
  type CreateAdminUserDto,
  type ResetAdminUserPasswordDto,
  type UpdateAdminUserStatusDto,
} from 'api-client';
import { toast } from 'react-hot-toast';

export const ADMIN_USERS_QUERY_KEY = ['admin-users'];
export const USER_QUOTA_QUERY_KEY = ['pos-users-quota'];

export interface UserQuotaUsage {
  used: number;
  base: number;
  extra: number;
  limit: number;
  remaining: number;
}

export const useAdminUsers = (enabled: boolean = true) => {
  return useQuery<AdminUser[]>({
    queryKey: ADMIN_USERS_QUERY_KEY,
    queryFn: () => getAdminUsers(),
    staleTime: 30000,
    enabled,
  });
};

export const useUserQuota = (enabled: boolean = true) => {
  return useQuery<{ users: AdminUser[]; usage: UserQuotaUsage }>({
    queryKey: USER_QUOTA_QUERY_KEY,
    queryFn: async () => {
      const res = await apiClient.get('/pos/users');
      return res.data;
    },
    staleTime: 30000,
    enabled,
    retry: 1,
  });
};

const extractApiError = (error: any, defaultMsg: string): string => {
  const msgObj = error?.response?.data?.message;
  if (typeof msgObj === 'string') return msgObj;
  if (msgObj && typeof msgObj === 'object' && msgObj.message) return msgObj.message;
  return defaultMsg;
};

export const useCreateAdminUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAdminUserDto) => createAdminUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: USER_QUOTA_QUERY_KEY });
      toast.success('Usuario creado exitosamente');
    },
    onError: (error: any) => {
      const msg = extractApiError(error, 'Error al crear usuario');
      toast.error(msg);
    },
  });
};

export const useResetAdminUserPassword = () => {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ResetAdminUserPasswordDto }) =>
      resetAdminUserPassword(id, data),
    onSuccess: () => {
      toast.success('Contraseña actualizada correctamente');
    },
    onError: (error: any) => {
      if (error?.response?.status === 403) {
        toast.error('No tienes permisos para modificar la contraseña de este usuario');
        return;
      }
      const msg = extractApiError(error, 'Error al actualizar contraseña');
      toast.error(msg);
    },
  });
};

export const useUpdateAdminUserStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAdminUserStatusDto }) =>
      updateAdminUserStatus(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: USER_QUOTA_QUERY_KEY });
      toast.success(
        updated.isActive
          ? 'Usuario activado exitosamente'
          : 'Usuario desactivado exitosamente'
      );
    },
    onError: (error: any) => {
      if (error?.response?.status === 403) {
        toast.error('No tienes permisos para modificar el estado de este usuario');
        return;
      }
      const msg = extractApiError(error, 'Error al cambiar estado');
      toast.error(msg);
    },
  });
};
