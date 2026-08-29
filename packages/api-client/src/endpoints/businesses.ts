import { apiClient } from '../client';

export type PricingModel = 'FREE' | 'FIXED' | 'PER_KM' | 'RIDER_QUOTE';

export interface PricingZone {
  id: string;
  name: string;
  price: number;
}

export interface Business {
  id: string;
  name: string;
  type?: string;
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
