import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCashRegisterStatus,
  openCashRegister,
  closeCashRegister,
  addCashMovement,
  type CashRegisterStatusResponse,
  type OpenCashRegisterDto,
  type CloseCashRegisterDto,
  type CashMovementDto,
} from 'api-client';
import { useAuthStore } from '../store/auth.store';
import { getStoredWebDeviceHeaders } from './usePosWebDevice';

const getOwnShiftKey = (businessId?: string | null, userId?: string | null) => {
  if (!businessId || !userId) return null;
  return `trackdeli_own_web_shift_${businessId}_${userId}`;
};

export function usePosShift(enabled: boolean = true) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const businessId = user?.businessId || null;
  const userId = user?.id || null;
  const ownShiftKey = getOwnShiftKey(businessId, userId);
  const [dismissedResumeShiftId, setDismissedResumeShiftId] = useState<string | null>(null);

  const statusQuery = useQuery<CashRegisterStatusResponse>({
    queryKey: ['pos', 'cash-register', 'status', businessId, userId],
    queryFn: () => getCashRegisterStatus(undefined, getStoredWebDeviceHeaders(businessId)),
    enabled,
    staleTime: 10000,
    refetchOnWindowFocus: true,
  });

  const openMutation = useMutation({
    mutationFn: ({
      dto,
      deviceHeaders,
    }: {
      dto: OpenCashRegisterDto;
      deviceHeaders?: { 'X-Device-Id'?: string; 'X-Device-Secret'?: string; 'Idempotency-Key'?: string };
    }) => openCashRegister(dto, { ...getStoredWebDeviceHeaders(businessId), ...(deviceHeaders || {}) }),
    onSuccess: (createdShift: any) => {
      if (ownShiftKey && createdShift?.id && typeof window !== 'undefined') {
        try {
          localStorage.setItem(ownShiftKey, String(createdShift.id));
        } catch {
          // Ignorar errores de almacenamiento
        }
      }
      queryClient.invalidateQueries({ queryKey: ['pos', 'cash-register', 'status'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'web-billing', 'status'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'cash-registers', 'open-list'] });
      queryClient.invalidateQueries({ queryKey: ['backoffice'] });
    },
    onError: (err: any) => {
      if (err?.response?.data?.code === 'WEB_REGISTER_ALREADY_OPEN') {
        queryClient.invalidateQueries({ queryKey: ['pos', 'cash-register', 'status'] });
      }
    },
  });

  const closeMutation = useMutation({
    mutationFn: ({
      dto,
      deviceHeaders,
    }: {
      dto: CloseCashRegisterDto;
      deviceHeaders?: { 'X-Device-Id'?: string; 'X-Device-Secret'?: string; 'Idempotency-Key'?: string };
    }) => closeCashRegister(dto, { ...getStoredWebDeviceHeaders(businessId), ...(deviceHeaders || {}) }),
    onSuccess: () => {
      if (ownShiftKey && typeof window !== 'undefined') {
        try {
          localStorage.removeItem(ownShiftKey);
        } catch {
          // Ignorar errores de almacenamiento
        }
      }
      queryClient.invalidateQueries({ queryKey: ['pos', 'cash-register', 'status'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'web-billing', 'status'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'cash-registers', 'open-list'] });
      queryClient.invalidateQueries({ queryKey: ['backoffice'] });
    },
  });

  const movementMutation = useMutation({
    mutationFn: ({
      dto,
      deviceHeaders,
    }: {
      dto: CashMovementDto;
      deviceHeaders?: { 'X-Device-Id'?: string; 'X-Device-Secret'?: string; 'Idempotency-Key'?: string };
    }) => addCashMovement(dto, { ...getStoredWebDeviceHeaders(businessId), ...(deviceHeaders || {}) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos', 'cash-register', 'status'] });
      queryClient.invalidateQueries({ queryKey: ['backoffice'] });
    },
  });

  const shiftId = statusQuery.data?.shiftId || null;
  const isOpen = Boolean(statusQuery.data?.isOpen);

  let isResumedFromOtherBrowser = false;
  if (typeof window !== 'undefined' && isOpen && shiftId && ownShiftKey) {
    const knownOwnShiftId = localStorage.getItem(ownShiftKey);
    const dismissedInSession = sessionStorage.getItem(`trackdeli_dismissed_resume_${shiftId}`) === '1';
    if (knownOwnShiftId !== shiftId && !dismissedInSession && dismissedResumeShiftId !== shiftId) {
      isResumedFromOtherBrowser = true;
    }
  }

  const dismissResumedNotice = useCallback(() => {
    if (!shiftId || typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(`trackdeli_dismissed_resume_${shiftId}`, '1');
    } catch {
      // Ignorar
    }
    setDismissedResumeShiftId(shiftId);
  }, [shiftId]);

  return {
    statusData: statusQuery.data,
    isOpen,
    shiftId,
    openedAt: statusQuery.data?.openedAt || null,
    cashierName: statusQuery.data?.cashierName || null,
    isResumedFromOtherBrowser,
    dismissResumedNotice,
    isLoading: statusQuery.isLoading,
    isError: statusQuery.isError,
    error: statusQuery.error,
    refetch: statusQuery.refetch,
    openShift: openMutation.mutateAsync,
    isOpening: openMutation.isPending,
    openError: openMutation.error,
    closeShift: closeMutation.mutateAsync,
    isClosing: closeMutation.isPending,
    closeError: closeMutation.error,
    addMovement: movementMutation.mutateAsync,
    isAddingMovement: movementMutation.isPending,
    movementError: movementMutation.error,
  };
}

