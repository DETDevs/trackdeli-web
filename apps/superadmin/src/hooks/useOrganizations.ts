import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getOrganizations,
  getOrganization,
  createOrganization,
  setBusinessOrganization,
  grantOrganizationAccess,
  revokeOrganizationAccess,
  type Organization,
} from 'api-client';
import toast from 'react-hot-toast';

export const ORGANIZATIONS_KEY = ['superadmin', 'organizations'];

export const useOrganizations = () => {
  return useQuery<Organization[]>({
    queryKey: ORGANIZATIONS_KEY,
    queryFn: getOrganizations,
    staleTime: 30000,
  });
};

export const useOrganization = (id?: string | null) => {
  return useQuery<Organization>({
    queryKey: [...ORGANIZATIONS_KEY, id],
    queryFn: () => getOrganization(id!),
    enabled: Boolean(id),
    staleTime: 30000,
  });
};

export const useCreateOrganization = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createOrganization(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORGANIZATIONS_KEY });
      toast.success('Empresa creada correctamente');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al crear la empresa');
    },
  });
};

export const useSetBusinessOrganization = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ businessId, organizationId }: { businessId: string; organizationId: string | null }) =>
      setBusinessOrganization(businessId, organizationId),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ORGANIZATIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ['businesses', vars.businessId] });
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      toast.success(vars.organizationId ? 'Negocio asignado a la empresa' : 'Negocio desvinculado de la empresa');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al actualizar la empresa del negocio');
    },
  });
};

export const useGrantOrganizationAccess = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      organizationId,
      userId,
      businessId,
    }: {
      organizationId: string;
      userId: string;
      businessId: string;
    }) => grantOrganizationAccess(organizationId, { userId, businessId }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: [...ORGANIZATIONS_KEY, vars.organizationId] });
      toast.success('Acceso multi-sucursal otorgado exitosamente');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al otorgar acceso a la sucursal');
    },
  });
};

export const useRevokeOrganizationAccess = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ organizationId, accessId }: { organizationId: string; accessId: string }) =>
      revokeOrganizationAccess(organizationId, accessId),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: [...ORGANIZATIONS_KEY, vars.organizationId] });
      toast.success('Acceso revocado correctamente');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al revocar acceso a la sucursal');
    },
  });
};

