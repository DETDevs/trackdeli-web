import { apiClient, getCustomer, searchCustomers } from 'api-client';

const normalizeNameKey = (val?: string | null): string =>
  (val || '').trim().toLowerCase().replace(/\s+/g, ' ');

const normalizePhoneDigits = (val?: string | null): string => (val || '').replace(/\D/g, '');

/**
 * Resuelve la dirección del cliente asociada a una venta, priorizando los campos de
 * entrega/comprobante y cayendo al registro de cliente vinculado.
 */
export const getSaleCustomerAddress = (sale?: any | null): string => {
  if (!sale) return '';
  return String(
    sale.deliveryAddress ||
      sale.customerAddress ||
      sale.customer?.lastAddressText ||
      sale.customer?.address ||
      '',
  ).trim();
};

/**
 * Resuelve el punto de referencia del cliente asociado a una venta.
 */
export const getSaleCustomerReference = (sale?: any | null): string => {
  if (!sale) return '';
  return String(
    sale.deliveryReference ||
      sale.customerReference ||
      sale.customer?.deliveryReference ||
      '',
  ).trim();
};

/**
 * Fusiona los datos de dirección/referencia/RUC de un cliente obtenido del API dentro de una venta.
 */
export const mergeCustomerIntoSale = (sale: any, fetched?: any | null): any => {
  if (!fetched) return sale;
  const fetchedAddress = String(fetched.lastAddressText || fetched.address || '').trim();
  const existingAddress = String(
    sale.customer?.lastAddressText || sale.customer?.address || '',
  ).trim();
  const fetchedReference = String(fetched.deliveryReference || '').trim();
  const existingReference = String(sale.customer?.deliveryReference || '').trim();

  return {
    ...sale,
    customerId: sale.customerId || fetched.id || null,
    customerAddress: sale.customerAddress || fetchedAddress || undefined,
    customerReference: sale.customerReference || fetchedReference || undefined,
    customer: {
      ...(sale.customer || {}),
      ...fetched,
      lastAddressText: fetchedAddress || existingAddress || null,
      deliveryReference: fetchedReference || existingReference || null,
    },
  };
};

/**
 * Enriquece una venta histórica consultando el cliente en el API cuando falta dirección o punto de referencia.
 */
export const enrichSaleWithCustomerAddress = async (sale: any): Promise<any> => {
  if (!sale) return sale;
  const hasAddr = Boolean(getSaleCustomerAddress(sale));
  const hasRef = Boolean(getSaleCustomerReference(sale));
  if (hasAddr && hasRef) return sale;

  const customerId = sale.customerId || sale.customer?.id;
  if (customerId) {
    try {
      const res = await apiClient.get(`/pos/customers/${customerId}`);
      if (res.data) {
        return mergeCustomerIntoSale(sale, res.data);
      }
    } catch {
      try {
        const fetched = await getCustomer(customerId);
        if (fetched) {
          return mergeCustomerIntoSale(sale, fetched);
        }
      } catch {
        // Silencioso si el cliente no existe o no hay conexión
      }
    }
    return sale;
  }

  const nameKey = normalizeNameKey(sale.customerName || sale.customer?.name);
  const phoneDigits = normalizePhoneDigits(
    sale.deliveryPhone || sale.customerPhone || sale.customer?.phone,
  );
  if (
    !nameKey ||
    nameKey === 'cliente general' ||
    nameKey === 'consumidor final' ||
    phoneDigits.length < 7
  ) {
    return sale;
  }

  try {
    const list = await searchCustomers(phoneDigits, sale.businessId);
    const matches = (Array.isArray(list) ? list : []).filter((c: any) => {
      const cName = normalizeNameKey(c.name);
      const cPhone = normalizePhoneDigits(c.phone);
      const phoneMatches =
        cPhone === phoneDigits ||
        (cPhone.length >= 7 &&
          (cPhone.endsWith(phoneDigits) || phoneDigits.endsWith(cPhone)));
      return cName === nameKey && phoneMatches;
    });
    if (matches.length === 1) {
      return mergeCustomerIntoSale(sale, matches[0]);
    }
  } catch {
    // Silencioso
  }

  return sale;
};

const RECEIPT_ADDR_PREF_PREFIX = 'trackdeli_web_show_customer_address:';

/**
 * Lee la preferencia local por negocio para mostrar dirección y referencia del cliente en tickets térmicos.
 */
export const getLocalShowCustomerAddress = (
  businessId?: string | null,
): boolean | undefined => {
  if (typeof window === 'undefined' || !businessId) return undefined;
  try {
    const raw = window.localStorage.getItem(
      `${RECEIPT_ADDR_PREF_PREFIX}${businessId}`,
    );
    if (raw === 'true') return true;
    if (raw === 'false') return false;
  } catch {
    // Silencioso
  }
  return undefined;
};

/**
 * Persiste localmente por negocio la preferencia de mostrar dirección y referencia del cliente en tickets térmicos.
 */
export const setLocalShowCustomerAddress = (
  businessId: string | null | undefined,
  value: boolean,
): void => {
  if (typeof window === 'undefined' || !businessId) return;
  try {
    window.localStorage.setItem(
      `${RECEIPT_ADDR_PREF_PREFIX}${businessId}`,
      value ? 'true' : 'false',
    );
  } catch {
    // Silencioso
  }
};
