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

export const useBusinessOrganization = (businessId?: string | null, directOrgId?: string | null) => {
  const { data: organizations = [], isLoading: isLoadingOrgs } = useOrganizations();

  return useQuery<Organization | null>({
    queryKey: ['superadmin', 'business-organization', businessId, directOrgId],
    queryFn: async () => {
      if (!businessId) return null;

      // 1. Si viene un organizationId directo, buscarlo directamente
      if (directOrgId) {
        return getOrganization(directOrgId);
      }

      // 2. Si no viene directo (debido a que GET /superadmin/businesses/:id no lo incluye en el payload del API),
      // buscar cuál de las empresas registradas contiene este negocio entre sus sucursales
      const candidateOrgs = organizations.filter((o) => (o.businessCount ?? 0) > 0);
      for (const candidate of candidateOrgs) {
        try {
          const detail = await getOrganization(candidate.id);
          if ((detail.businesses || []).some((b) => b.id === businessId)) {
            return detail;
          }
        } catch {}
      }

      return null;
    },
    enabled: Boolean(businessId) && !isLoadingOrgs,
    staleTime: 30000,
  });
};

export const useCreateOrganization = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createOrganization(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORGANIZATIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'business-organization'] });
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
      queryClient.invalidateQueries({ queryKey: ['superadmin-business', vars.businessId] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-businesses'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'business-organization'] });
      toast.success(vars.organizationId ? 'Negocio asignado a la empresa' : 'Negocio quitado de la empresa');
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
      queryClient.invalidateQueries({ queryKey: ORGANIZATIONS_KEY });
      queryClient.invalidateQueries({ queryKey: [...ORGANIZATIONS_KEY, vars.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'business-organization'] });
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
      queryClient.invalidateQueries({ queryKey: ORGANIZATIONS_KEY });
      queryClient.invalidateQueries({ queryKey: [...ORGANIZATIONS_KEY, vars.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'business-organization'] });
      toast.success('Acceso revocado correctamente');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al revocar acceso a la sucursal');
    },
  });
};
