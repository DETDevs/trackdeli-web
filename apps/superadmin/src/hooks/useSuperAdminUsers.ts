import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';
import {
  type AdminUser,
  type CreateAdminUserDto,
  type ResetAdminUserPasswordDto,
  type UpdateAdminUserStatusDto,
} from 'api-client';
import { toast } from 'react-hot-toast';

export const SUPERADMIN_USERS_QUERY_KEY = 'admin-users';

export const fetchSuperAdminUsers = async (params?: { businessId?: string }): Promise<AdminUser[]> => {
  const { data } = await apiClient.get<AdminUser[]>('/admin/users', { params });
  return data;
};

export const createSuperAdminUserApi = async (dto: CreateAdminUserDto): Promise<AdminUser> => {
  const { data } = await apiClient.post<AdminUser>('/admin/users', dto);
  return data;
};

export const resetSuperAdminUserPasswordApi = async (
  id: string,
  dto: ResetAdminUserPasswordDto
): Promise<{ message: string }> => {
  const { data } = await apiClient.patch<{ message: string }>(`/admin/users/${id}/password`, dto);
  return data;
};

export const updateSuperAdminUserStatusApi = async (
  id: string,
  dto: UpdateAdminUserStatusDto
): Promise<AdminUser> => {
  const { data } = await apiClient.patch<AdminUser>(`/admin/users/${id}/status`, dto);
  return data;
};

export const useSuperAdminUsers = (params?: { businessId?: string }) => {
  return useQuery<AdminUser[]>({
    queryKey: [SUPERADMIN_USERS_QUERY_KEY, params?.businessId || 'all'],
    queryFn: () => fetchSuperAdminUsers(params),
    staleTime: 30000,
  });
};

export const useCreateSuperAdminUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAdminUserDto) => createSuperAdminUserApi(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [SUPERADMIN_USERS_QUERY_KEY] });
      if (variables.businessId) {
        queryClient.invalidateQueries({ queryKey: ['business', variables.businessId] });
      }
      toast.success('Usuario creado exitosamente');
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || 'Error al crear usuario';
      toast.error(msg);
    },
  });
};

export const useResetSuperAdminUserPassword = () => {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ResetAdminUserPasswordDto }) =>
      resetSuperAdminUserPasswordApi(id, data),
    onSuccess: () => {
      toast.success('Contraseña actualizada correctamente');
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || 'Error al actualizar contraseña';
      toast.error(msg);
    },
  });
};

export const useUpdateSuperAdminUserStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAdminUserStatusDto }) =>
      updateSuperAdminUserStatusApi(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: [SUPERADMIN_USERS_QUERY_KEY] });
      if (updated.businessId) {
        queryClient.invalidateQueries({ queryKey: ['business', updated.businessId] });
      }
      toast.success(
        updated.isActive
          ? 'Usuario activado exitosamente'
          : 'Usuario desactivado exitosamente'
      );
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || 'Error al cambiar estado';
      toast.error(msg);
    },
  });
};
