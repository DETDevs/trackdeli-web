import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCashRegisterStatus,
  openCashRegister,
  type CashRegisterStatusResponse,
  type OpenCashRegisterDto,
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
      deviceHeaders?: { 'X-Device-Id'?: string; 'X-Device-Secret'?: string };
    }) => openCashRegister(dto, deviceHeaders),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos', 'cash-register', 'status'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'web-billing', 'status'] });
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
  };
}
