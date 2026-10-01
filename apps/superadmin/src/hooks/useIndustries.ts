import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';

export interface IndustryField {
  id: string;
  industryId: string;
  label: string;
  type: 'TEXT' | 'NUMBER' | 'LIST' | 'BOOLEAN' | 'DATE';
  options?: string[];
  isRequired: boolean;
  isSearchable: boolean;
  showInPos: boolean;
  isActive: boolean;
  order: number;
}

export interface Industry {
  id: string;
  name: string;
  code: string;
  posVertical: 'RESTAURANTE' | 'RETAIL';
  isActive: boolean;
  fields?: IndustryField[];
  _count?: { fields: number };
}

export const useIndustries = () => {
  return useQuery<Industry[]>({
    queryKey: ['superadmin-industries'],
    queryFn: async () => {
      const { data } = await apiClient.get('/industries');
      return data;
    },
  });
};

export const useIndustry = (id: string) => {
  return useQuery<Industry>({
    queryKey: ['superadmin-industries', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/industries/${id}`);
      return data;
    },
    enabled: !!id,
  });
};

export const useCreateIndustry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Industry>) => {
      const { data } = await apiClient.post('/industries', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-industries'] });
    },
  });
};

export const useUpdateIndustry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<Industry> }) => {
      const { data } = await apiClient.put(`/industries/${id}`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-industries'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-industries', variables.id] });
    },
  });
};

export const useCreateIndustryField = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ industryId, payload }: { industryId: string; payload: Partial<IndustryField> }) => {
      const { data } = await apiClient.post(`/industries/${industryId}/fields`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-industries', variables.industryId] });
    },
  });
};

export const useUpdateIndustryField = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ industryId, fieldId, payload }: { industryId: string; fieldId: string; payload: Partial<IndustryField> }) => {
      const { data } = await apiClient.put(`/industries/${industryId}/fields/${fieldId}`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-industries', variables.industryId] });
    },
  });
};
