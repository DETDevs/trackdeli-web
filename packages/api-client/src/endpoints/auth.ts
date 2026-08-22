import { apiClient } from '../client';

export const login = async (email: string, password: string) => {
  const res = await apiClient.post('/auth/login', { email, password });
  return res.data as {
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      businessId: string;
    };
  };
};

export const refresh = async (refreshToken: string) => {
  const res = await apiClient.post('/auth/refresh', { refreshToken });
  return res.data as {
    accessToken: string;
    refreshToken: string;
  };
};
