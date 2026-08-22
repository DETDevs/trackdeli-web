import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { login as apiLogin } from 'api-client';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  businessId: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const res = await apiLogin(email, password);
          localStorage.setItem('trackdeli_access_token', res.accessToken);
          localStorage.setItem('trackdeli_refresh_token', res.refreshToken);
          set({
            user: res.user,
            accessToken: res.accessToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('trackdeli_access_token');
        localStorage.removeItem('trackdeli_refresh_token');
        set({ user: null, accessToken: null, isAuthenticated: false });
      },

      setTokens: (accessToken, refreshToken) => {
        localStorage.setItem('trackdeli_access_token', accessToken);
        localStorage.setItem('trackdeli_refresh_token', refreshToken);
        set({ accessToken, isAuthenticated: true });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated
      }),
    }
  )
);
