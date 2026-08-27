import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Interceptor de requests — agregar token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sa_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Variables para evitar múltiples refreshes simultáneos
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

// Interceptor de responses — manejar 401 con refresh silencioso
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Solo interceptar 401 que no sean del refresh o login
    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/login')
    ) {
      return Promise.reject(error);
    }

    // Si ya estamos refrescando, encolar este request
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

    // Iniciar refresh
    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = localStorage.getItem('sa_refresh_token');

      if (!refreshToken) {
        throw new Error('No hay refresh token de SuperAdmin');
      }

      // Usar axios directo (sin interceptores) para el refresh
      const { data } = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        { refreshToken }
      );

      const newAccessToken: string = data.accessToken;
      const newRefreshToken: string = data.refreshToken;

      // Guardar nuevos tokens
      localStorage.setItem('sa_access_token', newAccessToken);
      localStorage.setItem('sa_refresh_token', newRefreshToken);

      // Resolver requests encoladas
      processQueue(null, newAccessToken);

      // Reintentar request original
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      // Refresh falló — limpiar tokens y redirigir
      processQueue(refreshError, null);
      localStorage.removeItem('sa_access_token');
      localStorage.removeItem('sa_refresh_token');
      localStorage.removeItem('sa_user');

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
