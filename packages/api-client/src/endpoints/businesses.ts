import { apiClient } from '../client';

export type BusinessType = 'NEGOCIO' | 'EMPRESA_RIDERS';
export type PricingModel = 'FREE' | 'FIXED' | 'PER_KM' | 'RIDER_QUOTE';

export interface PricingZone {
  id: string;
  name: string;
  price: number;
}

export interface BusinessClient {
  id: string;
  businessId: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isActive: boolean;
  createdAt: string;
  _count?: {
    orders?: number;
  };
}

export interface CreateBusinessClientDto {
  name: string;
  phone?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  isActive?: boolean;
}

export interface UpdateBusinessClientDto {
  name?: string;
  phone?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  isActive?: boolean;
}

export interface Business {
  id: string;
  name: string;
  type?: string;
  businessType?: BusinessType;
  commissionRate?: number;
  altCommissionRate?: number;
  altCommissionDistanceKm?: number;
  dispatchTimeoutMin?: number;
  logoUrl?: string;
  defaultGeofenceRadiusM: number;
  latitude?: number;
  longitude?: number;
  isActive?: boolean;
  pricingModel?: PricingModel;
  baseRate?: number;
  ratePerKm?: number;
  freeZoneKm?: number;
  minRate?: number;
  maxRate?: number;
  pricingZones?: PricingZone[];
  whatsappNumber?: string;
  whatsappDisplay?: string;
  membership?: {
    status: 'ACTIVE' | 'EXPIRED' | 'NONE';
    endDate?: string | null;
    daysLeft?: number | null;
  };
  createdAt: string;
}

export interface UpdateBusinessInput {
  name?: string;
  type?: string;
  businessType?: BusinessType;
  commissionRate?: number;
  altCommissionRate?: number;
  altCommissionDistanceKm?: number;
  dispatchTimeoutMin?: number;
  logoUrl?: string;
  defaultGeofenceRadiusM?: number;
  latitude?: number;
  longitude?: number;
  pricingModel?: PricingModel;
  baseRate?: number;
  ratePerKm?: number;
  freeZoneKm?: number;
  minRate?: number;
  maxRate?: number;
  pricingZones?: PricingZone[];
  whatsappNumber?: string;
  whatsappDisplay?: string;
}

export const getMyBusiness = async () => {
  const res = await apiClient.get('/businesses/me');
  return res.data as Business;
};

export const updateMyBusiness = async (data: UpdateBusinessInput) => {
  const res = await apiClient.patch('/businesses/me', data);
  return res.data as Business;
};

const normalizeClient = (raw: any): BusinessClient => {
  if (!raw) return raw;
  return {
    id: raw.id,
    businessId: raw.businessId,
    name: raw.name || '',
    phone: raw.phone || null,
    address: raw.address || raw.lastAddressText || null,
    latitude:
      raw.latitude !== undefined && raw.latitude !== null
        ? Number(raw.latitude)
        : raw.lastLatitude !== undefined && raw.lastLatitude !== null
        ? Number(raw.lastLatitude)
        : null,
    longitude:
      raw.longitude !== undefined && raw.longitude !== null
        ? Number(raw.longitude)
        : raw.lastLongitude !== undefined && raw.lastLongitude !== null
        ? Number(raw.lastLongitude)
        : null,
    isActive: raw.isActive !== undefined ? Boolean(raw.isActive) : !raw.isBlocked,
    createdAt: raw.createdAt,
    _count: raw._count,
  };
};

export const getBusinessClients = async (params?: { search?: string; isActive?: boolean }): Promise<BusinessClient[]> => {
  try {
    const queryParams: Record<string, any> = { ...params };
    if (params?.search) {
      queryParams.q = params.search;
    }
    const res = await apiClient.get('/businesses/me/clients', { params: queryParams });
    const rawList = Array.isArray(res.data)
      ? res.data
      : Array.isArray(res.data?.items)
      ? res.data.items
      : [];
    return rawList.map(normalizeClient);
  } catch (err: any) {
    if (err?.response?.status === 404) {
      try {
        const res2 = await apiClient.get('/business-clients', { params });
        const rawList2 = Array.isArray(res2.data)
          ? res2.data
          : Array.isArray(res2.data?.items)
          ? res2.data.items
          : [];
        return rawList2.map(normalizeClient);
      } catch {
        return [];
      }
    }
    return [];
  }
};

export const createBusinessClient = async (data: CreateBusinessClientDto): Promise<BusinessClient> => {
  const payload = {
    ...data,
    ...(data.isActive !== undefined ? { isBlocked: !data.isActive } : {}),
  };
  try {
    const res = await apiClient.post('/businesses/me/clients', payload);
    return normalizeClient(res.data);
  } catch (err: any) {
    if (err?.response?.status === 404) {
      const res2 = await apiClient.post('/business-clients', data);
      return normalizeClient(res2.data);
    }
    throw err;
  }
};

export const updateBusinessClient = async (id: string, data: UpdateBusinessClientDto): Promise<BusinessClient> => {
  const payload = {
    ...data,
    ...(data.isActive !== undefined ? { isBlocked: !data.isActive } : {}),
  };
  try {
    const res = await apiClient.patch(`/businesses/me/clients/${id}`, payload);
    return normalizeClient(res.data);
  } catch (err: any) {
    if (err?.response?.status === 404) {
      const res2 = await apiClient.patch(`/business-clients/${id}`, data);
      return normalizeClient(res2.data);
    }
    throw err;
  }
};

export const deleteBusinessClient = async (id: string): Promise<{ success: boolean }> => {
  try {
    const res = await apiClient.delete(`/businesses/me/clients/${id}`);
    return res.data || { success: true };
  } catch (err: any) {
    if (err?.response?.status === 404 || err?.response?.status === 405) {
      try {
        const res2 = await apiClient.delete(`/businesses/me/business-clients/${id}`);
        return res2.data || { success: true };
      } catch {
        const res3 = await apiClient.delete(`/business-clients/${id}`);
        return res3.data || { success: true };
      }
    }
    throw err;
  }
};

