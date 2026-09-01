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
  isActive?: boolean;
}

export interface UpdateBusinessClientDto {
  name?: string;
  phone?: string;
  address?: string;
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

// Business Clients (para EMPRESA_RIDERS)
export const getBusinessClients = async (params?: { search?: string; isActive?: boolean }): Promise<BusinessClient[]> => {
  try {
    const res = await apiClient.get('/business-clients', { params });
    return Array.isArray(res.data) ? res.data : [];
  } catch (err: any) {
    if (err?.response?.status === 404) {
      try {
        const res2 = await apiClient.get('/businesses/me/clients', { params });
        return Array.isArray(res2.data) ? res2.data : [];
      } catch {
        return [];
      }
    }
    return [];
  }
};

export const createBusinessClient = async (data: CreateBusinessClientDto): Promise<BusinessClient> => {
  try {
    const res = await apiClient.post('/business-clients', data);
    return res.data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      const res2 = await apiClient.post('/businesses/me/clients', data);
      return res2.data;
    }
    throw err;
  }
};

export const updateBusinessClient = async (id: string, data: UpdateBusinessClientDto): Promise<BusinessClient> => {
  try {
    const res = await apiClient.patch(`/business-clients/${id}`, data);
    return res.data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      const res2 = await apiClient.patch(`/businesses/me/clients/${id}`, data);
      return res2.data;
    }
    throw err;
  }
};

export const deleteBusinessClient = async (id: string): Promise<{ success: boolean }> => {
  try {
    const res = await apiClient.delete(`/business-clients/${id}`);
    return res.data || { success: true };
  } catch (err: any) {
    if (err?.response?.status === 404) {
      const res2 = await apiClient.delete(`/businesses/me/clients/${id}`);
      return res2.data || { success: true };
    }
    throw err;
  }
};
