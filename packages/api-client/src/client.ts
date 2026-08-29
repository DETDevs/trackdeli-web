import axios from 'axios';

// @ts-ignore: Vite injects import.meta.env during build
const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'https://trackdeli-api-production.up.railway.app/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Flag global FUERA del interceptor — previene loops paralelos
let isRefreshing = false;
// Cola de requests que llegaron mientras se estaba refrescando
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

// Request interceptor: agregar JWT en cada request
apiClient.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('trackdeli_access_token');
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: manejar 401 con refresh token
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Notificar si es 402 Payment Required
    if (error.response?.status === 402 && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('trackdeli:payment_required', {
          detail: error.response?.data,
        })
      );
    }

    // Condiciones para NO intentar refresh:
    // 1. No es un error 401
    // 2. Ya se intentó el retry en este request (_retry flag)
    // 3. El request que falló ES el endpoint de refresh (evitar loop)
    // 4. El request que falló ES el endpoint de login
    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/login')
    ) {
      return Promise.reject(error);
    }

    // Si ya hay un refresh en curso, encolar este request
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

    // Marcar el request como "ya se intentó retry"
    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = localStorage.getItem('trackdeli_refresh_token');

      // Si no hay refresh token, ir directo al login
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // Intentar refrescar — usar axios directo, NO apiClient (evitar interceptors)
      const response = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        { refreshToken }
      );

      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

      // Guardar nuevos tokens
      localStorage.setItem('trackdeli_access_token', newAccessToken);
      localStorage.setItem('trackdeli_refresh_token', newRefreshToken);

      // Actualizar el store de Zustand si está disponible
      // (importar dinámicamente para evitar dependencia circular)
      try {
        const { useAuthStore } = await import('../../../apps/admin/src/store/auth.store');
        useAuthStore.getState().setTokens(newAccessToken, newRefreshToken);
        
        // Reconectar el WebSocket si estaba conectado
        const { useSocketStore } = await import('../../../apps/admin/src/store/socket.store');
        const socket = useSocketStore.getState().socket;
        if (socket) {
          socket.auth = { token: newAccessToken };
          socket.disconnect().connect();
        }
      } catch {
        // Si no se puede importar el store, continuar igual
      }

      // Procesar la cola de requests pendientes con el nuevo token
      processQueue(null, newAccessToken);

      // Reintentar el request original con el nuevo token
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return apiClient(originalRequest);

    } catch (refreshError) {
      // El refresh falló — limpiar todo y redirigir al login
      processQueue(refreshError, null);

      // Limpiar localStorage
      localStorage.removeItem('trackdeli_access_token');
      localStorage.removeItem('trackdeli_refresh_token');
      localStorage.removeItem('auth-storage');

      // Limpiar el store de Zustand si está disponible
      try {
        const { useAuthStore } = await import('../../../apps/admin/src/store/auth.store');
        useAuthStore.getState().logout();
      } catch {
        // Si no se puede importar el store, continuar igual
      }

      // Redirigir al login (una sola vez)
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
