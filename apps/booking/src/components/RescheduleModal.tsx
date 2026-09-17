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
  // Inicializar fecha seleccionada en hoy
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);

  // Consultar disponibilidad del servicio para la fecha elegida
  const { data: availabilityData, isLoading: isLoadingSlots } = useAvailability(
    appointment.businessId,
    appointment.serviceId,
    selectedDate
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-100 flex items-center gap-2">
              <CalendarBlank size={18} className="text-brand-500" />
              Reagendar turno
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Servicio: <strong className="text-gray-200">{appointment.service.name}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-5 overflow-y-auto">
          {/* Comparación Horario Actual */}
          <div className="p-3.5 rounded-xl bg-gray-800/60 border border-gray-700/60 flex items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-gray-500 block text-[10px] uppercase font-semibold">
                Turno actual programado
              </span>
              <span className="font-medium text-gray-300 capitalize">
                {currentScheduledDate}
              </span>
            </div>
            {selectedSlot && (
              <>
                <ArrowRight size={16} className="text-brand-500 shrink-0" />
                <div className="text-right">
                  <span className="text-brand-500 block text-[10px] uppercase font-bold">
                    Nuevo turno elegido
                  </span>
                  <span className="font-bold text-gray-100">
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
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300/90 flex items-start gap-2">
            <Info size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p>
                Al reagendar, la cita volverá al estado{' '}
                <strong className="text-amber-400">PENDIENTE</strong> de aprobación por el negocio.
              </p>
              <p className="text-[11px] text-amber-400/80">
                Solo se permite <strong>1 reagendamiento</strong> por el portal. Para cambios adicionales deberás comunicarte con el negocio.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-gray-800 bg-gray-900/90 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting || !selectedSlot}
            className="px-5 py-2 text-xs font-bold text-black bg-brand-500 hover:bg-brand-400 rounded-xl transition-all shadow-md disabled:opacity-40 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
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
