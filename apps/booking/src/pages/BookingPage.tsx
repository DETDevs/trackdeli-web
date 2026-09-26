import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowLeft,
  WarningCircle,
  Warning,
  ArrowSquareOut,
} from '@phosphor-icons/react';
import { BookingHeader } from '../components/BookingHeader';
import { ServiceSelector } from '../components/ServiceSelector';
import { SpecialistSelector } from '../components/SpecialistSelector';
import { DateTimeSelector } from '../components/DateTimeSelector';
import { CustomerForm } from '../components/CustomerForm';
import { BookingSummaryModal } from '../components/BookingSummaryModal';
import { BookingSuccess } from '../components/BookingSuccess';
import {
  useBusinessInfo,
  usePublicServices,
  useAvailability,
  useCreateAppointment,
} from '../hooks/useBooking';
import type {
  AppointmentDetail,
  AvailableSlot,
  BookingServiceItem,
  BookingSpecialistInfo,
} from '../types/booking';

export const BookingPage: React.FC = () => {
  const { businessId } = useParams<{ businessId: string }>();

  // Wizard Steps: 1 = Servicio/Especialista, 2 = Fecha/Hora, 3 = Datos
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

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

  // Step 1A -> Seleccionar Servicio
  const handleSelectService = (service: BookingServiceItem) => {
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
    setSelectedSpecialist(specialist);
    setSelectedSlot(null);
    setCurrentStep(2);
  };

  // Regresar desde el paso 2 (Fecha y Hora)
  const handleBackFromStep2 = () => {
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
    setSelectedDate(date);
    setSelectedSlot(null);
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

    // 2. Teléfono WhatsApp
    const rawPhone = formData.customerPhone.trim();
    if (!rawPhone) {
      errors.customerPhone = 'Por favor ingresá tu número de WhatsApp.';
    } else {
      const digitsOnly = rawPhone.replace(/\D/g, '');
      const validPhonePattern = /^\+?[0-9\s\-()]{8,20}$/;

      if (!validPhonePattern.test(rawPhone) || rawPhone.lastIndexOf('+') > 0) {
        errors.customerPhone = 'El formato del número de teléfono no es válido.';
      } else if (digitsOnly.length < 8) {
        errors.customerPhone = 'El número debe contener al menos 8 dígitos (ej. 8888 1234).';
      } else if (digitsOnly.length > 15) {
        errors.customerPhone = 'El número no puede tener más de 15 dígitos.';
      } else if (/^(\d)\1{7,}$/.test(digitsOnly)) {
        errors.customerPhone = 'Por favor ingresá un número de teléfono real.';
      }
    }

    // 3. Correo electrónico (opcional)
    const trimmedEmail = formData.customerEmail.trim();
    if (
      trimmedEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)
    ) {
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

  // Enviar confirmación final
  const handleConfirmBooking = async () => {
    if (!selectedService || !selectedSlot) return;

    try {
      const result = await createAppointmentMutation.mutateAsync({
        serviceId: selectedService.id,
        specialistId:
          selectedSpecialist && selectedSpecialist !== 'any'
            ? selectedSpecialist.id
            : undefined,
        scheduledAt: selectedSlot.scheduledAt,
        customerName: formData.customerName.trim(),
        customerPhone: formData.customerPhone.trim(),
        customerEmail: formData.customerEmail.trim() || undefined,
      });

      setIsSummaryOpen(false);
      setCreatedAppointment(result);
    } catch (err: any) {
      setIsSummaryOpen(false);
      if (err?.response?.data?.code === 'DUPLICATE_PENDING_APPOINTMENT') {
        const data = err.response.data;
        setDuplicatePendingError({
          message: data.message,
          matchedBy: data.matchedBy,
          manageToken: data.manageToken,
        });
        if (data.matchedBy === 'phone' || data.matchedBy === 'both') {
          setFormErrors((prev) => ({
            ...prev,
            customerPhone: 'Ya tenés una solicitud de reserva pendiente con este número.',
          }));
        }
        if (data.matchedBy === 'email' || data.matchedBy === 'both') {
          setFormErrors((prev) => ({
            ...prev,
            customerEmail: 'Ya tenés una solicitud de reserva pendiente con este correo.',
          }));
        }
      }
    }
  };

  const handleResetFlow = () => {
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
                setCurrentStep(1);
                // Si ya eligió servicio y tiene especialistas, volver al sub-paso de servicio
                setServiceSubStep('service');
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
            onClick={() => selectedService && currentStep > 2 && setCurrentStep(2)}
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
              onSelectSlot={setSelectedSlot}
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
                onClick={() => setCurrentStep(3)}
                disabled={!selectedSlot}
                className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-40 flex items-center gap-2"
              >
                Continuar a tus datos
                <ArrowRight size={15} weight="bold" />
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
                onClick={() => setCurrentStep(2)}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline shrink-0"
              >
                Cambiar turno
              </button>
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
                onClick={() => setCurrentStep(2)}
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
