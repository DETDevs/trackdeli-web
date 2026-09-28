import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowLeft,
  WarningCircle,
  Warning,
  ArrowSquareOut,
  Clock,
} from '@phosphor-icons/react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { BookingHeader } from '../components/BookingHeader';
import { ServiceSelector } from '../components/ServiceSelector';
import { SpecialistSelector } from '../components/SpecialistSelector';
import { DateTimeSelector } from '../components/DateTimeSelector';
import { CustomerForm } from '../components/CustomerForm';
import { BookingSummaryModal } from '../components/BookingSummaryModal';
import { BookingSuccess } from '../components/BookingSuccess';
import { bookingApi } from '../services/bookingApi';
import {
  useBusinessInfo,
  usePublicServices,
  useAvailability,
  useCreateAppointment,
} from '../hooks/useBooking';
import type {
  AppointmentDetail,
  AppointmentHoldResponse,
  AvailableSlot,
  BookingServiceItem,
  BookingSpecialistInfo,
} from '../types/booking';

export const BookingPage: React.FC = () => {
  const { businessId } = useParams<{ businessId: string }>();
  const queryClient = useQueryClient();

  // Wizard Steps: 1 = Servicio/Especialista, 2 = Fecha/Hora, 3 = Datos
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // 80b: Estado del hold temporal de horario
  const [currentHold, setCurrentHold] = useState<AppointmentHoldResponse | null>(null);
  const [isCreatingHold, setIsCreatingHold] = useState(false);

  // Sub-paso en Step 1: 'service' (1A) o 'specialist' (1B)
  const [serviceSubStep, setServiceSubStep] = useState<'service' | 'specialist'>('service');

  // Form State
  const [selectedService, setSelectedService] = useState<BookingServiceItem | null>(null);
  const [selectedSpecialist, setSelectedSpecialist] = useState<BookingSpecialistInfo | 'any' | null>(null);

  // Default date: today in YYYY-MM-DD (local time)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);

  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
  });
  const [formErrors, setFormErrors] = useState<
    Partial<Record<'customerName' | 'customerPhone' | 'customerEmail', string>>
  >({});

  // Summary & Success Modal State
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [duplicatePendingError, setDuplicatePendingError] = useState<{
    message: string;
    matchedBy?: 'phone' | 'email' | 'both';
    manageToken?: string;
  } | null>(null);
  const [createdAppointment, setCreatedAppointment] = useState<AppointmentDetail | null>(null);

  // API Queries
  const {
    data: business,
    isLoading: isLoadingBusiness,
  } = useBusinessInfo(businessId);

  const {
    data: services = [],
    isLoading: isLoadingServices,
    isError: isServicesError,
  } = usePublicServices(businessId);

  // Consultar disponibilidad pasando el specialistId si se eligió uno individual
  const {
    data: availabilityData,
    isLoading: isLoadingSlots,
  } = useAvailability(
    businessId,
    selectedService?.id,
    selectedDate,
    selectedSpecialist && selectedSpecialist !== 'any' ? selectedSpecialist.id : undefined
  );

  // Mutation
  const createAppointmentMutation = useCreateAppointment(businessId || '');

  // 80b: Liberación best-effort si el usuario cierra o recarga la ventana teniendo un hold activo
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentHold && businessId) {
        const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';
        const url = `${API_BASE}/businesses/${businessId}/booking/holds/${currentHold.holdId}?holderToken=${encodeURIComponent(currentHold.holderToken)}`;
        try {
          fetch(url, {
            method: 'DELETE',
            headers: {
              'x-holder-token': currentHold.holderToken,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ holderToken: currentHold.holderToken }),
            keepalive: true,
          }).catch(() => {});
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentHold, businessId]);

  // Step 1A -> Seleccionar Servicio
  const handleSelectService = (service: BookingServiceItem) => {
    if (currentHold && businessId) {
      bookingApi
        .releaseHold(businessId, currentHold.holdId, currentHold.holderToken)
        .catch(() => {});
      setCurrentHold(null);
    }
    setSelectedService(service);
    setSelectedSlot(null);

    const assignedSpecialists = service.specialists || (service.specialist ? [service.specialist] : []);

    // Si tiene 2 o más especialistas asignados, mostrar sub-paso 1B
    if (assignedSpecialists.length >= 2) {
      setServiceSubStep('specialist');
      setSelectedSpecialist('any'); // Por defecto 'Cualquier especialista disponible'
    } else {
      // 0 o 1 especialista: saltar directo a Fecha y Hora sin fricción
      setServiceSubStep('service');
      setSelectedSpecialist(assignedSpecialists[0] || null);
      setCurrentStep(2);
    }
  };

  // Step 1B -> Seleccionar Especialista
  const handleSelectSpecialist = (specialist: BookingSpecialistInfo | 'any') => {
    if (currentHold && businessId) {
      bookingApi
        .releaseHold(businessId, currentHold.holdId, currentHold.holderToken)
        .catch(() => {});
      setCurrentHold(null);
    }
    setSelectedSpecialist(specialist);
    setSelectedSlot(null);
    setCurrentStep(2);
  };

  // Regresar desde el paso 2 (Fecha y Hora) al paso 1
  const handleBackFromStep2 = () => {
    if (currentHold && businessId) {
      bookingApi
        .releaseHold(businessId, currentHold.holdId, currentHold.holderToken)
        .catch(() => {});
      setCurrentHold(null);
    }
    setSelectedSlot(null);

    const assignedSpecialists =
      selectedService?.specialists || (selectedService?.specialist ? [selectedService.specialist] : []);
    if (assignedSpecialists.length >= 2) {
      setServiceSubStep('specialist');
    } else {
      setServiceSubStep('service');
    }
    setCurrentStep(1);
  };

  // Step 2 -> Cambio de fecha
  const handleSelectDate = (date: string) => {
    if (currentHold && businessId) {
      bookingApi
        .releaseHold(businessId, currentHold.holdId, currentHold.holderToken)
        .catch(() => {});
      setCurrentHold(null);
    }
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  // Step 2 -> Selección de slot (si cambia de horario, liberar hold previo)
  const handleSelectSlot = (slot: AvailableSlot | null) => {
    if (currentHold && businessId && slot?.scheduledAt !== selectedSlot?.scheduledAt) {
      bookingApi
        .releaseHold(businessId, currentHold.holdId, currentHold.holderToken)
        .catch(() => {});
      setCurrentHold(null);
    }
    setSelectedSlot(slot);
  };

  // 80b: Continuar de Paso 2 -> Paso 3 creando el hold temporal
  const handleContinueToStep3 = async () => {
    if (!selectedService || !selectedSlot || !businessId) return;

    // Si ya tenemos un hold activo para este mismo slot exacto y no ha expirado, avanzar directo
    if (
      currentHold &&
      new Date(currentHold.expiresAt).getTime() > Date.now() &&
      currentHold.serviceId === selectedService.id
    ) {
      setCurrentStep(3);
      return;
    }

    // Si había un hold previo, liberarlo (best effort)
    if (currentHold) {
      bookingApi
        .releaseHold(businessId, currentHold.holdId, currentHold.holderToken)
        .catch(() => {});
      setCurrentHold(null);
    }

    setIsCreatingHold(true);
    try {
      const hold = await bookingApi.createHold(businessId, {
        serviceId: selectedService.id,
        specialistId:
          selectedSpecialist && selectedSpecialist !== 'any'
            ? selectedSpecialist.id
            : undefined,
        startAt: selectedSlot.scheduledAt,
      });

      setCurrentHold(hold);
      setCurrentStep(3);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 409) {
        toast.error('Ese horario ya no está disponible, elegí otro', {
          id: 'slot-conflict-error',
          duration: 5000,
        });
        setSelectedSlot(null);
        // Refrescar automáticamente los horarios disponibles del paso 2
        queryClient.invalidateQueries({
          queryKey: ['booking', 'availability', businessId],
        });
      } else {
        const msg = err?.response?.data?.message;
        const errorText = Array.isArray(msg)
          ? msg.join('. ')
          : typeof msg === 'string' && msg
          ? msg
          : 'No fue posible reservar el horario temporalmente. Por favor intentá nuevamente.';
        toast.error(errorText, { duration: 5000 });
      }
    } finally {
      setIsCreatingHold(false);
    }
  };

  // 80b: Regresar desde el paso 3 al paso 2 (liberar hold explícitamente y refrescar)
  const handleBackFromStep3 = () => {
    if (currentHold && businessId) {
      // Best effort: liberar el hold explícitamente sin bloquear la navegación
      bookingApi
        .releaseHold(businessId, currentHold.holdId, currentHold.holderToken)
        .catch((err) => {
          console.warn('Best-effort release hold failed:', err);
        });
      setCurrentHold(null);
    }

    // Refrescar disponibilidad para que el slot vuelva a mostrarse disponible
    queryClient.invalidateQueries({
      queryKey: ['booking', 'availability', businessId],
    });

    setCurrentStep(2);
  };

  // Regresar desde paso 3 directo al paso 1 (liberar hold y limpiar slot)
  const handleBackToStep1 = () => {
    if (currentHold && businessId) {
      bookingApi
        .releaseHold(businessId, currentHold.holdId, currentHold.holderToken)
        .catch(() => {});
      setCurrentHold(null);
    }
    setSelectedSlot(null);
    setServiceSubStep('service');
    setCurrentStep(1);
    queryClient.invalidateQueries({
      queryKey: ['booking', 'availability', businessId],
    });
  };

  // Step 3 -> Cambio de campos
  const handleFormChange = (
    field: 'customerName' | 'customerPhone' | 'customerEmail',
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    if (duplicatePendingError && (field === 'customerPhone' || field === 'customerEmail')) {
      setDuplicatePendingError(null);
    }
  };

  const validateStep3 = () => {
    const errors: typeof formErrors = {};

    // 1. Nombre completo
    const trimmedName = formData.customerName.trim();
    if (!trimmedName) {
      errors.customerName = 'Por favor ingresá tu nombre completo.';
    } else if (trimmedName.length < 2) {
      errors.customerName = 'El nombre debe tener al menos 2 caracteres.';
    } else if (trimmedName.length > 80) {
      errors.customerName = 'El nombre no puede superar los 80 caracteres.';
    }

    // 2. Teléfono WhatsApp (fijo +505, exactamente 8 dígitos)
    const phoneDigits = formData.customerPhone.replace(/\D/g, '');
    if (!phoneDigits) {
      errors.customerPhone = 'Por favor ingresá tu número de WhatsApp.';
    } else if (phoneDigits.length < 8) {
      errors.customerPhone = `El número debe tener exactamente 8 dígitos (ingresaste ${phoneDigits.length}/8).`;
    } else if (/^(\d)\1{7}$/.test(phoneDigits)) {
      errors.customerPhone = 'Por favor ingresá un número de teléfono válido.';
    }

    // 3. Correo electrónico (obligatorio para confirmación)
    const trimmedEmail = formData.customerEmail.trim();
    if (!trimmedEmail) {
      errors.customerEmail = 'Por favor ingresá tu correo electrónico para enviarte la confirmación.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.customerEmail = 'El formato del correo electrónico no es válido.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Abrir modal de resumen
  const handleReviewBooking = () => {
    if (!validateStep3()) return;
    setIsSummaryOpen(true);
  };

  // Enviar confirmación final (submit paso 3)
  const handleConfirmBooking = async () => {
    if (!selectedService || !selectedSlot || !businessId) return;

    if (!currentHold) {
      toast.error(
        'El tiempo para completar tu reserva expiró, por favor elegí el horario de nuevo',
        { id: 'hold-expired-error', duration: 6000 }
      );
      setSelectedSlot(null);
      setCurrentStep(2);
      queryClient.invalidateQueries({
        queryKey: ['booking', 'availability', businessId],
      });
      return;
    }

    const phoneDigits = formData.customerPhone.replace(/\D/g, '').slice(0, 8);
    const fullPhone = `+505${phoneDigits}`;

    try {
      const result = await createAppointmentMutation.mutateAsync({
        serviceId: selectedService.id,
        specialistId:
          selectedSpecialist && selectedSpecialist !== 'any'
            ? selectedSpecialist.id
            : undefined,
        scheduledAt: selectedSlot.scheduledAt,
        customerName: formData.customerName.trim(),
        customerPhone: fullPhone,
        customerEmail: formData.customerEmail.trim(),
        holdId: currentHold.holdId,
        holderToken: currentHold.holderToken,
      });

      // Al crearse la cita con éxito, el backend elimina el hold atómicamente
      setCurrentHold(null);
      setIsSummaryOpen(false);
      setCreatedAppointment(result);
    } catch (err: any) {
      setIsSummaryOpen(false);
      const resData = err?.response?.data;
      const status = err?.response?.status;
      const msg = resData?.message || '';

      if (resData?.code === 'DUPLICATE_PENDING_APPOINTMENT') {
        setDuplicatePendingError({
          message: resData.message,
          matchedBy: resData.matchedBy,
          manageToken: resData.manageToken,
        });
        if (resData.matchedBy === 'phone' || resData.matchedBy === 'both') {
          setFormErrors((prev) => ({
            ...prev,
            customerPhone: 'Ya tenés una solicitud de reserva pendiente con este número.',
          }));
        }
        if (resData.matchedBy === 'email' || resData.matchedBy === 'both') {
          setFormErrors((prev) => ({
            ...prev,
            customerEmail: 'Ya tenés una solicitud de reserva pendiente con este correo.',
          }));
        }
        return;
      }

      // Si el backend rechaza porque el hold expiró (o conflicto 409)
      const isHoldExpired =
        status === 409 &&
        (typeof msg === 'string' &&
          (msg.toLowerCase().includes('reserva temporal') ||
            msg.toLowerCase().includes('expir') ||
            msg.toLowerCase().includes('hold')));

      if (isHoldExpired || status === 409) {
        toast.error(
          'El tiempo para completar tu reserva expiró, por favor elegí el horario de nuevo',
          { id: 'hold-expired-error', duration: 6000 }
        );
        setCurrentHold(null);
        setSelectedSlot(null);
        setCurrentStep(2);
        queryClient.invalidateQueries({
          queryKey: ['booking', 'availability', businessId],
        });
        return;
      }
    }
  };

  const handleResetFlow = () => {
    if (currentHold && businessId) {
      bookingApi
        .releaseHold(businessId, currentHold.holdId, currentHold.holderToken)
        .catch(() => {});
      setCurrentHold(null);
    }
    setCreatedAppointment(null);
    setCurrentStep(1);
    setServiceSubStep('service');
    setSelectedService(null);
    setSelectedSpecialist(null);
    setSelectedSlot(null);
    setFormData({ customerName: '', customerPhone: '', customerEmail: '' });
  };

  if (!businessId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-2 max-w-sm p-6 bg-white rounded-3xl border border-gray-200 shadow-sm">
          <WarningCircle size={36} className="text-amber-500 mx-auto" />
          <h2 className="text-lg font-bold text-gray-900">Enlace de reserva incompleto</h2>
          <p className="text-xs text-gray-500">
            Falta el identificador del negocio en la dirección web.
          </p>
        </div>
      </div>
    );
  }

  // Si ya se creó la cita, mostrar pantalla de éxito
  if (createdAppointment) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <BookingHeader business={business} isLoading={isLoadingBusiness} />
        <main className="flex-1 flex items-center justify-center p-4">
          <BookingSuccess
            appointment={createdAppointment}
            business={business}
            onReset={handleResetFlow}
          />
        </main>
      </div>
    );
  }

  const assignedSpecialists =
    selectedService?.specialists || (selectedService?.specialist ? [selectedService.specialist] : []);

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 flex flex-col selection:bg-brand-500 selection:text-white">
      {/* Header con Señales de Confianza */}
      <BookingHeader business={business} isLoading={isLoadingBusiness} />

      {/* Contenedor Principal */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 sm:py-8 space-y-6">
        {/* Error si el negocio no existe o no tiene CITAS */}
        {isServicesError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 shadow-2xs">
            <WarningCircle size={18} className="shrink-0 text-rose-600" />
            <p>
              El servicio de reservas online no está disponible actualmente para este negocio.
              Por favor contactá directamente al local.
            </p>
          </div>
        )}

        {/* Stepper Indicator */}
        <div className="grid grid-cols-3 gap-2 pb-1">
          {/* Paso 1 */}
          <button
            type="button"
            onClick={() => {
              if (currentStep > 1) {
                if (currentStep === 3) {
                  handleBackToStep1();
                } else {
                  setCurrentStep(1);
                  setServiceSubStep('service');
                }
              }
            }}
            disabled={currentStep < 1}
            className={`flex items-center gap-2 p-2.5 rounded-2xl border text-xs transition-all shadow-xs ${
              currentStep === 1
                ? 'bg-emerald-50/80 border-brand-500 text-brand-900 font-bold ring-1 ring-brand-500/20'
                : currentStep > 1
                ? 'bg-white border-gray-200 text-gray-700 hover:text-gray-900 hover:border-gray-300 font-semibold'
                : 'bg-gray-100 border-gray-200 text-gray-400 opacity-60'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                currentStep > 1
                  ? 'bg-brand-600 text-white font-bold'
                  : currentStep === 1
                  ? 'bg-brand-600 text-white font-bold'
                  : 'bg-gray-200 text-gray-500 font-semibold'
              }`}
            >
              1
            </span>
            <span className="truncate">
              {currentStep === 1 && serviceSubStep === 'specialist' ? 'Especialista' : 'Servicio'}
            </span>
          </button>

          {/* Paso 2 */}
          <button
            type="button"
            onClick={() => {
              if (selectedService && currentStep > 2) {
                handleBackFromStep3();
              }
            }}
            disabled={!selectedService || currentStep < 2}
            className={`flex items-center gap-2 p-2.5 rounded-2xl border text-xs transition-all shadow-xs ${
              currentStep === 2
                ? 'bg-emerald-50/80 border-brand-500 text-brand-900 font-bold ring-1 ring-brand-500/20'
                : currentStep > 2
                ? 'bg-white border-gray-200 text-gray-700 hover:text-gray-900 hover:border-gray-300 font-semibold'
                : 'bg-gray-100 border-gray-200 text-gray-400 opacity-60'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                currentStep > 2
                  ? 'bg-brand-600 text-white font-bold'
                  : currentStep === 2
                  ? 'bg-brand-600 text-white font-bold'
                  : 'bg-gray-200 text-gray-500 font-semibold'
              }`}
            >
              2
            </span>
            <span className="truncate">Fecha y Hora</span>
          </button>

          {/* Paso 3 */}
          <div
            className={`flex items-center gap-2 p-2.5 rounded-2xl border text-xs shadow-xs ${
              currentStep === 3
                ? 'bg-emerald-50/80 border-brand-500 text-brand-900 font-bold ring-1 ring-brand-500/20'
                : 'bg-gray-100 border-gray-200 text-gray-400 opacity-60'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                currentStep === 3
                  ? 'bg-brand-600 text-white font-bold'
                  : 'bg-gray-200 text-gray-500 font-semibold'
              }`}
            >
              3
            </span>
            <span className="truncate">Tus Datos</span>
          </div>
        </div>

        {/* STEP 1: Selección de Servicio o Especialista */}
        {currentStep === 1 && (
          <>
            {/* Sub-paso 1A: Elegir el tipo de servicio */}
            {serviceSubStep === 'service' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-gray-900">
                    Seleccioná el servicio que deseás reservar
                  </h2>
                  <p className="text-xs text-gray-500">
                    Elegí entre los servicios disponibles para ver profesionales y horarios.
                  </p>
                </div>

                <ServiceSelector
                  services={services}
                  selectedService={selectedService}
                  onSelectService={handleSelectService}
                  isLoading={isLoadingServices}
                />
              </div>
            )}

            {/* Sub-paso 1B: Elegir especialista (solo si tiene 2 o más) */}
            {serviceSubStep === 'specialist' && selectedService && (
              <SpecialistSelector
                specialists={assignedSpecialists}
                selectedSpecialist={selectedSpecialist}
                onSelectSpecialist={handleSelectSpecialist}
                onBack={() => setServiceSubStep('service')}
                serviceName={selectedService.name}
              />
            )}
          </>
        )}

        {/* STEP 2: Seleccionar Fecha y Horario */}
        {currentStep === 2 && selectedService && (
          <div className="space-y-6 animate-fadeIn">
            {/* Resumen del servicio y especialista seleccionado */}
            <div className="p-4 rounded-2xl bg-white border border-gray-200 flex items-center justify-between gap-3 shadow-xs">
              <div className="space-y-0.5 min-w-0">
                <span className="text-[10px] font-bold text-brand-700 uppercase tracking-wider block">
                  Servicio seleccionado
                </span>
                <h2 className="text-base font-bold text-gray-900 truncate">
                  {selectedService.name}
                </h2>
                {selectedSpecialist && (
                  <p className="text-xs text-gray-500 font-medium truncate">
                    {selectedSpecialist === 'any'
                      ? 'Cualquier especialista disponible'
                      : `Atendido por ${selectedSpecialist.name}${
                          selectedSpecialist.specialty ? ` — ${selectedSpecialist.specialty}` : ''
                        }`}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleBackFromStep2}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline shrink-0"
              >
                Cambiar
              </button>
            </div>

            <DateTimeSelector
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              slots={availabilityData?.availableSlots || []}
              selectedSlot={selectedSlot}
              onSelectSlot={handleSelectSlot}
              isLoadingSlots={isLoadingSlots}
            />

            <div className="pt-4 flex items-center justify-between border-t border-gray-200">
              <button
                type="button"
                onClick={handleBackFromStep2}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-100 border border-gray-200 shadow-xs transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft size={14} weight="bold" />
                Atrás
              </button>

              <button
                type="button"
                onClick={handleContinueToStep3}
                disabled={!selectedSlot || isCreatingHold}
                className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-40 flex items-center gap-2"
              >
                {isCreatingHold ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Reservando horario...
                  </>
                ) : (
                  <>
                    Continuar a tus datos
                    <ArrowRight size={15} weight="bold" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Datos del Cliente */}
        {currentStep === 3 && selectedService && selectedSlot && (
          <div className="space-y-6 animate-fadeIn">
            <div className="p-4 rounded-2xl bg-white border border-gray-200 flex items-center justify-between gap-3 text-xs shadow-xs">
              <div className="min-w-0 space-y-0.5">
                <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">
                  Turno elegido
                </span>
                <span className="font-bold text-gray-900 truncate block">
                  {selectedService.name} • {selectedDate} a las {selectedSlot.startTime}
                </span>
                {selectedSpecialist && (
                  <span className="text-gray-500 text-[11px] block truncate">
                    {selectedSpecialist === 'any'
                      ? 'Cualquier especialista disponible'
                      : `Con ${selectedSpecialist.name}`}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleBackFromStep3}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline shrink-0"
              >
                Cambiar turno
              </button>
            </div>

            {/* 80b: Feedback visual de reserva temporal */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/90 border border-emerald-200/80 text-emerald-950 text-xs flex items-center gap-2.5 shadow-2xs">
              <Clock size={18} weight="bold" className="text-emerald-600 shrink-0" />
              <p className="font-medium text-emerald-900 leading-snug">
                Horario reservado por unos minutos mientras completás tus datos.
              </p>
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-bold text-gray-900">
                Completá tus datos de contacto
              </h2>
              <p className="text-xs text-gray-500">
                El negocio usará estos datos para notificarte y coordinar tu turno.
              </p>
            </div>

            {duplicatePendingError && (
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 space-y-3 shadow-xs animate-fadeIn">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0 text-amber-700 mt-0.5">
                    <Warning size={20} weight="fill" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <h3 className="text-sm font-bold text-amber-900">
                      Ya tenés una reserva pendiente de confirmación
                    </h3>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      {duplicatePendingError.message}
                    </p>
                  </div>
                </div>

                {duplicatePendingError.manageToken && (
                  <div className="pt-2 border-t border-amber-200/80 flex flex-wrap items-center gap-2">
                    <Link
                      to={`/manage/${duplicatePendingError.manageToken}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs"
                    >
                      <ArrowSquareOut size={15} weight="bold" />
                      Revisar o cancelar mi solicitud previa en el Portal de Autogestión
                    </Link>
                  </div>
                )}
              </div>
            )}

            <div className="p-5 sm:p-6 rounded-3xl bg-white border border-gray-200 shadow-xs">
              <CustomerForm
                formData={formData}
                onChange={handleFormChange}
                errors={formErrors}
              />
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-gray-200">
              <button
                type="button"
                onClick={handleBackFromStep3}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-100 border border-gray-200 shadow-xs transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft size={14} weight="bold" />
                Atrás
              </button>

              <button
                type="button"
                onClick={handleReviewBooking}
                className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2"
              >
                Revisar y confirmar
                <ArrowRight size={15} weight="bold" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Modal Resumen antes de confirmar */}
      {selectedService && selectedSlot && (
        <BookingSummaryModal
          isOpen={isSummaryOpen}
          onClose={() => setIsSummaryOpen(false)}
          onConfirm={handleConfirmBooking}
          isSubmitting={createAppointmentMutation.isPending}
          business={business}
          service={selectedService}
          specialist={selectedSpecialist}
          slot={selectedSlot}
          customerName={formData.customerName}
          customerPhone={formData.customerPhone}
          customerEmail={formData.customerEmail}
        />
      )}
    </div>
  );
};
