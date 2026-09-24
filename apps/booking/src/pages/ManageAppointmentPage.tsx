import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  CalendarBlank,
  Clock,
  User,
  WhatsappLogo,
  ArrowClockwise,
  XCircle,
  CheckCircle,
  WarningCircle,
  Storefront,
} from '@phosphor-icons/react';
import { AppointmentStatusBadge } from '../components/AppointmentStatusBadge';
import { CancelConfirmModal } from '../components/CancelConfirmModal';
import { RescheduleModal } from '../components/RescheduleModal';
import {
  useAppointmentDetail,
  useCancelAppointment,
  useRescheduleAppointment,
} from '../hooks/useManageAppointment';

export const ManageAppointmentPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  // Modals state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);

  // Queries & Mutations
  const {
    data: appointment,
    isLoading,
    isError,
  } = useAppointmentDetail(token);

  const cancelMutation = useCancelAppointment(token);
  const rescheduleMutation = useRescheduleAppointment(token);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-400 font-medium">
            Cargando información de tu cita...
          </p>
        </div>
      </div>
    );
  }

  if (isError || !appointment) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 text-center">
        <div className="max-w-sm p-6 rounded-2xl bg-gray-800/50 border border-gray-800 space-y-3">
          <WarningCircle size={36} className="text-rose-400 mx-auto" />
          <h2 className="text-base font-bold text-gray-100">
            Cita no encontrada
          </h2>
          <p className="text-xs text-gray-400 leading-relaxed">
            El enlace de gestión es inválido o la cita ya no se encuentra disponible en el sistema.
          </p>
        </div>
      </div>
    );
  }

  // Comprobar si la cita es gestionable
  const isPast = new Date(appointment.scheduledAt).getTime() < Date.now();
  const isFinishedStatus =
    appointment.status === 'CANCELLED' ||
    appointment.status === 'COMPLETED' ||
    appointment.status === 'NO_SHOW';

  const isManageable = !isPast && !isFinishedStatus;

  // Formato de fecha
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

  const whatsappUrl = appointment.business?.whatsappNumber
    ? `https://wa.me/${appointment.business.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(
        `Hola, me contacto respecto a mi cita para "${appointment.service.name}" el día ${formattedDate}.`
      )}`
    : null;

  // Handlers
  const handleConfirmCancel = async () => {
    try {
      await cancelMutation.mutateAsync();
      setIsCancelModalOpen(false);
    } catch {
      // Error manejado en hook
    }
  };

  const handleConfirmReschedule = async (newScheduledAt: string) => {
    try {
      await rescheduleMutation.mutateAsync(newScheduledAt);
      setIsRescheduleModalOpen(false);
    } catch {
      // Error manejado en hook
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col selection:bg-brand-500 selection:text-black">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center text-brand-500">
              <Storefront size={18} />
            </div>
            <div>
              <span className="text-[11px] text-gray-400 block font-medium">
                Portal de Autogestión
              </span>
              <h1 className="text-sm font-semibold text-gray-100 truncate">
                {appointment.business?.name || 'TrackDeli Citas'}
              </h1>
            </div>
          </div>

          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium"
            >
              <WhatsappLogo size={16} weight="fill" />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-6 sm:py-8 space-y-5">
        {/* Encabezado de la Cita & Badge de Estado */}
        <div className="p-5 rounded-2xl bg-gray-800/70 border border-gray-700/70 space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <span className="text-[11px] uppercase tracking-wider font-semibold text-gray-400">
                Detalle de tu turno
              </span>
              <h2 className="text-lg font-bold text-gray-100 mt-0.5">
                {appointment.service.name}
              </h2>
            </div>
            <AppointmentStatusBadge status={appointment.status} />
          </div>

          {/* Mensaje de estado PENDIENTE */}
          {appointment.status === 'PENDING' && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300/90 leading-relaxed">
              <strong>Tu solicitud está pendiente de aprobación.</strong> El negocio te
              confirmará a la brevedad.
            </div>
          )}

          {/* Mensaje de estado CONFIRMADA */}
          {appointment.status === 'CONFIRMED' && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-300 leading-relaxed flex items-center gap-2">
              <CheckCircle size={18} className="text-emerald-400 shrink-0" />
              <span>¡Tu cita está confirmada por el negocio! Te esperamos a la hora programada.</span>
            </div>
          )}

          {/* Mensaje de estado CANCELADA */}
          {appointment.status === 'CANCELLED' && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-300 leading-relaxed flex items-start gap-2">
              <XCircle size={18} className="text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong>Esta cita se encuentra cancelada.</strong>
                {appointment.cancellationReason && (
                  <p className="mt-0.5 text-rose-400/80 text-[11px]">
                    Motivo: {appointment.cancellationReason}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Fecha, Horario, Precio */}
          <div className="pt-2 grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 space-y-1">
              <span className="text-gray-400 flex items-center gap-1 text-[11px]">
                <CalendarBlank size={14} className="text-gray-500" />
                Fecha programada
              </span>
              <span className="font-semibold text-gray-200 block capitalize">
                {formattedDate}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 space-y-1">
              <span className="text-gray-400 flex items-center gap-1 text-[11px]">
                <Clock size={14} className="text-gray-500" />
                Horario
              </span>
              <span className="font-semibold text-brand-400 block">
                {formattedTime} ({appointment.durationMinutes} min)
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 px-1 border-t border-gray-700/40">
            <span className="text-gray-400">Tarifa del servicio</span>
            <span className="text-sm font-bold text-gray-100">
              C$ {appointment.price.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Información del Negocio y Cliente */}
        <div className="p-4 rounded-2xl bg-gray-800/40 border border-gray-800 space-y-3 text-xs">
          <div className="flex items-start gap-2.5">
            <Storefront size={16} className="text-gray-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-gray-200 block">
                {appointment.business?.name}
              </span>
              {appointment.business?.posAddress && (
                <span className="text-gray-400 text-[11px] block mt-0.5">
                  {appointment.business.posAddress}
                </span>
              )}
            </div>
          </div>

          <div className="border-t border-gray-800 pt-2 flex items-center justify-between text-[11px] text-gray-400">
            <span className="flex items-center gap-1.5">
              <User size={13} className="text-gray-500" />
              Titular de la reserva: <strong className="text-gray-300">{appointment.customer.name}</strong>
            </span>
            <span>{appointment.customer.phone}</span>
          </div>
        </div>

        {/* Acciones de Autogestión */}
        {isManageable ? (
          <div className="p-5 rounded-2xl bg-gray-800/60 border border-gray-700/70 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Opciones de gestión
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Botón Reagendar o Nota de límite alcanzado */}
              {appointment.rescheduleCount >= 1 ? (
                <div className="col-span-1 sm:col-span-2 p-3.5 rounded-xl bg-gray-800 border border-gray-700 text-xs text-gray-300 space-y-1.5">
                  <p className="font-medium text-amber-300">
                    Ya reagendaste esta cita una vez.
                  </p>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Para realizar cambios adicionales, por favor contactá directamente al
                    negocio por WhatsApp o teléfono.
                  </p>
                  {whatsappUrl && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:underline pt-1"
                    >
                      <WhatsappLogo size={14} weight="fill" />
                      Contactar por WhatsApp
                    </a>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsRescheduleModalOpen(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-600 text-xs font-semibold text-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowClockwise size={15} className="text-brand-400" />
                  Reagendar turno
                </button>
              )}

              {/* Botón Cancelar mi cita */}
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-semibold text-rose-400 transition-colors flex items-center justify-center gap-2"
              >
                <XCircle size={15} />
                Cancelar mi cita
              </button>
            </div>
          </div>
        ) : (
          /* Mensaje cuando ya no es gestionable */
          <div className="p-4 rounded-2xl bg-gray-800/30 border border-gray-800 text-center space-y-1.5 text-xs text-gray-400">
            <p className="font-medium text-gray-300">
              Esta cita ya no puede ser modificada ni cancelada desde el portal.
            </p>
            <p className="text-[11px]">
              {isPast
                ? 'El horario programado ya ha transcurrido.'
                : 'La cita se encuentra finalizada o cancelada.'}
            </p>
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-emerald-400 hover:underline pt-1 font-medium"
              >
                <WhatsappLogo size={14} weight="fill" />
                Contactar al negocio por WhatsApp
              </a>
            )}
          </div>
        )}

        {/* Link para reservar otro turno */}
        <div className="pt-2 text-center">
          <Link
            to={`/booking/${appointment.business?.slug || appointment.businessId}`}
            className="text-xs text-gray-400 hover:text-gray-200 transition-colors inline-flex items-center gap-1"
          >
            <Storefront size={14} />
            Hacer una nueva reserva en este negocio
          </Link>
        </div>
      </main>

      {/* Modal de Cancelación */}
      <CancelConfirmModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirm={handleConfirmCancel}
        isSubmitting={cancelMutation.isPending}
        appointment={appointment}
      />

      {/* Modal de Reagendamiento */}
      <RescheduleModal
        isOpen={isRescheduleModalOpen}
        onClose={() => setIsRescheduleModalOpen(false)}
        onConfirm={handleConfirmReschedule}
        isSubmitting={rescheduleMutation.isPending}
        appointment={appointment}
      />
    </div>
  );
};
