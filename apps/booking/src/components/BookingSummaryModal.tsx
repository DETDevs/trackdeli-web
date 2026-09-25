import React from 'react';
import {
  CalendarBlank,
  Clock,
  MapPin,
  User,
  Phone,
  EnvelopeSimple,
  ShieldCheck,
  X,
  Sparkle,
} from '@phosphor-icons/react';
import type {
  AvailableSlot,
  BookingServiceItem,
  BookingSpecialistInfo,
  BusinessPublicInfo,
} from '../types/booking';

interface BookingSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  business?: BusinessPublicInfo;
  service: BookingServiceItem;
  specialist?: BookingSpecialistInfo | 'any' | null;
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
  specialist,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Confirmar reserva
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Revisá los detalles de tu turno antes de enviar la solicitud.
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
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Negocio & Dirección */}
          <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
            <h3 className="text-sm font-bold text-gray-900">
              {business?.name || 'Servicio de Citas'}
            </h3>
            {business?.posAddress && (
              <p className="text-xs text-gray-500 flex items-start gap-1.5 pt-0.5">
                <MapPin size={15} className="text-brand-600 shrink-0 mt-0.5" />
                <span>{business.posAddress}</span>
              </p>
            )}
          </div>

          {/* Detalles del Servicio y Turno */}
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500">Servicio</span>
              <span className="font-bold text-gray-900">{service.name}</span>
            </div>

            {/* Especialista si aplica */}
            {specialist && (
              <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Especialista</span>
                {specialist === 'any' ? (
                  <span className="font-semibold text-brand-700 flex items-center gap-1">
                    <Sparkle size={13} weight="fill" />
                    Cualquier disponible
                  </span>
                ) : (
                  <span className="font-semibold text-gray-900">
                    {specialist.name}
                    {specialist.specialty ? ` (${specialist.specialty})` : ''}
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500 flex items-center gap-1">
                <CalendarBlank size={14} className="text-gray-400" />
                Fecha
              </span>
              <span className="font-semibold text-gray-900 capitalize">
                {formattedDate}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500 flex items-center gap-1">
                <Clock size={14} className="text-gray-400" />
                Horario
              </span>
              <span className="font-bold text-brand-600">
                {slot.startTime} ({service.durationMinutes} min)
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500">
                Precio estimado
              </span>
              <span className="font-bold text-gray-900 text-sm">
                C$ {service.price.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Datos del Cliente */}
          <div className="pt-1 space-y-2 text-xs">
            <span className="font-bold uppercase tracking-wider text-[11px] text-gray-400">
              Tus datos de contacto
            </span>
            <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 space-y-1.5 text-gray-700">
              <div className="flex items-center gap-2">
                <User size={14} className="text-gray-400 shrink-0" />
                <span className="font-semibold text-gray-900">{customerName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-gray-400 shrink-0" />
                <span>{customerPhone}</span>
              </div>
              {customerEmail ? (
                <div className="flex items-center gap-2">
                  <EnvelopeSimple size={14} className="text-gray-400 shrink-0" />
                  <span>{customerEmail}</span>
                </div>
              ) : (
                <div className="text-[11px] text-gray-400 italic pl-5">
                  Sin correo electrónico
                </div>
              )}
            </div>
          </div>

          {/* Advertencia de Estado Pendiente */}
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5 shadow-2xs">
            <ShieldCheck size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Al confirmar, tu solicitud se enviará con estado{' '}
              <strong className="text-amber-800 font-bold">PENDIENTE</strong>. El negocio la
              confirmará a la brevedad.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50/80 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl transition-all shadow-xs disabled:opacity-50"
          >
            Modificar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-all shadow-xs disabled:opacity-60 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
