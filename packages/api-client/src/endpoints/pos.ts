import { apiClient } from '../client';

export interface WebBillingStatusResponse {
  webAdminEnabled: boolean;
  enabled: boolean;
  maxWebDevices: number | null;
  activeWebDevices: number;
  hasOpenShift: boolean;
}

export const getWebBillingStatus = async (businessId?: string): Promise<WebBillingStatusResponse> => {
  const res = await apiClient.get<WebBillingStatusResponse>('/pos/web-billing/status', {
    params: businessId ? { businessId } : undefined,
  });
  return res.data;
};
