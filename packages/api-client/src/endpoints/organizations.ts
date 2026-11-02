import { apiClient } from '../client';

export interface Organization {
  id: string;
  name: string;
  businessCount?: number;
  createdAt?: string;
  updatedAt?: string;
  industry?: {
    id: string;
    name: string;
  } | null;
  businesses?: Array<{
    id: string;
    name: string;
    slug?: string;
    isPrimary?: boolean;
    businessType?: string;
  }>;
  accesses?: OrganizationAccess[];
}

export interface OrganizationAccess {
  id: string;
  organizationId: string;
  userId: string;
  businessId: string;
  createdAt?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    businessId?: string;
  };
  business?: {
    id: string;
    name: string;
    slug?: string;
  };
}

export const createOrganization = async (name: string): Promise<Organization> => {
  const res = await apiClient.post('/superadmin/organizations', { name });
  return res.data;
};

export const getOrganizations = async (): Promise<Organization[]> => {
  const res = await apiClient.get('/superadmin/organizations');
  return res.data;
};

export const getOrganization = async (id: string): Promise<Organization> => {
  const res = await apiClient.get(`/superadmin/organizations/${id}`);
  return res.data;
};

export const setBusinessOrganization = async (
  businessId: string,
  organizationId: string | null
): Promise<{ success: boolean; organizationId: string | null }> => {
  const res = await apiClient.patch(`/superadmin/businesses/${businessId}/organization`, {
    organizationId,
  });
  return res.data;
};

export const grantOrganizationAccess = async (
  organizationId: string,
  data: { userId: string; businessId: string }
): Promise<OrganizationAccess> => {
  const res = await apiClient.post(`/superadmin/organizations/${organizationId}/access`, data);
  return res.data;
};

export const revokeOrganizationAccess = async (
  organizationId: string,
  accessId: string
): Promise<{ success: boolean }> => {
  const res = await apiClient.delete(`/superadmin/organizations/${organizationId}/access/${accessId}`);
  return res.data;
};

