import { useState, useEffect } from 'react';
import type { WaiterAuthData, BusinessPublicInfo } from '../types/mesero';

const TOKEN_KEY = 'trackdeli_waiter_token';
const REFRESH_KEY = 'trackdeli_waiter_refresh';
const WAITER_KEY = 'trackdeli_waiter_info';
const SLUG_KEY = 'trackdeli_waiter_slug';

export interface StoredWaiterSession {
  waiter: {
    id: string;
    name: string;
    businessId: string;
    role: string;
  };
  business?: BusinessPublicInfo;
  slug: string;
}

export const getStoredSession = (): StoredWaiterSession | null => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const info = localStorage.getItem(WAITER_KEY);
    const slug = localStorage.getItem(SLUG_KEY);
    if (!token || !info) return null;
    const parsed = JSON.parse(info);
    return {
      waiter: parsed.waiter,
      business: parsed.business,
      slug: slug || '',
    };
  } catch {
    return null;
  }
};

export const saveSession = (data: WaiterAuthData, slug: string) => {
  localStorage.setItem(TOKEN_KEY, data.accessToken);
  if (data.refreshToken) {
    localStorage.setItem(REFRESH_KEY, data.refreshToken);
  }
  localStorage.setItem(
    WAITER_KEY,
    JSON.stringify({ waiter: data.waiter, business: data.business })
  );
  localStorage.setItem(SLUG_KEY, slug);
};

export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(WAITER_KEY);
};

export const useWaiterAuth = () => {
  const [session, setSession] = useState<StoredWaiterSession | null>(getStoredSession);

  useEffect(() => {
    const handleStorage = () => {
      setSession(getStoredSession());
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const login = (data: WaiterAuthData, slug: string) => {
    saveSession(data, slug);
    setSession({
      waiter: data.waiter,
      business: data.business,
      slug,
    });
  };

  const logout = () => {
    clearSession();
    setSession(null);
  };

  return {
    session,
    isAuthenticated: Boolean(session),
    login,
    logout,
  };
};
