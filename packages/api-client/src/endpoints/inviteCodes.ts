import { apiClient } from '../client';

export interface InviteCodeUsage {
  id: string;
  inviteCodeId: string;
  riderId: string;
  rider?: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    profilePhotoUrl?: string | null;
    createdAt?: string;
  };
  usedAt: string;
}

export interface InviteCode {
  id: string;
  businessId: string;
  code: string;
  description?: string | null;
  maxUses?: number | null;
  usedCount: number;
  isActive: boolean;
  expiresAt?: string | null;
  createdAt: string;
  business?: {
    id: string;
    name: string;
    logoUrl?: string | null;
  };
  usages?: InviteCodeUsage[];
}

export interface CreateInviteCodeDto {
  code?: string;
  description?: string;
  maxUses?: number;
  expiresAt?: string;
}

export const getInviteCodes = async (): Promise<InviteCode[]> => {
  try {
    const res = await apiClient.get('/invite-codes');
    return Array.isArray(res.data) ? res.data : [];
  } catch (err: any) {
    if (err?.response?.status === 404) {
      try {
        const res2 = await apiClient.get('/businesses/invite-codes');
        return Array.isArray(res2.data) ? res2.data : [];
      } catch {
        return [];
      }
    }
    return [];
  }
};

export const createInviteCode = async (dto: CreateInviteCodeDto): Promise<InviteCode> => {
  try {
    const res = await apiClient.post('/invite-codes', dto);
    return res.data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      const res2 = await apiClient.post('/businesses/invite-codes', dto);
      return res2.data;
    }
    throw err;
  }
};

export const toggleInviteCode = async (id: string): Promise<InviteCode> => {
  try {
    const res = await apiClient.patch(`/invite-codes/${id}/toggle`);
    return res.data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      const res2 = await apiClient.patch(`/invite-codes/${id}`);
      return res2.data;
    }
    throw err;
  }
};

export const getInviteCodeUsages = async (id: string): Promise<InviteCodeUsage[]> => {
  try {
    const res = await apiClient.get(`/invite-codes/${id}/usages`);
    return Array.isArray(res.data) ? res.data : [];
  } catch {
    return [];
  }
};

export const getPublicInviteCode = async (code: string): Promise<InviteCode> => {
  try {
    const res = await apiClient.get(`/invite-codes/public/${code}`);
    return res.data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      const res2 = await apiClient.get(`/invite-codes/${code}`);
      return res2.data;
    }
    throw err;
  }
};
