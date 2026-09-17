import React, { useMemo, useRef } from 'react';
import { CalendarBlank, Clock, WarningCircle, CaretLeft, CaretRight } from '@phosphor-icons/react';
import type { AvailableSlot } from '../types/booking';

interface DateTimeSelectorProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  slots: AvailableSlot[];
  selectedSlot: AvailableSlot | null;
  onSelectSlot: (slot: AvailableSlot) => void;
  isLoadingSlots: boolean;
}

const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

export const DateTimeSelector: React.FC<DateTimeSelectorProps> = ({
  selectedDate,
  onSelectDate,
  slots,
  selectedSlot,
  onSelectSlot,
  isLoadingSlots,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Generar próximos 30 días a partir de hoy (en UTC/local seguro)
  const next30Days = useMemo(() => {
    const days: Array<{
      dateStr: string; // YYYY-MM-DD
      dayOfWeek: string;
      dayNumber: number;
      monthName: string;
    }> = [];

    const now = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      days.push({
        dateStr,
        dayOfWeek: i === 0 ? 'Hoy' : DAYS_SHORT[d.getDay()],
        dayNumber: d.getDate(),
        monthName: MONTHS_SHORT[d.getMonth()],
      });
    }
    return days;
  }, []);

  // Scroll horizontal buttons
  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const amount = direction === 'left' ? -240 : 240;
      scrollContainerRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Selector de fecha */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <CalendarBlank size={14} className="text-brand-500" />
            Elegí una fecha
          </label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => scroll('left')}
              className="p-1.5 rounded-lg bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
              title="Anterior"
            >
              <CaretLeft size={14} weight="bold" />
            </button>
            <button
              type="button"
              onClick={() => scroll('right')}
              className="p-1.5 rounded-lg bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
              title="Siguiente"
            >
              <CaretRight size={14} weight="bold" />
            </button>
          </div>
        </div>

        {/* Tira horizontal de días */}
        <div
          ref={scrollContainerRef}
          className="flex gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar scroll-smooth"
        >
          {next30Days.map((item) => {
            const isSelected = selectedDate === item.dateStr;
            return (
              <button
                key={item.dateStr}
                type="button"
                onClick={() => onSelectDate(item.dateStr)}
                className={`flex flex-col items-center justify-center min-w-[68px] py-3 px-2 rounded-xl border transition-all shrink-0 ${
                  isSelected
                    ? 'bg-brand-500 text-black border-brand-500 font-medium shadow-sm'
                    : 'bg-gray-800/70 text-gray-300 hover:text-white border-gray-700/80 hover:border-gray-600'
                }`}
              >
                <span
                  className={`text-[11px] uppercase tracking-wider font-medium ${
                    isSelected ? 'text-black/80 font-bold' : 'text-gray-400'
                  }`}
                >
                  {item.dayOfWeek}
                </span>
                <span className="text-lg font-bold my-0.5 leading-none">
                  {item.dayNumber}
                </span>
                <span
                  className={`text-[10px] ${
                    isSelected ? 'text-black/70 font-semibold' : 'text-gray-500'
                  }`}
                >
                  {item.monthName}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Selector de horario */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 mb-3">
          <Clock size={14} className="text-brand-500" />
          Horarios disponibles
        </label>

        {isLoadingSlots ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-11 rounded-xl bg-gray-800/50 border border-gray-800 animate-pulse"
              />
            ))}
          </div>
        ) : slots.length === 0 ? (
          /* Estado vacío amigable cuando no hay horarios */
          <div className="p-5 rounded-xl bg-gray-800/40 border border-gray-800 text-center space-y-1.5">
            <WarningCircle size={22} className="mx-auto text-amber-400/80" />
            <p className="text-sm font-medium text-gray-300">
              No hay turnos disponibles para esta fecha.
            </p>
            <p className="text-xs text-gray-400">
              El negocio no atiende este día o todos los turnos ya fueron reservados.
              Probá seleccionando otro día en el calendario.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {slots.map((slot) => {
              const isSelected = selectedSlot?.scheduledAt === slot.scheduledAt;
              return (
                <button
                  key={slot.scheduledAt}
                  type="button"
                  onClick={() => onSelectSlot(slot)}
                  className={`py-2.5 px-3 rounded-xl border text-center transition-all ${
                    isSelected
                      ? 'bg-brand-500 text-black border-brand-500 font-bold'
                      : 'bg-gray-800/60 hover:bg-gray-800 text-gray-200 border-gray-700/70 hover:border-gray-600 font-medium'
                  }`}
                >
                  <span className="text-sm tracking-tight">{slot.startTime}</span>
                  <span
                    className={`block text-[10px] mt-0.5 ${
                      isSelected ? 'text-black/70' : 'text-gray-400'
                    }`}
                  >
                    hasta {slot.endTime}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
