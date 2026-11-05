import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';
import toast from 'react-hot-toast';
import type { PaymentMethod } from './useMemberships';

// ═══════════════════════════════════════════════
// 244b — Acuerdo comercial por negocio (contrato real del 244a)
// ═══════════════════════════════════════════════

export type CommercialSaleModality =
  | 'MEMBRESIA_MENSUAL'
  | 'PAGO_UNICO_SISTEMA'
  | 'COMBO_COMPLETO'
  | 'COMBO_PARCIAL';

export type CommercialPaymentType = 'CONTADO' | 'CREDITO';
export type CommercialAgreementStatus = 'VIGENTE' | 'LIQUIDADO' | 'CANCELADO';
export type CommercialPaymentKind = 'ADELANTO' | 'CUOTA' | 'PAGO';
export type CommercialInstallmentStatus = 'PENDIENTE' | 'PARCIAL' | 'PAGADA' | 'VENCIDA';

export type CommercialEquipmentType =
  | 'COMPUTADORA'
  | 'MONITOR'
  | 'TECLADO'
  | 'MOUSE'
  | 'IMPRESORA_TERMICA'
  | 'GAVETA_DINERO'
  | 'LECTOR_BARRA'
  | 'IMPRESORA_COCINA'
  | 'TABLET'
  | 'OTRO';

export type CommercialEquipmentStatus = 'PENDIENTE' | 'ENTREGADO' | 'RETIRADO';

/** Tipos que el API exige con número de serie al quedar ENTREGADO (commercial.service.ts:30-38). */
export const SERIAL_REQUIRED_TYPES: CommercialEquipmentType[] = [
  'COMPUTADORA',
  'MONITOR',
  'IMPRESORA_TERMICA',
  'GAVETA_DINERO',
  'LECTOR_BARRA',
  'IMPRESORA_COCINA',
  'TABLET',
];

export const SALE_MODALITY_LABELS: Record<CommercialSaleModality, string> = {
  MEMBRESIA_MENSUAL: 'Membresía mensual',
  PAGO_UNICO_SISTEMA: 'Pago único (solo sistema)',
  COMBO_COMPLETO: 'Combo completo',
  COMBO_PARCIAL: 'Combo parcial',
};

export const PAYMENT_KIND_LABELS: Record<CommercialPaymentKind, string> = {
  ADELANTO: 'Adelanto',
  CUOTA: 'Cuota',
  PAGO: 'Pago completo',
};

export const EQUIPMENT_TYPE_LABELS: Record<CommercialEquipmentType, string> = {
  COMPUTADORA: 'Computadora',
  MONITOR: 'Monitor',
  TECLADO: 'Teclado',
  MOUSE: 'Mouse',
  IMPRESORA_TERMICA: 'Impresora térmica',
  GAVETA_DINERO: 'Gaveta de dinero',
  LECTOR_BARRA: 'Lector de código de barras',
  IMPRESORA_COCINA: 'Impresora de cocina',
  TABLET: 'Tablet',
  OTRO: 'Otro',
};

export const EQUIPMENT_STATUS_LABELS: Record<CommercialEquipmentStatus, string> = {
  PENDIENTE: 'Pendiente de entrega',
  ENTREGADO: 'Entregado',
  RETIRADO: 'Retirado',
};

export interface CommercialAgreement {
  id: string;
  businessId: string;
  saleModality: CommercialSaleModality;
  paymentType: CommercialPaymentType;
  status: CommercialAgreementStatus;
  totalPrice: number;
  currency: string;
  downPayment: number;
  financedBalance: number;
  installmentsCount: number;
  firstInstallmentDate: string | null;
  graceDays: number;
  activatedAt: string;
  maintenanceFreeMonths: number;
  maintenanceFreeEndsAt: string | null;
  maintenanceFeeNio: number;
  installationDoneAt: string | null;
  trainingDoneAt: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommercialInstallment {
  id: string;
  installmentNumber: number;
  dueDate: string;
  dueDateIso: string;
  amount: number;
  paidAmount: number;
  pendingAmount: number;
  status: CommercialInstallmentStatus;
  paidAt: string | null;
}

export interface CommercialPayment {
  id: string;
  agreementId: string;
  kind: CommercialPaymentKind;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber: string | null;
  paymentProofUrl: string | null;
  paidAt: string;
  paidAtIso: string;
  paidAmountNio: number | null;
  exchangeRate: number | null;
  notes: string | null;
  registeredBy: string;
  voidedAt: string | null;
  voidedBy: string | null;
  voidReason: string | null;
  createdAt: string;
}

export interface CommercialEquipment {
  id: string;
  agreementId: string;
  businessId: string;
  equipmentType: CommercialEquipmentType;
  description: string | null;
  brand: string;
  model: string;
  serialNumber: string;
  price: number | null;
  status: CommercialEquipmentStatus;
  deliveredAt: string | null;
  warrantyEndsAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface CommercialSummary {
  totalPaid: number;
  balance: number;
  overdueAmount: number;
  overdueInstallments: number;
  nextInstallment: {
    id: string;
    installmentNumber: number;
    dueDate: string;
    amount: number;
    paidAmount: number;
    pendingAmount: number;
  } | null;
  maintenance: {
    status: 'INCLUIDO' | 'EN_COBRO' | 'NO_APLICA';
    endsAt: string | null;
    daysLeft: number | null;
    feeNio: number;
  };
  coverage: {
    source: 'MAINTENANCE_FREE' | 'MEMBERSHIP' | null;
    coveredUntil: string | null;
    blocked: boolean;
  };
}

export interface CommercialData {
  agreement: CommercialAgreement;
  installments: CommercialInstallment[];
  payments: CommercialPayment[];
  equipment: CommercialEquipment[];
  summary: CommercialSummary;
}

export interface UpsertAgreementInput {
  saleModality: CommercialSaleModality;
  paymentType: CommercialPaymentType;
  totalPrice: number;
  downPayment?: number;
  currency?: string;
  installmentsCount?: number;
  firstInstallmentDate?: string;
  graceDays: number;
  activatedAt: string;
  maintenanceFreeMonths: number;
  maintenanceFeeNio: number;
  installationDoneAt?: string;
  trainingDoneAt?: string;
  notes?: string;
}

export interface RecordPaymentInput {
  kind: CommercialPaymentKind;
  amount: number;
  paymentMethod?: PaymentMethod;
  referenceNumber?: string;
  paidAt?: string;
  paidAmountNio?: number;
  exchangeRate?: number;
  notes?: string;
  file?: File | null;
}

export interface EquipmentInput {
  equipmentType: CommercialEquipmentType;
  description?: string;
  brand: string;
  model: string;
  serialNumber?: string;
  price?: number;
  status?: CommercialEquipmentStatus;
  deliveredAt?: string;
  warrantyEndsAt?: string;
  notes?: string;
}

/** Extrae el mensaje legible de un error del API (NestJS puede mandar string o arreglo). */
export function getApiErrorMessage(err: any, fallback: string): string {
  const msg = err?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join('. ');
  if (typeof msg === 'string' && msg.trim()) return msg;
  return fallback;
}

export const commercialKey = (businessId: string) => ['superadmin-business-commercial', businessId];

/**
 * Invalida todo lo que depende del acuerdo comercial: la sección, el detalle
 * (coverage_source, commercial_overdue) y la lista de negocios.
 */
function invalidateCommercial(queryClient: ReturnType<typeof useQueryClient>, businessId: string) {
  queryClient.invalidateQueries({ queryKey: commercialKey(businessId) });
  queryClient.invalidateQueries({ queryKey: ['superadmin-business', businessId] });
  queryClient.invalidateQueries({ queryKey: ['superadmin-businesses'] });
  queryClient.invalidateQueries({ queryKey: ['superadmin', 'summary'] });
}

export function useCommercial(businessId: string) {
  return useQuery<CommercialData | null>({
    queryKey: commercialKey(businessId),
    queryFn: async () => {
      const { data } = await apiClient.get(`/superadmin/businesses/${businessId}/commercial`);
      // El API devuelve null (body vacío) cuando no hay acuerdo
      return data && typeof data === 'object' && data.agreement ? (data as CommercialData) : null;
    },
    enabled: !!businessId,
  });
}

export function useUpsertCommercialAgreement(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpsertAgreementInput) => {
      const { data } = await apiClient.put(`/superadmin/businesses/${businessId}/commercial`, input);
      return data as CommercialData;
    },
    onSuccess: () => {
      toast.success('Acuerdo comercial guardado');
      invalidateCommercial(queryClient, businessId);
    },
  });
}

export function useRecordCommercialPayment(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ agreementId, input }: { agreementId: string; input: RecordPaymentInput }) => {
      const { file, ...body } = input;
      const { data: payment } = await apiClient.post(
        `/superadmin/commercial/${agreementId}/payments`,
        body,
      );

      let proofError: string | null = null;
      if (file && payment?.id) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          await apiClient.post(`/superadmin/commercial/payments/${payment.id}/proof`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch (err) {
          // El pago ya quedó registrado; solo falló el comprobante
          proofError = getApiErrorMessage(err, 'No se pudo subir el comprobante');
        }
      }
      return { payment, proofError };
    },
    onSuccess: ({ proofError }) => {
      if (proofError) {
        toast.error(`El pago se registró, pero el comprobante falló: ${proofError}`);
      } else {
        toast.success('Pago registrado');
      }
      invalidateCommercial(queryClient, businessId);
    },
  });
}

export function useVoidCommercialPayment(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ paymentId, reason }: { paymentId: string; reason: string }) => {
      const { data } = await apiClient.post(`/superadmin/commercial/payments/${paymentId}/void`, {
        reason,
      });
      return data;
    },
    onSuccess: () => {
      toast.success('Pago anulado');
      invalidateCommercial(queryClient, businessId);
    },
  });
}

export function useSaveCommercialEquipment(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      agreementId,
      equipmentId,
      input,
    }: {
      agreementId: string;
      equipmentId?: string;
      input: EquipmentInput;
    }) => {
      if (equipmentId) {
        const { data } = await apiClient.patch(`/superadmin/commercial/equipment/${equipmentId}`, input);
        return data;
      }
      const { data } = await apiClient.post(`/superadmin/commercial/${agreementId}/equipment`, input);
      return data;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.equipmentId ? 'Equipo actualizado' : 'Equipo agregado');
      invalidateCommercial(queryClient, businessId);
    },
  });
}

