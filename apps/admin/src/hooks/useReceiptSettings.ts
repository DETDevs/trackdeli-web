import { useQuery } from '@tanstack/react-query';
import { getPosReceiptSettings, PosReceiptSettingsData } from 'api-client';
import { useAuthStore } from '../store/auth.store';
import { getLocalShowCustomerAddress } from '../utils/customerAddress';

export const DEFAULT_RECEIPT_SETTINGS: PosReceiptSettingsData = {
  id: undefined,
  businessId: '',
  logoImage: null,
  showLogo: false,
  headerLines: [],
  footerLines: ['¡Gracias por su compra!'],
  showBusinessName: true,
  showAddress: true,
  showPhone: true,
  showTaxId: true,
  showCashier: true,
  showCustomer: true,
  showCustomerAddress: false,
  showTaxBreakdown: true,
  showBatches: false,
  paperWidthMm: 80,
  updatedAt: null,
  updatedById: null,
};

export function useReceiptSettings(businessId?: string) {
  const userBusinessId = useAuthStore((s) => s.user?.businessId);
  const resolvedBusinessId = businessId || userBusinessId;

  const query = useQuery({
    queryKey: ['posReceiptSettings', businessId],
    queryFn: async () => {
      try {
        const data = await getPosReceiptSettings(businessId);
        const effectiveBizId =
          resolvedBusinessId ||
          useAuthStore.getState().user?.businessId ||
          data?.businessId;
        const localAddrPref = getLocalShowCustomerAddress(effectiveBizId);
        const base = data || DEFAULT_RECEIPT_SETTINGS;
        return {
          ...base,
          showCustomerAddress:
            base.showCustomerAddress !== undefined
              ? Boolean(base.showCustomerAddress)
              : (localAddrPref ?? false),
        };
      } catch (err) {
        console.warn('[useReceiptSettings] Error fetching settings, using defaults:', err);
        const effectiveBizId =
          resolvedBusinessId || useAuthStore.getState().user?.businessId;
        const localAddrPref = getLocalShowCustomerAddress(effectiveBizId);
        return {
          ...DEFAULT_RECEIPT_SETTINGS,
          showCustomerAddress: localAddrPref ?? false,
        };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos de caché
  });

  const fallbackLocalPref = getLocalShowCustomerAddress(resolvedBusinessId);
  const settings: PosReceiptSettingsData = query.data
    ? query.data
    : {
        ...DEFAULT_RECEIPT_SETTINGS,
        showCustomerAddress: fallbackLocalPref ?? false,
      };

  return {
    settings,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
