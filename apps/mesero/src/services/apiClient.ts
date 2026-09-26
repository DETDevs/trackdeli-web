import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para inyectar token JWT del mesero
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('trackdeli_waiter_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejo de 401 (sesión expirada)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login') && !currentPath.endsWith('/mesas')) {
        localStorage.removeItem('trackdeli_waiter_token');
        localStorage.removeItem('trackdeli_waiter_refresh');
        localStorage.removeItem('trackdeli_waiter_info');
        // Redirigir al login del negocio si hay slug en la URL
        const match = currentPath.match(/\/mesas\/([^/]+)/);
        if (match && match[1]) {
          window.location.href = `/mesas/${match[1]}/login`;
        }
      }
    }
    return Promise.reject(error);
  }
);
