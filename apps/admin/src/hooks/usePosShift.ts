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

export function usePosShift(enabled: boolean = true) {
  const queryClient = useQueryClient();

  const statusQuery = useQuery<CashRegisterStatusResponse>({
    queryKey: ['pos', 'cash-register', 'status'],
    queryFn: () => getCashRegisterStatus(),
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
    }) => openCashRegister(dto, deviceHeaders),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos', 'cash-register', 'status'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'web-billing', 'status'] });
      queryClient.invalidateQueries({ queryKey: ['backoffice'] });
    },
  });

  const closeMutation = useMutation({
    mutationFn: ({
      dto,
      deviceHeaders,
    }: {
      dto: CloseCashRegisterDto;
      deviceHeaders?: { 'X-Device-Id'?: string; 'X-Device-Secret'?: string; 'Idempotency-Key'?: string };
    }) => closeCashRegister(dto, deviceHeaders),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos', 'cash-register', 'status'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'web-billing', 'status'] });
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
    }) => addCashMovement(dto, deviceHeaders),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos', 'cash-register', 'status'] });
      queryClient.invalidateQueries({ queryKey: ['backoffice'] });
    },
  });

  return {
    statusData: statusQuery.data,
    isOpen: Boolean(statusQuery.data?.isOpen),
    shiftId: statusQuery.data?.shiftId || null,
    openedAt: statusQuery.data?.openedAt || null,
    cashierName: statusQuery.data?.cashierName || null,
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

