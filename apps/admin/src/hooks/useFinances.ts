import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from 'api-client';
import toast from 'react-hot-toast';
import {
  PayablesSummary,
  PayablesListResponse,
  PayablesQueryParams,
  PayableDetail,
  CreatePayablePaymentDto,
  VoidPayablePaymentDto,
  ExpenseCategory,
  ExpensesResponse,
  ExpensesQueryParams,
  CreateExpenseDto,
  VoidExpenseDto,
  CreateExpenseCategoryDto,
  UpdateExpenseCategoryDto,
  IncomeStatementResponse,
  IncomeStatementQueryParams,
  CreditPortfolioSummary,
} from '../types/finances';

// ==========================================
// Cuentas por Pagar (Payables) Hooks
// ==========================================

export function usePayablesSummary(enabled: boolean = true) {
  return useQuery<PayablesSummary>({
    queryKey: ['pos', 'payables', 'summary'],
    queryFn: async () => {
      const res = await apiClient.get<PayablesSummary>('/pos/payables/summary');
      return res.data;
    },
    enabled,
    staleTime: 30000,
    retry: 1,
  });
}

export function usePayables(params: PayablesQueryParams, enabled: boolean = true) {
  return useQuery<PayablesListResponse>({
    queryKey: ['pos', 'payables', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.status && params.status !== 'ALL') searchParams.set('status', params.status);
      if (params.supplierId) searchParams.set('supplierId', params.supplierId);
      if (params.onlyOverdue) searchParams.set('onlyOverdue', 'true');
      if (params.search) searchParams.set('search', params.search);
      if (params.page) searchParams.set('page', String(params.page));
      if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));

      const qs = searchParams.toString();
      const res = await apiClient.get<PayablesListResponse>(`/pos/payables${qs ? `?${qs}` : ''}`);
      return res.data;
    },
    enabled,
    staleTime: 30000,
  });
}

export function usePayableDetail(id: string | null, enabled: boolean = true) {
  return useQuery<PayableDetail>({
    queryKey: ['pos', 'payables', id],
    queryFn: async () => {
      if (!id) throw new Error('Payable ID required');
      const res = await apiClient.get<PayableDetail>(`/pos/payables/${id}`);
      return res.data;
    },
    enabled: Boolean(enabled && id),
    staleTime: 10000,
  });
}

export function useCreatePayablePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      payableId,
      dto,
    }: {
      payableId: string;
      dto: CreatePayablePaymentDto;
    }) => {
      // En web, deductFromCurrentShift siempre es false
      const payload = {
        ...dto,
        deductFromCurrentShift: false,
      };
      const res = await apiClient.post(`/pos/payables/${payableId}/payments`, payload);
      return res.data;
    },
    onSuccess: (_, variables) => {
      toast.success('Abono registrado correctamente');
      queryClient.invalidateQueries({ queryKey: ['pos', 'payables'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'payables', variables.payableId] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'payables', 'summary'] });
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Error al registrar el abono';
      toast.error(msg);
    },
  });
}

export function useVoidPayablePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      payableId,
      paymentId,
      dto,
    }: {
      payableId: string;
      paymentId: string;
      dto: VoidPayablePaymentDto;
    }) => {
      const res = await apiClient.post(
        `/pos/payables/${payableId}/payments/${paymentId}/void`,
        dto
      );
      return res.data;
    },
    onSuccess: (_, variables) => {
      toast.success('Abono anulado correctamente');
      queryClient.invalidateQueries({ queryKey: ['pos', 'payables'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'payables', variables.payableId] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'payables', 'summary'] });
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Error al anular el abono';
      toast.error(msg);
    },
  });
}

// ==========================================
// Gastos (Expenses) Hooks
// ==========================================

export function useExpenseCategories(enabled: boolean = true) {
  return useQuery<ExpenseCategory[]>({
    queryKey: ['pos', 'expense-categories'],
    queryFn: async () => {
      const res = await apiClient.get<ExpenseCategory[]>('/pos/expense-categories');
      return res.data;
    },
    enabled,
    staleTime: 60000,
  });
}

export function useCreateExpenseCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateExpenseCategoryDto) => {
      const res = await apiClient.post<ExpenseCategory>('/pos/expense-categories', dto);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Categoría de gasto creada');
      queryClient.invalidateQueries({ queryKey: ['pos', 'expense-categories'] });
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Error al crear la categoría';
      toast.error(msg);
    },
  });
}

export function useUpdateExpenseCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      dto,
    }: {
      id: string;
      dto: UpdateExpenseCategoryDto;
    }) => {
      const res = await apiClient.patch<ExpenseCategory>(`/pos/expense-categories/${id}`, dto);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Categoría actualizada');
      queryClient.invalidateQueries({ queryKey: ['pos', 'expense-categories'] });
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Error al actualizar la categoría';
      toast.error(msg);
    },
  });
}

export function useExpenses(params: ExpensesQueryParams, enabled: boolean = true) {
  return useQuery<ExpensesResponse>({
    queryKey: ['pos', 'expenses', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.from) searchParams.set('from', params.from);
      if (params.to) searchParams.set('to', params.to);
      if (params.categoryId && params.categoryId !== 'ALL')
        searchParams.set('categoryId', params.categoryId);
      if (params.paymentMethod && params.paymentMethod !== 'ALL')
        searchParams.set('paymentMethod', params.paymentMethod);
      if (params.includeVoided) searchParams.set('includeVoided', 'true');
      if (params.search) searchParams.set('search', params.search);
      if (params.page) searchParams.set('page', String(params.page));
      if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));

      const qs = searchParams.toString();
      const res = await apiClient.get<ExpensesResponse>(`/pos/expenses${qs ? `?${qs}` : ''}`);
      return res.data;
    },
    enabled,
    staleTime: 30000,
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateExpenseDto) => {
      // En web, deductFromCurrentShift siempre es false
      const payload = {
        ...dto,
        deductFromCurrentShift: false,
      };
      const res = await apiClient.post('/pos/expenses', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Gasto registrado correctamente');
      queryClient.invalidateQueries({ queryKey: ['pos', 'expenses'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'reports', 'income-statement'] });
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Error al registrar el gasto';
      toast.error(msg);
    },
  });
}

export function useVoidExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: VoidExpenseDto }) => {
      const res = await apiClient.post(`/pos/expenses/${id}/void`, dto);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Gasto anulado correctamente');
      queryClient.invalidateQueries({ queryKey: ['pos', 'expenses'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'reports', 'income-statement'] });
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Error al anular el gasto';
      toast.error(msg);
    },
  });
}

// ==========================================
// Estado de Resultados Hook
// ==========================================

export function useIncomeStatement(params: IncomeStatementQueryParams, enabled: boolean = true) {
  return useQuery<IncomeStatementResponse>({
    queryKey: ['pos', 'reports', 'income-statement', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.period && params.period !== 'custom') {
        searchParams.set('period', params.period);
      }
      if (params.from) searchParams.set('from', params.from);
      if (params.to) searchParams.set('to', params.to);

      const qs = searchParams.toString();
      const res = await apiClient.get<IncomeStatementResponse>(
        `/pos/reports/income-statement${qs ? `?${qs}` : ''}`
      );
      return res.data;
    },
    enabled,
    staleTime: 60000,
  });
}

// ==========================================
// Por Cobrar (Resumen informativo) Hook
// ==========================================

export function useCreditPortfolioSummary(enabled: boolean = true) {
  return useQuery<CreditPortfolioSummary>({
    queryKey: ['pos', 'reports', 'credit-summary'],
    queryFn: async () => {
      const res = await apiClient.get<CreditPortfolioSummary>('/pos/reports/credit-summary');
      return res.data;
    },
    enabled,
    staleTime: 60000,
    retry: 1,
  });
}
