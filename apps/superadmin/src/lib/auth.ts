import { create } from 'zustand';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://trackdeli-api-production.up.railway.app/api/v1';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
  businessId?: string | null;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: (() => {
    try {
      const raw = localStorage.getItem('sa_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })(),
  accessToken: localStorage.getItem('sa_access_token'),
  isAuthenticated: !!localStorage.getItem('sa_access_token'),
  isLoading: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const { data } = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password,
      });

      if (data.user?.role !== 'SUPERADMIN') {
        throw new Error('No tenés permisos para acceder aquí');
      }

      localStorage.setItem('sa_access_token', data.accessToken);
      localStorage.setItem('sa_refresh_token', data.refreshToken);
      localStorage.setItem('sa_user', JSON.stringify(data.user));

      set({
        user: data.user,
        accessToken: data.accessToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      set({ isLoading: false });
      const msg = error.response?.data?.message || error.message || 'Error al iniciar sesión';
      throw new Error(msg);
    }
  },

  logout: () => {
    localStorage.removeItem('sa_access_token');
    localStorage.removeItem('sa_refresh_token');
    localStorage.removeItem('sa_user');
    set({ user: null, accessToken: null, isAuthenticated: false });
  },

  checkAuth: () => {
    const token = localStorage.getItem('sa_access_token');
    const userRaw = localStorage.getItem('sa_user');
    if (token && userRaw) {
      try {
        const user = JSON.parse(userRaw);
        if (user.role === 'SUPERADMIN') {
          set({ user, accessToken: token, isAuthenticated: true });
          return;
        }
      } catch {
        // ignore
      }
    }
    set({ user: null, accessToken: null, isAuthenticated: false });
  },
}));
