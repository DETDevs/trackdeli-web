import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from './useCommercial';

import { BusinessProductType } from './useBusinessProducts';

export type PaymentMethod =
  | 'TRANSFERENCIA'
  | 'EFECTIVO'
  | 'PAYPAL'
  | 'BINANCE'
  | 'ALTA_INICIAL'
  | 'AUTOMATICO'
  | 'OTRO';

export type MembershipStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PENDING';

/**
 * Tipo de membresía (contrato 252b, API pendiente).
 * PAID = pago recibido. TRIAL = prueba gratis, monto 0, no cuenta como ingreso.
 * Mientras el API no lo envíe, toda membresía se trata como PAID.
 */
export type MembershipKind = 'PAID' | 'TRIAL';

/**
 * Cómo arranca el período de un pago nuevo (contrato 252b, API pendiente).
 * CONTINUE = renovación: continúa donde termina el último período.
 * TODAY = empieza hoy y mueve el día de cobro.
 * CUSTOM = fecha elegida.
 */
export type MembershipStartMode = 'CONTINUE' | 'TODAY' | 'CUSTOM';

export interface MembershipProductItem {
  id: string;
  businessProductSubscriptionId: string;
  productType: BusinessProductType;
  name: string;
  amountAttributed?: number | null;
}

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
  type?: MembershipKind | null;
  daysLeft?: number;
  billing_anchor_day?: number | null;
  current_period_start?: string | null;
  due_date?: string | null;
  grace_ends_at?: string | null;
  membership_status?: string | null;
  days_until_due?: number | null;
  products?: MembershipProductItem[];
  isUnitemized?: boolean;
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
  businessProductSubscriptionIds?: string[];
  idempotencyKey?: string;
  /** Solo se envían si el API soporta el contrato 252b (ver useMembershipPreview). */
  type?: MembershipKind;
  startMode?: MembershipStartMode;
  trialDays?: number;
}

/** Nota que pone el API al crear la membresía automática del alta del negocio. */
const AUTO_INITIAL_NOTE_PREFIX = 'Alta inicial del negocio';

export function isTrialMembership(m: Pick<MembershipItem, 'type'>): boolean {
  return m.type === 'TRIAL';
}

/**
 * Membresía creada automáticamente por el asistente de alta como pago,
 * aunque el negocio haya empezado con prueba gratis. Sirve para avisar al superadmin.
 */
export function isAutoInitialMembership(
  m: Pick<MembershipItem, 'notes' | 'paymentMethod' | 'type'>
): boolean {
  return (
    m.type !== 'TRIAL' &&
    m.paymentMethod === 'OTRO' &&
    typeof m.notes === 'string' &&
    m.notes.startsWith(AUTO_INITIAL_NOTE_PREFIX)
  );
}

/** Cuenta solo pagos reales: no anulados y no pruebas gratis. */
export function countPaidMemberships(memberships: MembershipItem[]): number {
  return memberships.filter((m) => m.status !== 'CANCELLED' && !isTrialMembership(m)).length;
}

export interface MembershipPreviewParams {
  type: MembershipKind;
  startMode: MembershipStartMode;
  startDate?: string;
  trialDays?: number;
}

/** Respuesta de GET /superadmin/businesses/:id/memberships/preview (contrato 252b). */
export interface MembershipPreview {
  startDate: string;
  endDate: string;
  anchorDay: number | null;
  previousAnchorDay?: number | null;
  anchorChanges?: boolean;
  warnings?: string[];
}

export type MembershipPreviewResult =
  | ({ supported: true } & MembershipPreview)
  | { supported: false };

/** Nest responde "Cannot GET ..." cuando la ruta no existe: así sabemos que el API todavía no tiene el contrato. */
function isMissingRoute(err: any): boolean {
  const status = err?.response?.status;
  if (status !== 404 && status !== 405) return false;
  const message = err?.response?.data?.message;
  const text = Array.isArray(message) ? message.join(' ') : String(message ?? '');
  return status === 405 || text.startsWith('Cannot ');
}

async function fetchMembershipPreview(
  businessId: string,
  params: MembershipPreviewParams
): Promise<MembershipPreviewResult> {
  try {
    const { data } = await apiClient.get(
      `/superadmin/businesses/${businessId}/memberships/preview`,
      { params }
    );
    return { supported: true, ...data };
  } catch (err: any) {
    if (isMissingRoute(err)) return { supported: false };
    throw err;
  }
}

/**
 * Pregunta al API qué período crearía un registro nuevo.
 * Si el endpoint todavía no existe, devuelve { supported: false } y la UI
 * bloquea lo que depende del contrato nuevo (prueba gratis, "Empieza hoy", "Otra fecha").
 */
export function useMembershipPreview(
  businessId: string,
  params: MembershipPreviewParams,
  enabled: boolean
) {
  const probe = useQuery<MembershipPreviewResult>({
    queryKey: ['superadmin-membership-preview-probe', businessId],
    queryFn: () => fetchMembershipPreview(businessId, { type: 'PAID', startMode: 'CONTINUE' }),
    enabled: enabled && !!businessId,
    retry: false,
    staleTime: 60_000,
  });

  const supported = probe.data?.supported === true;

  const preview = useQuery<MembershipPreviewResult>({
    queryKey: ['superadmin-membership-preview', businessId, params],
    queryFn: () => fetchMembershipPreview(businessId, params),
    enabled: enabled && !!businessId && supported,
    retry: false,
    staleTime: 0,
  });

  return {
    isCheckingSupport: probe.isLoading,
    supported,
    preview: preview.data && preview.data.supported ? preview.data : null,
    isLoadingPreview: preview.isFetching,
    previewError: preview.error ? getApiErrorMessage(preview.error, 'No se pudo calcular el período') : null,
  };
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

export interface CreateMembershipResult {
  membership: MembershipItem;
  proofError?: string | null;
}

export function useCreateMembership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMembershipInput): Promise<CreateMembershipResult> => {
      const { file, idempotencyKey, ...body } = input;
      const { data: membership } = await apiClient.post('/superadmin/memberships', body, {
        headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
      });

      let proofError: string | null = null;
      let finalMembership = membership;

      if (file && membership?.id) {
        try {
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
          finalMembership = proofData.membership || membership;
        } catch (err: any) {
          proofError = getApiErrorMessage(err, 'No se pudo subir el comprobante');
        }
      }

      return { membership: finalMembership, proofError };
    },
    onSuccess: (data, variables) => {
      if (data?.proofError) {
        toast.error(
          `El pago de membresía se registró, pero falló la subida del comprobante: ${data.proofError}`
        );
      } else if (variables.type === 'TRIAL') {
        toast.success('Prueba gratis registrada');
      } else {
        toast.success('Pago de membresía registrado');
      }
      queryClient.invalidateQueries({
        queryKey: ['superadmin-membership-preview', variables.businessId],
      });
      const bizId = variables.businessId || data?.membership?.businessId;
      queryClient.invalidateQueries({
        queryKey: ['superadmin-business-memberships', bizId],
      });
      queryClient.invalidateQueries({
        queryKey: ['superadmin-business', bizId],
      });
      queryClient.invalidateQueries({
        queryKey: ['superadmin-business-products', bizId],
      });
      queryClient.invalidateQueries({ queryKey: ['superadmin-businesses'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-expiring-memberships'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'summary'] });
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message || 'Error al registrar el pago de membresía'
      );
    },
  });
}

export function useVoidMembership(businessId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data } = await apiClient.post(`/superadmin/memberships/${id}/void`, {
        reason,
      });
      return data;
    },
    onSuccess: (data) => {
      if (data?.warning) {
        toast(data.warning, { icon: '⚠️' });
      } else {
        toast.success('Membresía anulada exitosamente');
      }
      queryClient.invalidateQueries({
        queryKey: ['superadmin-business-memberships', businessId],
      });
      queryClient.invalidateQueries({
        queryKey: ['superadmin-business', businessId],
      });
      queryClient.invalidateQueries({
        queryKey: ['superadmin-business-products', businessId],
      });
      queryClient.invalidateQueries({ queryKey: ['superadmin-businesses'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-expiring-memberships'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'summary'] });
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message || 'Error al anular la membresía'
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
