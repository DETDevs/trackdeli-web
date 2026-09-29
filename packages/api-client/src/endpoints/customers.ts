import { apiClient } from '../client';

export interface Customer {
  id: string;
  businessId: string;
  phone: string;
  name: string;
  email?: string | null;
  notes?: string | null;
  ruc?: string | null;
  creditLimit?: number | null;
  isBlocked?: boolean;
  lastLatitude?: number | null;
  lastLongitude?: number | null;
  lastAddressText?: string | null;
  lastConfirmedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    appointments?: number;
    creditAccounts?: number;
    sales?: number;
  };
  business?: {
    id: string;
    name: string;
    logoUrl?: string | null;
    whatsappNumber?: string | null;
    whatsappDisplay?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };
}

export interface CustomerLocationSession {
  id: string;
  customerId: string;
  token: string;
  shortCode?: string;
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
  shortCode?: string;
  expiresAt?: string;
  link?: string;
  whatsappUrl?: string;
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
  orderId?: string;
}): Promise<LocationConfirmationLinkResponse> => {
  if (params.customerId) {
    try {
      const res = await apiClient.post(`/customers/${params.customerId}/location-confirmation-link`, {
        businessId: params.businessId,
        orderId: params.orderId,
      });
      if (res.data) {
        return {
          customerId: res.data.customerId || params.customerId,
          confirmationUrl: res.data.confirmationUrl || res.data.url || res.data.link,
          token: res.data.token,
          shortCode: res.data.shortCode,
          expiresAt: res.data.expiresAt,
          whatsappUrl: res.data.whatsappUrl,
          ...res.data,
        };
      }
    } catch {
    }
  }

  try {
    const res = await apiClient.post('/customers/location-confirmation-link', {
      businessId: params.businessId,
      phone: params.phone,
      name: params.name || 'Cliente',
      orderId: params.orderId,
    });
    return {
      customerId: res.data.customerId,
      confirmationUrl: res.data.confirmationUrl || res.data.url || res.data.link,
      token: res.data.token,
      shortCode: res.data.shortCode,
      expiresAt: res.data.expiresAt,
      whatsappUrl: res.data.whatsappUrl,
      ...res.data,
    };
  } catch (err: any) {
    if (err?.response?.status === 404 && params.businessId) {
      const res2 = await apiClient.post(`/businesses/${params.businessId}/customers/location-confirmation-link`, {
        phone: params.phone,
        name: params.name || 'Cliente',
        orderId: params.orderId,
      });
      return {
        customerId: res2.data.customerId,
        confirmationUrl: res2.data.confirmationUrl || res2.data.url || res2.data.link,
        token: res2.data.token,
        shortCode: res2.data.shortCode,
        expiresAt: res2.data.expiresAt,
        whatsappUrl: res2.data.whatsappUrl,
        ...res2.data,
      };
    }
    throw err;
  }
};

export const getCustomerLocationSession = async (token: string): Promise<CustomerLocationSession> => {
  let data: any = null;
  const cleanToken = (token || '').trim();

  try {
    const res = await apiClient.get(`/c/${cleanToken}`);
    data = res.data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      try {
        const res2 = await apiClient.get(`/customers/confirm-location/${cleanToken}`);
        data = res2.data;
      } catch {
        try {
          const res3 = await apiClient.get(`/customers/c/${cleanToken}`);
          data = res3.data;
        } catch {
          try {
            const res4 = await apiClient.get(`/confirm-location/${cleanToken}`);
            data = res4.data;
          } catch {
            const res5 = await apiClient.get(`/customers/location-session/${cleanToken}`);
            data = res5.data;
          }
        }
      }
    } else {
      throw err;
    }
  }

  if (!data) {
    throw new Error('Sesión de ubicación no encontrada');
  }

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
    token: data.token || data.shortCode || cleanToken,
    shortCode: data.shortCode,
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
  const cleanToken = (token || '').trim();

  if (customerId) {
    try {
      const res = await apiClient.patch(`/customers/${customerId}/location`, {
        ...dto,
        token: cleanToken,
      });
      return res.data;
    } catch (err: any) {
      if (err?.response?.status !== 404) {
        throw err;
      }
    }
  }

  try {
    const res = await apiClient.patch(`/customers/confirm-location/${cleanToken}`, dto);
    return res.data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      try {
        const res2 = await apiClient.patch(`/customers/c/${cleanToken}`, dto);
        return res2.data;
      } catch {
        try {
          const res3 = await apiClient.patch(`/c/${cleanToken}`, dto);
          return res3.data;
        } catch {
          const res4 = await apiClient.patch(`/customers/location-session/${cleanToken}`, dto);
          return res4.data;
        }
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

export interface PaginatedCustomersResponse {
  items: Customer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CustomerHistoryResponse {
  customer: Customer & {
    email?: string | null;
    notes?: string | null;
    creditLimit?: number | null;
    ruc?: string | null;
    isBlocked?: boolean;
    consecutiveNoShows?: number;
  };
  products?: {
    citas: boolean;
    carteraCobro: boolean;
  };
  appointments?: any[];
  creditAccounts?: any[];
}

export interface UpdateCustomerInput {
  name?: string;
  phone?: string;
  address?: string;
  email?: string;
  notes?: string;
  latitude?: number | null;
  longitude?: number | null;
  isBlocked?: boolean;
}

export const getCustomers = async (params?: {
  search?: string;
  page?: number;
  limit?: number;
  businessId?: string;
}): Promise<PaginatedCustomersResponse> => {
  const queryParams: Record<string, any> = {};
  if (params?.search) queryParams.q = params.search;
  if (params?.page) queryParams.page = params.page;
  if (params?.limit) queryParams.limit = params.limit;

  const url = params?.businessId
    ? `/businesses/${params.businessId}/customers`
    : '/businesses/me/customers';

  try {
    const res = await apiClient.get(url, { params: queryParams });
    if (Array.isArray(res.data)) {
      return {
        items: res.data,
        total: res.data.length,
        page: 1,
        limit: res.data.length,
        totalPages: 1,
      };
    }
    return {
      items: res.data?.items || [],
      total: res.data?.total || 0,
      page: res.data?.page || 1,
      limit: res.data?.limit || 50,
      totalPages: res.data?.totalPages || 1,
    };
  } catch (err: any) {
    if (err?.response?.status === 404) {
      try {
        const res2 = await apiClient.get('/customers', { params: queryParams });
        if (Array.isArray(res2.data)) {
          return {
            items: res2.data,
            total: res2.data.length,
            page: 1,
            limit: res2.data.length,
            totalPages: 1,
          };
        }
        return {
          items: res2.data?.items || [],
          total: res2.data?.total || 0,
          page: res2.data?.page || 1,
          limit: res2.data?.limit || 50,
          totalPages: res2.data?.totalPages || 1,
        };
      } catch {
        return { items: [], total: 0, page: 1, limit: 50, totalPages: 1 };
      }
    }
    throw err;
  }
};

export const getCustomer = async (id: string, businessId?: string): Promise<Customer> => {
  const url = businessId
    ? `/businesses/${businessId}/customers/${id}`
    : `/businesses/me/customers/${id}`;
  try {
    const res = await apiClient.get(url);
    return res.data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      const res2 = await apiClient.get(`/customers/${id}`);
      return res2.data;
    }
    throw err;
  }
};

export const getCustomerHistory = async (id: string, businessId?: string): Promise<CustomerHistoryResponse> => {
  const url = businessId
    ? `/businesses/${businessId}/customers/${id}/history`
    : `/businesses/me/customers/${id}/history`;
  try {
    const res = await apiClient.get(url);
    return res.data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      const res2 = await apiClient.get(`/customers/${id}/history`);
      return res2.data;
    }
    throw err;
  }
};

export const updateCustomer = async (
  id: string,
  data: UpdateCustomerInput,
  businessId?: string
): Promise<Customer> => {
  const url = businessId
    ? `/businesses/${businessId}/customers/${id}`
    : `/businesses/me/customers/${id}`;

  try {
    const res = await apiClient.patch(url, data);
    return res.data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      const res2 = await apiClient.patch(`/customers/${id}`, data);
      return res2.data;
    }
    throw err;
  }
};
