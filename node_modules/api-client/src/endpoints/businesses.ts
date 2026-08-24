import { apiClient } from '../client';

export interface Business {
  id: string;
  name: string;
  type?: string;
  logoUrl?: string;
  defaultGeofenceRadiusM: number;
  latitude?: number;
  longitude?: number;
  createdAt: string;
}

export const getMyBusiness = async () => {
  const res = await apiClient.get('/businesses/me');
  return res.data as Business;
};

export const updateMyBusiness = async (data: { latitude: number; longitude: number }) => {
  const res = await apiClient.patch('/businesses/me', data);
  return res.data as Business;
};
