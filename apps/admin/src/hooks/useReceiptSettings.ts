import { useQuery } from '@tanstack/react-query';
import { getPosReceiptSettings, PosReceiptSettingsData } from 'api-client';

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
  showTaxBreakdown: true,
  showBatches: false,
  paperWidthMm: 80,
  updatedAt: null,
  updatedById: null,
};

export function useReceiptSettings(businessId?: string) {
  const query = useQuery({
    queryKey: ['posReceiptSettings', businessId],
    queryFn: async () => {
      try {
        const data = await getPosReceiptSettings(businessId);
        return data || DEFAULT_RECEIPT_SETTINGS;
      } catch (err) {
        console.warn('[useReceiptSettings] Error fetching settings, using defaults:', err);
        return DEFAULT_RECEIPT_SETTINGS;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos de caché
  });

  return {
    settings: query.data || DEFAULT_RECEIPT_SETTINGS,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
