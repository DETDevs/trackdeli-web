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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-500 font-medium">
            Cargando información de tu cita...
          </p>
        </div>
      </div>
    );
  }

  if (isError || !appointment) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-center">
        <div className="max-w-sm p-6 rounded-3xl bg-white border border-gray-200 shadow-sm space-y-3">
          <WarningCircle size={36} className="text-rose-500 mx-auto" />
          <h2 className="text-base font-bold text-gray-900">
            Cita no encontrada
          </h2>
          <p className="text-xs text-gray-500 leading-relaxed">
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
    <div className="min-h-screen bg-slate-50 text-gray-900 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/95 backdrop-blur-md sticky top-0 z-30 shadow-xs">
        <div className="max-w-xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-brand-600 shadow-2xs">
              <Storefront size={18} weight="duotone" />
            </div>
            <div>
              <span className="text-[11px] text-gray-400 block font-semibold uppercase tracking-wider">
                Portal de Autogestión
              </span>
              <h1 className="text-sm font-bold text-gray-900 truncate">
                {appointment.business?.name || 'TrackDeli Citas'}
              </h1>
            </div>
          </div>

          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 px-3 py-1.5 rounded-xl transition-all shadow-xs"
            >
              <WhatsappLogo size={16} weight="fill" className="text-emerald-600" />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-6 sm:py-8 space-y-5">
        {/* Encabezado de la Cita & Badge de Estado */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <span className="text-[11px] uppercase tracking-wider font-bold text-gray-400">
                Detalle de tu turno
              </span>
              <h2 className="text-lg font-bold text-gray-900 mt-0.5">
                {appointment.service.name}
              </h2>
              {appointment.specialist?.name && (
                <p className="text-xs text-brand-700 font-semibold mt-0.5">
                  Atendido por {appointment.specialist.name}
                  {appointment.specialist.specialty ? ` — ${appointment.specialist.specialty}` : ''}
                </p>
              )}
            </div>
            <AppointmentStatusBadge status={appointment.status} />
          </div>

          {/* Mensaje de estado PENDIENTE */}
          {appointment.status === 'PENDING' && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 leading-relaxed shadow-2xs">
              <strong className="font-bold text-amber-900">Tu solicitud está pendiente de aprobación.</strong> El negocio te
              confirmará a la brevedad.
            </div>
          )}

          {/* Mensaje de estado CONFIRMADA */}
          {appointment.status === 'CONFIRMED' && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 leading-relaxed flex items-center gap-2.5 shadow-2xs">
              <CheckCircle size={18} weight="fill" className="text-emerald-600 shrink-0" />
              <span>¡Tu cita está confirmada por el negocio! Te esperamos a la hora programada.</span>
            </div>
          )}

          {/* Mensaje de estado CANCELADA */}
          {appointment.status === 'CANCELLED' && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-950 leading-relaxed flex items-start gap-2.5 shadow-2xs">
              <XCircle size={18} weight="fill" className="text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-rose-900">Esta cita se encuentra cancelada.</strong>
                {appointment.cancellationReason && (
                  <p className="mt-0.5 text-rose-800 text-[11px]">
                    Motivo: {appointment.cancellationReason}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Fecha, Horario, Precio */}
          <div className="pt-2 grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
              <span className="text-gray-500 flex items-center gap-1 text-[11px] font-medium">
                <CalendarBlank size={14} className="text-gray-400" />
                Fecha programada
              </span>
              <span className="font-bold text-gray-900 block capitalize">
                {formattedDate}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
              <span className="text-gray-500 flex items-center gap-1 text-[11px] font-medium">
                <Clock size={14} className="text-gray-400" />
                Horario
              </span>
              <span className="font-bold text-brand-600 block">
                {formattedTime} ({appointment.durationMinutes} min)
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 px-1 border-t border-gray-100">
            <span className="text-gray-500">Tarifa del servicio</span>
            <span className="text-sm font-bold text-gray-900">
              C$ {appointment.price.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Información del Negocio y Cliente */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-gray-200 shadow-xs space-y-3 text-xs">
          <div className="flex items-start gap-2.5">
            <Storefront size={18} className="text-brand-600 shrink-0 mt-0.5" weight="duotone" />
            <div>
              <span className="font-bold text-gray-900 block">
                {appointment.business?.name}
              </span>
              {appointment.business?.posAddress && (
                <span className="text-gray-500 text-[11px] block mt-0.5">
                  {appointment.business.posAddress}
                </span>
              )}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-2.5 flex items-center justify-between text-[11px] text-gray-500">
            <span className="flex items-center gap-1.5">
              <User size={13} className="text-gray-400" />
              Titular: <strong className="text-gray-800 font-semibold">{appointment.customer.name}</strong>
            </span>
            <span className="font-medium text-gray-700">{appointment.customer.phone}</span>
          </div>
        </div>

        {/* Acciones de Autogestión */}
        {isManageable ? (
          <div className="p-5 sm:p-6 rounded-3xl bg-white border border-gray-200 shadow-xs space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Opciones de gestión
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Botón Reagendar o Nota de límite alcanzado */}
              {appointment.rescheduleCount >= 1 ? (
                <div className="col-span-1 sm:col-span-2 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1.5 shadow-2xs">
                  <p className="font-bold text-amber-900">
                    Ya reagendaste esta cita una vez.
                  </p>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Para realizar cambios adicionales, por favor contactá directamente al
                    negocio por WhatsApp o teléfono.
                  </p>
                  {whatsappUrl && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:underline pt-1"
                    >
                      <WhatsappLogo size={14} weight="fill" className="text-emerald-600" />
                      Contactar por WhatsApp
                    </a>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsRescheduleModalOpen(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-xs font-bold text-white transition-all shadow-xs flex items-center justify-center gap-2"
                >
                  <ArrowClockwise size={15} weight="bold" />
                  Reagendar turno
                </button>
              )}

              {/* Botón Cancelar mi cita */}
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-xs font-bold text-rose-700 border border-rose-200 transition-all flex items-center justify-center gap-2 shadow-2xs"
              >
                <XCircle size={15} weight="bold" />
                Cancelar mi cita
              </button>
            </div>
          </div>
        ) : (
          /* Mensaje cuando ya no es gestionable */
          <div className="p-5 rounded-3xl bg-white border border-gray-200 text-center space-y-1.5 text-xs text-gray-500 shadow-xs">
            <p className="font-bold text-gray-800">
              Esta cita ya no puede ser modificada ni cancelada desde el portal.
            </p>
            <p className="text-[11px] text-gray-400">
              {isPast
                ? 'El horario programado ya ha transcurrido.'
                : 'La cita se encuentra finalizada o cancelada.'}
            </p>
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-emerald-700 hover:underline pt-1 font-semibold"
              >
                <WhatsappLogo size={14} weight="fill" className="text-emerald-600" />
                Contactar al negocio por WhatsApp
              </a>
            )}
          </div>
        )}

        {/* Link para reservar otro turno */}
        <div className="pt-2 text-center">
          <Link
            to={`/booking/${appointment.business?.slug || appointment.businessId}`}
            className="text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors inline-flex items-center gap-1.5 p-2 rounded-xl hover:bg-gray-100"
          >
            <Storefront size={15} />
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
