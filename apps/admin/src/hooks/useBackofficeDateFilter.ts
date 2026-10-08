import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, subDays, startOfMonth } from 'date-fns';

export type DateFilterPreset = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

interface StoredFilterState {
  preset: DateFilterPreset;
  customFrom?: string;
  customTo?: string;
}

const STORAGE_KEY = 'trackdeli_pos_backoffice_date_filter';

const getLocalDateString = (d: Date): string => {
  return format(d, 'yyyy-MM-dd');
};

export const useBackofficeDateFilter = (defaultPreset: DateFilterPreset = 'today') => {
  // Inicializar estado desde sessionStorage si existe
  const [preset, setPresetState] = useState<DateFilterPreset>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as StoredFilterState;
        if (parsed.preset) return parsed.preset;
      }
    } catch {
      // Ignorar errores de parseo
    }
    return defaultPreset;
  });

  const todayStr = useMemo(() => getLocalDateString(new Date()), []);

  const [customFrom, setCustomFromState] = useState<string>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as StoredFilterState;
        if (parsed.customFrom) return parsed.customFrom;
      }
    } catch {}
    return todayStr;
  });

  const [customTo, setCustomToState] = useState<string>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as StoredFilterState;
        if (parsed.customTo) return parsed.customTo;
      }
    } catch {}
    return todayStr;
  });

  // Guardar en sessionStorage en cada cambio
  useEffect(() => {
    try {
      const stateToStore: StoredFilterState = {
        preset,
        customFrom,
        customTo,
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stateToStore));
    } catch {}
  }, [preset, customFrom, customTo]);

  // Calcular las fechas resultantes según el preset activo
  const { from, to, label } = useMemo(() => {
    const now = new Date();
    const today = getLocalDateString(now);

    switch (preset) {
      case 'today':
        return {
          from: today,
          to: today,
          label: 'Hoy',
        };

      case 'yesterday': {
        const yDate = subDays(now, 1);
        const yStr = getLocalDateString(yDate);
        return {
          from: yStr,
          to: yStr,
          label: 'Ayer',
        };
      }

      case 'week': {
        const wDate = subDays(now, 6);
        const wStr = getLocalDateString(wDate);
        return {
          from: wStr,
          to: today,
          label: 'Últimos 7 días',
        };
      }

      case 'month': {
        const mStart = startOfMonth(now);
        const mStr = getLocalDateString(mStart);
        return {
          from: mStr,
          to: today,
          label: 'Este mes',
        };
      }

      case 'custom':
      default:
        return {
          from: customFrom || today,
          to: customTo || today,
          label: 'Personalizado',
        };
    }
  }, [preset, customFrom, customTo]);

  const setPreset = useCallback((newPreset: DateFilterPreset) => {
    setPresetState(newPreset);
  }, []);

  const setCustomRange = useCallback((newFrom: string, newTo: string) => {
    setCustomFromState(newFrom);
    setCustomToState(newTo);
    setPresetState('custom');
  }, []);

  return {
    preset,
    setPreset,
    from,
    to,
    customFrom,
    customTo,
    setCustomRange,
    label,
  };
};
