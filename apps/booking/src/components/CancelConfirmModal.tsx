import React from 'react';
import { Warning, X } from '@phosphor-icons/react';
import type { AppointmentDetail } from '../types/booking';

interface CancelConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  appointment: AppointmentDetail;
}

export const CancelConfirmModal: React.FC<CancelConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  appointment,
}) => {
  if (!isOpen) return null;

  const dateObj = new Date(appointment.scheduledAt);
  const formattedDate = new Intl.DateTimeFormat('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(dateObj);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
            <Warning size={22} weight="duotone" />
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

        <div>
          <h3 className="text-base font-bold text-gray-100">
            ¿Deseás cancelar tu cita?
          </h3>
          <p className="text-xs text-gray-400 mt-1 leading-relaxed">
            Se liberará tu turno para{' '}
            <strong className="text-gray-200">{appointment.service.name}</strong> programado para el{' '}
            <strong className="text-gray-200">{formattedDate}</strong>.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 text-[11px] text-rose-300/80 leading-relaxed">
          Esta acción no se puede deshacer. Si necesitás otro horario, podés usar la opción de <strong>Reagendar</strong> en lugar de cancelar.
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-3.5 py-2 text-xs font-semibold text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors disabled:opacity-50"
          >
            Volver
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Cancelando...
              </>
            ) : (
              'Sí, cancelar cita'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
