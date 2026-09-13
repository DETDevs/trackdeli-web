import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminUsers,
  createAdminUser,
  resetAdminUserPassword,
  updateAdminUserStatus,
  type AdminUser,
  type CreateAdminUserDto,
  type ResetAdminUserPasswordDto,
  type UpdateAdminUserStatusDto,
} from 'api-client';
import { toast } from 'react-hot-toast';

export const ADMIN_USERS_QUERY_KEY = ['admin-users'];

export const useAdminUsers = () => {
  return useQuery<AdminUser[]>({
    queryKey: ADMIN_USERS_QUERY_KEY,
    queryFn: () => getAdminUsers(),
    staleTime: 30000,
  });
};

export const useCreateAdminUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAdminUserDto) => createAdminUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY });
      toast.success('Cajero creado exitosamente');
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || 'Error al crear cajero';
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
      const msg = error?.response?.data?.message || 'Error al actualizar contraseña';
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
      toast.success(
        updated.isActive
          ? 'Cajero activado exitosamente'
          : 'Cajero desactivado exitosamente'
      );
    },
    onError: (error: any) => {
      if (error?.response?.status === 403) {
        toast.error('No tienes permisos para modificar el estado de este usuario');
        return;
      }
      const msg = error?.response?.data?.message || 'Error al cambiar estado';
      toast.error(msg);
    },
  });
};
