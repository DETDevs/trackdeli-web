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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-3xl shadow-xl p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
            <Warning size={22} weight="duotone" />
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

        <div>
          <h3 className="text-base font-bold text-gray-900">
            ¿Deseás cancelar tu cita?
          </h3>
          <p className="text-xs text-gray-600 mt-1 leading-relaxed">
            Se liberará tu turno para{' '}
            <strong className="text-gray-900">{appointment.service.name}</strong> programado para el{' '}
            <strong className="text-gray-900">{formattedDate}</strong>.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-800 leading-relaxed">
          Esta acción no se puede deshacer. Si necesitás otro horario, podés usar la opción de <strong>Reagendar</strong> en lugar de cancelar.
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-3.5 py-2 text-xs font-semibold text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl transition-all shadow-xs disabled:opacity-50"
          >
            Volver
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-xs disabled:opacity-50 flex items-center gap-2"
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
