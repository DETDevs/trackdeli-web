import { useQuery } from '@tanstack/react-query';
import { apiClient } from 'api-client';

export interface PosPoliciesData {
  businessId: string;
  requireOpenShiftToSell?: boolean;
  blindCashClose?: boolean;
  cashCloseDiscrepancyPolicy?: 'AUTORIZACION' | 'LIBRE';
  cashCloseTolerance?: number;
  cashDifferenceTolerance?: number;
  cashCloseMaxRecounts?: number;
  multiCurrencyEnabled?: boolean;
  acceptedCurrencies?: string;
  discountsEnabled?: boolean;
  cashierMaxDiscountPercent?: number;
  paymentMethodsEnabled?: string;
  requireReferenceCard?: boolean;
  requireReferenceTransfer?: boolean;
  requireBankCardTransfer?: boolean;
  creditInterestEnabled?: boolean;
  creditInterestType?: 'FLAT' | 'MONTHLY';
  creditInterestRate?: number;
  creditMaxInstallments?: number;
  creditAllowedFrequencies?: string;
  creditLimitOverrideRequiresApproval?: boolean;
  [key: string]: any;
}

export function usePosPolicies(enabled: boolean = true) {
  const query = useQuery<PosPoliciesData>({
    queryKey: ['pos', 'policies'],
    queryFn: async () => {
      const res = await apiClient.get<PosPoliciesData>('/pos/policies');
      return res.data;
    },
    enabled,
    staleTime: 60000,
    refetchOnWindowFocus: true,
  });

  const policies = query.data;

  // Por defecto, si requireOpenShiftToSell no está explícitamente en false, es obligatorio (true)
  const requireOpenShiftToSell = policies?.requireOpenShiftToSell !== false;
  const blindCashClose = Boolean(policies?.blindCashClose);
  const cashCloseDiscrepancyPolicy = policies?.cashCloseDiscrepancyPolicy || 'AUTORIZACION';
  const cashCloseTolerance = typeof policies?.cashCloseTolerance === 'number'
    ? policies.cashCloseTolerance
    : (typeof policies?.cashDifferenceTolerance === 'number' ? policies.cashDifferenceTolerance : 0);
  const cashCloseMaxRecounts = typeof policies?.cashCloseMaxRecounts === 'number' ? policies.cashCloseMaxRecounts : 1;
  const multiCurrencyEnabled = Boolean(policies?.multiCurrencyEnabled);

  // Métodos habilitados
  const paymentMethodsString = policies?.paymentMethodsEnabled || 'EFECTIVO,TARJETA,TRANSFERENCIA,CREDITO';
  const enabledPaymentMethods = paymentMethodsString
    .split(',')
    .map((m) => m.trim().toUpperCase())
    .filter(Boolean);

  const requireReferenceCard = Boolean(policies?.requireReferenceCard);
  const requireReferenceTransfer = Boolean(policies?.requireReferenceTransfer);
  const requireBankCardTransfer = Boolean(policies?.requireBankCardTransfer);

  // Políticas de crédito
  const creditInterestEnabled = Boolean(policies?.creditInterestEnabled);
  const creditInterestType = policies?.creditInterestType || 'FLAT';
  const creditInterestRate = Number(policies?.creditInterestRate || 0);
  const creditMaxInstallments = Number(policies?.creditMaxInstallments || 12);
  const creditAllowedFrequencies = (policies?.creditAllowedFrequencies || 'SEMANAL,QUINCENAL,MENSUAL')
    .split(',')
    .map((f) => f.trim().toUpperCase())
    .filter(Boolean);
  const creditLimitOverrideRequiresApproval = policies?.creditLimitOverrideRequiresApproval !== false;

  return {
    ...query,
    policies,
    requireOpenShiftToSell,
    blindCashClose,
    cashCloseDiscrepancyPolicy,
    cashCloseTolerance,
    cashCloseMaxRecounts,
    multiCurrencyEnabled,
    enabledPaymentMethods,
    requireReferenceCard,
    requireReferenceTransfer,
    requireBankCardTransfer,
    creditInterestEnabled,
    creditInterestType,
    creditInterestRate,
    creditMaxInstallments,
    creditAllowedFrequencies,
    creditLimitOverrideRequiresApproval,
  };
}
