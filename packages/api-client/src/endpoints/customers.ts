import { apiClient } from '../client';

export interface Customer {
  id: string;
  businessId: string;
  phone: string;
  name: string;
  lastLatitude?: number | null;
  lastLongitude?: number | null;
  lastAddressText?: string | null;
  lastConfirmedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  business?: {
    id: string;
    name: string;
    logoUrl?: string | null;
    whatsappNumber?: string | null;
    whatsappDisplay?: string | null;
  };
}

export interface CustomerLocationSession {
  id: string;
  customerId: string;
  token: string;
  isActive: boolean;
  status: 'PENDING' | 'RESPONDED' | string;
  sessionStatus: 'PENDING' | 'RESPONDED' | string;
  respondedAt?: string | null;
  expiresAt: string;
  customer: Customer;
}

export interface UpdateCustomerLocationDto {
  latitude?: number;
  longitude?: number;
  addressText?: string;
  confirmedOnly?: boolean;
}

export interface LocationConfirmationLinkResponse {
  customerId: string;
  confirmationUrl: string;
  token: string;
  expiresAt?: string;
  link?: string;
}

export const searchCustomers = async (
  query: string,
  businessId?: string
): Promise<Customer[]> => {
  if (!query || query.trim().length < 1) return [];
  const q = encodeURIComponent(query.trim());

  if (businessId) {
    try {
      const res = await apiClient.get(`/businesses/${businessId}/customers/search?q=${q}`);
      if (Array.isArray(res.data)) return res.data;
    } catch {
      // Fallback to global search
    }
  }

  try {
    const res = await apiClient.get(`/customers/search?q=${q}`);
    return Array.isArray(res.data) ? res.data : [];
  } catch {
    return [];
  }
};

export const createLocationConfirmationLink = async (params: {
  customerId?: string;
  businessId?: string;
  phone: string;
  name?: string;
}): Promise<LocationConfirmationLinkResponse> => {
  if (params.customerId) {
    try {
      const res = await apiClient.post(`/customers/${params.customerId}/location-confirmation-link`, {
        businessId: params.businessId,
      });
      if (res.data) {
        return {
          customerId: res.data.customerId || params.customerId,
          confirmationUrl: res.data.confirmationUrl || res.data.url || res.data.link,
          token: res.data.token,
          expiresAt: res.data.expiresAt,
          ...res.data,
        };
      }
    } catch {
      // Fallback to generic upsert creation below
    }
  }

  // Generic endpoint with upsert
  try {
    const res = await apiClient.post('/customers/location-confirmation-link', {
      businessId: params.businessId,
      phone: params.phone,
      name: params.name || 'Cliente',
    });
    return {
      customerId: res.data.customerId,
      confirmationUrl: res.data.confirmationUrl || res.data.url || res.data.link,
      token: res.data.token,
      expiresAt: res.data.expiresAt,
      ...res.data,
    };
  } catch (err: any) {
    if (err?.response?.status === 404 && params.businessId) {
      const res2 = await apiClient.post(`/businesses/${params.businessId}/customers/location-confirmation-link`, {
        phone: params.phone,
        name: params.name || 'Cliente',
      });
      return {
        customerId: res2.data.customerId,
        confirmationUrl: res2.data.confirmationUrl || res2.data.url || res2.data.link,
        token: res2.data.token,
        expiresAt: res2.data.expiresAt,
        ...res2.data,
      };
    }
    throw err;
  }
};

/**
 * Resuelve el token de confirmación de ubicación del cliente contra el endpoint de clientes
 * NUNCA contra TrackingSession de pedidos.
 */
export const getCustomerLocationSession = async (token: string): Promise<CustomerLocationSession> => {
  let data: any = null;

  try {
    const res = await apiClient.get(`/customers/confirm-location/${token}`);
    data = res.data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      try {
        const res2 = await apiClient.get(`/customers/location-sessions/${token}`);
        data = res2.data;
      } catch {
        try {
          const res3 = await apiClient.get(`/customers/location-session/${token}`);
          data = res3.data;
        } catch {
          const res4 = await apiClient.get(`/customers/session/${token}`);
          data = res4.data;
        }
      }
    } else {
      throw err;
    }
  }

  if (!data) {
    throw new Error('Sesión de ubicación no encontrada');
  }

  // Normalizar datos de respuesta (tanto si viene objeto Customer directo como si viene empaquetado)
  const customer: Customer = data.customer || {
    id: data.id || data.customerId,
    businessId: data.businessId,
    phone: data.phone,
    name: data.name,
    lastLatitude: data.lastLatitude,
    lastLongitude: data.lastLongitude,
    lastAddressText: data.lastAddressText,
    lastConfirmedAt: data.lastConfirmedAt,
    business: data.business,
  };

  const rawStatus = data.sessionStatus || data.status || data.session?.status;
  const isResponded = rawStatus === 'RESPONDED' || Boolean(data.respondedAt || data.session?.respondedAt);
  const sessionStatus = isResponded ? 'RESPONDED' : (rawStatus || 'PENDING');

  return {
    id: data.id || data.customerId || customer.id,
    customerId: customer.id || data.customerId,
    token: data.token || token,
    isActive: data.isActive !== undefined ? data.isActive : true,
    status: sessionStatus,
    sessionStatus,
    respondedAt: data.respondedAt || data.session?.respondedAt || null,
    expiresAt: data.expiresAt || new Date(Date.now() + 86400000).toISOString(),
    customer,
  };
};

export const updateCustomerLocationByToken = async (
  token: string,
  dto: UpdateCustomerLocationDto,
  customerId?: string
): Promise<any> => {
  if (customerId) {
    try {
      const res = await apiClient.patch(`/customers/${customerId}/location`, {
        ...dto,
        token,
      });
      return res.data;
    } catch (err: any) {
      if (err?.response?.status !== 404) {
        throw err;
      }
    }
  }

  try {
    const res = await apiClient.patch(`/customers/confirm-location/${token}`, dto);
    return res.data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      try {
        const res2 = await apiClient.patch(`/customers/location-sessions/${token}`, dto);
        return res2.data;
      } catch {
        const res3 = await apiClient.patch(`/customers/location-session/${token}`, dto);
        return res3.data;
      }
    }
    throw err;
  }
};

export const updateCustomerLocation = async (
  customerId: string,
  dto: UpdateCustomerLocationDto
): Promise<Customer> => {
  const res = await apiClient.patch(`/customers/${customerId}/location`, dto);
  return res.data;
};
