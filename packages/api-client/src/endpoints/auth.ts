import { apiClient } from '../client';

export interface Branch {
  id: string;
  name: string;
  slug?: string;
  isPrimary?: boolean;
}

export interface AuthLoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    businessId: string;
  };
  branches?: Branch[];
}

export const login = async (email: string, password: string): Promise<AuthLoginResponse> => {
  const res = await apiClient.post('/auth/login', { email, password });
  return res.data;
};

export const switchBranch = async (businessId: string): Promise<AuthLoginResponse> => {
  const res = await apiClient.post('/auth/switch-branch', { businessId });
  return res.data;
};

export const getBranches = async (): Promise<Branch[]> => {
  const res = await apiClient.get('/auth/branches');
  return res.data;
};

export const refresh = async (refreshToken: string) => {
  const res = await apiClient.post('/auth/refresh', { refreshToken });
  return res.data as {
    accessToken: string;
    refreshToken: string;
  };
};
