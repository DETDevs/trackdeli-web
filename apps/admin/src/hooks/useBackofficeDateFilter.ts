import { useState, useEffect, useMemo, useCallback } from 'react';
import { getManaguaTodayYMD } from '../utils/dateManagua';

export type DateFilterPreset = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

interface StoredFilterState {
  preset: DateFilterPreset;
  customFrom?: string;
  customTo?: string;
}

const STORAGE_KEY = 'trackdeli_pos_backoffice_date_filter';

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

  const todayStr = useMemo(() => getManaguaTodayYMD(), []);

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

  // Calcular las fechas resultantes según el preset activo usando la fecha del negocio en Managua
  const { from, to, label } = useMemo(() => {
    const today = getManaguaTodayYMD();
    const [y, m, d] = today.split('-').map(Number);
    const baseDate = new Date(y, m - 1, d, 12, 0, 0);

    const calcDaysAgo = (days: number): string => {
      const dt = new Date(baseDate);
      dt.setDate(baseDate.getDate() - days);
      const resY = dt.getFullYear();
      const resM = String(dt.getMonth() + 1).padStart(2, '0');
      const resD = String(dt.getDate()).padStart(2, '0');
      return `${resY}-${resM}-${resD}`;
    };

    switch (preset) {
      case 'today':
        return {
          from: today,
          to: today,
          label: 'Hoy',
        };

      case 'yesterday': {
        const yStr = calcDaysAgo(1);
        return {
          from: yStr,
          to: yStr,
          label: 'Ayer',
        };
      }

      case 'week': {
        const wStr = calcDaysAgo(6);
        return {
          from: wStr,
          to: today,
          label: 'Últimos 7 días',
        };
      }

      case 'month': {
        const mStr = `${y}-${String(m).padStart(2, '0')}-01`;
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
