import React from 'react';
import {
  HourglassMedium,
  CalendarBlank,
  Clock,
  MapPin,
  WhatsappLogo,
  ArrowSquareOut,
  EnvelopeSimple,
  ArrowLeft,
} from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import type { AppointmentDetail, BusinessPublicInfo } from '../types/booking';

interface BookingSuccessProps {
  appointment: AppointmentDetail;
  business?: BusinessPublicInfo;
  onReset: () => void;
}

export const BookingSuccess: React.FC<BookingSuccessProps> = ({
  appointment,
  business,
  onReset,
}) => {
  const dateObj = new Date(appointment.scheduledAt);
  const formattedDate = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'America/Managua',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(dateObj);

  const formattedTime = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'America/Managua',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(dateObj);

  const whatsappUrl = business?.whatsappNumber
    ? `https://wa.me/${business.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(
        `Hola, acabo de registrar una solicitud de cita para "${appointment.service.name}" el día ${formattedDate} a las ${formattedTime}. Mi nombre es ${appointment.customer.name}.`
      )}`
    : null;

  return (
    <div className="max-w-md mx-auto py-6 px-4 text-center animate-fadeIn">
      {/* Tarjeta principal contenedora */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-7 shadow-sm">
        {/* Ícono de Estado PENDIENTE */}
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600 mb-4 shadow-xs">
          <HourglassMedium size={32} weight="duotone" />
        </div>

        {/* Titulares claros sobre estado pendiente */}
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">
          ¡Solicitud enviada!
        </h2>
        <div className="mt-2.5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 max-w-sm mx-auto leading-relaxed">
          <strong className="font-bold text-amber-900">Tu solicitud fue enviada. El negocio la confirmará pronto.</strong>
          <p className="mt-1 text-amber-800 text-[11px]">
            Esta cita aún no está garantizada. Te notificaremos cuando el negocio apruebe tu turno.
          </p>
        </div>

        {/* Tarjeta de Resumen */}
        <div className="mt-6 p-4 rounded-2xl bg-gray-50 border border-gray-100 text-left space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-gray-200/60">
            <span className="text-xs text-gray-500">Negocio</span>
            <span className="text-xs font-bold text-gray-900">
              {business?.name || appointment.business?.name}
            </span>
          </div>

          <div className="flex items-center justify-between pb-2.5 border-b border-gray-200/60">
            <span className="text-xs text-gray-500">Servicio</span>
            <span className="text-xs font-bold text-gray-900">
              {appointment.service.name}
            </span>
          </div>

          {/* Especialista asignado */}
          {appointment.specialist?.name && (
            <div className="flex items-center justify-between pb-2.5 border-b border-gray-200/60">
              <span className="text-xs text-gray-500">Especialista</span>
              <span className="text-xs font-bold text-brand-700">
                {appointment.specialist.name}
                {appointment.specialist.specialty ? ` — ${appointment.specialist.specialty}` : ''}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between pb-2.5 border-b border-gray-200/60">
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <CalendarBlank size={14} className="text-gray-400" />
              Fecha
            </span>
            <span className="text-xs font-semibold text-gray-900 capitalize">
              {formattedDate}
            </span>
          </div>

          <div className="flex items-center justify-between pb-2.5 border-b border-gray-200/60">
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock size={14} className="text-gray-400" />
              Horario
            </span>
            <span className="text-xs font-bold text-brand-600">
              {formattedTime} ({appointment.durationMinutes} min)
            </span>
          </div>

          {business?.posAddress && (
            <div className="flex items-start justify-between gap-3 text-xs pt-0.5">
              <span className="text-gray-500 flex items-center gap-1 shrink-0">
                <MapPin size={14} className="text-gray-400" />
                Dirección
              </span>
              <span className="text-gray-800 text-right font-medium">
                {business.posAddress}
              </span>
            </div>
          )}
        </div>

        {/* Nota de correo si dejó email */}
        {appointment.customerEmail && (
          <div className="mt-4 p-3 rounded-2xl bg-blue-50 border border-blue-200 flex items-center gap-2.5 text-xs text-blue-900 text-left">
            <EnvelopeSimple size={18} className="text-blue-600 shrink-0" />
            <p>
              Te enviamos el comprobante a{' '}
              <strong className="text-blue-950 font-bold">{appointment.customerEmail}</strong> con el
              enlace para autogestionar tu turno.
            </p>
          </div>
        )}

        {/* Botones de acción rápida */}
        <div className="mt-6 space-y-2.5">
          {/* Enlace de Autogestión directo */}
          {appointment.manageToken && (
            <Link
              to={`/manage/${appointment.manageToken}`}
              className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-xs font-bold text-white transition-all shadow-xs flex items-center justify-center gap-2"
            >
              <ArrowSquareOut size={15} />
              Ver y gestionar mi cita (Portal de Autogestión)
            </Link>
          )}

          {/* Botón a WhatsApp */}
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-xs font-bold text-emerald-800 border border-emerald-200 transition-all flex items-center justify-center gap-2 shadow-2xs"
            >
              <WhatsappLogo size={16} weight="fill" className="text-emerald-600" />
              Consultar al negocio por WhatsApp
            </a>
          )}

          {/* Volver a reservar */}
          <button
            type="button"
            onClick={onReset}
            className="w-full py-2 px-4 text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors flex items-center justify-center gap-1 mt-2"
          >
            <ArrowLeft size={14} />
            Reservar otro turno
          </button>
        </div>
      </div>
    </div>
  );
};
