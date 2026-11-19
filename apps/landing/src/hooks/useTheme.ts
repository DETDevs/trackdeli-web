import { useEffect, useState } from 'react';

export type ThemePreference = 'light' | 'dark' | 'auto';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'nexol-theme';

const getSystemDark = (): boolean => {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export const readStoredTheme = (): ThemePreference => {
  if (typeof window === 'undefined') return 'auto';
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // ignore storage errors
  }
  return 'auto';
};

export const applyThemePreference = (pref: ThemePreference): ResolvedTheme => {
  const isDark = pref === 'dark' || (pref === 'auto' && getSystemDark());
  if (typeof document !== 'undefined') {
    const html = document.documentElement;
    if (pref === 'dark' || pref === 'light') {
      html.setAttribute('data-theme', pref);
    } else {
      html.removeAttribute('data-theme');
    }
    html.classList.toggle('dark', isDark);
  }
  return isDark ? 'dark' : 'light';
};

export const useTheme = () => {
  const [theme, setThemeState] = useState<ThemePreference>(readStoredTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    applyThemePreference(readStoredTheme())
  );

  const setTheme = (next: ThemePreference) => {
    setThemeState(next);
    try {
      if (next === 'auto') {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, next);
      }
    } catch {
      // ignore storage errors
    }
    setResolvedTheme(applyThemePreference(next));
  };

  useEffect(() => {
    setResolvedTheme(applyThemePreference(theme));

    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => {
      if (theme === 'auto') {
        setResolvedTheme(applyThemePreference('auto'));
      }
    };
    mq.addEventListener('change', handleMediaChange);
    return () => {
      mq.removeEventListener('change', handleMediaChange);
    };
  }, [theme]);

  return { theme, setTheme, resolvedTheme };
};
