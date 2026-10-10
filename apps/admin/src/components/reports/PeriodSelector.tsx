import React, { useState, useEffect } from 'react';
import { CalendarBlank, WarningCircle, ArrowsClockwise } from '@phosphor-icons/react';
import { PeriodType } from '../../types/reports';
import { getManaguaTodayYMD } from '../../utils/dateManagua';

interface PeriodSelectorProps {
  period: PeriodType;
  from?: string;
  to?: string;
  onChange: (period: PeriodType, from?: string, to?: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  period,
  from,
  to,
  onChange,
  onRefresh,
  isRefreshing = false,
}) => {
  const todayStr = getManaguaTodayYMD();

  const [customFrom, setCustomFrom] = useState<string>(from || todayStr);
  const [customTo, setCustomTo] = useState<string>(to || todayStr);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (from) setCustomFrom(from);
    if (to) setCustomTo(to);
  }, [from, to]);

  const handlePeriodClick = (p: PeriodType) => {
    setErrorMsg(null);
    if (p !== 'custom') {
      onChange(p);
    } else {
      validateAndApply(customFrom, customTo);
    }
  };

  const validateAndApply = (f: string, t: string) => {
    if (!f || !t) {
      setErrorMsg('Selecciona ambas fechas');
      return;
    }

    const dFrom = new Date(`${f}T00:00:00`);
    const dTo = new Date(`${t}T23:59:59`);

    if (isNaN(dFrom.getTime()) || isNaN(dTo.getTime())) {
      setErrorMsg('Fechas inválidas');
      return;
    }

    if (dFrom > dTo) {
      setErrorMsg('La fecha inicial no puede ser posterior a la final');
      return;
    }

    const diffDays = Math.ceil((dTo.getTime() - dFrom.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 366) {
      setErrorMsg('El rango no puede superar 366 días');
      return;
    }

    setErrorMsg(null);
    onChange('custom', f, t);
  };

  return (
    <div className="flex flex-col gap-2 w-full sm:w-auto">
      <div className="flex flex-wrap items-center gap-2">
        {/* Pills de período */}
        <div className="inline-flex items-center bg-gray-100 p-1 rounded-xl gap-0.5 max-w-full overflow-x-auto">
          {(
            [
              { id: 'today', label: 'Hoy' },
              { id: 'week', label: 'Esta semana' },
              { id: 'month', label: 'Este mes' },
              { id: 'custom', label: 'Personalizado' },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handlePeriodClick(p.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                period === p.id
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Botón de refrescar */}
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="flex items-center justify-center p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition-colors shadow-2xs cursor-pointer shrink-0"
            title="Refrescar reportes"
          >
            <ArrowsClockwise
              size={15}
              weight="bold"
              className={isRefreshing ? 'animate-spin text-gray-900' : 'text-gray-600'}
            />
          </button>
        )}
      </div>

      {/* Rango de fechas personalizado */}
      {period === 'custom' && (
        <div className="flex flex-wrap items-center gap-2 bg-white p-2.5 rounded-xl border border-gray-200 shadow-2xs text-xs">
          <CalendarBlank size={16} className="text-gray-500 shrink-0" weight="bold" />

          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-gray-500 text-[11px] font-medium shrink-0">Desde:</span>
            <input
              type="date"
              value={customFrom}
              max={customTo || todayStr}
              onChange={(e) => {
                const val = e.target.value;
                setCustomFrom(val);
                validateAndApply(val, customTo);
              }}
              className="border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-800 bg-gray-50/50 focus:bg-white focus:outline-none focus:border-gray-900 shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-gray-500 text-[11px] font-medium shrink-0">Hasta:</span>
            <input
              type="date"
              value={customTo}
              min={customFrom}
              onChange={(e) => {
                const val = e.target.value;
                setCustomTo(val);
                validateAndApply(customFrom, val);
              }}
              className="border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-800 bg-gray-50/50 focus:bg-white focus:outline-none focus:border-gray-900 shadow-2xs"
            />
          </div>

          {errorMsg && (
            <div className="flex items-center text-red-600 text-[11px] gap-1 w-full sm:w-auto font-medium">
              <WarningCircle size={14} weight="fill" className="shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
