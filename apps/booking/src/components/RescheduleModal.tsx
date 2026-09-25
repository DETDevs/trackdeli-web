import React, { useState } from 'react';
import { CalendarBlank, ArrowRight, X, Info } from '@phosphor-icons/react';
import { DateTimeSelector } from './DateTimeSelector';
import { useAvailability } from '../hooks/useBooking';
import type { AppointmentDetail, AvailableSlot } from '../types/booking';

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newScheduledAt: string) => void;
  isSubmitting: boolean;
  appointment: AppointmentDetail;
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  appointment,
}) => {
  // Inicializar fecha seleccionada en hoy (hora local)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);

  // Consultar disponibilidad del servicio para la fecha elegida (respetando el especialista si ya tenía uno)
  const { data: availabilityData, isLoading: isLoadingSlots } = useAvailability(
    appointment.businessId,
    appointment.serviceId,
    selectedDate,
    appointment.specialistId || undefined
  );

  if (!isOpen) return null;

  const currentScheduledDate = new Intl.DateTimeFormat('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(appointment.scheduledAt));

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  const handleConfirm = () => {
    if (!selectedSlot) return;
    onConfirm(selectedSlot.scheduledAt);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-lg bg-white border border-gray-200 rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <CalendarBlank size={18} className="text-brand-600" />
              Reagendar turno
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Servicio: <strong className="text-gray-900">{appointment.service.name}</strong>
              {appointment.specialist?.name && (
                <span> • Con {appointment.specialist.name}</span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-5 overflow-y-auto">
          {/* Comparación Horario Actual */}
          <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-bold">
                Turno actual programado
              </span>
              <span className="font-semibold text-gray-700 capitalize">
                {currentScheduledDate}
              </span>
            </div>
            {selectedSlot && (
              <>
                <ArrowRight size={16} className="text-brand-600 shrink-0" />
                <div className="text-right">
                  <span className="text-brand-700 block text-[10px] uppercase font-bold">
                    Nuevo turno elegido
                  </span>
                  <span className="font-bold text-gray-900">
                    {selectedDate} a las {selectedSlot.startTime}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Selector de fecha y slot */}
          <DateTimeSelector
            selectedDate={selectedDate}
            onSelectDate={handleDateChange}
            slots={availabilityData?.availableSlots || []}
            selectedSlot={selectedSlot}
            onSelectSlot={setSelectedSlot}
            isLoadingSlots={isLoadingSlots}
          />

          {/* Advertencia de Estado Pendiente y Límite de 1 reagendamiento */}
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5 shadow-2xs">
            <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p>
                Al reagendar, la cita volverá al estado{' '}
                <strong className="text-amber-800 font-bold">PENDIENTE</strong> de aprobación por el negocio.
              </p>
              <p className="text-[11px] text-amber-800">
                Solo se permite <strong>1 reagendamiento</strong> por el portal. Para cambios adicionales deberás comunicarte con el negocio.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50/80 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl transition-all shadow-xs disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting || !selectedSlot}
            className="px-5 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-all shadow-xs disabled:opacity-40 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Reagendando...
              </>
            ) : (
              'Confirmar nuevo horario'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
