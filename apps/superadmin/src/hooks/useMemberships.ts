import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';
import toast from 'react-hot-toast';

export type PaymentMethod =
  | 'TRANSFERENCIA'
  | 'EFECTIVO'
  | 'PAYPAL'
  | 'BINANCE'
  | 'OTRO';

export type MembershipStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PENDING';

export interface MembershipItem {
  id: string;
  businessId: string;
  business?: {
    id: string;
    name: string;
    logoUrl: string | null;
  };
  startDate: string;
  endDate: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  paymentProofUrl: string | null;
  paidAt: string | null;
  notes: string | null;
  status: MembershipStatus;
  daysLeft?: number;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface CreateMembershipInput {
  businessId: string;
  startDate: string;
  endDate: string;
  amount: number;
  currency?: string;
  paymentMethod?: PaymentMethod;
  paidAt?: string;
  notes?: string;
  file?: File | null;
}

export function useBusinessMemberships(businessId: string) {
  return useQuery<MembershipItem[]>({
    queryKey: ['superadmin-business-memberships', businessId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/superadmin/businesses/${businessId}/memberships`);
      return data;
    },
    enabled: !!businessId,
    refetchInterval: 30000,
  });
}

export function useExpiringMemberships() {
  return useQuery<MembershipItem[]>({
    queryKey: ['superadmin-expiring-memberships'],
    queryFn: async () => {
      const { data } = await apiClient.get('/superadmin/memberships/expiring');
      return data;
    },
    refetchInterval: 30000,
  });
}

export function useCreateMembership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMembershipInput) => {
      const { file, ...body } = input;
      // 1. Crear membresía
      const { data: membership } = await apiClient.post('/superadmin/memberships', body);

      // 2. Subir comprobante si se adjuntó archivo
      if (file && membership?.id) {
        const formData = new FormData();
        formData.append('file', file);

        const { data: proofData } = await apiClient.post(
          `/superadmin/memberships/${membership.id}/proof`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );
        return proofData.membership || membership;
      }

      return membership;
    },
    onSuccess: (data) => {
      toast.success('Pago de membresía registrado exitosamente');
      queryClient.invalidateQueries({
        queryKey: ['superadmin-business-memberships', data.businessId],
      });
      queryClient.invalidateQueries({
        queryKey: ['superadmin-business', data.businessId],
      });
      queryClient.invalidateQueries({ queryKey: ['superadmin-businesses'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-expiring-memberships'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-metrics'] });
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message || 'Error al registrar el pago de membresía'
      );
    },
  });
}

export function useUploadPaymentProof() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);

      const { data } = await apiClient.post(
        `/superadmin/memberships/${id}/proof`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return data;
    },
    onSuccess: () => {
      toast.success('Comprobante subido exitosamente');
      queryClient.invalidateQueries({
        queryKey: ['superadmin-business-memberships'],
      });
      queryClient.invalidateQueries({ queryKey: ['superadmin-business'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Error al subir el comprobante');
    },
  });
}
