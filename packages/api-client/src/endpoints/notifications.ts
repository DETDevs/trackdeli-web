import { apiClient } from '../client';

export type SystemNotificationCategory =
  | 'MEMBERSHIP'
  | 'RECEIVABLES'
  | 'PAYABLES'
  | 'EXPIRY'
  | 'INVENTORY'
  | 'OPERATIONS';

export type SystemNotificationSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface SystemNotificationRedirect {
  route: string;
  state?: Record<string, any>;
  actionLabel: string;
}

export interface SystemNotificationItem {
  id: string;
  fingerprint: string;
  category: SystemNotificationCategory;
  severity: SystemNotificationSeverity;
  title: string;
  body: string;
  count?: number;
  amount?: number;
  currency?: string;
  highlights?: string[];
  redirect: SystemNotificationRedirect;
}

export interface MembershipAlertSummary {
  status: string;
  source: string | null;
  coveredUntil: string | null;
  graceEndsAt: string | null;
  daysUntilDue: number | null;
  graceDaysRemaining: number | null;
  isInGrace: boolean;
  shouldShowTopBanner: boolean;
  bannerSeverity: 'CRITICAL' | 'WARNING' | null;
  bannerMessage: string | null;
  lastAmount: number | null;
  lastCurrency: string | null;
  commercialInstallment?: {
    installmentNumber: number;
    dueDate: string;
    remainingAmount: number;
    currency: string;
    daysUntilDue: number;
  } | null;
}

export interface PosNotificationCenterResponse {
  serverNow: string;
  membership: MembershipAlertSummary | null;
  items: SystemNotificationItem[];
  counts: {
    total: number;
    critical: number;
    warning: number;
    info: number;
  };
}

export const getPosNotificationCenter = async (
  businessId?: string,
): Promise<PosNotificationCenterResponse> => {
  const res = await apiClient.get<PosNotificationCenterResponse>(
    '/pos/notifications/center',
    {
      params: businessId ? { businessId } : undefined,
    },
  );
  return res.data;
};
