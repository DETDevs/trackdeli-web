import React from 'react';
import {
  CalendarBlank,
  Clock,
  CurrencyDollar,
  MapPin,
  User,
  Phone,
  EnvelopeSimple,
  ShieldCheck,
  X,
} from '@phosphor-icons/react';
import type {
  AvailableSlot,
  BookingServiceItem,
  BusinessPublicInfo,
} from '../types/booking';

interface BookingSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  business?: BusinessPublicInfo;
  service: BookingServiceItem;
  slot: AvailableSlot;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
}

export const BookingSummaryModal: React.FC<BookingSummaryModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  business,
  service,
  slot,
  customerName,
  customerPhone,
  customerEmail,
}) => {
  if (!isOpen) return null;

  // Formatear fecha legible
  const dateObj = new Date(slot.scheduledAt);
  const formattedDate = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(dateObj);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-100">
              Confirmar reserva
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Revisá los detalles de tu turno antes de enviar la solicitud.
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
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Negocio & Dirección */}
          <div className="p-3.5 rounded-xl bg-gray-800/60 border border-gray-700/60 space-y-1">
            <h3 className="text-sm font-bold text-gray-200">
              {business?.name || 'Servicio de Citas'}
            </h3>
            {business?.posAddress && (
              <p className="text-xs text-gray-400 flex items-start gap-1.5 pt-0.5">
                <MapPin size={15} className="text-brand-400 shrink-0 mt-0.5" />
                <span>{business.posAddress}</span>
              </p>
            )}
          </div>

          {/* Detalles del Servicio y Turno */}
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-gray-800/80">
              <span className="text-gray-400">Servicio</span>
              <span className="font-semibold text-gray-200">{service.name}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-gray-800/80">
              <span className="text-gray-400 flex items-center gap-1">
                <CalendarBlank size={14} className="text-gray-500" />
                Fecha
              </span>
              <span className="font-semibold text-gray-200 capitalize">
                {formattedDate}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-gray-800/80">
              <span className="text-gray-400 flex items-center gap-1">
                <Clock size={14} className="text-gray-500" />
                Horario
              </span>
              <span className="font-semibold text-brand-400">
                {slot.startTime} ({service.durationMinutes} min)
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-gray-800/80">
              <span className="text-gray-400 flex items-center gap-1">
                <CurrencyDollar size={14} className="text-gray-500" />
                Precio estimado
              </span>
              <span className="font-bold text-gray-100 text-sm">
                ${service.price.toFixed(2)} USD
              </span>
            </div>
          </div>

          {/* Datos del Cliente */}
          <div className="pt-1 space-y-2 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-gray-400">
              Tus datos de contacto
            </span>
            <div className="p-3 rounded-xl bg-gray-800/40 border border-gray-800 space-y-1 text-gray-300">
              <div className="flex items-center gap-2">
                <User size={14} className="text-gray-500 shrink-0" />
                <span className="font-medium text-gray-200">{customerName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-gray-500 shrink-0" />
                <span>{customerPhone}</span>
              </div>
              {customerEmail ? (
                <div className="flex items-center gap-2">
                  <EnvelopeSimple size={14} className="text-gray-500 shrink-0" />
                  <span>{customerEmail}</span>
                </div>
              ) : (
                <div className="text-[11px] text-gray-500 italic pl-5">
                  Sin correo electrónico
                </div>
              )}
            </div>
          </div>

          {/* Advertencia de Estado Pendiente */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300/90 flex items-start gap-2">
            <ShieldCheck size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Al confirmar, tu solicitud se enviará con estado{' '}
              <strong className="text-amber-400">PENDIENTE</strong>. El negocio la
              confirmará a la brevedad.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-gray-800 bg-gray-900/90 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors disabled:opacity-50"
          >
            Modificar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-bold text-black bg-brand-500 hover:bg-brand-400 rounded-xl transition-all shadow-md disabled:opacity-60 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Enviando...
              </>
            ) : (
              'Confirmar reserva'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
