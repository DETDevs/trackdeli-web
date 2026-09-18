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
    <div className="max-w-md mx-auto py-8 px-4 text-center animate-fadeIn">
      {/* Ícono de Estado PENDIENTE */}
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 mb-4 shadow-lg shadow-amber-500/5">
        <HourglassMedium size={32} weight="duotone" />
      </div>

      {/* Titulares claros sobre estado pendiente */}
      <h2 className="text-xl font-bold text-gray-100 tracking-tight">
        ¡Solicitud enviada!
      </h2>
      <div className="mt-2 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300/90 max-w-sm mx-auto leading-relaxed">
        <strong>Tu solicitud fue enviada. El negocio la confirmará pronto.</strong>
        <p className="mt-1 text-amber-400/80 text-[11px]">
          Esta cita aún no está garantizada. Te notificaremos cuando el negocio apruebe tu turno.
        </p>
      </div>

      {/* Tarjeta de Resumen */}
      <div className="mt-6 p-4 rounded-2xl bg-gray-800/70 border border-gray-700/80 text-left space-y-3">
        <div className="flex items-center justify-between pb-2.5 border-b border-gray-700/50">
          <span className="text-xs text-gray-400">Negocio</span>
          <span className="text-xs font-semibold text-gray-200">
            {business?.name || appointment.business?.name}
          </span>
        </div>

        <div className="flex items-center justify-between pb-2.5 border-b border-gray-700/50">
          <span className="text-xs text-gray-400">Servicio</span>
          <span className="text-xs font-semibold text-gray-200">
            {appointment.service.name}
          </span>
        </div>

        <div className="flex items-center justify-between pb-2.5 border-b border-gray-700/50">
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <CalendarBlank size={14} className="text-gray-500" />
            Fecha
          </span>
          <span className="text-xs font-semibold text-gray-200 capitalize">
            {formattedDate}
          </span>
        </div>

        <div className="flex items-center justify-between pb-2.5 border-b border-gray-700/50">
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Clock size={14} className="text-gray-500" />
            Horario
          </span>
          <span className="text-xs font-semibold text-brand-400">
            {formattedTime} ({appointment.durationMinutes} min)
          </span>
        </div>

        {business?.posAddress && (
          <div className="flex items-start justify-between gap-3 text-xs pt-0.5">
            <span className="text-gray-400 flex items-center gap-1 shrink-0">
              <MapPin size={14} className="text-gray-500" />
              Dirección
            </span>
            <span className="text-gray-300 text-right font-medium">
              {business.posAddress}
            </span>
          </div>
        )}
      </div>

      {/* Nota de correo si dejó email */}
      {appointment.customerEmail && (
        <div className="mt-4 p-3 rounded-xl bg-gray-800/40 border border-gray-700/50 flex items-center gap-2.5 text-xs text-gray-400 text-left">
          <EnvelopeSimple size={18} className="text-brand-400 shrink-0" />
          <p>
            Te enviamos el comprobante a{' '}
            <strong className="text-gray-200">{appointment.customerEmail}</strong> con el
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
            className="w-full py-2.5 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-xs font-semibold text-gray-200 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowSquareOut size={15} className="text-brand-400" />
            Ver y gestionar mi cita (Portal de Autogestión)
          </Link>
        )}

        {/* Botón a WhatsApp */}
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-semibold text-emerald-400 transition-colors flex items-center justify-center gap-2"
          >
            <WhatsappLogo size={16} weight="fill" />
            Consultar al negocio por WhatsApp
          </a>
        )}

        {/* Volver a reservar */}
        <button
          type="button"
          onClick={onReset}
          className="w-full py-2 px-4 text-xs font-medium text-gray-400 hover:text-gray-200 transition-colors flex items-center justify-center gap-1 mt-2"
        >
          <ArrowLeft size={14} />
          Reservar otro turno
        </button>
      </div>
    </div>
  );
};
