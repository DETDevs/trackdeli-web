import axios from 'axios';

// @ts-ignore: Vite injects import.meta.env during build
const API_BASE_URL = import.meta.env?.VITE_API_URL || import.meta.env?.VITE_API_BASE_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.request.use(
  (config) => {
    const accessToken =
      localStorage.getItem('trackdeli_access_token') || localStorage.getItem('sa_access_token');
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 402 && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('trackdeli:payment_required', {
          detail: error.response?.data,
        })
      );
    }

    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/login')
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = localStorage.getItem('trackdeli_refresh_token');

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        { refreshToken }
      );

      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

      localStorage.setItem('trackdeli_access_token', newAccessToken);
      localStorage.setItem('trackdeli_refresh_token', newRefreshToken);

      try {
        const { useAuthStore } = await import('../../../apps/admin/src/store/auth.store');
        useAuthStore.getState().setTokens(newAccessToken, newRefreshToken);

        const { useSocketStore } = await import('../../../apps/admin/src/store/socket.store');
        const socket = useSocketStore.getState().socket;
        if (socket) {
          socket.auth = { token: newAccessToken };
          socket.disconnect().connect();
        }
      } catch {
      }

      processQueue(null, newAccessToken);

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return apiClient(originalRequest);

    } catch (refreshError) {
      processQueue(refreshError, null);

      localStorage.removeItem('trackdeli_access_token');
      localStorage.removeItem('trackdeli_refresh_token');
      localStorage.removeItem('auth-storage');

      try {
        const { useAuthStore } = await import('../../../apps/admin/src/store/auth.store');
        useAuthStore.getState().logout();
      } catch {
      }

      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;
