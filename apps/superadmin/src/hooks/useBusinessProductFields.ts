import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';
import { type FieldFormValues } from '../components/modals/FieldFormModal';

export interface BusinessProductField {
  id: string;
  businessId: string;
  label: string;
  key: string;
  dataType: 'TEXT' | 'NUMBER' | 'SELECT' | 'BOOLEAN' | 'DATE' | 'LIST';
  options?: string[];
  isRequired: boolean;
  isSearchable: boolean;
  /** Nombres reales que devuelve el API (el editor usa isRequired/isSearchable). */
  required?: boolean;
  searchable?: boolean;
  showInPos: boolean;
  /** 208c: solo aplica a campos LIST (permitir agregar opciones al vuelo). */
  allowCreateInline?: boolean;
  /** 208c: opciones del catálogo para campos LIST. */
  fieldOptions?: Array<{ id: string; label: string; isActive: boolean }>;
  isActive: boolean;
  order: number;
}

/** Respuesta de POST .../product-fields/apply-template */
export interface ApplyTemplateResult {
  businessId: string;
  industry: string;
  appliedFields: Array<{ key: string; action: 'UPGRADED_TO_LIST' | 'UPDATED' | 'CREATED' }>;
  totalMigratedOptions: number;
}

/** Respuesta de POST .../product-fields/migrate-text-to-list */
export interface MigrateTextToListResult {
  businessId: string;
  createdOptions: number;
  updatedProducts: number;
  details: Array<{
    fieldKey: string;
    fieldLabel: string;
    distinctValuesFound: number;
    optionsCreated: number;
    productsMigrated: number;
  }>;
}

export const useBusinessProductFields = (businessId: string) => {
  return useQuery<BusinessProductField[]>({
    queryKey: ['superadmin-business-product-fields', businessId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/superadmin/businesses/${businessId}/product-fields`);
      return data;
    },
    enabled: !!businessId,
  });
};

export const useCreateBusinessProductField = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ businessId, payload }: { businessId: string; payload: Partial<FieldFormValues> }) => {
      const { data } = await apiClient.post(`/superadmin/businesses/${businessId}/product-fields`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-business-product-fields', variables.businessId] });
    },
  });
};

export const useUpdateBusinessProductField = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ businessId, fieldId, payload }: { businessId: string; fieldId: string; payload: Partial<FieldFormValues> }) => {
      const { data } = await apiClient.patch(`/superadmin/businesses/${businessId}/product-fields/${fieldId}`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-business-product-fields', variables.businessId] });
    },
  });
};

export const useToggleBusinessProductFieldStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ businessId, fieldId, activate }: { businessId: string; fieldId: string; activate: boolean }) => {
      const endpoint = activate ? 'activate' : 'deactivate';
      const { data } = await apiClient.patch(`/superadmin/businesses/${businessId}/product-fields/${fieldId}/${endpoint}`);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-business-product-fields', variables.businessId] });
    },
  });
};

export const useReorderBusinessProductFields = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ businessId, fieldIds }: { businessId: string; fieldIds: string[] }) => {
      const { data } = await apiClient.patch(`/superadmin/businesses/${businessId}/product-fields/reorder`, { fieldIds });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-business-product-fields', variables.businessId] });
    },
  });
};

export const useApplyBusinessFieldTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ businessId }: { businessId: string }): Promise<ApplyTemplateResult> => {
      const { data } = await apiClient.post(`/superadmin/businesses/${businessId}/product-fields/apply-template`);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-business-product-fields', variables.businessId] });
    },
  });
};

export const useMigrateBusinessTextToList = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ businessId }: { businessId: string }): Promise<MigrateTextToListResult> => {
      const { data } = await apiClient.post(`/superadmin/businesses/${businessId}/product-fields/migrate-text-to-list`);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-business-product-fields', variables.businessId] });
    },
  });
};
