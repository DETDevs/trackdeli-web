import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getWebBillingStatus, type WebBillingStatusResponse } from 'api-client';
import { useAuthStore } from '../store/auth.store';
import { useMyProducts } from './useMyProducts';

export function usePosWebAccess() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isSuperAdmin = user?.role === 'SUPERADMIN';

  const { data: productsData } = useMyProducts(!isSuperAdmin);

  const isDeliveryActive =
    isSuperAdmin || productsData?.products?.DELIVERY?.status === 'ACTIVE';

  const isPosActive =
    isSuperAdmin || productsData?.products?.POS?.status === 'ACTIVE';

  const [isAccessDisabledByEvent, setIsAccessDisabledByEvent] = useState(false);

  useEffect(() => {
    const handleDisabled = () => {
      setIsAccessDisabledByEvent(true);
    };

    window.addEventListener('trackdeli:web_access_disabled', handleDisabled);
    return () => {
      window.removeEventListener('trackdeli:web_access_disabled', handleDisabled);
    };
  }, []);

  // Para negocios con solo Delivery (isPosActive = false), no se ejecuta la consulta
  const query = useQuery<WebBillingStatusResponse>({
    queryKey: ['pos', 'web-billing', 'status'],
    queryFn: () => getWebBillingStatus(),
    enabled: Boolean(isAuthenticated && isPosActive && !isSuperAdmin),
    staleTime: 30000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const isErrorCodeDisabled =
    (query.error as any)?.response?.data?.code === 'WEB_ACCESS_DISABLED' ||
    (query.error as any)?.response?.status === 403;

  let webAdminEnabled = true;
  let webBillingEnabled = false;

  if (isSuperAdmin) {
    webAdminEnabled = true;
    webBillingEnabled = true;
  } else if (!isPosActive) {
    webAdminEnabled = false;
    webBillingEnabled = false;
  } else if (isAccessDisabledByEvent || isErrorCodeDisabled) {
    webAdminEnabled = false;
    webBillingEnabled = false;
  } else if (query.data) {
    webAdminEnabled = query.data.webAdminEnabled ?? true;
    webBillingEnabled = query.data.enabled ?? false;
  }

  // Roles autorizados para cobrar: SUPERADMIN, ENCARGADO, CAJERO (no REPARTIDOR)
  const canCobrar = Boolean(
    isSuperAdmin ||
      user?.role === 'ENCARGADO' ||
      user?.role === 'CAJERO' ||
      user?.role === 'ADMIN' ||
      !user?.role
  );

  return {
    isPosActive,
    isDeliveryActive,
    webAdminEnabled,
    webBillingEnabled,
    canCobrar,
    isLoading: isPosActive && !isSuperAdmin ? query.isLoading : false,
    statusData: query.data,
    refetch: query.refetch,
  };
}
